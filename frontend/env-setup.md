# Frontend Environment Setup

## Quick Setup

Run this command in the `frontend` directory to create your `.env.local` file:

```bash
cat > .env.local << 'EOF'
# Frontend-specific environment variables with NEXT_PUBLIC_ prefix
# These mirror the values from the main .env file at the project root

# Verifier API Key for testnet
NEXT_PUBLIC_VERIFIER_API_KEY_TESTNET=00000000-0000-0000-0000-000000000000

# X-API-KEY for DA Layer
NEXT_PUBLIC_X_API_KEY=00000000-0000-0000-0000-000000000000

# Web2Json Verifier URL for testnet
NEXT_PUBLIC_WEB2JSON_VERIFIER_URL_TESTNET=https://web2json-verifier-test.flare.rocks/

# Data Availability Layer URL for Coston2 testnet
NEXT_PUBLIC_COSTON2_DA_LAYER_URL=https://ctn2-data-availability.flare.network/
EOF
```

## Manual Setup

If you prefer to create the file manually, create `frontend/.env.local` with these contents:

```
NEXT_PUBLIC_VERIFIER_API_KEY_TESTNET=00000000-0000-0000-0000-000000000000
NEXT_PUBLIC_X_API_KEY=00000000-0000-0000-0000-000000000000
NEXT_PUBLIC_WEB2JSON_VERIFIER_URL_TESTNET=https://web2json-verifier-test.flare.rocks/
NEXT_PUBLIC_COSTON2_DA_LAYER_URL=https://ctn2-data-availability.flare.network/
```

## Variable Mapping

These frontend variables map to your main `.env` file:

| Frontend Variable | Main .env Variable |
|---|---|
| `NEXT_PUBLIC_VERIFIER_API_KEY_TESTNET` | `VERIFIER_API_KEY_TESTNET` |
| `NEXT_PUBLIC_X_API_KEY` | `X_API_KEY` |
| `NEXT_PUBLIC_WEB2JSON_VERIFIER_URL_TESTNET` | `WEB2JSON_VERIFIER_URL_TESTNET` |
| `NEXT_PUBLIC_COSTON2_DA_LAYER_URL` | `COSTON2_DA_LAYER_URL` |

## Notes

- The `NEXT_PUBLIC_` prefix is required for Next.js to make these variables available to client-side code
- When you get your actual API keys from the Flare team, update both files
- The frontend will show configuration warnings until these are set 