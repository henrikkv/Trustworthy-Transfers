export const FDC_CONFIG = {
  verifierUrl: process.env.NEXT_PUBLIC_WEB2JSON_VERIFIER_URL_TESTNET || "",
  
  verifierApiKey: process.env.NEXT_PUBLIC_VERIFIER_API_KEY_TESTNET || "",
  
  daLayerUrl: process.env.NEXT_PUBLIC_COSTON2_DA_LAYER_URL || "",
  
  xApiKey: process.env.NEXT_PUBLIC_X_API_KEY || "",
}

// Validation function to check if required environment variables are set
export function validateFDCConfig(): { isValid: boolean; missingVars: string[] } {
  const requiredVars = [
    { key: 'verifierUrl', name: 'NEXT_PUBLIC_WEB2JSON_VERIFIER_URL_TESTNET' },
    { key: 'verifierApiKey', name: 'NEXT_PUBLIC_VERIFIER_API_KEY_TESTNET' },
    { key: 'daLayerUrl', name: 'NEXT_PUBLIC_COSTON2_DA_LAYER_URL' },
    { key: 'xApiKey', name: 'NEXT_PUBLIC_X_API_KEY' },
  ]

  const missingVars = requiredVars
    .filter(({ key }) => !FDC_CONFIG[key as keyof typeof FDC_CONFIG])
    .map(({ name }) => name)

  return {
    isValid: missingVars.length === 0,
    missingVars
  }
}

// Development mode warning
if (process.env.NODE_ENV === 'development') {
  const { isValid, missingVars } = validateFDCConfig()
  if (!isValid) {
    console.warn('⚠️  FDC Configuration Warning:')
    console.warn('The following environment variables are not set:')
    missingVars.forEach(varName => {
      console.warn(`  - ${varName}`)
    })
    console.warn('Add NEXT_PUBLIC_ prefix to these variables in your .env file for client-side access.')
  }
} 