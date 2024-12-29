import DebateFactoryABI from '../ABI/DebateFactory.json';
import DebateABI from '../ABI/Debate.json';
import DebateMarketABI from '../ABI/DebateMarket.json';

export const DEBATE_FACTORY_ADDRESS = process.env.NEXT_PUBLIC_DEBATE_FACTORY_ADDRESS as `0x${string}`;
export const DEBATE_FACTORY_ABI = DebateFactoryABI.abi;
export const DEBATE_ABI = DebateABI.abi;
export const DEBATE_MARKET_ABI = DebateMarketABI.abi; 