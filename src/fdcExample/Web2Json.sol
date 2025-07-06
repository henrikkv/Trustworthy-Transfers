// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {console} from "dependencies/forge-std-1.9.5/src/console.sol";
import {Strings} from "@openzeppelin-contracts/utils/Strings.sol";
import {ContractRegistry} from "flare-periphery/src/coston2/ContractRegistry.sol";
import {IFdcVerification} from "flare-periphery/src/coston2/IFdcVerification.sol";
import {IWeb2Json} from "flare-periphery/src/coston2/IWeb2Json.sol";

struct WiseTransfer {
    uint256 id;
    uint256 targetAccount;
    bool status;
    address userMessage;
    uint256 targetValue;
    string targetCurrency;
}

struct DataTransportObject {
    uint256 id;
    uint256 targetAccount;
    string status;
    address userMessage;
    uint256 targetValue;
    string targetCurrency;
}

interface IWiseTransferList {
    function addTransfer(IWeb2Json.Proof calldata data) external;
    function getAllTransfers()
        external
        view
        returns (WiseTransfer[] memory);
    function deposit(uint256 targetAccount) external payable;
    function withdraw(IWeb2Json.Proof calldata transferProof) external;
}

contract WiseTransferList {
    mapping(uint256 => WiseTransfer) public transfers;
    uint256[] public transferIds;
    
    // New mappings for deposit/withdrawal functionality
    mapping(uint256 => uint256) public deposits; // targetAccount => amount
    mapping(uint256 => bool) public usedTransfers; // transferId => used
    
    // Price conversion: 1 EUR = 50 FLR
    uint256 public constant EUR_TO_FLR_RATE = 50;
    
    // Events
    event Deposit(uint256 indexed targetAccount, uint256 amount, address indexed depositor);
    event Withdrawal(uint256 indexed transferId, uint256 indexed targetAccount, uint256 amount, address indexed recipient);

    function isJsonApiProofValid(
        IWeb2Json.Proof calldata _proof
    ) private view returns (bool) {
        // Inline the check for now until we have an official contract deployed
        return ContractRegistry.getFdcVerification().verifyJsonApi(_proof);
    }

    function addTransfer(IWeb2Json.Proof calldata data) public {
        require(isJsonApiProofValid(data), "Invalid proof");

        DataTransportObject memory dto = abi.decode(
            data.data.responseBody.abiEncodedData,
            (DataTransportObject)
        );

        require(transfers[dto.id].id == 0, "Transfer already exists");

        WiseTransfer memory transfer = WiseTransfer({
            id: dto.id,
            targetAccount: dto.targetAccount,
            status: keccak256(abi.encodePacked(dto.status)) == keccak256(abi.encodePacked("outgoing_payment_sent")),
            userMessage: dto.userMessage,
            targetValue: dto.targetValue,
            targetCurrency: dto.targetCurrency
        });

        transfers[dto.id] = transfer;
        transferIds.push(dto.id);
    }

    function getAllTransfers()
        public
        view
        returns (WiseTransfer[] memory)
    {
        WiseTransfer[] memory result = new WiseTransfer[](
            transferIds.length
        );
        for (uint256 i = 0; i < transferIds.length; i++) {
            result[i] = transfers[transferIds[i]];
        }
        return result;
    }
    
    /**
     * @dev Allows users to deposit Flare tokens to the contract
     * @param targetAccount The Wise account ID of the user
     */
    function deposit(uint256 targetAccount) external payable {
        require(msg.value > 0, "Deposit amount must be greater than 0");
        require(targetAccount > 0, "Target account must be valid");
        
        deposits[targetAccount] += msg.value;
        
        emit Deposit(targetAccount, msg.value, msg.sender);
    }
    
    /**
     * @dev Converts EUR amount to FLR amount using the fixed rate
     * @param eurAmount The amount in EUR (in cents/smallest unit)
     * @return The equivalent amount in FLR
     */
    function convertEurToFlr(uint256 eurAmount) public pure returns (uint256) {
        // Assuming eurAmount is in cents (e.g., 100 = 1 EUR)
        // Convert to FLR: (eurAmount / 100) * 50 = eurAmount * 50 / 100 = eurAmount / 2
        return (eurAmount * EUR_TO_FLR_RATE) / 100;
    }
    
    /**
     * @dev Allows users to withdraw tokens using a verified Wise transfer
     * @param transferProof The FDC proof containing the Wise transfer data
     */
    function withdraw(IWeb2Json.Proof calldata transferProof) external {
        require(isJsonApiProofValid(transferProof), "Invalid proof");
        
        DataTransportObject memory dto = abi.decode(
            transferProof.data.responseBody.abiEncodedData,
            (DataTransportObject)
        );
        
        require(!usedTransfers[dto.id], "Transfer already used");
        require(dto.userMessage == msg.sender, "User message must match caller address");
        require(
            keccak256(abi.encodePacked(dto.status)) == keccak256(abi.encodePacked("outgoing_payment_sent")),
            "Transfer must be in 'outgoing_payment_sent' status"
        );
        require(
            keccak256(abi.encodePacked(dto.targetCurrency)) == keccak256(abi.encodePacked("EUR")),
            "Transfer must be in EUR currency"
        );
        
        uint256 availableAmount = deposits[dto.targetAccount];
        require(availableAmount > 0, "No funds available for this account");
        
        // Convert EUR amount to FLR
        uint256 flrAmount = convertEurToFlr(dto.targetValue);
        require(flrAmount > 0, "Invalid EUR amount");
        require(flrAmount <= availableAmount, "Insufficient funds deposited");
        
        // Mark transfer as used
        usedTransfers[dto.id] = true;
        
        // Reduce the deposit by the withdrawn amount
        deposits[dto.targetAccount] -= flrAmount;
        
        // Transfer the converted FLR amount
        (bool success, ) = msg.sender.call{value: flrAmount}("");
        require(success, "Transfer failed");
        
        emit Withdrawal(dto.id, dto.targetAccount, flrAmount, msg.sender);
    }
    
    /**
     * @dev Get the deposit amount for a specific target account
     * @param targetAccount The Wise account ID
     * @return The amount of tokens deposited for this account
     */
    function getDepositAmount(uint256 targetAccount) external view returns (uint256) {
        return deposits[targetAccount];
    }
    
    /**
     * @dev Check if a transfer has been used for withdrawal
     * @param transferId The ID of the transfer to check
     * @return True if the transfer has been used, false otherwise
     */
    function isTransferUsed(uint256 transferId) external view returns (bool) {
        return usedTransfers[transferId];
    }
}
