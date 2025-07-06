import Web3 from "web3"

// WiseTransferList contract ABI
export const WISE_TRANSFER_LIST_ABI = [
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
        "name": "data",
        "type": "tuple"
      }
    ],
    "name": "addTransfer",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getAllTransfers",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "id",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "targetAccount",
            "type": "uint256"
          },
          {
            "internalType": "bool",
            "name": "status",
            "type": "bool"
          },
          {
            "internalType": "address",
            "name": "userMessage",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "targetValue",
            "type": "uint256"
          },
          {
            "internalType": "string",
            "name": "targetCurrency",
            "type": "string"
          }
        ],
        "internalType": "struct WiseTransfer[]",
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "transferIds",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "transfers",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "targetAccount",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "status",
        "type": "bool"
      },
      {
        "internalType": "address",
        "name": "userMessage",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "targetValue",
        "type": "uint256"
      },
      {
        "internalType": "string",
        "name": "targetCurrency",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
]

export interface WiseTransfer {
  id: string
  targetAccount: string
  status: boolean
  userMessage: string
  targetValue: string
  targetCurrency: string
}

export class WiseTransferContract {
  private web3: Web3
  private contract: any
  private account: string

  constructor(web3: Web3, contractAddress: string, account: string) {
    this.web3 = web3
    this.account = account
    this.contract = new web3.eth.Contract(WISE_TRANSFER_LIST_ABI, contractAddress)
  }

  async addTransfer(data: any): Promise<any> {
    console.log("Adding transfer with data:", data)
    
    console.log("Data structure:")
    console.log("  merkleProof:", data.merkleProof)
    console.log("  data:", data.data)
    console.log("  data.attestationType:", data.data.attestationType)
    console.log("  data.sourceId:", data.data.sourceId)
    console.log("  data.votingRound:", data.data.votingRound)
    console.log("  data.lowestUsedTimestamp:", data.data.lowestUsedTimestamp)
    console.log("  data.requestBody:", data.data.requestBody)
    console.log("  data.responseBody:", data.data.responseBody)
    console.log("  data.responseBody.abiEncodedData:", data.data.responseBody.abiEncodedData)
    
    // Try to decode the response data to understand what's in it
    try {
      const dataTransportObjectABI = [
        {
          "components": [
            {"internalType": "uint256", "name": "id", "type": "uint256"},
            {"internalType": "uint256", "name": "targetAccount", "type": "uint256"},
            {"internalType": "string", "name": "status", "type": "string"},
            {"internalType": "address", "name": "userMessage", "type": "address"},
            {"internalType": "uint256", "name": "targetValue", "type": "uint256"},
            {"internalType": "string", "name": "targetCurrency", "type": "string"}
          ],
          "internalType": "struct DataTransportObject",
          "name": "dto",
          "type": "tuple"
        }
      ]
      
      const decodedData = this.web3.eth.abi.decodeParameter(
        dataTransportObjectABI[0],
        data.data.responseBody.abiEncodedData
      ) as any
      
      console.log("Decoded transfer data:", decodedData)
      
      // Check if this transfer already exists
      const existingTransfer = await this.contract.methods.transfers(decodedData.id).call()
      console.log("Existing transfer check for ID", decodedData.id, ":", existingTransfer)
      
      if (existingTransfer.id !== 0n) {
        throw new Error(`Transfer with ID ${decodedData.id} already exists`)
      }

      console.log("Creating transaction...")
      
      console.log("Estimating gas for transaction...")
      const gasEstimate = await this.contract.methods.addTransfer(data).estimateGas({
        from: this.account,
        gas: "3000000"
      })
      
      console.log("Gas estimate:", gasEstimate)
      
      const transaction = await this.contract.methods.addTransfer(data).send({
        from: this.account,
        gas: Math.floor(Number(gasEstimate) * 1.2).toString() // Add 20% buffer
      })
      
      console.log("Transaction successful:", transaction.transactionHash)
      return transaction
      
    } catch (error: any) {
      console.error("Error in addTransfer:", error)
      throw error
    }
  }

  async getAllTransfers(): Promise<WiseTransfer[]> {
    const transfers = await this.contract.methods.getAllTransfers().call()
    return transfers.map((transfer: any) => ({
      id: transfer.id.toString(),
      targetAccount: transfer.targetAccount.toString(),
      status: transfer.status,
      userMessage: transfer.userMessage,
      targetValue: transfer.targetValue.toString(),
      targetCurrency: transfer.targetCurrency
    }))
  }

  async getTransferById(id: string): Promise<WiseTransfer | null> {
    try {
      const transfer = await this.contract.methods.transfers(id).call()
      
      // Check if transfer exists (id != 0)
      if (transfer.id === '0') {
        return null
      }
      
      return {
        id: transfer.id.toString(),
        targetAccount: transfer.targetAccount.toString(),
        status: transfer.status,
        userMessage: transfer.userMessage,
        targetValue: transfer.targetValue.toString(),
        targetCurrency: transfer.targetCurrency
      }
    } catch (error) {
      console.error("Error getting transfer:", error)
      return null
    }
  }
}

export function createWiseTransferContract(
  web3: Web3,
  contractAddress: string,
  account: string
): WiseTransferContract {
  return new WiseTransferContract(web3, contractAddress, account)
} 
