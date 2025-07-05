import Web3 from "web3"

const FLARE_CONTRACT_REGISTRY_ADDRESS = "0xaD67FE66660Fb8dFE9d6b1b4240d8650e30F6019"

const FLARE_CONTRACT_REGISTRY_ABI = [
  {
    "inputs": [{"internalType": "string", "name": "name", "type": "string"}],
    "name": "getContractAddressByName",
    "outputs": [{"internalType": "address", "name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  }
]

const FDC_HUB_ABI = [
  {
    "inputs": [{"internalType": "bytes", "name": "data", "type": "bytes"}],
    "name": "requestAttestation",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "payable",
    "type": "function"
  }
]

const FDC_REQUEST_FEE_CONFIGURATIONS_ABI = [
  {
    "inputs": [{"internalType": "bytes", "name": "data", "type": "bytes"}],
    "name": "getRequestFee",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
]

const FLARE_SYSTEMS_MANAGER_ABI = [
  {
    "inputs": [],
    "name": "firstVotingRoundStartTs",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "votingEpochDurationSeconds",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getCurrentVotingEpochId",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
]

export class FDCContractHelper {
  private web3: Web3
  private account: string
  private contractRegistry: any

  constructor(web3: Web3, account: string) {
    this.web3 = web3
    this.account = account
    this.contractRegistry = new this.web3.eth.Contract(
      FLARE_CONTRACT_REGISTRY_ABI,
      FLARE_CONTRACT_REGISTRY_ADDRESS
    )
  }

  private async getContractAddress(contractName: string): Promise<string> {
    try {
      const address = await this.contractRegistry.methods.getContractAddressByName(contractName).call() as string
      if (!address || address === '0x0000000000000000000000000000000000000000') {
        throw new Error(`Contract ${contractName} not found in registry`)
      }
      return address
    } catch (error) {
      console.error(`Error getting contract address for ${contractName}:`, error)
      throw new Error(`Failed to get contract address for ${contractName}: ${error}`)
    }
  }

  async getFdcHub(): Promise<any> {
    try {
      const fdcHubAddress = await this.getContractAddress("FdcHub")
      console.log("FDC Hub address:", fdcHubAddress)
      
      return new this.web3.eth.Contract(FDC_HUB_ABI, fdcHubAddress)
    } catch (error) {
      console.error("Error getting FDC Hub:", error)
      throw new Error(`Failed to get FDC Hub contract: ${error}`)
    }
  }

  async getFdcRequestFeeConfigurations(): Promise<any> {
    try {
      const feeConfigAddress = await this.getContractAddress("FdcRequestFeeConfigurations")
      console.log("FDC Request Fee Configurations address:", feeConfigAddress)
      
      return new this.web3.eth.Contract(FDC_REQUEST_FEE_CONFIGURATIONS_ABI, feeConfigAddress)
    } catch (error) {
      console.error("Error getting FDC Request Fee Configurations:", error)
      throw new Error(`Failed to get FDC Request Fee Configurations contract: ${error}`)
    }
  }

  async getFlareSystemsManager(): Promise<any> {
    try {
      const flareSystemsManagerAddress = await this.getContractAddress("FlareSystemsManager")
      console.log("Flare Systems Manager address:", flareSystemsManagerAddress)
      
      return new this.web3.eth.Contract(FLARE_SYSTEMS_MANAGER_ABI, flareSystemsManagerAddress)
    } catch (error) {
      console.error("Error getting Flare Systems Manager:", error)
      throw new Error(`Failed to get Flare Systems Manager contract: ${error}`)
    }
  }

  async getFdcRequestFee(abiEncodedRequest: string): Promise<string> {
    try {
      console.log("Getting FDC request fee for:", abiEncodedRequest.substring(0, 50) + "...")
      
      const feeConfig = await this.getFdcRequestFeeConfigurations()
      const fee = await feeConfig.methods.getRequestFee(abiEncodedRequest).call()
      
      console.log("Request fee:", this.web3.utils.fromWei(fee, 'ether'), "FLR")
      return fee
    } catch (error) {
      console.error("Error getting request fee:", error)
      throw new Error(`Failed to get request fee: ${error}`)
    }
  }

  async submitAttestationRequest(abiEncodedRequest: string) {
    try {
      console.log("=== Submitting attestation request ===")
      
      const fdcHub = await this.getFdcHub()
      
      const requestFee = await this.getFdcRequestFee(abiEncodedRequest)
      
      const balance = await this.web3.eth.getBalance(this.account)
      
      console.log("Wallet balance:", this.web3.utils.fromWei(balance, 'ether'), "FLR")
      console.log("Required fee:", this.web3.utils.fromWei(requestFee, 'ether'), "FLR")
      
      if (BigInt(balance) < BigInt(requestFee)) {
        throw new Error(`Insufficient balance. Required: ${this.web3.utils.fromWei(requestFee, 'ether')} FLR, Available: ${this.web3.utils.fromWei(balance, 'ether')} FLR`)
      }
      
      console.log("Submitting request with fee:", this.web3.utils.fromWei(requestFee, 'ether'), "FLR")
      
      const txData = fdcHub.methods.requestAttestation(abiEncodedRequest)
      const gas = await txData.estimateGas({ from: this.account, value: requestFee })
      
      const transaction = await txData.send({
        from: this.account,
        value: requestFee,
        gas: gas.toString()
      })
      
      console.log("Transaction submitted:", transaction.transactionHash)
      console.log("Transaction mined in block:", transaction.blockNumber)
      
      const roundId = await this.calculateRoundId(transaction)
      
      console.log(`Check round progress at: https://coston2-systems-explorer.flare.rocks/voting-epoch/${roundId}?tab=fdc`)
      
      return {
        txHash: transaction.transactionHash,
        blockNumber: transaction.blockNumber,
        roundId: roundId,
        fee: requestFee
      }
    } catch (error) {
      console.error("Error submitting attestation request:", error)
      throw new Error(`Failed to submit attestation request: ${error}`)
    }
  }

  async calculateRoundId(receipt: any): Promise<number> {
    try {
      console.log("=== Calculating round ID ===")
      
      const block = await this.web3.eth.getBlock(receipt.blockNumber)
      if (!block) {
        throw new Error("Could not get block information")
      }
      
      const blockTimestamp = BigInt(block.timestamp)
      
      const flareSystemsManager = await this.getFlareSystemsManager()
      
      const firstVotingRoundStartTs = await flareSystemsManager.methods.firstVotingRoundStartTs().call()
      const votingEpochDurationSeconds = await flareSystemsManager.methods.votingEpochDurationSeconds().call()
      
      console.log("Block timestamp:", blockTimestamp)
      console.log("First voting round start ts:", firstVotingRoundStartTs)
      console.log("Voting epoch duration seconds:", votingEpochDurationSeconds)
      
      const roundId = Number(
        (blockTimestamp - BigInt(firstVotingRoundStartTs)) / BigInt(votingEpochDurationSeconds)
      )
      
      console.log("Calculated round id:", roundId)
      
      const currentVotingEpochId = await flareSystemsManager.methods.getCurrentVotingEpochId().call()
      console.log("Current voting epoch ID:", Number(currentVotingEpochId))
      
      return roundId
    } catch (error) {
      console.error("Error calculating round ID:", error)
      throw new Error(`Failed to calculate round ID: ${error}`)
    }
  }
}

export async function submitWiseAttestationRequest(
  abiEncodedRequest: string,
  web3: Web3,
  account: string
) {
  try {
    const helper = new FDCContractHelper(web3, account)
    return await helper.submitAttestationRequest(abiEncodedRequest)
  } catch (error) {
    console.error("Error in submitWiseAttestationRequest:", error)
    throw error
  }
} 