// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

contract MeterBox is Ownable2Step, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using MessageHashUtils for bytes32;

    uint256 public constant MAX_BPS = 10_000;
    uint256 public constant MAX_FEE_CAP_BPS = 1_000;
    uint256 public constant MIN_DELAY = 2 days;

    bytes32 private constant _EIP712_DOMAIN_TYPEHASH =
        keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");
    bytes32 private constant _NAME_HASH = keccak256(bytes("MeterBox"));
    bytes32 private constant _VERSION_HASH = keccak256(bytes("2"));
    bytes32 private constant _USAGE_TICKET_TYPEHASH =
        keccak256("UsageTicket(address customer,uint256 amount,uint256 spendingLimit,uint256 deadline,bytes32 nonce,uint256 providerEpoch)");

    mapping(address => uint256) public balances;
    mapping(address => mapping(bytes32 => bool)) public usedNonces;

    address public provider;
    uint256 public providerEpoch;
    address public feeRecipient;
    uint256 public feeRateBps;

    struct Pending {
        address addr;
        uint256 eta;
    }

    Pending public pendingProvider;
    uint256 public pendingFeeRate;
    uint256 public pendingFeeRateEta;
    address public pendingFeeRecipient;
    uint256 public pendingFeeRecipientEta;

    address public immutable usdcToken;
    uint256 public immutable maxFeeRateBps;
    uint256 public immutable deployedChainId;

    error ZeroAddress();
    error ZeroAmount();
    error InsufficientBalance(uint256 available, uint256 required);
    error InvalidSignature(address recovered, address expected);
    error TicketExpired();
    error NonceUsed();
    error FeeTooHigh(uint256 requested, uint256 max);
    error SpendingLimitExceeded(uint256 amount, uint256 limit);
    error Unauthorized();
    error ChainMismatch();

    event Deposited(address indexed customer, uint256 amount);
    event Settled(address indexed customer, address indexed provider, uint256 amount, uint256 fee, bytes32 nonce);
    event Withdrawn(address indexed customer, uint256 amount);
    event ProviderUpdated(address indexed oldProvider, address indexed newProvider);
    event FeeRecipientUpdated(address indexed oldRecipient, address indexed newRecipient);
    event FeeRateUpdated(uint256 oldRate, uint256 newRate);
    event ChangeProposed(string paramName, uint256 eta);

    struct SettleParams {
        address customer;
        uint256 amount;
        uint256 spendingLimit;
        uint256 deadline;
        bytes32 nonce;
        bytes signature;
    }

    /// @notice Creates the MeterBox billing contract.
    /// @param initialOwner The owner address for Ownable access control.
    /// @param provider_ The initial authorized provider that can call settle.
    /// @param usdcToken_ The USDC token address used for billing and withdrawals.
    /// @param maxFeeRateBps_ The maximum protocol fee rate in basis points.
    constructor(address initialOwner, address provider_, address usdcToken_, uint256 maxFeeRateBps_) Ownable(initialOwner) {
        if (initialOwner == address(0) || provider_ == address(0) || usdcToken_ == address(0)) {
            revert ZeroAddress();
        }
        if (maxFeeRateBps_ > MAX_FEE_CAP_BPS) {
            revert FeeTooHigh(maxFeeRateBps_, MAX_FEE_CAP_BPS);
        }

        provider = provider_;
        usdcToken = usdcToken_;
        maxFeeRateBps = maxFeeRateBps_;
        deployedChainId = block.chainid;
    }

    /// @notice Deposits prepaid USDC into the caller's MeterBox balance.
    /// @param amount The amount of USDC to deposit.
    function deposit(uint256 amount) external nonReentrant {
        if (amount == 0) {
            revert ZeroAmount();
        }

        IERC20(usdcToken).safeTransferFrom(msg.sender, address(this), amount);
        balances[msg.sender] += amount;

        emit Deposited(msg.sender, amount);
    }

    /// @notice Settles a signed usage ticket and transfers funds to the provider.
    /// @param params The signed usage ticket details and customer signature.
    function settle(SettleParams calldata params) external nonReentrant {
        if (msg.sender != provider) {
            revert Unauthorized();
        }
        if (block.timestamp > params.deadline) {
            revert TicketExpired();
        }
        if (usedNonces[params.customer][params.nonce]) {
            revert NonceUsed();
        }
        if (params.amount > params.spendingLimit) {
            revert SpendingLimitExceeded(params.amount, params.spendingLimit);
        }

        if (block.chainid != deployedChainId) {
            revert ChainMismatch();
        }

        bytes32 digest = _typedDataHash(params);
        address signer = ECDSA.recover(digest, params.signature);
        if (signer != params.customer) {
            revert InvalidSignature(signer, params.customer);
        }

        uint256 customerBalance = balances[params.customer];
        if (customerBalance < params.amount) {
            revert InsufficientBalance(customerBalance, params.amount);
        }

        usedNonces[params.customer][params.nonce] = true;

        uint256 fee = (params.amount * feeRateBps) / MAX_BPS;
        uint256 net = params.amount - fee;

        balances[params.customer] = customerBalance - params.amount;

        IERC20(usdcToken).safeTransfer(provider, net);

        if (fee > 0) {
            if (feeRecipient == address(0)) {
                balances[params.customer] += fee;
            } else {
                IERC20(usdcToken).safeTransfer(feeRecipient, fee);
            }
        }

        emit Settled(params.customer, provider, params.amount, fee, params.nonce);
    }

    /// @notice Withdraws a specified amount of unused prepaid USDC.
    /// @param amount The amount of USDC to withdraw.
    function withdraw(uint256 amount) external nonReentrant {
        _withdraw(msg.sender, amount);
    }

    /// @notice Withdraws the caller's full unused prepaid USDC balance.
    function withdrawAll() external nonReentrant {
        uint256 amount = balances[msg.sender];
        if (amount == 0) {
            revert InsufficientBalance(amount, 1);
        }

        _withdraw(msg.sender, amount);
    }

    /// @notice Proposes an update to the authorized provider address.
    /// @param newProvider The new provider address.
    function proposeProvider(address newProvider) external onlyOwner {
        if (newProvider == address(0)) {
            revert ZeroAddress();
        }

        uint256 eta = block.timestamp + MIN_DELAY;
        pendingProvider = Pending({addr: newProvider, eta: eta});

        emit ChangeProposed("provider", eta);
    }

    /// @notice Executes a pending provider address update after the delay.
    function executeProvider() external onlyOwner {
        Pending memory pending = pendingProvider;
        if (pending.eta == 0 || block.timestamp < pending.eta) {
            revert Unauthorized();
        }

        address oldProvider = provider;
        provider = pending.addr;
        providerEpoch += 1;
        delete pendingProvider;

        emit ProviderUpdated(oldProvider, pending.addr);
    }

    /// @notice Proposes an update to the protocol fee recipient address.
    /// @param newRecipient The new fee recipient address, or address(0) to disable fee payouts.
    function proposeFeeRecipient(address newRecipient) external onlyOwner {
        uint256 eta = block.timestamp + MIN_DELAY;
        pendingFeeRecipient = newRecipient;
        pendingFeeRecipientEta = eta;

        emit ChangeProposed("feeRecipient", eta);
    }

    /// @notice Executes a pending fee recipient address update after the delay.
    function executeFeeRecipient() external onlyOwner {
        uint256 eta = pendingFeeRecipientEta;
        if (eta == 0 || block.timestamp < eta) {
            revert Unauthorized();
        }

        address oldRecipient = feeRecipient;
        address newRecipient = pendingFeeRecipient;

        feeRecipient = newRecipient;
        delete pendingFeeRecipient;
        delete pendingFeeRecipientEta;

        emit FeeRecipientUpdated(oldRecipient, newRecipient);
    }

    /// @notice Proposes an update to the protocol fee rate in basis points.
    /// @param newRate The new fee rate, capped by maxFeeRateBps.
    function proposeFeeRate(uint256 newRate) external onlyOwner {
        if (newRate > maxFeeRateBps) {
            revert FeeTooHigh(newRate, maxFeeRateBps);
        }

        uint256 eta = block.timestamp + MIN_DELAY;
        pendingFeeRate = newRate;
        pendingFeeRateEta = eta;

        emit ChangeProposed("feeRateBps", eta);
    }

    /// @notice Executes a pending fee rate update after the delay.
    function executeFeeRate() external onlyOwner {
        uint256 eta = pendingFeeRateEta;
        if (eta == 0 || block.timestamp < eta) {
            revert Unauthorized();
        }

        uint256 oldRate = feeRateBps;
        uint256 newRate = pendingFeeRate;

        feeRateBps = newRate;
        delete pendingFeeRate;
        delete pendingFeeRateEta;

        emit FeeRateUpdated(oldRate, newRate);
    }

    /// @notice Returns the EIP-712 digest for a usage ticket.
    /// @param params The usage ticket parameters.
    /// @return The digest that the customer must sign.
    function getTypedDataHash(SettleParams calldata params) external view returns (bytes32) {
        return _typedDataHash(params);
    }

    /// @notice Returns the EIP-712 domain separator used for ticket signing.
    /// @return The EIP-712 domain separator.
    function domainSeparator() external view returns (bytes32) {
        return _domainSeparator();
    }

    function _withdraw(address customer, uint256 amount) internal {
        if (amount == 0) {
            revert ZeroAmount();
        }

        uint256 customerBalance = balances[customer];
        if (customerBalance < amount) {
            revert InsufficientBalance(customerBalance, amount);
        }

        balances[customer] = customerBalance - amount;
        IERC20(usdcToken).safeTransfer(customer, amount);

        emit Withdrawn(customer, amount);
    }

    function _typedDataHash(SettleParams calldata params) internal view returns (bytes32) {
        bytes32 structHash = keccak256(
            abi.encode(
                _USAGE_TICKET_TYPEHASH,
                params.customer,
                params.amount,
                params.spendingLimit,
                params.deadline,
                params.nonce,
                providerEpoch
            )
        );

        return MessageHashUtils.toTypedDataHash(_domainSeparator(), structHash);
    }

    function _domainSeparator() internal view returns (bytes32) {
        return keccak256(
            abi.encode(_EIP712_DOMAIN_TYPEHASH, _NAME_HASH, _VERSION_HASH, deployedChainId, address(this))
        );
    }
}
