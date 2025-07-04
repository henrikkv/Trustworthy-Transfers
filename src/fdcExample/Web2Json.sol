// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {console} from "dependencies/forge-std-1.9.5/src/console.sol";
import {Strings} from "@openzeppelin-contracts/utils/Strings.sol";
import {ContractRegistry} from "flare-periphery/src/coston2/ContractRegistry.sol";
import {IFdcVerification} from "flare-periphery/src/coston2/IFdcVerification.sol";
import {FdcStrings} from "src/utils/fdcStrings/Payment.sol";
import {IWeb2Json} from "flare-periphery/src/coston2/IWeb2Json.sol";

struct WiseTransfer {
    uint256 id;
    uint256 targetAccount;
    bool status;
    address userMessage;
}

struct DataTransportObject {
    uint256 id;
    uint256 targetAccount;
    string status;
    address userMessage;
}

interface IWiseTransferList {
    function addTransfer(IWeb2Json.Proof calldata data) external;
    function getAllTransfers()
        external
        view
        returns (WiseTransfer[] memory);
}

contract WiseTransferList {
    mapping(uint256 => WiseTransfer) public transfers;
    uint256[] public transferIds;

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
            userMessage: dto.userMessage
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
}
