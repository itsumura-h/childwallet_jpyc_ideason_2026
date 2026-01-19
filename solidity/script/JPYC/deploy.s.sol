// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script} from "forge-std/Script.sol";
import {JPYC} from "../../src/JPYC.sol";
import {console} from "forge-std/console.sol";

contract JPYCScript is Script {
    JPYC public jpyc;

    function setUp() public {}

    function run() public {
        vm.startBroadcast();

        jpyc = new JPYC(1_000_000 * 10 ** 18);
        console.log("JPYC deployed at", address(jpyc));

        vm.stopBroadcast();
    }
}
