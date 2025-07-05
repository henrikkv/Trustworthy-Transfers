// FDC Contract interactions using Flare periphery package
// Properly integrated with @flarenetwork/flare-periphery-contracts

import { ethers } from "ethers"

// Flare Contract Registry is deployed at the same address on all networks
const FLARE_CONTRACT_REGISTRY_ADDRESS = "0xaD67FE66660Fb8dFE9d6b1b4240d8650e30F6019"

// Contract name hashes (keccak256(abi.encode(contractName)))
const CONTRACT_NAMES = {
  FdcHub: ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(["string"], ["FdcHub"])),
  FdcRequestFeeConfigurations: ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(["string"], ["FdcRequestFeeConfigurations"])),
  FlareSystemsManager: ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(["string"], ["FlareSystemsManager"])),
}

// Minimal ABIs for the contracts we need
const FLARE_CONTRACT_REGISTRY_ABI = [
  "function getContractAddressByHash(bytes32 nameHash) view returns (address)"
]

const FDC_HUB_ABI = [
  "function requestAttestation(bytes calldata data) payable returns (bool)"
]

const FDC_REQUEST_FEE_CONFIGURATIONS_ABI = [
  "function getRequestFee(bytes calldata data) view returns (uint256)"
]

const FLARE_SYSTEMS_MANAGER_ABI = [
  "function firstVotingRoundStartTs() view returns (uint256)",
  "function votingEpochDurationSeconds() view returns (uint256)",
  "function getCurrentVotingEpochId() view returns (uint256)"
]

// Helper class to interact with FDC contracts using the periphery package
export class FDCContractHelper {
  private provider: ethers.BrowserProvider
  private signer: ethers.JsonRpcSigner
  private contractRegistry: ethers.Contract

  constructor(provider: ethers.BrowserProvider, signer: ethers.JsonRpcSigner) {
    this.provider = provider
    this.signer = signer
    this.contractRegistry = new ethers.Contract(
      FLARE_CONTRACT_REGISTRY_ADDRESS,
      FLARE_CONTRACT_REGISTRY_ABI,
      this.signer
    )
  }

  // Get contract address using the FlareContractRegistry
  private async getContractAddress(nameHash: string): Promise<string> {
    try {
      const address = await this.contractRegistry.getContractAddressByHash(nameHash)
      if (address === ethers.ZeroAddress) {
        throw new Error("Contract not found in registry")
      }
      return address
    } catch (error) {
      console.error("Error getting contract address:", error)
      throw new Error(`Failed to get contract address: ${error}`)
    }
  }

  // Get FDC Hub contract
  async getFdcHub() {
    try {
      const fdcHubAddress = await this.getContractAddress(CONTRACT_NAMES.FdcHub)
      console.log("FDC Hub address:", fdcHubAddress)
      
      return new ethers.Contract(
        fdcHubAddress,
        FDC_HUB_ABI,
        this.signer
      )
    } catch (error) {
      console.error("Error getting FDC Hub:", error)
      throw new Error(`Failed to get FDC Hub contract: ${error}`)
    }
  }

  // Get FDC Request Fee Configurations contract
  async getFdcRequestFeeConfigurations() {
    try {
      const feeConfigAddress = await this.getContractAddress(CONTRACT_NAMES.FdcRequestFeeConfigurations)
      console.log("FDC Request Fee Configurations address:", feeConfigAddress)
      
      return new ethers.Contract(
        feeConfigAddress,
        FDC_REQUEST_FEE_CONFIGURATIONS_ABI,
        this.signer
      )
    } catch (error) {
      console.error("Error getting FDC Request Fee Configurations:", error)
      throw new Error(`Failed to get FDC Request Fee Configurations contract: ${error}`)
    }
  }

  // Get Flare Systems Manager contract
  async getFlareSystemsManager() {
    try {
      const flareSystemsManagerAddress = await this.getContractAddress(CONTRACT_NAMES.FlareSystemsManager)
      console.log("Flare Systems Manager address:", flareSystemsManagerAddress)
      
      return new ethers.Contract(
        flareSystemsManagerAddress,
        FLARE_SYSTEMS_MANAGER_ABI,
        this.signer
      )
    } catch (error) {
      console.error("Error getting Flare Systems Manager:", error)
      throw new Error(`Failed to get Flare Systems Manager contract: ${error}`)
    }
  }

