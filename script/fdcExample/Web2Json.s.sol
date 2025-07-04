// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {console} from "dependencies/forge-std-1.9.5/src/console.sol";
import {Script} from "dependencies/forge-std-1.9.5/src/Script.sol";
import {Surl} from "dependencies/surl-0.0.0/src/Surl.sol";
import {Strings} from "@openzeppelin-contracts/utils/Strings.sol";
import {Base as StringsBase} from "src/utils/fdcStrings/Base.sol";
import {Base} from "./Base.s.sol";
import {IWeb2Json} from "flare-periphery/src/coston2/IWeb2Json.sol";
import {WiseTransferList, IWiseTransferList} from "src/fdcExample/Web2Json.sol";

// Configuration constants
string constant attestationTypeName = "Web2Json";
string constant dirPath = "data/";

// Required environment variables:
// - WISE_TRANSFER_ID: The ID of the transfer to query
// - WISE_API_KEY: Your Wise API key

// Run with command
//      WISE_TRANSFER_ID=your-transfer-id WISE_API_KEY=your-api-key forge script script/fdcExample/Web2Json.s.sol:PrepareAttestationRequest --rpc-url $COSTON2_RPC_URL --ffi

contract PrepareAttestationRequest is Script {
    using Surl for *;

    string public httpMethod = "GET";
    string public queryParams = "{}";
    string public body = "{}";
    string public postProcessJq =
        '{id: .id, targetAccount: .targetAccount, status: .status, userMessage: .reference}';
    string public abiSignature =
        '{\\"components\\": [{\\"internalType\\": \\"uint256\\", \\"name\\": \\"id\\", \\"type\\": \\"uint256\\"},{\\"internalType\\": \\"uint256\\", \\"name\\": \\"targetAccount\\", \\"type\\": \\"uint256\\"},{\\"internalType\\": \\"string\\", \\"name\\": \\"status\\", \\"type\\": \\"string\\"},{\\"internalType\\": \\"address\\", \\"name\\": \\"userMessage\\", \\"type\\": \\"address\\"}],\\"name\\": \\"task\\",\\"type\\": \\"tuple\\"}';

    string public sourceName = "PublicWeb2";

    function prepareRequestBody(
        string memory url,
        string memory httpMethod,
        string memory headers,
        string memory queryParams,
        string memory body,
        string memory postProcessJq,
        string memory abiSignature
    ) private pure returns (string memory) {
        return
            string.concat(
                '{"url": "',
                url,
                '","httpMethod": "',
                httpMethod,
                '","headers": "',
                headers,
                '","queryParams": "',
                queryParams,
                '","body": "',
                body,
                '","postProcessJq": "',
                postProcessJq,
                '","abiSignature": "',
                abiSignature,
                '"}'
            );
    }

    function run() external {
        string memory transferId = vm.envString("WISE_TRANSFER_ID");
        string memory apiKey = vm.envString("WISE_API_KEY");
        
        console.log("Using transfer ID: %s", transferId);
        console.log("API key configured: %s characters", Strings.toString(bytes(apiKey).length));
        
        string memory apiUrl = string.concat(
            "https://api.transferwise.com/v1/transfers/",
            transferId
        );
        string memory headers = string.concat(
            '{\\"Content-Type\\":\\"application/json\\",\\"Authorization\\":\\"Bearer ',
            apiKey,
            '\\"}'
        );
        
        console.log("API URL: %s", apiUrl);
        
        // Preparing request data
        string memory attestationType = Base.toUtf8HexString(
            attestationTypeName
        );
        string memory sourceId = Base.toUtf8HexString(sourceName);
        string memory requestBody = prepareRequestBody(
            apiUrl,
            httpMethod,
            headers,
            queryParams,
            body,
            postProcessJq,
            abiSignature
        );
        (string[] memory headers, string memory body) = Base
            .prepareAttestationRequest(attestationType, sourceId, requestBody);

        // TODO change key in .env
        // string memory baseUrl = "https://testnet-verifier-fdc-test.aflabs.org/";
        string memory baseUrl = vm.envString("WEB2JSON_VERIFIER_URL_TESTNET");
        string memory url = string.concat(
            baseUrl,
            "Web2Json",
            "/prepareRequest"
        );
        console.log("url: %s", url);

        // Posting the attestation request
        (, bytes memory data) = url.post(headers, body);

        Base.AttestationResponse memory response = Base.parseAttestationRequest(
            data
        );

        // Writing abiEncodedRequest to a file
        Base.writeToFile(
            dirPath,
            string.concat(attestationTypeName, "_abiEncodedRequest"),
            StringsBase.toHexString(response.abiEncodedRequest),
            true
        );
    }
}

// Run with command
//      forge script script/fdcExample/Web2Json.s.sol:SubmitAttestationRequest --rpc-url $COSTON2_RPC_URL --etherscan-api-key $FLARE_API_KEY --broadcast --ffi

