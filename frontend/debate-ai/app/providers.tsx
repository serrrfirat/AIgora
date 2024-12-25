'use client';

import { WagmiConfig, createClient, configureChains } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { publicProvider } from 'wagmi/providers/public';
import { MetaMaskConnector } from 'wagmi/connectors/metaMask';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  const { chains, provider, webSocketProvider } = configureChains(
    [sepolia],
    [publicProvider()]
  );

  const [client] = useState(() => 
    createClient({
      autoConnect: true,
      provider,
      webSocketProvider,
      connectors: [
        new MetaMaskConnector({ chains })
      ],
    })
  );

  return (
    <WagmiConfig client={client}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiConfig>
  );
} 