'use client'

import { useState, useEffect } from 'react'
import { ethers } from 'ethers'

export function WalletConnection() {
  const [account, setAccount] = useState<string | null>(null)
  const [provider, setProvider] = useState<ethers.providers.Web3Provider | null>(null)

  useEffect(() => {
    const initProvider = async () => {
      if (typeof window.ethereum !== 'undefined') {
        const provider = new ethers.providers.Web3Provider(window.ethereum)
        setProvider(provider)
      }
    }
    initProvider()
  }, [])

  const connectWallet = async () => {
    if (provider) {
      try {
        await provider.send("eth_requestAccounts", [])
        const signer = provider.getSigner()
        const address = await signer.getAddress()
        setAccount(address)
      } catch (error) {
        console.error("Failed to connect wallet:", error)
      }
    }
  }

  return (
    <div>
      {account ? (
        <div className="bg-zinc-800 text-white px-4 py-2 rounded-full">
          {account.slice(0, 6)}...{account.slice(-4)}
        </div>
      ) : (
        <button
          onClick={connectWallet}
          className="bg-white text-black px-6 py-2 rounded-full font-medium hover:bg-zinc-200 transition-colors"
        >
          CONNECT WALLET
        </button>
      )}
    </div>
  )
}

