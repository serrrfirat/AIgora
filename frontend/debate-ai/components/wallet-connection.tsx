'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider, useAccount } from 'wagmi'
import { config } from '@/config/wallet-config'
import { Account } from '@/lib/account'
import { WalletOptions } from '@/config/wallet-options'


const queryClient = new QueryClient()

function ConnectWallet() {
  const { isConnected } = useAccount()
  if (isConnected) return <Account />
  return <WalletOptions />
}

export function WalletConnection() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}> 
        <ConnectWallet />
      </QueryClientProvider> 
    </WagmiProvider>
  )
}

