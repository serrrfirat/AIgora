import { http, createConfig } from 'wagmi'
import { base, holesky, mainnet, optimism } from 'wagmi/chains'
import { injected, metaMask, safe, walletConnect } from 'wagmi/connectors'
import * as React from 'react'
import { Connector, useConnect } from 'wagmi'

export const config = createConfig({
  chains: [mainnet, base, holesky],
  connectors: [
    injected(),
    metaMask(),
    safe(),
  ],
  transports: {
    [mainnet.id]: http(),
    [base.id]: http(),
    [holesky.id]: http(),
  },
})