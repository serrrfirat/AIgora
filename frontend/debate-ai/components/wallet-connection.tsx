'use client'

import { useState, useEffect } from 'react'
import * as ethers from 'ethers'
import { Button } from './ui/button'
import { Switch } from './ui/switch'

const HOLESKY_CHAIN_ID = '0x4268' // 17000 in hex
const MAINNET_CHAIN_ID = '0x1'    // 1 in hex

interface SwitchChainError extends Error {
  code: number;
}

export function WalletConnection() {
  const [provider, setProvider] = useState<ethers.providers.Web3Provider | null>(null)
  const [account, setAccount] = useState<string | null>(null)
  const [chainId, setChainId] = useState<string | null>(null)
  const [isMainnet, setIsMainnet] = useState(true)

  useEffect(() => {
    const handleChainChange = (newChainId: string) => {
      setChainId(newChainId)
      setIsMainnet(newChainId === MAINNET_CHAIN_ID)
    }

    const initProvider = async () => {
      if (typeof window.ethereum !== 'undefined') {
        const provider = new ethers.providers.Web3Provider(window.ethereum as ethers.providers.ExternalProvider)
        setProvider(provider)
        const network = await provider.getNetwork()
        const currentChainId = '0x' + network.chainId.toString(16)
        setChainId(currentChainId)
        setIsMainnet(currentChainId === MAINNET_CHAIN_ID)

        if (window.ethereum.on) {
          window.ethereum.on('chainChanged', handleChainChange)
        }
      }
    }

    initProvider()

    return () => {
      if (window.ethereum?.removeListener) {
        window.ethereum.removeListener('chainChanged', handleChainChange)
      }
    }
  }, [])

  const connectWallet = async () => {
    if (!provider || !window.ethereum) return
    try {
      await window.ethereum.request({ method: 'eth_requestAccounts' })
      const signer = provider.getSigner()
      const address = await signer.getAddress()
      setAccount(address)
    } catch (error) {
      console.error('Error connecting wallet:', error)
    }
  }

  const switchNetwork = async (targetChainId: string) => {
    if (!window.ethereum) return
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: targetChainId }],
      })
    } catch (error) {
      const switchError = error as SwitchChainError
      if (switchError.code === 4902 && targetChainId === HOLESKY_CHAIN_ID) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: HOLESKY_CHAIN_ID,
                chainName: 'Holesky Testnet',
                nativeCurrency: {
                  name: 'ETH',
                  symbol: 'ETH',
                  decimals: 18,
                },
                rpcUrls: ['https://ethereum-holesky.publicnode.com'],
                blockExplorerUrls: ['https://holesky.etherscan.io'],
              },
            ],
          })
        } catch (addError) {
          console.error('Error adding Holesky network:', addError)
        }
      }
      console.error('Error switching network:', error)
    }
  }

  const toggleNetwork = async () => {
    const targetChainId = isMainnet ? HOLESKY_CHAIN_ID : MAINNET_CHAIN_ID
    await switchNetwork(targetChainId)
    setIsMainnet(!isMainnet)
  }

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <Switch
          checked={isMainnet}
          onCheckedChange={toggleNetwork}
          className="data-[state=checked]:bg-green-500"
        />
        <span className="text-sm font-medium">
          {isMainnet ? 'Mainnet' : 'Holesky'}
        </span>
      </div>
      <Button onClick={connectWallet}>
        {account ? `${account.slice(0, 6)}...${account.slice(-4)}` : 'Connect Wallet'}
      </Button>
    </div>
  )
}

