// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.8.11;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract VestingToken is ERC20 {
    constructor() ERC20("VestingToken", "VT") {
<<<<<<< HEAD:contracts/Token.sol
        _mint(msg.sender, 10**24);
=======
        _mint(msg.sender, 10**9);
>>>>>>> 13a5358127bb5c5b7b094a441d3ab2619090506c:contracts/VestingToken.sol
    }
}
