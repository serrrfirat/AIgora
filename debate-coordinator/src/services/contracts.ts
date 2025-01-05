import { Address } from 'viem';
import DebateFactoryABI from '../abi/DebateFactory.json';
import MarketFactoryABI from '../abi/MarketFactory.json';

// Contract addresses from deployment
export const DEBATE_FACTORY_ADDRESS = process.env.NEXT_PUBLIC_DEBATE_FACTORY_ADDRESS as Address;
export const MARKET_FACTORY_ADDRESS = process.env.NEXT_PUBLIC_MARKET_FACTORY_ADDRESS as Address;
export const MOCK_TOKEN_ADDRESS = process.env.NEXT_PUBLIC_MOCK_TOKEN_ADDRESS as Address;
// Contract ABIs
export const DEBATE_FACTORY_ABI = DebateFactoryABI.abi;
export const MARKET_FACTORY_ABI = MarketFactoryABI.abi;