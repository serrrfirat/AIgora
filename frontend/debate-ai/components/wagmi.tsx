import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import {
  arbitrum,
  base,
  mainnet,
  optimism,
  polygon,
  sepolia,
  holesky,
} from "wagmi/chains";

if (!process.env.NEXT_PUBLIC_RAINBOWKIT_PROJECT_ID) {
  throw new Error("RAINBOWKIT_PROJECT_ID is not set");
}
export const rainbowKitProjectId =
  process.env.NEXT_PUBLIC_RAINBOWKIT_PROJECT_ID;
export const config = getDefaultConfig({
  appName: "RainbowKit demo",
  projectId: rainbowKitProjectId,
  chains: [
    mainnet,
    polygon,
    optimism,
    arbitrum,
    base,
    holesky,
    ...(process.env.NEXT_PUBLIC_ENABLE_TESTNETS === "true" ? [sepolia] : []),
  ],
  ssr: true,
});
