"use client"

import { useState } from "react"
import Web3 from "web3"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Wallet, CheckCircle, AlertCircle } from "lucide-react"
import { prepareWiseAttestationRequest } from "@/lib/fdc-utils"
import { submitWiseAttestationRequest } from "@/lib/fdc-contracts"
import { retrieveWiseAttestationData, interactWithWiseContract } from "@/lib/fdc-data-retrieval"
import { FDC_CONFIG, validateFDCConfig } from "@/lib/config"

interface TransactionRequest {
  apiKey: string
  transferId: string
}

interface TransactionResult {
  success: boolean
  txHash?: string
  error?: string
  data?: any
  step?: 'prepared' | 'submitted' | 'retrieving' | 'completed' | 'interacted'
}

export default function TrustworthyTransfersApp() {
  const [wallet, setWallet] = useState<{
    address: string
    web3: Web3
  } | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [apiKey, setApiKey] = useState("1fd8008a-fa07-4c6f-be8a-16b54a2e7482")
  const [transferId, setTransferId] = useState("1614003520")
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState<TransactionResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [currentStep, setCurrentStep] = useState<'prepare' | 'submit' | 'retrieve' | 'interact' | 'complete'>('prepare')
  const [abiEncodedRequest, setAbiEncodedRequest] = useState<string | null>(null)
  const [roundId, setRoundId] = useState<number | null>(null)
  const [proofData, setProofData] = useState<any>(null)

  const { isValid: isFDCConfigValid, missingVars } = validateFDCConfig()

  const connectWallet = async () => {
    if (!window.ethereum) {
      setError("MetaMask or another Ethereum wallet is required")
      return
    }

    setIsConnecting(true)
    setError(null)

    try {
      const web3 = new Web3(window.ethereum)
      await window.ethereum.request({ method: 'eth_requestAccounts' })

      const accounts = await web3.eth.getAccounts()
      const address = accounts[0]
      const chainId = await web3.eth.getChainId()
      
      console.log("Wallet connected successfully:", address)
      console.log("Connected to network:", chainId)
      
      setWallet({ address, web3 })
    } catch (err: any) {
      console.error("Wallet connection error:", err)
      setError(err.message || "Failed to connect wallet")
    } finally {
      setIsConnecting(false)
    }
  }

  const disconnectWallet = () => {
    setWallet(null)
    setResult(null)
    setError(null)
    setCurrentStep('prepare')
    setAbiEncodedRequest(null)
    setRoundId(null)
    setProofData(null)
  }

  const submitTransaction = async () => {
    if (!wallet) return

    setIsProcessing(true)
    setResult(null)
    setError(null)

    try {
      const chainId = await wallet.web3.eth.getChainId()
      
      // Check if we're on Coston2 testnet
      if (Number(chainId) !== 114) {
        throw new Error(`Please switch to Coston2 testnet (Chain ID: 114). Current network: ${chainId}`)
      }

      console.log("Network info:", { chainId })

      if (currentStep === 'prepare') {
        // Step 1: Prepare attestation request
        if (!apiKey || !transferId) {
          throw new Error("API key and transfer ID are required")
        }

        console.log("=== Step 1: Preparing attestation request ===")
        console.log("Starting FDC attestation request with:", { transferId })
        
        const attestationData = await prepareWiseAttestationRequest(
          transferId,
          apiKey,
          FDC_CONFIG.verifierUrl,
          FDC_CONFIG.verifierApiKey
        )

        console.log("Attestation request prepared successfully:", attestationData)
        
        if (!attestationData || !attestationData.abiEncodedRequest) {
          throw new Error("Failed to get abiEncodedRequest from verifier")
        }

        setAbiEncodedRequest(attestationData.abiEncodedRequest)
        setCurrentStep('submit')
        
        setResult({
          success: true,
          step: 'prepared',
          data: {
            transferId,
            timestamp: new Date().toISOString(),
            abiEncodedRequest: attestationData.abiEncodedRequest,
            stepDescription: "Request prepared successfully"
          }
        })

        console.log("=== Ready for Step 2: Submit attestation request ===")
        
      } else if (currentStep === 'submit') {
        // Step 2: Submit attestation request
        if (!abiEncodedRequest) {
          throw new Error("No prepared attestation request found")
        }

        console.log("=== Step 2: Submitting attestation request ===")
        
        const submissionResult = await submitWiseAttestationRequest(
          abiEncodedRequest,
          wallet.web3,
          wallet.address
        )

        console.log("Attestation request submitted successfully:", submissionResult)
        
        setRoundId(submissionResult.roundId)
        setCurrentStep('retrieve')
        
        setResult({
          success: true,
          step: 'submitted',
          txHash: submissionResult.txHash,
          data: {
            transferId,
            timestamp: new Date().toISOString(),
            abiEncodedRequest,
            txHash: submissionResult.txHash,
            blockNumber: submissionResult.blockNumber,
            roundId: submissionResult.roundId,
            fee: submissionResult.fee,
            stepDescription: "Request submitted to FDC network"
          }
        })

        console.log("=== Ready for Step 3: Retrieve data and proof ===")
        
      } else if (currentStep === 'retrieve') {
        // Step 3: Retrieve data and proof
        if (!abiEncodedRequest || !roundId) {
          throw new Error("Missing required data for retrieval")
        }

        console.log("=== Step 3: Retrieving data and proof ===")
        
        const proofData = await retrieveWiseAttestationData(
          abiEncodedRequest,
          roundId,
          wallet.web3
        )

        console.log("Data and proof retrieved successfully:", proofData)
        
        setProofData(proofData)
        setCurrentStep('interact')
        
        setResult({
          success: true,
          step: 'completed',
          data: {
            transferId,
            timestamp: new Date().toISOString(),
            abiEncodedRequest,
            roundId,
            proof: proofData,
            stepDescription: "Data and proof retrieved successfully"
          }
        })

        console.log("=== Ready for Step 4: Interact with contract ===")
        
      } else if (currentStep === 'interact') {
        // Step 4: Interact with contract using the proof
        if (!proofData) {
          throw new Error("No proof data available for contract interaction")
        }

        // Check if contract address is configured
        if (!FDC_CONFIG.wiseTransferListAddress) {
          throw new Error("Contract address not configured. Please deploy the WiseTransferList contract first and set NEXT_PUBLIC_WISE_TRANSFER_LIST_ADDRESS in your .env file.")
        }

        console.log("=== Step 4: Interacting with contract ===")
        console.log("Contract address:", FDC_CONFIG.wiseTransferListAddress)
        
        const contractResult = await interactWithWiseContract(
          FDC_CONFIG.wiseTransferListAddress,
          proofData,
          wallet.web3,
          wallet.address
        )

        console.log("Contract interaction successful:", contractResult)
        
        setCurrentStep('complete')
        
        setResult({
          success: true,
          step: 'interacted',
          txHash: contractResult.transactionHash,
          data: {
            transferId,
            timestamp: new Date().toISOString(),
            abiEncodedRequest,
            roundId,
            proof: proofData,
            contractResult: contractResult,
            stepDescription: "Contract interaction completed successfully"
          }
        })

        console.log("=== FDC process completed ===")
        
      } else {
        throw new Error("Invalid step")
      }
      
    } catch (err: any) {
      console.error("FDC operation failed:", err)
      setResult({
        success: false,
        error: err.message || "FDC operation failed"
      })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">Trustworthy Transfers</h1>
          <p className="text-gray-600">
            A decentralized application for secure transfers using Flare Data Connector
          </p>
        </div>

        {/* Configuration Warning */}
        {!isFDCConfigValid && (
          <Alert className="border-amber-200 bg-amber-50">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription>
              <strong>Configuration Issue:</strong> Missing environment variables: {missingVars.join(', ')}
              <br />
              Please set these in your .env.local file for the application to work properly.
            </AlertDescription>
          </Alert>
        )}

        {/* Contract Address Warning */}
        {!FDC_CONFIG.wiseTransferListAddress && (
          <Alert className="border-blue-200 bg-blue-50">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription>
              <strong>Contract Not Deployed:</strong> The WiseTransferList contract address is not configured.
              <br />
              You can complete the first 3 steps (prepare, submit, retrieve), but you'll need to deploy the contract and set <code>NEXT_PUBLIC_WISE_TRANSFER_LIST_ADDRESS</code> to complete the final step.
            </AlertDescription>
          </Alert>
        )}

        {/* Connection Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Wallet Connection
            </CardTitle>
            <CardDescription>
              Connect your wallet to start using Trustworthy Transfers
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!wallet ? (
              <Button 
                onClick={connectWallet} 
                disabled={isConnecting}
                className="w-full"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Wallet className="mr-2 h-4 w-4" />
                    Connect Wallet
                  </>
                )}
              </Button>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-green-800 font-medium">Connected</span>
                  </div>
                  <Button 
                    onClick={disconnectWallet}
                    variant="outline"
                    size="sm"
                  >
                    Disconnect
                  </Button>
                </div>
                <div className="text-sm text-gray-600">
                  <strong>Address:</strong> {wallet.address}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Transfer Request Form */}
        {wallet && (
          <Card>
            <CardHeader>
              <CardTitle>Transfer Request</CardTitle>
              <CardDescription>
                Enter the details of the transfer you want to verify
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="api-key">API Key</Label>
                <Input
                  id="api-key"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter your API key"
                  disabled={isProcessing}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="transfer-id">Transfer ID</Label>
                <Input
                  id="transfer-id"
                  value={transferId}
                  onChange={(e) => setTransferId(e.target.value)}
                  placeholder="Enter transfer ID"
                  disabled={isProcessing}
                />
              </div>

              <Button 
                onClick={submitTransaction}
                disabled={isProcessing || !apiKey || !transferId || !isFDCConfigValid || (currentStep === 'interact' && !FDC_CONFIG.wiseTransferListAddress)}
                className="w-full"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    {currentStep === 'prepare' && 'Prepare Request'}
                    {currentStep === 'submit' && 'Submit Request'}
                    {currentStep === 'retrieve' && 'Retrieve Data & Proof'}
                    {currentStep === 'interact' && 'Interact with Contract'}
                    {currentStep === 'complete' && 'Complete'}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Error Display */}
        {error && (
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription>
              <strong>Error:</strong> {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Result Display */}
        {result && (
          <Card className={result.success ? "border-green-200" : "border-red-200"}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {result.success ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-600" />
                )}
                {result.success ? "Success" : "Error"}
              </CardTitle>
              <CardDescription>
                {result.success ? "Operation completed successfully" : "Operation failed"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {result.success && result.data && (
                <div className="space-y-4">
                  <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="text-green-800 font-medium">
                      {result.data.stepDescription}
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div>
                      <strong>Transfer ID:</strong> {result.data?.transferId}
                    </div>
                    <div>
                      <strong>Timestamp:</strong> {result.data?.timestamp}
                    </div>
                    
                    {result.step === 'submitted' && (
                      <>
                        <div>
                          <strong>Transaction Hash:</strong>
                          <a 
                            href={`https://coston2-explorer.flare.network/tx/${result.data?.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 underline ml-1"
                          >
                            {result.data?.txHash}
                          </a>
                        </div>
                        <div>
                          <strong>Block Number:</strong> {result.data?.blockNumber}
                        </div>
                        <div>
                          <strong>Round ID:</strong> {result.data?.roundId}
                        </div>
                        <div>
                          <strong>Fee Paid:</strong> {result.data?.fee && wallet ? `${wallet.web3.utils.fromWei(result.data.fee.toString(), 'ether')} FLR` : 'N/A'}
                        </div>
                      </>
                    )}
                    
                    {result.step === 'completed' && result.data?.proof && (
                      <>
                        <div>
                          <strong>Round ID:</strong> {result.data?.roundId}
                        </div>
                        <div>
                          <strong>Proof Retrieved:</strong> ✅
                        </div>
                        <div>
                          <strong>Response Hex:</strong>
                          <pre className="font-mono text-xs mt-1 p-2 bg-gray-100 rounded overflow-x-auto max-h-32">
                            {result.data.proof.response_hex?.substring(0, 100)}...
                          </pre>
                        </div>
                        <div>
                          <strong>Attestation Type:</strong> {result.data.proof.attestation_type}
                        </div>
                      </>
                    )}
                    
                    {result.step === 'interacted' && result.data?.contractResult && (
                      <>
                        <div>
                          <strong>Contract Interaction:</strong> ✅
                        </div>
                        <div>
                          <strong>Transaction Hash:</strong>
                          <a 
                            href={`https://coston2-explorer.flare.network/tx/${result.data.contractResult.transactionHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 underline ml-1"
                          >
                            {result.data.contractResult.transactionHash}
                          </a>
                        </div>
                        <div>
                          <strong>Block Number:</strong> {result.data.contractResult.blockNumber}
                        </div>
                        <div>
                          <strong>Transfers Retrieved:</strong> {result.data.contractResult.transfers?.length || 0} transfers
                        </div>
                        {result.data.contractResult.transfers && result.data.contractResult.transfers.length > 0 && (
                          <div>
                            <strong>Transfer Data:</strong>
                            <pre className="font-mono text-xs mt-1 p-2 bg-gray-100 rounded overflow-x-auto max-h-32">
                              {JSON.stringify(result.data.contractResult.transfers[0], null, 2)}
                            </pre>
                          </div>
                        )}
                      </>
                    )}
                    
                    {result.data?.abiEncodedRequest && result.step === 'prepared' && (
                      <div>
                        <strong>ABI Encoded Request:</strong>
                        <pre className="font-mono text-xs mt-1 p-2 bg-gray-100 rounded overflow-x-auto max-h-32">
                          {result.data.abiEncodedRequest}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {!result.success && (
                <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                  <div className="text-red-800">
                    {result.error}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Progress Steps */}
        <Card>
          <CardHeader>
            <CardTitle>Process Flow</CardTitle>
            <CardDescription>
              Follow these steps to complete your transfer verification
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                  currentStep === 'prepare' ? 'bg-blue-100 text-blue-600' : 
                  ['submit', 'retrieve', 'complete'].includes(currentStep) ? 'bg-green-100 text-green-600' : 
                  'bg-gray-100 text-gray-600'
                }`}>1</span>
                <span>
                  {currentStep === 'prepare' ? '🔄' : 
                   ['submit', 'retrieve', 'complete'].includes(currentStep) ? '✅' : '⏳'} 
                  Prepare attestation request
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                  currentStep === 'submit' ? 'bg-blue-100 text-blue-600' : 
                  ['retrieve', 'complete'].includes(currentStep) ? 'bg-green-100 text-green-600' : 
                  'bg-gray-100 text-gray-600'
                }`}>2</span>
                <span>
                  {currentStep === 'submit' ? '🔄' : 
                   ['retrieve', 'complete'].includes(currentStep) ? '✅' : '⏳'} 
                  Submit attestation request
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                  currentStep === 'retrieve' ? 'bg-blue-100 text-blue-600' : 
                  currentStep === 'complete' ? 'bg-green-100 text-green-600' : 
                  'bg-gray-100 text-gray-600'
                }`}>3</span>
                <span>
                  {currentStep === 'retrieve' ? '🔄' : 
                   currentStep === 'complete' ? '✅' : '⏳'} 
                  Retrieve data and proof
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                  currentStep === 'complete' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'
                }`}>4</span>
                <span>
                  {currentStep === 'complete' ? '✅' : '⏳'} 
                  Process completed
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  )
}

