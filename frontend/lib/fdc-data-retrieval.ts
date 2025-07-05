import Web3 from "web3"
import { FDC_CONFIG } from "./config"

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

  private async postRequestToDALayer(url: string, request: any): Promise<any> {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    })
    
    if (!response.ok) {
      throw new Error(`DA Layer request failed: ${response.status} ${response.statusText}`)
    }
    
    return await response.json()
  }

  async retrieveDataAndProof(abiEncodedRequest: string, roundId: number): Promise<any> {
    const url = `${FDC_CONFIG.daLayerUrl}api/v1/fdc/proof-by-request-round-raw`
    
    console.log("=== Retrieving data and proof ===")
    
    const relay = await this.getRelay()
    
    console.log("Checking round finalization...")
    let attempts = 0
    const maxAttempts = 18 // Maximum ~3 minutes
    
    while (attempts < maxAttempts) {
      const isFinalized = await relay.methods.isFinalized(200, roundId).call() as boolean
      
      if (isFinalized) {
        console.log("✅ Round finalized!")
        break
      }
      
      if (attempts === maxAttempts - 1) {
        throw new Error(`Round ${roundId} not finalized after ${maxAttempts * 10} seconds`)
      }
      
      console.log(`Round ${roundId} not finalized yet, waiting... (${attempts + 1}/${maxAttempts})`)
      await sleep(10000)
      attempts++
    }
    
    console.log("Requesting proof from DA Layer...")
    const request = {
      votingRoundId: roundId,
      requestBytes: abiEncodedRequest,
    }
    
    let proof = await this.postRequestToDALayer(url, request)
    
    let proofAttempts = 0
    const maxProofAttempts = 36
    
    while (!proof.response_hex && proofAttempts < maxProofAttempts) {
      console.log(`Proof not ready, waiting... (${proofAttempts + 1}/${maxProofAttempts})`)
      await sleep(5000)
      proof = await this.postRequestToDALayer(url, request)
      proofAttempts++
    }
    
    if (!proof.response_hex) {
      throw new Error("Proof not generated within expected time (3 minutes)")
    }
    
    console.log("✅ Proof retrieved successfully!")
    return proof
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
