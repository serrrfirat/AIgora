import { providers } from 'ethers';

interface RequestArguments {
  method: string;
  params?: unknown[];
}

type EthereumProvider = providers.ExternalProvider & {
  isMetaMask?: boolean;
  _state?: { accounts?: string[] };
  request: (args: RequestArguments) => Promise<unknown>;
};

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

export {}; 