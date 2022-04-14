// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.8.11;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract VestingToken is ERC20 {
    constructor() ERC20("VestingToken", "VT") {
        _mint(msg.sender, 10**9);
    }
}
