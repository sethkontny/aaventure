// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title RecoveryPassport
 * @dev Soulbound NFT representing a user's recovery journey
 * Each passport tracks sobriety date and meeting attendance on-chain
 */
contract RecoveryPassport is ERC721, Ownable {
    uint256 private _tokenIdCounter;

    struct PassportData {
        uint256 joinDate;        // Unix timestamp when passport was minted
        uint256 sobrietyDate;    // User's chosen sobriety date
        uint256 meetingsAttended; // Count of verified meetings
        bool isOfficial;         // Verified by AAVenture admin
    }

    mapping(uint256 => PassportData) public passportData;
    mapping(address => uint256) public userPassport; // One passport per address

    event PassportMinted(address indexed user, uint256 tokenId, uint256 joinDate);
    event MeetingIncremented(uint256 indexed tokenId, uint256 newCount);
    event PassportVerified(uint256 indexed tokenId);

    constructor() ERC721("AAVenture Recovery Passport", "AAREC") Ownable(msg.sender) {
        _tokenIdCounter = 1; // Start from 1
    }

    /**
     * @dev Mint a new recovery passport (one per address)
     * @param _sobrietyDate User's sobriety date (unix timestamp)
     */
    function mintPassport(uint256 _sobrietyDate) external {
        require(userPassport[msg.sender] == 0, "Already has passport");
        require(_sobrietyDate <= block.timestamp, "Future date not allowed");

        uint256 tokenId = _tokenIdCounter++;
        _safeMint(msg.sender, tokenId);

        passportData[tokenId] = PassportData({
            joinDate: block.timestamp,
            sobrietyDate: _sobrietyDate,
            meetingsAttended: 0,
            isOfficial: false
        });

        userPassport[msg.sender] = tokenId;

        emit PassportMinted(msg.sender, tokenId, block.timestamp);
    }

    /**
     * @dev Check if an address has a passport
     */
    function hasPassport(address user) external view returns (bool) {
        return userPassport[user] != 0;
    }

    /**
     * @dev Increment meeting count (only callable by contract owner/backend)
     * @param tokenId The passport token ID
     */
    function incrementMeetings(uint256 tokenId) external onlyOwner {
        require(_ownerOf(tokenId) != address(0), "Passport does not exist");
        
        passportData[tokenId].meetingsAttended++;
        
        emit MeetingIncremented(tokenId, passportData[tokenId].meetingsAttended);
    }

    /**
     * @dev Mark a passport as officially verified
     * @param tokenId The passport token ID
     */
    function verifyPassport(uint256 tokenId) external onlyOwner {
        require(_ownerOf(tokenId) != address(0), "Passport does not exist");
        
        passportData[tokenId].isOfficial = true;
        
        emit PassportVerified(tokenId);
    }

    /**
     * @dev Override to make soulbound (non-transferable)
     */
    function _update(address to, uint256 tokenId, address auth) internal virtual override returns (address) {
        address from = _ownerOf(tokenId);
        if (from != address(0) && to != address(0)) {
            revert("Soulbound: Transfer not allowed");
        }
        return super._update(to, tokenId, auth);
    }

    /**
     * @dev Get passport data for a token
     */
    function getPassportData(uint256 tokenId) external view returns (PassportData memory) {
        require(_ownerOf(tokenId) != address(0), "Passport does not exist");
        return passportData[tokenId];
    }
}
