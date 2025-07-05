"use client"

import { useState } from "react"
import { ethers } from "ethers"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Wallet, CheckCircle, AlertCircle } from "lucide-react"
import { prepareWiseAttestationRequest } from "@/lib/fdc-utils"
import { submitWiseAttestationRequest } from "@/lib/fdc-contracts"
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
  step?: 'prepared' | 'submitted' | 'retrieving' | 'completed'
}

export default function TrustworthyTransfersApp() {
  const [wallet, setWallet] = useState<{
    address: string
    provider: ethers.BrowserProvider
    signer: ethers.JsonRpcSigner
  } | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [apiKey, setApiKey] = useState("1fd8008a-fa07-4c6f-be8a-16b54a2e7482")
  const [transferId, setTransferId] = useState("1614003520")
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState<TransactionResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [currentStep, setCurrentStep] = useState<'prepare' | 'submit' | 'retrieve' | 'complete'>('prepare')
  const [abiEncodedRequest, setAbiEncodedRequest] = useState<string | null>(null)

  const { isValid: isFDCConfigValid, missingVars } = validateFDCConfig()

  const connectWallet = async () => {
    if (!window.ethereum) {
      setError("MetaMask or another Ethereum wallet is required")
      return
    }

    setIsConnecting(true)
    setError(null)

    try {
      const provider = new ethers.BrowserProvider(window.ethereum)
      await provider.send("eth_requestAccounts", [])

      const signer = await provider.getSigner()
      const address = await signer.getAddress()
      const network = await provider.getNetwork()
      
      console.log("Wallet connected successfully:", address)
      console.log("Connected to network:", network.chainId.toString(), network.name)
      
      setWallet({ address, provider, signer })
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
  }

  const submitTransaction = async () => {
    if (!wallet) return

    setIsProcessing(true)
    setResult(null)
    setError(null)

    try {
      const network = await wallet.provider.getNetwork()
      const chainId = Number(network.chainId)
      
      // Check if we're on Coston2 testnet
      if (chainId !== 114) {
        throw new Error(`Please switch to Coston2 testnet (Chain ID: 114). Current network: ${chainId}`)
      }

      console.log("Network info:", { chainId, name: network.name })

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
          wallet.provider,
          wallet.signer
        )

        console.log("Attestation request submitted successfully:", submissionResult)
        
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
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Configuration Required:</strong> The following environment variables need to be set up:
              <ul className="mt-2 ml-4 list-disc">
                {missingVars.map(varName => (
                  <li key={varName} className="text-sm">{varName}</li>
                ))}
              </ul>
              <p className="mt-2 text-sm">
                Please create a <code>.env.local</code> file in the frontend directory. 
                See <code>env-setup.md</code> for quick setup instructions.
              </p>
            </AlertDescription>
          </Alert>
        )}

        {/* Wallet Connection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Wallet Connection
            </CardTitle>
            <CardDescription>Connect your wallet to get started</CardDescription>
          </CardHeader>
          <CardContent>
            {!wallet ? (
              <Button onClick={connectWallet} disabled={isConnecting} className="w-full">
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
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-sm font-medium text-green-800">Connected</span>
                  </div>
                  <Button variant="outline" size="sm" onClick={disconnectWallet}>
                    Disconnect
                  </Button>
                </div>
                <div className="text-sm text-gray-600">
                  <p><strong>Address:</strong> {wallet.address}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Transaction Form */}
        {wallet && (
          <Card>
            <CardHeader>
              <CardTitle>
                {currentStep === 'prepare' && "Step 1: Prepare Attestation Request"}
                {currentStep === 'submit' && "Step 2: Submit to FDC Network"}
                {currentStep === 'retrieve' && "Step 3: Retrieve Data and Proof"}
              </CardTitle>
              <CardDescription>
                {currentStep === 'prepare' && "Enter your Wise API key and transfer ID to prepare the FDC attestation request"}
                {currentStep === 'submit' && "Submit the prepared request to the FDC network (requires FLR for fees)"}
                {currentStep === 'retrieve' && "Retrieve the verified data and proof from the network"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {currentStep === 'prepare' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="apiKey">Wise API Key</Label>
                    <Input
                      id="apiKey"
                      type="password"
                      placeholder="Enter your Wise API key"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      disabled={isProcessing}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="transferId">Transfer ID</Label>
                    <Input
                      id="transferId"
                      type="text"
                      placeholder="Enter transfer ID"
                      value={transferId}
                      onChange={(e) => setTransferId(e.target.value)}
                      disabled={isProcessing}
                    />
                  </div>
                </>
              )}

              {currentStep === 'submit' && (
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-800">
                      ✅ Attestation request prepared successfully!
                    </p>
                    <p className="text-sm text-blue-700 mt-2">
                      Ready to submit to the FDC network. This will require a small fee in FLR.
                    </p>
                  </div>
                  
                  {abiEncodedRequest && (
                    <div className="space-y-2">
                      <Label>Prepared Request</Label>
                      <div className="p-2 bg-gray-100 rounded text-xs font-mono break-all max-h-20 overflow-y-auto">
                        {abiEncodedRequest.substring(0, 100)}...
                      </div>
                    </div>
                  )}
                </div>
              )}

              {currentStep === 'retrieve' && (
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-sm text-green-800">
                      ✅ Attestation request submitted successfully!
                    </p>
                    <p className="text-sm text-green-700 mt-2">
                      Your request has been submitted to the FDC network. The next step will be to retrieve the verified data and proof.
                    </p>
                  </div>
                  
                  {result?.data?.roundId && (
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-700">
                        <strong>Round ID:</strong> {result.data.roundId}
                      </p>
                      <p className="text-sm text-gray-700">
                        <strong>Transaction:</strong> {result.data.txHash}
                      </p>
                      <a 
                        href={`https://coston2-systems-explorer.flare.rocks/voting-epoch/${result.data.roundId}?tab=fdc`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 text-sm underline"
                      >
                        View round progress →
                      </a>
                    </div>
                  )}
                </div>
              )}

                              <div className="space-y-2">
                  <Button
                    onClick={submitTransaction}
                    disabled={
                      isProcessing || 
                      (currentStep === 'prepare' && (!apiKey.trim() || !transferId.trim())) ||
                      (currentStep === 'retrieve') // Not implemented yet
                    }
                    className="w-full"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {currentStep === 'prepare' && "Preparing Request..."}
                        {currentStep === 'submit' && "Submitting to FDC..."}
                        {currentStep === 'retrieve' && "Retrieving Data..."}
                      </>
                    ) : (
                      <>
                        {currentStep === 'prepare' && "Prepare Attestation Request"}
                        {currentStep === 'submit' && "Submit to FDC Network"}
                        {currentStep === 'retrieve' && "Retrieve Data & Proof (Coming Soon)"}
                      </>
                    )}
                  </Button>
                  
                  {(currentStep === 'submit' || currentStep === 'retrieve') && (
                    <Button
                      onClick={() => {
                        setCurrentStep('prepare')
                        setAbiEncodedRequest(null)
                        setResult(null)
                        setError(null)
                      }}
                      variant="outline"
                      className="w-full"
                    >
                      Start Over
                    </Button>
                  )}
                </div>
            </CardContent>
          </Card>
        )}

        {/* Transaction Result */}
        {result && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {result.success ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-600" />
                )}
                FDC Attestation Result
              </CardTitle>
            </CardHeader>
            <CardContent>
              {result.success ? (
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-sm text-green-800">
                      {result.data?.stepDescription || "Operation completed successfully!"}
                    </p>
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
                          <strong>Fee Paid:</strong> {result.data?.fee ? `${ethers.formatEther(result.data.fee.toString())} FLR` : 'N/A'}
                        </div>
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
              ) : (
                <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                  <p className="text-sm text-red-800">{result.error || "Attestation request failed"}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* FDC Process Info */}
        <Card>
          <CardHeader>
            <CardTitle>FDC Process Steps</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                  currentStep === 'prepare' ? 'bg-blue-100 text-blue-600' : 
                  (currentStep === 'submit' || currentStep === 'retrieve') ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'
                }`}>1</span>
                <span>
                  {(currentStep === 'submit' || currentStep === 'retrieve') ? '✅' : currentStep === 'prepare' ? '🔄' : '⏳'} 
                  Prepare attestation request
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                  currentStep === 'submit' ? 'bg-blue-100 text-blue-600' : 
                  currentStep === 'retrieve' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'
                }`}>2</span>
                <span>
                  {currentStep === 'retrieve' ? '✅' : currentStep === 'submit' ? '🔄' : '⏳'} 
                  Submit attestation request
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                  currentStep === 'retrieve' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                }`}>3</span>
                <span>
                  {currentStep === 'retrieve' ? '🔄' : '⏳'} 
                  Retrieve data and proof
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 bg-gray-100 text-gray-600 rounded-full flex items-center justify-center text-xs font-semibold">4</span>
                <span>⏳ Interact with smart contract</span>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  )
}

