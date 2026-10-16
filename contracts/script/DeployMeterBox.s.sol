// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console2} from "forge-std/Script.sol";
import {MeterBox} from "../MeterBox.sol";

/// @notice Deploys MeterBox with the owner-approved roles on Arc only.
/// @dev No private key is read by this script. For a future live deployment,
///      Forge must receive an explicitly approved hardware signer via --ledger.
contract DeployMeterBox is Script {
    address internal constant INITIAL_OWNER = 0x6Fa3659a15e9264E43EC67Fe4bB5d31D38109A42;
    address internal constant PROVIDER = 0x765fb7e6a0BdDDc29f57eeCE34AEda0Fb318805d;
    address internal constant ARC_USDC = 0x3600000000000000000000000000000000000000;
    uint256 internal constant MAX_FEE_RATE_BPS = 500;

    function run() external {
        require(block.chainid == 5042 || block.chainid == 5042002, "DeployMeterBox: wrong Arc chain");

        console2.log("=== MeterBox Deployment ===");
        console2.log("initialOwner :", INITIAL_OWNER);
        console2.log("provider     :", PROVIDER);
        console2.log("usdcToken    :", ARC_USDC);
        console2.log("maxFeeRate   :", MAX_FEE_RATE_BPS, "bps");
        console2.log("chainId      :", block.chainid);

        vm.startBroadcast();
        MeterBox box = new MeterBox(INITIAL_OWNER, PROVIDER, ARC_USDC, MAX_FEE_RATE_BPS);
        vm.stopBroadcast();

        console2.log("=== Deployment Simulated / Broadcast By CLI ===");
        console2.log("MeterBox address :", address(box));
        console2.log("owner()          :", box.owner());
        console2.log("provider()       :", box.provider());
        console2.log("usdcToken()      :", box.usdcToken());
        console2.log("deployedChainId():", box.deployedChainId());
        console2.log("maxFeeRateBps()  :", box.maxFeeRateBps());

        assert(box.owner() == INITIAL_OWNER);
        assert(box.provider() == PROVIDER);
        assert(box.usdcToken() == ARC_USDC);
        assert(box.deployedChainId() == block.chainid);
        assert(box.maxFeeRateBps() == MAX_FEE_RATE_BPS);
    }
}
