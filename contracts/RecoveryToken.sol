// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title RecoveryToken (REC)
 * @dev Rewards token for attending meetings and participating in the community
 */
contract RecoveryToken is ERC20, Ownable {
    
    event TokensRewarded(address indexed to, uint256 amount, string reason);

    constructor() ERC20("Recovery Token", "REC") Ownable(msg.sender) {
        // Mint initial supply to deployer (for rewards pool)
        _mint(msg.sender, 1000000 * 10**decimals()); // 1 million tokens
    }

    /**
     * @dev Mint new tokens (only owner can call - for rewarding users)
     * @param to Recipient address
     * @param amount Amount of tokens (in wei)
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
        emit TokensRewarded(to, amount, "Meeting attendance or community contribution");
    }

    /**
     * @dev Batch reward multiple users at once
     * @param recipients Array of addresses
     * @param amounts Array of amounts (parallel to recipients)
     */
    function batchReward(address[] calldata recipients, uint256[] calldata amounts) external onlyOwner {
        require(recipients.length == amounts.length, "Arrays length mismatch");
        
        for (uint256 i = 0; i < recipients.length; i++) {
            _mint(recipients[i], amounts[i]);
            emit TokensRewarded(recipients[i], amounts[i], "Batch reward");
        }
    }

    /**
     * @dev Burn tokens from own balance
     * @param amount Amount to burn
     */
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }
}
