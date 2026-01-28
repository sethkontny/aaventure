// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";

/**
 * @title RecoveryToken
 * @dev The utility and governance token for the platform.
 * Users earn this by attending meetings and reaching milestones.
 */
contract RecoveryToken is ERC20, ERC20Burnable, Ownable, ERC20Permit, ERC20Votes {
    constructor() 
        ERC20("RecoveryToken", "REC") 
        ERC20Permit("RecoveryToken")
        Ownable(msg.sender)
    {}

    /**
     * @dev Mint new tokens.
     * Only the platform (Owner) or the DAO (via future role setup) can mint.
     * In a real DAO, you might restrict this further.
     */
    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }

    // The following functions are overrides required by Solidity.

    function _update(address from, address to, uint256 value)
        internal
        override(ERC20, ERC20Votes)
    {
        super._update(from, to, value);
    }

    function nonces(address owner)
        public
        view
        override(ERC20Permit, Nonces)
        returns (uint256)
    {
        return super.nonces(owner);
    }
}
