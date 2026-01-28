// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title RecoveryPassport
 * @dev A Soulbound NFT (non-transferable) that tracks a user's recovery journey.
 * Compatible with OpenZeppelin 5.0
 */
contract RecoveryPassport is ERC721, Ownable {
    uint256 private _nextTokenId;

    struct PassportData {
        uint256 joinDate;       // Timestamp when they joined
        uint256 sobrietyDate;   // Timestamp of their sobriety date
        uint256 meetingsAttended; // Counter for meetings
        bool isOfficial;        // If the user belongs to an official AA group
    }

    // Mapping from Token ID to Passport Data
    mapping(uint256 => PassportData) public passportData;
    
    // Mapping to check if an address already has a passport
    mapping(address => bool) public hasPassport;

    // Events
    event PassportMinted(address indexed user, uint256 tokenId, uint256 joinDate);
    event SobrietyDateUpdated(uint256 indexed tokenId, uint256 newDate);
    event MeetingAttended(uint256 indexed tokenId, uint256 totalMeetings);

    // Pass msg.sender to Ownable to set the deployer as the initial owner
    constructor() ERC721("RecoveryPassport", "REC-PASS") Ownable(msg.sender) {}

    /**
     * @dev Mints a new Recovery Passport to the caller.
     * One per address.
     * @param _sobrietyDate The user's self-reported sobriety date.
     */
    function mintPassport(uint256 _sobrietyDate) external {
        require(!hasPassport[msg.sender], "Address already has a passport");

        uint256 tokenId = _nextTokenId++;
        _safeMint(msg.sender, tokenId);

        passportData[tokenId] = PassportData({
            joinDate: block.timestamp,
            sobrietyDate: _sobrietyDate,
            meetingsAttended: 0,
            isOfficial: true
        });

        hasPassport[msg.sender] = true;
        emit PassportMinted(msg.sender, tokenId, block.timestamp);
    }

    /**
     * @dev Validates attendance. Only the contract owner (the platform backend) can call this.
     * @param tokenId The ID of the passport to update.
     */
    function incrementMeetings(uint256 tokenId) external onlyOwner {
        // In OZ 5.0, ownerOf will revert if token doesn't exist, so this check is implicit
        // but we can check explicitly if we want to be safe, or just rely on reverts.
        // We'll trust _requireOwned (internal) or similar checks, but let's just access it.
        require(ownerOf(tokenId) != address(0), "Passport does not exist");
        
        passportData[tokenId].meetingsAttended += 1;
        emit MeetingAttended(tokenId, passportData[tokenId].meetingsAttended);
    }

    /**
     * @dev User can update their sobriety date.
     */
    function updateSobrietyDate(uint256 tokenId, uint256 newDate) external {
        require(ownerOf(tokenId) == msg.sender, "Not passport owner");
        passportData[tokenId].sobrietyDate = newDate;
        emit SobrietyDateUpdated(tokenId, newDate);
    }

    /**
     * @dev Soulbound Logic: Override _update to prevent moving the NFT.
     * It can only be minted (from 0) or burned (to 0), but NO transfers between users.
     */
    function _update(address to, uint256 tokenId, address auth) internal virtual override returns (address) {
        address from = _ownerOf(tokenId);
        
        // If 'from' is not the zero address (minting) AND 'to' is not the zero address (burning),
        // then it is a transfer, which we forbid.
        if (from != address(0) && to != address(0)) {
            revert("RecoveryPassport: Soulbound token cannot be transferred");
        }

        return super._update(to, tokenId, auth);
    }
}