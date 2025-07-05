import { ethers } from "ethers"

export const FLARE_NETWORKS = {
  flare: {
    chainId: 14,
    name: "Flare Network",
    rpcUrl: "https://flare-api.flare.network/ext/C/rpc",
    explorerUrl: "https://flare-explorer.flare.network",
    fdcHubAddress: "0x0c13aDA1C7143Cf0a0795FFaB93eEBb6FAD6e4e3",
    daLayerEndpoint: "https://da-layer.flare.network",
    nativeCurrency: {
      name: "Flare",
      symbol: "FLR",
      decimals: 18,
    },
  },
  coston2: {
    chainId: 114,
    name: "Coston2 Testnet",
    rpcUrl: "https://coston2-api.flare.network/ext/C/rpc",
    explorerUrl: "https://coston2-explorer.flare.network",
    fdcHubAddress: "0x0c13aDA1C7143Cf0a0795FFaB93eEBb6FAD6e4e3",
    daLayerEndpoint: "https://ctn2-data-availability.flare.network",
    nativeCurrency: {
      name: "Coston2 Flare",
      symbol: "C2FLR",
      decimals: 18,
    },
  },
} as const

export function createFlareProvider(rpcUrl: string, chainId: number) {
  return new ethers.JsonRpcProvider(rpcUrl, {
    chainId,
    name: chainId === 14 ? "flare" : "coston2",
  })
}

export function getNetworkConfig(chainId: number) {
  return Object.values(FLARE_NETWORKS).find((network) => network.chainId === chainId)
}
