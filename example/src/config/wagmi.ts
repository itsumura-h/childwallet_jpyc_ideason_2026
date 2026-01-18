import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { anvil, sepolia } from 'wagmi/chains';
import { http } from 'viem';
import { WALLETCONNECT_PROJECT_ID } from './env';

export const supportedChains = [sepolia, anvil] as const;

export const wagmiConfig = getDefaultConfig({
	appName: 'Example Register',
	projectId: WALLETCONNECT_PROJECT_ID || 'WALLETCONNECT_PROJECT_ID',
	chains: supportedChains,
	ssr: false,
	transports: {
		[sepolia.id]: http(),
		[anvil.id]: http('http://127.0.0.1:8545'),
	},
});
