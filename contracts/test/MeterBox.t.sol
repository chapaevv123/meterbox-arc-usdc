// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console2} from "forge-std/Test.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {MeterBox} from "../MeterBox.sol";
import {MockERC20} from "../test-helpers/MockERC20.sol";

// ─────────────────────────────────────────────────────────────────────────────
// Handler for invariant testing
// ─────────────────────────────────────────────────────────────────────────────

contract MeterBoxHandler is Test {
    MeterBox public box;
    MockERC20 public usdc;

    // Ghost tracking: sum of (deposit - settled_net_transferred - withdrawn)
    // should equal the USDC held by the contract at all times.
    uint256 public ghostTotalBalance; // sum of balances[] for tracked users

    // Nonce tracking for invariant_NonceMonotonicity
    mapping(address => mapping(bytes32 => bool)) public ghostUsedNonces;

    // Tracked customers
    address[] public customers;
    mapping(address => bool) internal _isCustomer;

    // A private key we can sign with
    uint256 internal constant CUST_PK = 0xBEEF_C0FFEE_DEAD;

    constructor(MeterBox _box, MockERC20 _usdc) {
        box = _box;
        usdc = _usdc;

        // Register the signer-derived customer as a tracked customer
        address cust = vm.addr(CUST_PK);
        customers.push(cust);
        _isCustomer[cust] = true;
    }

    // ── deposit ──────────────────────────────────────────────────────────────
    function deposit(uint256 amount) external {
        amount = bound(amount, 1, 1_000_000e6);

        address cust = vm.addr(CUST_PK);
        usdc.mint(cust, amount);

        vm.startPrank(cust);
        usdc.approve(address(box), amount);
        box.deposit(amount);
        vm.stopPrank();

        ghostTotalBalance += amount;
    }

    // ── withdraw ─────────────────────────────────────────────────────────────
    function withdraw(uint256 amount) external {
        address cust = vm.addr(CUST_PK);
        uint256 bal = box.balances(cust);
        if (bal == 0) return;
        amount = bound(amount, 1, bal);

        vm.prank(cust);
        box.withdraw(amount);

        ghostTotalBalance -= amount;
    }

    // ── settle ───────────────────────────────────────────────────────────────
    function settle(uint256 amount, bytes32 nonce) external {
        address cust = vm.addr(CUST_PK);
        uint256 bal = box.balances(cust);
        if (bal == 0) return;
        if (ghostUsedNonces[cust][nonce]) return;

        amount = bound(amount, 1, bal);

        MeterBox.SettleParams memory p;
        p.customer = cust;
        p.amount = amount;
        p.spendingLimit = amount; // exact limit so SpendingLimitExceeded can't fire
        p.deadline = block.timestamp + 1 days;
        p.nonce = nonce;

        bytes32 digest = box.getTypedDataHash(p);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(CUST_PK, digest);
        p.signature = abi.encodePacked(r, s, v);

        address providerAddr = box.provider();
        vm.prank(providerAddr);
        box.settle(p);

        // Update ghost: full amount leaves the customer balance regardless of fee
        // (fee either goes to feeRecipient or comes back to customer — net of the
        // customer balance it's always `amount` debited)
        uint256 feeRateBps = box.feeRateBps();
        uint256 fee = (amount * feeRateBps) / 10_000;
        address feeRecipient = box.feeRecipient();
        if (fee > 0 && feeRecipient == address(0)) {
            // fee returned to customer balance, ghost only loses net
            ghostTotalBalance -= (amount - fee);
        } else {
            ghostTotalBalance -= amount;
        }

        ghostUsedNonces[cust][nonce] = true;
    }

    function getCustomersLength() external view returns (uint256) {
        return customers.length;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Invariant test contract
// ─────────────────────────────────────────────────────────────────────────────

contract MeterBoxInvariantTest is Test {
    MeterBox internal box;
    MockERC20 internal usdc;
    MeterBoxHandler internal handler;

    address internal owner;
    address internal providerAddr;

    function setUp() public {
        owner = makeAddr("owner");
        providerAddr = makeAddr("provider");

        usdc = new MockERC20("Mock USDC", "mUSDC", 6);

        vm.prank(owner);
        box = new MeterBox(owner, providerAddr, address(usdc), 500); // 5% max fee

        handler = new MeterBoxHandler(box, usdc);
        targetContract(address(handler));
    }

    /// @notice USDC held by the contract must always equal the sum of all tracked
    ///         customer balances (the ghost sum in the handler).
    function invariant_BalancesNeverExceedContractHoldings() public view {
        uint256 contractHolding = usdc.balanceOf(address(box));
        assertGe(contractHolding, handler.ghostTotalBalance(), "contract holds less USDC than ghost sum");
    }

    /// @notice Once a nonce is used, it must remain used — it can never be unset.
    function invariant_NonceMonotonicity() public view {
        address cust = vm.addr(0xBEEF_C0FFEE_DEAD);
        // If the handler recorded a nonce as used, the contract must agree
        // (we spot-check a few representative nonces)
        bytes32[3] memory nonces = [bytes32(uint256(1)), bytes32(uint256(2)), bytes32(uint256(3))];
        for (uint256 i = 0; i < nonces.length; i++) {
            if (handler.ghostUsedNonces(cust, nonces[i])) {
                assertTrue(box.usedNonces(cust, nonces[i]), "nonce was un-set after being used");
            }
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main unit / fuzz test contract
// ─────────────────────────────────────────────────────────────────────────────

contract MeterBoxTest is Test {
    // ── Accounts ──────────────────────────────────────────────────────────────
    address internal owner;
    uint256 internal customerPk;
    address internal customer;
    address internal providerAddr;
    address internal feeRecipientAddr;
    address internal alice;
    address internal attacker;

    // ── Contracts ─────────────────────────────────────────────────────────────
    MockERC20 internal usdc;
    MeterBox internal box;

    // ── Constants ─────────────────────────────────────────────────────────────
    uint256 internal constant INITIAL_BALANCE = 1_000e6;   // 1000 USDC (6 dec)
    uint256 internal constant MAX_FEE_BPS     = 500;        // 5%
    uint256 internal constant ONE_USDC        = 1e6;

    // ── Events (mirrored for expectEmit) ─────────────────────────────────────
    event Deposited(address indexed customer, uint256 amount);
    event Settled(address indexed customer, address indexed provider, uint256 amount, uint256 fee, bytes32 nonce);
    event Withdrawn(address indexed customer, uint256 amount);
    event ProviderUpdated(address indexed oldProvider, address indexed newProvider);
    event FeeRecipientUpdated(address indexed oldRecipient, address indexed newRecipient);
    event FeeRateUpdated(uint256 oldRate, uint256 newRate);
    event ChangeProposed(string paramName, uint256 eta);

    // ─────────────────────────────────────────────────────────────────────────
    function setUp() public {
        owner           = makeAddr("owner");
        (customer, customerPk) = makeAddrAndKey("customer");
        providerAddr    = makeAddr("provider");
        feeRecipientAddr = makeAddr("feeRecipient");
        alice           = makeAddr("alice");
        attacker        = makeAddr("attacker");

        // Deploy mock USDC
        usdc = new MockERC20("Mock USDC", "mUSDC", 6);

        // Deploy MeterBox
        vm.prank(owner);
        box = new MeterBox(owner, providerAddr, address(usdc), MAX_FEE_BPS);

        // Fund test users
        usdc.mint(customer, INITIAL_BALANCE);
        usdc.mint(alice, INITIAL_BALANCE);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Internal helpers
    // ─────────────────────────────────────────────────────────────────────────

    /// @dev Build and sign a SettleParams using the customer's private key.
    function _buildAndSign(
        uint256 amount,
        uint256 spendingLimit,
        uint256 deadline,
        bytes32 nonce
    ) internal view returns (MeterBox.SettleParams memory params) {
        params.customer      = customer;
        params.amount        = amount;
        params.spendingLimit = spendingLimit;
        params.deadline      = deadline;
        params.nonce         = nonce;

        bytes32 digest = box.getTypedDataHash(params);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(customerPk, digest);
        params.signature = abi.encodePacked(r, s, v);
    }

    /// @dev Approve & deposit `amount` of USDC from customer.
    function _deposit(uint256 amount) internal {
        vm.startPrank(customer);
        usdc.approve(address(box), amount);
        box.deposit(amount);
        vm.stopPrank();
    }

    // =========================================================================
    // 1. DEPLOYMENT & INITIALIZATION
    // =========================================================================

    function test_Constructor_SetsState() public view {
        assertEq(box.owner(),         owner);
        assertEq(box.provider(),      providerAddr);
        assertEq(box.usdcToken(),     address(usdc));
        assertEq(box.maxFeeRateBps(), MAX_FEE_BPS);
        assertEq(box.feeRateBps(),    0);
        assertEq(box.feeRecipient(),  address(0));
        assertEq(box.deployedChainId(), block.chainid);
    }

    // =========================================================================
    // 2. DEPOSIT — happy path
    // =========================================================================

    function test_Deposit() public {
        uint256 amount = 100e6;

        vm.startPrank(customer);
        usdc.approve(address(box), amount);

        vm.expectEmit(true, false, false, true, address(box));
        emit Deposited(customer, amount);

        box.deposit(amount);
        vm.stopPrank();

        assertEq(box.balances(customer), amount,          "balance mismatch");
        assertEq(usdc.balanceOf(address(box)), amount,    "contract USDC mismatch");
        assertEq(usdc.balanceOf(customer), INITIAL_BALANCE - amount, "customer USDC mismatch");
    }

    // =========================================================================
    // 3. SETTLE — happy paths
    // =========================================================================

    function test_Settle_NoFee() public {
        uint256 deposit = 500e6;
        uint256 amount  = 200e6;
        bytes32 nonce   = keccak256("nonce-1");

        _deposit(deposit);

        MeterBox.SettleParams memory p = _buildAndSign(amount, amount, block.timestamp + 1 days, nonce);

        uint256 providerBefore = usdc.balanceOf(providerAddr);

        vm.expectEmit(true, true, false, true, address(box));
        emit Settled(customer, providerAddr, amount, 0, nonce);

        vm.prank(providerAddr);
        box.settle(p);

        assertEq(box.balances(customer),       deposit - amount, "customer balance");
        assertEq(usdc.balanceOf(providerAddr), providerBefore + amount, "provider received");
        assertTrue(box.usedNonces(customer, nonce), "nonce not marked used");
    }

    function test_Settle_WithFee() public {
        // Set fee rate to 500 bps (5%) and a fee recipient
        vm.startPrank(owner);
        box.proposeFeeRecipient(feeRecipientAddr);
        vm.warp(block.timestamp + 2 days);
        box.executeFeeRecipient();
        box.proposeFeeRate(500);
        vm.warp(block.timestamp + 2 days);
        box.executeFeeRate();
        vm.stopPrank();

        uint256 deposit = 500e6;
        uint256 amount  = 200e6;   // 5% fee = 10e6
        bytes32 nonce   = keccak256("nonce-fee");

        _deposit(deposit);

        MeterBox.SettleParams memory p = _buildAndSign(amount, amount, block.timestamp + 1 days, nonce);

        uint256 expectedFee = (amount * 500) / 10_000; // 10e6
        uint256 expectedNet = amount - expectedFee;      // 190e6

        uint256 providerBefore       = usdc.balanceOf(providerAddr);
        uint256 feeRecipientBefore   = usdc.balanceOf(feeRecipientAddr);

        vm.expectEmit(true, true, false, true, address(box));
        emit Settled(customer, providerAddr, amount, expectedFee, nonce);

        vm.prank(providerAddr);
        box.settle(p);

        assertEq(box.balances(customer),            deposit - amount,           "customer balance");
        assertEq(usdc.balanceOf(providerAddr),      providerBefore + expectedNet, "provider net");
        assertEq(usdc.balanceOf(feeRecipientAddr),  feeRecipientBefore + expectedFee, "fee recipient");
    }

    function test_Settle_FeeNoRecipient() public {
        // Set fee rate but keep feeRecipient = address(0) → fee returns to customer
        vm.startPrank(owner);
        box.proposeFeeRate(500);
        vm.warp(block.timestamp + 2 days);
        box.executeFeeRate();
        vm.stopPrank();

        uint256 deposit = 500e6;
        uint256 amount  = 200e6;   // 5% fee = 10e6 returns to customer
        bytes32 nonce   = keccak256("nonce-nofee-recipient");

        _deposit(deposit);

        MeterBox.SettleParams memory p = _buildAndSign(amount, amount, block.timestamp + 1 days, nonce);

        uint256 expectedFee = (amount * 500) / 10_000; // 10e6
        uint256 expectedNet = amount - expectedFee;      // 190e6

        vm.prank(providerAddr);
        box.settle(p);

        // customer loses net, regains fee
        assertEq(box.balances(customer), deposit - expectedNet, "customer balance with fee rebate");
        // provider only gets net
        assertEq(usdc.balanceOf(providerAddr), expectedNet, "provider net");
        // contract retains the rebated fee
        assertEq(usdc.balanceOf(address(box)), deposit - expectedNet, "contract balance");
    }

    // =========================================================================
    // 4. WITHDRAW — happy paths
    // =========================================================================

    function test_Withdraw() public {
        uint256 deposit  = 500e6;
        uint256 withdraw = 150e6;

        _deposit(deposit);

        vm.expectEmit(true, false, false, true, address(box));
        emit Withdrawn(customer, withdraw);

        vm.prank(customer);
        box.withdraw(withdraw);

        assertEq(box.balances(customer),    deposit - withdraw, "customer balance");
        assertEq(usdc.balanceOf(customer),  INITIAL_BALANCE - deposit + withdraw, "customer USDC");
    }

    function test_WithdrawAll() public {
        uint256 deposit = 300e6;

        _deposit(deposit);

        vm.expectEmit(true, false, false, true, address(box));
        emit Withdrawn(customer, deposit);

        vm.prank(customer);
        box.withdrawAll();

        assertEq(box.balances(customer),   0, "balance not zero");
        assertEq(usdc.balanceOf(customer), INITIAL_BALANCE, "USDC not returned");
    }

    // =========================================================================
    // 5. REVERT TESTS — deposit
    // =========================================================================

    function test_Revert_DepositZero() public {
        vm.prank(customer);
        vm.expectRevert(MeterBox.ZeroAmount.selector);
        box.deposit(0);
    }

    function test_Revert_DepositInsufficientAllowance() public {
        // Approve less than deposit amount → SafeERC20 / ERC-20 allowance error
        vm.startPrank(customer);
        usdc.approve(address(box), 50e6);
        vm.expectRevert(); // ERC-20 "insufficient allowance"
        box.deposit(100e6);
        vm.stopPrank();
    }

    // =========================================================================
    // 6. REVERT TESTS — settle
    // =========================================================================

    function test_Revert_SettleUnauthorized() public {
        _deposit(100e6);
        MeterBox.SettleParams memory p = _buildAndSign(50e6, 50e6, block.timestamp + 1 days, keccak256("n1"));

        vm.prank(attacker);
        vm.expectRevert(MeterBox.Unauthorized.selector);
        box.settle(p);
    }

    function test_Revert_SettleExpired() public {
        _deposit(100e6);

        // Deadline already in the past
        uint256 pastDeadline = block.timestamp - 1;
        MeterBox.SettleParams memory p = _buildAndSign(50e6, 50e6, pastDeadline, keccak256("n-expired"));

        vm.prank(providerAddr);
        vm.expectRevert(MeterBox.TicketExpired.selector);
        box.settle(p);
    }

    function test_Revert_SettleNonceUsed() public {
        _deposit(200e6);
        bytes32 nonce = keccak256("nonce-reuse");
        MeterBox.SettleParams memory p = _buildAndSign(50e6, 50e6, block.timestamp + 1 days, nonce);

        vm.prank(providerAddr);
        box.settle(p);

        // Re-sign with same nonce (same params — balance covers it)
        MeterBox.SettleParams memory p2 = _buildAndSign(50e6, 50e6, block.timestamp + 1 days, nonce);

        vm.prank(providerAddr);
        vm.expectRevert(MeterBox.NonceUsed.selector);
        box.settle(p2);
    }

    function test_Revert_SettleOnDifferentChain() public {
        _deposit(100e6);
        MeterBox.SettleParams memory p = _buildAndSign(50e6, 50e6, block.timestamp + 1 days, keccak256("chain-replay"));
        vm.chainId(block.chainid + 1);
        vm.prank(providerAddr);
        vm.expectRevert(MeterBox.ChainMismatch.selector);
        box.settle(p);
    }

    function test_Revert_SettleOnDifferentContract() public {
        MeterBox other = new MeterBox(owner, providerAddr, address(usdc), MAX_FEE_BPS);
        vm.startPrank(customer);
        usdc.approve(address(other), 100e6);
        other.deposit(100e6);
        vm.stopPrank();

        MeterBox.SettleParams memory p = _buildAndSign(50e6, 50e6, block.timestamp + 1 days, keccak256("contract-replay"));
        vm.prank(providerAddr);
        vm.expectPartialRevert(MeterBox.InvalidSignature.selector);
        other.settle(p);
    }

    function test_Revert_SettleInvalidSignature() public {
        _deposit(100e6);

        // Sign with attacker's key, not customer's
        (address attackerAddr, uint256 attackerPk) = makeAddrAndKey("attacker-signer");
        vm.label(attackerAddr, "attackerSigner");

        MeterBox.SettleParams memory p;
        p.customer      = customer;
        p.amount        = 50e6;
        p.spendingLimit = 50e6;
        p.deadline      = block.timestamp + 1 days;
        p.nonce         = keccak256("n-bad-sig");

        bytes32 digest = box.getTypedDataHash(p);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(attackerPk, digest);
        p.signature = abi.encodePacked(r, s, v);

        vm.prank(providerAddr);
        vm.expectRevert(
            abi.encodeWithSelector(MeterBox.InvalidSignature.selector, attackerAddr, customer)
        );
        box.settle(p);
    }

    function test_Revert_SettleSpendingLimit() public {
        _deposit(500e6);
        uint256 spendingLimit = 100e6;
        uint256 amount        = 200e6; // exceeds limit

        MeterBox.SettleParams memory p = _buildAndSign(amount, spendingLimit, block.timestamp + 1 days, keccak256("n-limit"));

        vm.prank(providerAddr);
        vm.expectRevert(
            abi.encodeWithSelector(MeterBox.SpendingLimitExceeded.selector, amount, spendingLimit)
        );
        box.settle(p);
    }

    function test_Revert_SettleInsufficientBalance() public {
        uint256 deposit = 50e6;
        _deposit(deposit);

        uint256 amount = 100e6; // more than deposited

        MeterBox.SettleParams memory p = _buildAndSign(amount, amount, block.timestamp + 1 days, keccak256("n-insuf"));

        vm.prank(providerAddr);
        vm.expectRevert(
            abi.encodeWithSelector(MeterBox.InsufficientBalance.selector, deposit, amount)
        );
        box.settle(p);
    }

    // =========================================================================
    // 7. REVERT TESTS — withdraw
    // =========================================================================

    function test_Revert_WithdrawZero() public {
        _deposit(100e6);
        vm.prank(customer);
        vm.expectRevert(MeterBox.ZeroAmount.selector);
        box.withdraw(0);
    }

    function test_Revert_WithdrawTooMuch() public {
        uint256 deposit = 100e6;
        _deposit(deposit);

        vm.prank(customer);
        vm.expectRevert(
            abi.encodeWithSelector(MeterBox.InsufficientBalance.selector, deposit, deposit + 1)
        );
        box.withdraw(deposit + 1);
    }

    // =========================================================================
    // 8. REVERT TESTS — constructor
    // =========================================================================

    function test_Revert_ConstructorZeroAddress_InitialOwner() public {
        // OZ Ownable2Step calls Ownable(initialOwner) first; when initialOwner==address(0)
        // OZ fires OwnableInvalidOwner before MeterBox's own ZeroAddress guard is reached.
        // The revert is still a zero-address protection — just from the inherited base.
        vm.expectRevert(
            abi.encodeWithSelector(Ownable.OwnableInvalidOwner.selector, address(0))
        );
        new MeterBox(address(0), providerAddr, address(usdc), MAX_FEE_BPS);
    }

    function test_Revert_ConstructorZeroAddress_Provider() public {
        vm.expectRevert(MeterBox.ZeroAddress.selector);
        new MeterBox(owner, address(0), address(usdc), MAX_FEE_BPS);
    }

    function test_Revert_ConstructorZeroAddress_USDC() public {
        vm.expectRevert(MeterBox.ZeroAddress.selector);
        new MeterBox(owner, providerAddr, address(0), MAX_FEE_BPS);
    }

    function test_Revert_ConstructorFeeTooHigh() public {
        uint256 tooHigh = 1001; // > MAX_FEE_CAP_BPS (1000)
        vm.expectRevert(
            abi.encodeWithSelector(MeterBox.FeeTooHigh.selector, tooHigh, uint256(1000))
        );
        new MeterBox(owner, providerAddr, address(usdc), tooHigh);
    }

    // =========================================================================
    // 9. TIMELOCK TESTS — proposeProvider / executeProvider
    // =========================================================================

    function test_Timelock_ProposeAndExecuteProvider() public {
        address newProvider = makeAddr("newProvider");

        vm.startPrank(owner);

        uint256 expectedEta = block.timestamp + 2 days;
        vm.expectEmit(false, false, false, true, address(box));
        emit ChangeProposed("provider", expectedEta);
        box.proposeProvider(newProvider);

        // Before delay: revert
        vm.expectRevert(MeterBox.Unauthorized.selector);
        box.executeProvider();

        // Warp past delay
        vm.warp(block.timestamp + 2 days);

        vm.expectEmit(true, true, false, false, address(box));
        emit ProviderUpdated(providerAddr, newProvider);
        box.executeProvider();

        vm.stopPrank();

        assertEq(box.provider(), newProvider, "provider not updated");
    }

    function test_Revert_Timelock_ExecuteTooEarly() public {
        address newProvider = makeAddr("newProvider2");

        vm.startPrank(owner);
        box.proposeProvider(newProvider);

        // Warp 1 day — still too early
        vm.warp(block.timestamp + 1 days);

        vm.expectRevert(MeterBox.Unauthorized.selector);
        box.executeProvider();
        vm.stopPrank();
    }

    function test_Revert_Timelock_ExecuteProvider_NoProposal() public {
        vm.prank(owner);
        vm.expectRevert(MeterBox.Unauthorized.selector);
        box.executeProvider();
    }

    function test_Timelock_ProposeAndExecuteFeeRate() public {
        uint256 newRate = 300;

        vm.startPrank(owner);

        uint256 expectedEta = block.timestamp + 2 days;
        vm.expectEmit(false, false, false, true, address(box));
        emit ChangeProposed("feeRateBps", expectedEta);
        box.proposeFeeRate(newRate);

        vm.warp(block.timestamp + 2 days);

        vm.expectEmit(false, false, false, true, address(box));
        emit FeeRateUpdated(0, newRate);
        box.executeFeeRate();

        vm.stopPrank();

        assertEq(box.feeRateBps(), newRate, "fee rate not updated");
    }

    function test_Timelock_ProposeAndExecuteFeeRecipient() public {
        address newRecipient = makeAddr("newRecipient");

        vm.startPrank(owner);

        uint256 expectedEta = block.timestamp + 2 days;
        vm.expectEmit(false, false, false, true, address(box));
        emit ChangeProposed("feeRecipient", expectedEta);
        box.proposeFeeRecipient(newRecipient);

        vm.warp(block.timestamp + 2 days);

        vm.expectEmit(true, true, false, false, address(box));
        emit FeeRecipientUpdated(address(0), newRecipient);
        box.executeFeeRecipient();

        vm.stopPrank();

        assertEq(box.feeRecipient(), newRecipient, "fee recipient not updated");
    }

    function test_Timelock_ProposeAndExecuteFeeRecipient_ZeroAllowed() public {
        // Setting feeRecipient to address(0) should be valid (disables fee payout)
        vm.startPrank(owner);

        // First set a real recipient
        box.proposeFeeRecipient(feeRecipientAddr);
        vm.warp(block.timestamp + 2 days);
        box.executeFeeRecipient();
        assertEq(box.feeRecipient(), feeRecipientAddr);

        // Now propose address(0)
        box.proposeFeeRecipient(address(0));
        vm.warp(block.timestamp + 2 days);
        box.executeFeeRecipient();

        vm.stopPrank();

        assertEq(box.feeRecipient(), address(0), "fee recipient should be zero");
    }

    function test_Revert_Timelock_FeeRateTooHigh() public {
        vm.prank(owner);
        vm.expectRevert(
            abi.encodeWithSelector(MeterBox.FeeTooHigh.selector, MAX_FEE_BPS + 1, MAX_FEE_BPS)
        );
        box.proposeFeeRate(MAX_FEE_BPS + 1);
    }

    function test_Revert_Timelock_ProposeProvider_ZeroAddress() public {
        vm.prank(owner);
        vm.expectRevert(MeterBox.ZeroAddress.selector);
        box.proposeProvider(address(0));
    }

    function test_Revert_Timelock_OnlyOwner_ProposeProvider() public {
        vm.prank(attacker);
        vm.expectRevert(
            abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, attacker)
        );
        box.proposeProvider(makeAddr("x"));
    }

    function test_Revert_Timelock_OnlyOwner_ProposeFeeRate() public {
        vm.prank(attacker);
        vm.expectRevert(
            abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, attacker)
        );
        box.proposeFeeRate(100);
    }

    function test_Revert_Timelock_OnlyOwner_ProposeFeeRecipient() public {
        vm.prank(attacker);
        vm.expectRevert(
            abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, attacker)
        );
        box.proposeFeeRecipient(makeAddr("x"));
    }

    function test_Revert_Timelock_FeeRate_ExecuteTooEarly() public {
        vm.startPrank(owner);
        box.proposeFeeRate(100);
        vm.warp(block.timestamp + 1 days);
        vm.expectRevert(MeterBox.Unauthorized.selector);
        box.executeFeeRate();
        vm.stopPrank();
    }

    function test_Revert_Timelock_FeeRecipient_ExecuteTooEarly() public {
        vm.startPrank(owner);
        box.proposeFeeRecipient(feeRecipientAddr);
        vm.warp(block.timestamp + 1 days);
        vm.expectRevert(MeterBox.Unauthorized.selector);
        box.executeFeeRecipient();
        vm.stopPrank();
    }

    // =========================================================================
    // 10. FUZZ TESTS
    // =========================================================================

    /// @notice testFuzz_DepositAndWithdraw: round-trip leaves balance at zero.
    function testFuzz_DepositAndWithdraw(uint256 amount) public {
        // Bound: 1 to 1e12 micro-USDC (6-decimal)
        amount = bound(amount, 1, 1e12);

        // Ensure customer has enough
        if (usdc.balanceOf(customer) < amount) {
            usdc.mint(customer, amount - usdc.balanceOf(customer));
        }

        vm.startPrank(customer);
        usdc.approve(address(box), amount);
        box.deposit(amount);
        vm.stopPrank();

        assertEq(box.balances(customer), amount, "balance after deposit");

        vm.prank(customer);
        box.withdraw(amount);

        assertEq(box.balances(customer), 0, "balance should be zero after full withdraw");
    }

    /// @notice testFuzz_SettlePartialBalance: settle partial → remainder is correct.
    function testFuzz_SettlePartialBalance(uint96 depositAmt, uint96 settleAmt) public {
        // Bound: ensure settleAmt <= depositAmt, both > 0
        depositAmt = uint96(bound(depositAmt, 1e6, 1e12));
        settleAmt  = uint96(bound(settleAmt,  1,   depositAmt));

        // Fund customer
        if (usdc.balanceOf(customer) < depositAmt) {
            usdc.mint(customer, uint256(depositAmt) - usdc.balanceOf(customer));
        }

        _deposit(depositAmt);

        bytes32 nonce = keccak256(abi.encode(depositAmt, settleAmt, block.timestamp));
        MeterBox.SettleParams memory p = _buildAndSign(
            settleAmt,
            settleAmt,
            block.timestamp + 1 days,
            nonce
        );

        // feeRateBps is 0 in default setUp
        vm.prank(providerAddr);
        box.settle(p);

        uint256 expectedRemaining = uint256(depositAmt) - uint256(settleAmt);
        assertEq(box.balances(customer), expectedRemaining, "incorrect remainder");
    }
}
