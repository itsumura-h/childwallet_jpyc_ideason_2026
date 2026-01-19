import { JSX } from "preact";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, http, createConfig } from "wagmi";
import { anvil, sepolia } from "viem/chains";
import {
  RainbowKitProvider,
  connectorsForWallets,
} from "@rainbow-me/rainbowkit";
import {
  injectedWallet,
  walletConnectWallet,
} from "@rainbow-me/rainbowkit/wallets";
import "@rainbow-me/rainbowkit/styles.css";
import { WALLETCONNECT_PROJECT_ID } from "./env";
import { WAGMI_CHAINS, WAGMI_TRANSPORTS } from './chains';

const queryClient = new QueryClient();

const connectors = connectorsForWallets(
  [
    {
      groupName: "Wallets",
      wallets: [
        injectedWallet,
        walletConnectWallet,
      ],
    },
  ],
  {
    appName: "example",
    projectId: WALLETCONNECT_PROJECT_ID,
  }
);

const wagmiConfig = createConfig({
  connectors,
  chains: WAGMI_CHAINS,
  transports: WAGMI_TRANSPORTS,
});

export default function WalletProvider({ children }: { children: JSX.Element }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>{children}</RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
