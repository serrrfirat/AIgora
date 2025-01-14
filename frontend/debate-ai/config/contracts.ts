import { Address } from 'viem';
import DebateFactoryABI from './abis/DebateFactory.json';
import MarketFactoryABI from './abis/MarketFactory.json';
import GladiatorNFTABI from './abis/GladiatorNFT.json';

// Contract addresses from deployment
export const DEBATE_FACTORY_ADDRESS = process.env.NEXT_PUBLIC_DEBATE_FACTORY_ADDRESS as Address;
export const MARKET_FACTORY_ADDRESS = process.env.NEXT_PUBLIC_MARKET_FACTORY_ADDRESS as Address;
export const MOCK_TOKEN_ADDRESS = process.env.NEXT_PUBLIC_MOCK_TOKEN_ADDRESS as Address;
export const GLADIATOR_NFT_ADDRESS = process.env.NEXT_PUBLIC_GLADIATOR_NFT_ADDRESS as Address;
// Contract ABIs
export const DEBATE_FACTORY_ABI = DebateFactoryABI.abi;
export const MARKET_FACTORY_ABI = MarketFactoryABI.abi;
export const GLADIATOR_NFT_ABI = GladiatorNFTABI.abi;

// Contract Constants
export const REQUIRED_JUDGES = 3;
export const MAX_SCORE = 10;
export const MIN_SCORE = 0;
export const OUTCOME_COUNT = 5;