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
  }

  // Entry point for your FDC implementation
  const submitTransaction = async () => {
    if (!wallet || !apiKey || !transferId) return

    setIsProcessing(true)
    setResult(null)
    setError(null)

    try {
      console.log("Starting FDC attestation request with:", { transferId })
      
      // Get network info
      const network = await wallet.provider.getNetwork()
      const chainId = Number(network.chainId)
      
      console.log("Network info:", { chainId, name: network.name })

      // Step 1: Prepare attestation request
      console.log("=== Step 1: Preparing attestation request ===")
      const attestationData = await prepareWiseAttestationRequest(
        transferId,
        apiKey,
        FDC_CONFIG.verifierUrl,
        FDC_CONFIG.verifierApiKey
      )

      console.log("Attestation request prepared successfully:", attestationData)

      // Check if we got the abiEncodedRequest
      if (!attestationData || !attestationData.abiEncodedRequest) {
        throw new Error("Failed to get abiEncodedRequest from verifier")
      }

      setResult({
        success: true,
        data: {
          transferId,
          timestamp: new Date().toISOString(),
          abiEncodedRequest: attestationData.abiEncodedRequest,
          step: "Request prepared successfully"
        }
      })

      // TODO: Next steps will be:
      // 1. Submit the attestation request to the FDC
      // 2. Retrieve the data and proof
      // 3. Interact with the smart contract

      console.log("=== Next: Submit attestation request ===")
      console.log("abiEncodedRequest:", attestationData.abiEncodedRequest)
      
    } catch (err: any) {
      console.error("FDC attestation request failed:", err)
      setResult({
        success: false,
        error: err.message || "FDC attestation request failed"
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
              <CardTitle>Submit FDC Attestation Request</CardTitle>
              <CardDescription>
                Enter your Wise API key and transfer ID to prepare the FDC attestation request
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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

              <Button
                onClick={submitTransaction}
                disabled={isProcessing || !apiKey.trim() || !transferId.trim()}
                className="w-full"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Preparing Attestation Request...
                  </>
                ) : (
                  "Prepare Attestation Request"
                )}
              </Button>
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
                      {result.data?.step || "Attestation request prepared successfully!"}
                    </p>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div>
                      <strong>Transfer ID:</strong> {result.data?.transferId}
                    </div>
                    <div>
                      <strong>Timestamp:</strong> {result.data?.timestamp}
                    </div>
                    {result.data?.abiEncodedRequest && (
                      <div>
                        <strong>ABI Encoded Request:</strong>
                        <pre className="font-mono text-xs mt-1 p-2 bg-gray-100 rounded overflow-x-auto">
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
                <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-semibold">1</span>
                <span>✅ Prepare attestation request</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 bg-gray-100 text-gray-600 rounded-full flex items-center justify-center text-xs font-semibold">2</span>
                <span>⏳ Submit attestation request</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 bg-gray-100 text-gray-600 rounded-full flex items-center justify-center text-xs font-semibold">3</span>
                <span>⏳ Retrieve data and proof</span>
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