contract SubmitAttestationRequest is Script {
    using Surl for *;
    // TODO add to docs that testnets are connected to testnets, and mainnets are connected to mainnets

    function run() external {
        // Reading the abiEncodedRequest from a file
        string memory fileName = string.concat(
            attestationTypeName,
            "_abiEncodedRequest",
            ".txt"
        );
        string memory filePath = string.concat(dirPath, fileName);
        string memory requestStr = vm.readLine(filePath);
        bytes memory request = vm.parseBytes(requestStr);

        // Submitting the attestation request
        uint256 timestamp = Base.submitAttestationRequest(request);
        uint256 votingRoundId = Base.calculateRoundId(timestamp);

        // Writing to a file
        Base.writeToFile(
            dirPath,
            string.concat(attestationTypeName, "_votingRoundId"),
            Strings.toString(votingRoundId),
            true
        );
    }
}

// Run with command
//      forge script script/fdcExample/Web2Json.s.sol:RetrieveDataAndProof --private-key $PRIVATE_KEY --rpc-url $COSTON2_RPC_URL --etherscan-api-key $FLARE_API_KEY --broadcast --ffi

contract RetrieveDataAndProof is Script {
    using Surl for *;

    function run() external {
        string memory daLayerUrl = vm.envString("COSTON2_DA_LAYER_URL"); // XXX
        string memory apiKey = vm.envString("X_API_KEY");

        // We import the abiEncodedRequest and votingRoundId from the files
        string memory requestBytes = vm.readLine(
            string.concat(
                dirPath,
                attestationTypeName,
                "_abiEncodedRequest",
                ".txt"
            )
        );
        string memory votingRoundId = vm.readLine(
            string.concat(
                dirPath,
                attestationTypeName,
                "_votingRoundId",
                ".txt"
            )
        );

        console.log("votingRoundId: %s\n", votingRoundId);
        console.log("requestBytes: %s\n", requestBytes);

        // Preparing the proof request
        string[] memory headers = Base.prepareHeaders(apiKey);
        string memory body = string.concat(
            '{"votingRoundId":',
            votingRoundId,
            ',"requestBytes":"',
            requestBytes,
            '"}'
        );
        console.log("body: %s\n", body);
        console.log(
            "headers: %s",
            string.concat("{", headers[0], ", ", headers[1]),
            "}\n"
        );

        // Posting the proof request
        string memory url = string.concat(
            daLayerUrl,
            // "api/v0/fdc/get-proof-round-id-bytes"
            "api/v1/fdc/proof-by-request-round-raw"
        );
        console.log("url: %s\n", url);

        (, bytes memory data) = Base.postAttestationRequest(url, headers, body);

        // Decoding the response from JSON data
        bytes memory dataJson = Base.parseData(data);
        Base.ParsableProof memory proof = abi.decode(
            dataJson,
            (Base.ParsableProof)
        );

        IWeb2Json.Response memory proofResponse = abi.decode(
            proof.responseHex,
            (IWeb2Json.Response)
        );

        IWeb2Json.Proof memory _proof = IWeb2Json.Proof(
            proof.proofs,
            proofResponse
        );

        // Writing proof to a file
        Base.writeToFile(
            dirPath,
            string.concat(attestationTypeName, "_proof"),
            StringsBase.toHexString(abi.encode(_proof)),
            true
        );
    }
}

// forge script script/fdcExample/Web2Json.s.sol:DeployContract --private-key $PRIVATE_KEY --rpc-url $COSTON2_RPC_URL --etherscan-api-key $FLARE_API_KEY --broadcast --verify --ffi

contract DeployContract is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        WiseTransferList transferList = new WiseTransferList();
        address _address = address(transferList);

        vm.stopBroadcast();

        Base.writeToFile(
            dirPath,
            string.concat(attestationTypeName, "_address"),
            StringsBase.toHexString(abi.encodePacked(_address)),
            true
        );
    }
}

// forge script script/fdcExample/Web2Json.s.sol:InteractWithContract --private-key $PRIVATE_KEY --rpc-url $COSTON2_RPC_URL --etherscan-api-key $FLARE_API_KEY --broadcast --ffi

contract InteractWithContract is Script {
    function run() external {
        string memory addressString = vm.readLine(
            string.concat(dirPath, attestationTypeName, "_address", ".txt")
        );
        address _address = vm.parseAddress(addressString);
        string memory proofString = vm.readLine(
            string.concat(dirPath, attestationTypeName, "_proof", ".txt")
        );
        bytes memory proofBytes = vm.parseBytes(proofString);
        IWeb2Json.Proof memory proof = abi.decode(
            proofBytes,
            (IWeb2Json.Proof)
        );
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);
        IWiseTransferList transferList = IWiseTransferList(_address);
        transferList.addTransfer(proof);
        vm.stopBroadcast();
    }
}
