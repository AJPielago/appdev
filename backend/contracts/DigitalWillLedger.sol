// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title DigitalWillLedger
 * @dev Stores IPFS CIDs for encrypted vault documents and anchors audit events
 *      on the Polygon Amoy testnet for the DigitalWill platform.
 */
contract DigitalWillLedger {
    address public owner;

    // Mapping of document ID → IPFS CID
    mapping(string => string) private documentCIDs;

    // Audit event log entry
    struct AuditEntry {
        string action;
        string details;
        string user;
        uint256 timestamp;
    }

    AuditEntry[] public auditLog;

    // Events
    event IPFSHashStored(string indexed docId, string cid, uint256 timestamp);
    event AuditEventLogged(uint256 indexed eventIndex, string action, string user, uint256 timestamp);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only the contract owner can perform this action");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * @dev Store an IPFS CID associated with a document ID.
     * @param docId The unique document identifier from the application.
     * @param cid The IPFS Content Identifier (CID) returned by Pinata.
     */
    function storeIPFSHash(string memory docId, string memory cid) public onlyOwner {
        documentCIDs[docId] = cid;
        emit IPFSHashStored(docId, cid, block.timestamp);
    }

    /**
     * @dev Retrieve the IPFS CID for a given document ID.
     * @param docId The unique document identifier.
     * @return The IPFS CID string.
     */
    function getIPFSHash(string memory docId) public view returns (string memory) {
        return documentCIDs[docId];
    }

    /**
     * @dev Log an audit event on-chain for immutable record-keeping.
     * @param action The action type (e.g., "ASSET_CREATED", "CLAIM_APPROVED").
     * @param details Human-readable description of the event.
     * @param user The user email or identifier who triggered the event.
     */
    function logAuditEvent(string memory action, string memory details, string memory user) public onlyOwner {
        auditLog.push(AuditEntry({
            action: action,
            details: details,
            user: user,
            timestamp: block.timestamp
        }));
        emit AuditEventLogged(auditLog.length - 1, action, user, block.timestamp);
    }

    /**
     * @dev Get the total number of audit events logged on-chain.
     * @return The count of audit entries.
     */
    function getAuditEventCount() public view returns (uint256) {
        return auditLog.length;
    }

    /**
     * @dev Get a specific audit event by index.
     * @param index The index of the audit entry.
     * @return action The action type.
     * @return details The event details.
     * @return user The user identifier.
     * @return timestamp The block timestamp when the event was logged.
     */
    function getAuditEvent(uint256 index) public view returns (
        string memory action,
        string memory details,
        string memory user,
        uint256 timestamp
    ) {
        require(index < auditLog.length, "Audit event index out of bounds");
        AuditEntry memory entry = auditLog[index];
        return (entry.action, entry.details, entry.user, entry.timestamp);
    }
}
