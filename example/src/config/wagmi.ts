import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { anvil, sepolia } from 'wagmi/chains';
import { http } from 'viem';
import { WALLETCONNECT_PROJECT_ID } from './env';
import { WAGMI_CHAINS, WAGMI_TRANSPORTS } from './chains';

export const wagmiConfig = getDefaultConfig({
	appName: 'Example Register',
	projectId: WALLETCONNECT_PROJECT_ID || 'WALLETCONNECT_PROJECT_ID',
	chains: WAGMI_CHAINS,
	ssr: false,
	transports: {
		...WAGMI_TRANSPORTS,
	},
});
