// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract CurrencyVerification is ERC20, Ownable, Pausable, ReentrancyGuard {
    struct CurrencyNote {
        uint256 serialNumber;
        uint256 denomination;
        string qrCodeHash;
        address issuer;
        uint256 issueDate;
        bool isActive;
        bool isVerified;
        string metadata;
    }

    struct Issuer {
        address issuerAddress;
        string name;
        string country;
        bool isAuthorized;
        uint256 totalIssued;
    }

    mapping(uint256 => CurrencyNote) public currencyNotes;
    mapping(address => Issuer) public issuers;
    mapping(string => uint256) public qrCodeToSerial;
    mapping(address => bool) public authorizedVerifiers;
    
    uint256 public totalNotesIssued;
    uint256 public totalValueIssued;
    uint256 public constant MAX_SUPPLY = 1000000000 * 10**18; // 1 billion tokens max
    
    event CurrencyIssued(
        uint256 indexed serialNumber,
        address indexed issuer,
        uint256 denomination,
        string qrCodeHash,
        uint256 timestamp
    );
    
    event CurrencyVerified(
        uint256 indexed serialNumber,
        address indexed verifier,
        bool isValid,
        uint256 timestamp
    );
    
    event IssuerRegistered(
        address indexed issuer,
        string name,
        string country
    );
    
    event CurrencyDeactivated(
        uint256 indexed serialNumber,
        address indexed deactivator,
        uint256 timestamp
    );

    modifier onlyAuthorizedIssuer() {
        require(issuers[msg.sender].isAuthorized, "Not authorized issuer");
        _;
    }

    modifier onlyAuthorizedVerifier() {
        require(authorizedVerifiers[msg.sender] || msg.sender == owner(), "Not authorized verifier");
        _;
    }

    constructor() ERC20("VerifiedCurrency", "VC") {
        _mint(msg.sender, 1000000 * 10**18); // Initial supply
    }

    function registerIssuer(
        address _issuer,
        string memory _name,
        string memory _country
    ) external onlyOwner {
        require(_issuer != address(0), "Invalid issuer address");
        
        issuers[_issuer] = Issuer({
            issuerAddress: _issuer,
            name: _name,
            country: _country,
            isAuthorized: true,
            totalIssued: 0
        });
        
        emit IssuerRegistered(_issuer, _name, _country);
    }

    function issueCurrency(
        uint256 _serialNumber,
        uint256 _denomination,
        string memory _qrCodeHash,
        string memory _metadata
    ) external onlyAuthorizedIssuer whenNotPaused nonReentrant {
        require(currencyNotes[_serialNumber].serialNumber == 0, "Serial number already exists");
        require(_denomination > 0, "Invalid denomination");
        require(bytes(_qrCodeHash).length > 0, "QR code hash required");
        require(qrCodeToSerial[_qrCodeHash] == 0, "QR code already in use");
        
        currencyNotes[_serialNumber] = CurrencyNote({
            serialNumber: _serialNumber,
            denomination: _denomination,
            qrCodeHash: _qrCodeHash,
            issuer: msg.sender,
            issueDate: block.timestamp,
            isActive: true,
            isVerified: false,
            metadata: _metadata
        });
        
        qrCodeToSerial[_qrCodeHash] = _serialNumber;
        issuers[msg.sender].totalIssued++;
        totalNotesIssued++;
        totalValueIssued += _denomination;
        
        emit CurrencyIssued(_serialNumber, msg.sender, _denomination, _qrCodeHash, block.timestamp);
    }

    function verifyCurrency(
        uint256 _serialNumber,
        string memory _qrCodeHash
    ) external onlyAuthorizedVerifier returns (bool) {
        CurrencyNote storage note = currencyNotes[_serialNumber];
        require(note.serialNumber != 0, "Currency note not found");
        require(note.isActive, "Currency note is inactive");
        require(keccak256(bytes(note.qrCodeHash)) == keccak256(bytes(_qrCodeHash)), "QR code mismatch");
        
        note.isVerified = true;
        
        emit CurrencyVerified(_serialNumber, msg.sender, true, block.timestamp);
        return true;
    }

    function checkCurrencyValidity(
        uint256 _serialNumber
    ) external view returns (bool isValid, string memory status) {
        CurrencyNote memory note = currencyNotes[_serialNumber];
        
        if (note.serialNumber == 0) {
            return (false, "Currency note not found");
        }
        
        if (!note.isActive) {
            return (false, "Currency note is inactive");
        }
        
        if (!note.isVerified) {
            return (false, "Currency note not verified");
        }
        
        return (true, "Valid currency");
    }

    function getCurrencyDetails(
        uint256 _serialNumber
    ) external view returns (
        uint256 serialNumber,
        uint256 denomination,
        address issuer,
        uint256 issueDate,
        bool isActive,
        bool isVerified,
        string memory metadata
    ) {
        CurrencyNote memory note = currencyNotes[_serialNumber];
        return (
            note.serialNumber,
            note.denomination,
            note.issuer,
            note.issueDate,
            note.isActive,
            note.isVerified,
            note.metadata
        );
    }

    function deactivateCurrency(uint256 _serialNumber) external onlyOwner {
        require(currencyNotes[_serialNumber].serialNumber != 0, "Currency note not found");
        
        currencyNotes[_serialNumber].isActive = false;
        
        emit CurrencyDeactivated(_serialNumber, msg.sender, block.timestamp);
    }

    function addAuthorizedVerifier(address _verifier) external onlyOwner {
        authorizedVerifiers[_verifier] = true;
    }

    function removeAuthorizedVerifier(address _verifier) external onlyOwner {
        authorizedVerifiers[_verifier] = false;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function getIssuerStats(address _issuer) external view returns (
        string memory name,
        string memory country,
        bool isAuthorized,
        uint256 totalIssued
    ) {
        Issuer memory issuer = issuers[_issuer];
        return (
            issuer.name,
            issuer.country,
            issuer.isAuthorized,
            issuer.totalIssued
        );
    }

    function getSystemStats() external view returns (
        uint256 totalNotes,
        uint256 totalValue,
        uint256 activeNotes
    ) {
        return (totalNotesIssued, totalValueIssued, totalNotesIssued);
    }
}
