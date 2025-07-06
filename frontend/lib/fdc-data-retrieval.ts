import Web3 from "web3"
import { FDC_CONFIG } from "./config"
import { createWiseTransferContract } from "./wise-transfer-contract"

const IWeb2JsonVerification_ABI = [
  {
    "inputs": [
      {
        "components": [
          {
            "internalType": "bytes32[]",
            "name": "merkleProof",
            "type": "bytes32[]"
          },
          {
            "components": [
              {
                "internalType": "bytes32",
                "name": "attestationType",
                "type": "bytes32"
              },
              {
                "internalType": "bytes32",
                "name": "sourceId",
                "type": "bytes32"
              },
              {
                "internalType": "uint256",
                "name": "votingRound",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "lowestUsedTimestamp",
                "type": "uint256"
              },
              {
                "components": [
                  {
                    "internalType": "string",
                    "name": "url",
                    "type": "string"
                  },
                  {
                    "internalType": "string",
                    "name": "httpMethod",
                    "type": "string"
                  },
                  {
                    "internalType": "string",
                    "name": "headers",
                    "type": "string"
                  },
                  {
                    "internalType": "string",
                    "name": "queryParams",
                    "type": "string"
                  },
                  {
                    "internalType": "string",
                    "name": "body",
                    "type": "string"
                  },
                  {
                    "internalType": "string",
                    "name": "postProcessJq",
                    "type": "string"
                  },
                  {
                    "internalType": "string",
                    "name": "abiSignature",
                    "type": "string"
                  }
                ],
                "internalType": "struct IWeb2Json.RequestBody",
                "name": "requestBody",
                "type": "tuple"
              },
              {
                "components": [
                  {
                    "internalType": "bytes",
                    "name": "abiEncodedData",
                    "type": "bytes"
                  }
                ],
                "internalType": "struct IWeb2Json.ResponseBody",
                "name": "responseBody",
                "type": "tuple"
              }
            ],
            "internalType": "struct IWeb2Json.Response",
            "name": "data",
            "type": "tuple"
          }
        ],
        "internalType": "struct IWeb2Json.Proof",
        "name": "_proof",
        "type": "tuple"
      }
    ],
    "name": "verifyJsonApi",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
]

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

const RELAY_ABI = [
  {
    "inputs": [
      {"internalType": "uint256", "name": "epochId", "type": "uint256"},
      {"internalType": "uint256", "name": "votingRoundId", "type": "uint256"}
    ],
    "name": "isFinalized",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  }
]

const FLARE_CONTRACT_REGISTRY_ABI = [
  {
    "inputs": [{"internalType": "string", "name": "name", "type": "string"}],
    "name": "getContractAddressByName",
    "outputs": [{"internalType": "address", "name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  }
]

const FLARE_CONTRACT_REGISTRY_ADDRESS = "0xaD67FE66660Fb8dFE9d6b1b4240d8650e30F6019"

const FDC_VERIFICATION_ABI = [
  {
    "inputs": [],
    "name": "fdcProtocolId",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
]

const IWeb2JsonVerification_CONTRACT_ABI = [
  {
    "inputs": [
      {
        "components": [
          {
            "internalType": "bytes32[]",
            "name": "merkleProof",
            "type": "bytes32[]"
          },
          {
            "components": [
              {
                "internalType": "bytes32",
                "name": "attestationType",
                "type": "bytes32"
              },
              {
                "internalType": "bytes32",
                "name": "sourceId",
                "type": "bytes32"
              },
              {
                "internalType": "uint256",
                "name": "votingRound",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "lowestUsedTimestamp",
                "type": "uint256"
              },
              {
                "components": [
                  {
                    "internalType": "string",
                    "name": "url",
                    "type": "string"
                  },
                  {
                    "internalType": "string",
                    "name": "httpMethod",
                    "type": "string"
                  },
                  {
                    "internalType": "string",
                    "name": "headers",
                    "type": "string"
                  },
                  {
                    "internalType": "string",
                    "name": "queryParams",
                    "type": "string"
                  },
                  {
                    "internalType": "string",
                    "name": "body",
                    "type": "string"
                  },
                  {
                    "internalType": "string",
                    "name": "postProcessJq",
                    "type": "string"
                  },
                  {
                    "internalType": "string",
                    "name": "abiSignature",
                    "type": "string"
                  }
                ],
                "internalType": "struct IWeb2Json.RequestBody",
                "name": "requestBody",
                "type": "tuple"
              },
              {
                "components": [
                  {
                    "internalType": "bytes",
                    "name": "abiEncodedData",
                    "type": "bytes"
                  }
                ],
                "internalType": "struct IWeb2Json.ResponseBody",
                "name": "responseBody",
                "type": "tuple"
              }
            ],
            "internalType": "struct IWeb2Json.Response",
            "name": "data",
            "type": "tuple"
          }
        ],
        "internalType": "struct IWeb2Json.Proof",
        "name": "_proof",
        "type": "tuple"
      }
    ],
    "name": "verifyJsonApi",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
]

export class FDCDataRetrieval {
  private web3: Web3

  constructor(web3: Web3) {
    this.web3 = web3
  }

  private async getRelay(): Promise<any> {
    const contractRegistry = new this.web3.eth.Contract(
      FLARE_CONTRACT_REGISTRY_ABI,
      FLARE_CONTRACT_REGISTRY_ADDRESS
    )
    
    const address = await contractRegistry.methods.getContractAddressByName("Relay").call() as string
    
    if (!address || address === '0x0000000000000000000000000000000000000000') {
      throw new Error("Relay contract not found in registry")
    }
    
    return new this.web3.eth.Contract(RELAY_ABI, address)
  }

  private async getFdcVerification(): Promise<any> {
    const contractRegistry = new this.web3.eth.Contract(
      FLARE_CONTRACT_REGISTRY_ABI,
      FLARE_CONTRACT_REGISTRY_ADDRESS
    )
    
    const address = await contractRegistry.methods.getContractAddressByName("FdcVerification").call() as string
    
    if (!address || address === '0x0000000000000000000000000000000000000000') {
      throw new Error("FdcVerification contract not found in registry")
    }
    
    return new this.web3.eth.Contract(FDC_VERIFICATION_ABI, address)
  }

  private async postRequestToDALayer(url: string, request: any): Promise<any> {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    })
    
    if (!response.ok) {
      // Get the response body for better error information
      let errorMessage = `DA Layer request failed: ${response.status}`;
      try {
        const errorBody = await response.text();
        if (errorBody) {
          errorMessage += ` - ${errorBody}`;
        }
      } catch (e) {
        // Ignore errors when trying to read the response body
      }
      throw new Error(errorMessage);
    }
    
    return await response.json()
  }

  private async postRequestToDALayerWithRetry(url: string, request: any, maxRetries: number = 3): Promise<any> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        console.log(`DA Layer request attempt ${attempt + 1}/${maxRetries}`);
        return await this.postRequestToDALayer(url, request);
      } catch (error) {
        lastError = error as Error;
        console.warn(`DA Layer request attempt ${attempt + 1} failed:`, error);
        
        // If it's the last attempt, don't wait
        if (attempt < maxRetries - 1) {
          // Wait before retrying (exponential backoff)
          const waitTime = Math.min(1000 * Math.pow(2, attempt), 5000);
          console.log(`Waiting ${waitTime}ms before retry...`);
          await sleep(waitTime);
        }
      }
    }
    
    throw lastError || new Error("DA Layer request failed after all retries");
  }

  async retrieveDataAndProof(abiEncodedRequest: string, roundId: number): Promise<any> {
    const url = `${FDC_CONFIG.daLayerUrl}api/v1/fdc/proof-by-request-round-raw`
    
    console.log("=== Retrieving data and proof ===")
    console.log("Waiting for the round to finalize...")
    
    const relay = await this.getRelay()
    const fdcVerification = await this.getFdcVerification()
    
    // Get the protocol ID like in hardhat - this is key!
    const protocolId = await fdcVerification.methods.fdcProtocolId().call()
    console.log("Protocol ID:", protocolId)
    
    while (!(await relay.methods.isFinalized(protocolId, roundId).call())) {
      await sleep(30000)  // 30 second intervals like hardhat
    }
    console.log("Round finalized!")
    
    const request = {
      votingRoundId: roundId,
      requestBytes: abiEncodedRequest,
    }
    
    console.log("Prepared request:", request)
    
    await sleep(10000)  // 10 second delay like hardhat
    
    let proof = await this.postRequestToDALayerWithRetry(url, request, 1)
    console.log("Waiting for the DA Layer to generate the proof...")
    
    while (proof.response_hex === undefined) {
      await sleep(10000)  // 10 second intervals like hardhat
      proof = await this.postRequestToDALayerWithRetry(url, request, 1)
    }
    
    console.log("Proof generated!")
    console.log("Raw proof from DA Layer:", proof)
    console.log("Proof keys:", Object.keys(proof))
    console.log("Proof structure:")
    console.log("  response_hex:", proof.response_hex)
    console.log("  attestation_type:", proof.attestation_type)
    console.log("  proof:", proof.proof)
    console.log("  proof type:", typeof proof.proof)
    console.log("  proof length:", proof.proof?.length)
    
    return proof
  }

  async interactWithContract(contractAddress: string, proof: any, account: string): Promise<any> {
    console.log("=== Interacting with contract ===")
    console.log("Contract address:", contractAddress)
    console.log("Proof from DA Layer:", proof)

    // A piece of black magic that allows us to read the response type from an artifact
    // This mimics the hardhat pattern: const IWeb2JsonVerification = await artifacts.require("IWeb2JsonVerification");
    // const responseType = IWeb2JsonVerification._json.abi[0].inputs[0].components[1];
    const responseType = IWeb2JsonVerification_CONTRACT_ABI[0].inputs[0].components[1]
    console.log("Response type:", responseType)

    const decodedResponse = this.web3.eth.abi.decodeParameter(
      responseType,
      proof.response_hex
    ) as any // Type assertion needed for Web3 decoded objects
    console.log("Decoded proof:", decodedResponse)

    const proofObject = {
      merkleProof: proof.proof,
      data: decodedResponse,
    }
    
    console.log("Final proof object for contract:", proofObject)

    console.log("Calling addTransfer on real contract...")
    
    // Create the contract instance
    const contractInstance = createWiseTransferContract(this.web3, contractAddress, account)

    const transaction = await contractInstance.addTransfer(proofObject)

    console.log("Transaction hash:", transaction.transactionHash)
    console.log("Transaction mined in block:", transaction.blockNumber)
    
    // Get all transfers to verify
    const allTransfers = await contractInstance.getAllTransfers()
    console.log("All transfers:", allTransfers)

    return {
      transactionHash: transaction.transactionHash,
      blockNumber: transaction.blockNumber,
      transfers: allTransfers
    }
  }
}

export async function retrieveWiseAttestationData(
  abiEncodedRequest: string,
  roundId: number,
  web3: Web3
): Promise<any> {
  const retrieval = new FDCDataRetrieval(web3)
  return await retrieval.retrieveDataAndProof(abiEncodedRequest, roundId)
}

export async function interactWithWiseContract(
  contractAddress: string,
  proof: any,
  web3: Web3,
  account: string
): Promise<any> {
  const retrieval = new FDCDataRetrieval(web3)
  return await retrieval.interactWithContract(contractAddress, proof, account)
} 