  // Calculate request fee
  async getFdcRequestFee(abiEncodedRequest: string): Promise<bigint> {
    try {
      console.log("Getting FDC request fee for:", abiEncodedRequest.substring(0, 50) + "...")
      
      const feeConfig = await this.getFdcRequestFeeConfigurations()
      const fee = await feeConfig.getRequestFee(abiEncodedRequest)
      
      console.log("Request fee:", ethers.formatEther(fee), "FLR")
      return fee
    } catch (error) {
      console.error("Error getting request fee:", error)
      throw new Error(`Failed to get request fee: ${error}`)
    }
  }

  // Submit attestation request
  async submitAttestationRequest(abiEncodedRequest: string) {
    try {
      console.log("=== Submitting attestation request ===")
      
      // Get FDC Hub contract
      const fdcHub = await this.getFdcHub()
      
      // Calculate required fee
      const requestFee = await this.getFdcRequestFee(abiEncodedRequest)
      
      // Check wallet balance
      const signerAddress = await this.signer.getAddress()
      const balance = await this.provider.getBalance(signerAddress)
      
      console.log("Wallet balance:", ethers.formatEther(balance), "FLR")
      console.log("Required fee:", ethers.formatEther(requestFee), "FLR")
      
      if (balance < requestFee) {
        throw new Error(`Insufficient balance. Required: ${ethers.formatEther(requestFee)} FLR, Available: ${ethers.formatEther(balance)} FLR`)
      }
      
      console.log("Submitting request with fee:", ethers.formatEther(requestFee), "FLR")
      
      // Submit the attestation request
      const transaction = await fdcHub.requestAttestation(abiEncodedRequest, {
        value: requestFee,
      })
      
      console.log("Transaction submitted:", transaction.hash)
      
      // Wait for transaction to be mined
      const receipt = await transaction.wait()
      console.log("Transaction mined in block:", receipt.blockNumber)
      
      // Calculate voting round ID
      const roundId = await this.calculateRoundId(receipt)
      
      console.log(`Check round progress at: https://coston2-systems-explorer.flare.rocks/voting-epoch/${roundId}?tab=fdc`)
      
      return {
        txHash: transaction.hash,
        blockNumber: receipt.blockNumber,
        roundId: roundId,
        fee: requestFee
      }
    } catch (error) {
      console.error("Error submitting attestation request:", error)
      throw new Error(`Failed to submit attestation request: ${error}`)
    }
  }

  // Calculate voting round ID from transaction receipt
  async calculateRoundId(receipt: ethers.TransactionReceipt): Promise<number> {
    try {
      console.log("=== Calculating round ID ===")
      
      // Get block timestamp
      const block = await this.provider.getBlock(receipt.blockNumber)
      if (!block) {
        throw new Error("Could not get block information")
      }
      
      const blockTimestamp = BigInt(block.timestamp)
      
      // Get Flare Systems Manager
      const flareSystemsManager = await this.getFlareSystemsManager()
      
      // Get voting epoch parameters
      const firstVotingRoundStartTs = await flareSystemsManager.firstVotingRoundStartTs()
      const votingEpochDurationSeconds = await flareSystemsManager.votingEpochDurationSeconds()
      
      console.log("Block timestamp:", blockTimestamp)
      console.log("First voting round start ts:", firstVotingRoundStartTs)
      console.log("Voting epoch duration seconds:", votingEpochDurationSeconds)
      
      // Calculate round ID
      const roundId = Number(
        (blockTimestamp - firstVotingRoundStartTs) / votingEpochDurationSeconds
      )
      
      console.log("Calculated round id:", roundId)
      
      // Get current voting epoch ID for comparison
      const currentVotingEpochId = await flareSystemsManager.getCurrentVotingEpochId()
      console.log("Current voting epoch ID:", Number(currentVotingEpochId))
      
      return roundId
    } catch (error) {
      console.error("Error calculating round ID:", error)
      throw new Error(`Failed to calculate round ID: ${error}`)
    }
  }
}

// Main function to submit attestation request
export async function submitWiseAttestationRequest(
  abiEncodedRequest: string,
  provider: ethers.BrowserProvider,
  signer: ethers.JsonRpcSigner
) {
  try {
    const helper = new FDCContractHelper(provider, signer)
    return await helper.submitAttestationRequest(abiEncodedRequest)
  } catch (error) {
    console.error("Error in submitWiseAttestationRequest:", error)
    throw error
  }
} 