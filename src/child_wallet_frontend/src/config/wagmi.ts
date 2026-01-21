import { createConfig, http, useChainId } from 'wagmi';
import type { Chain } from 'viem';
import { anvil, sepolia } from 'viem/chains';

const ANVIL_RPC_URL = 'http://localhost:8545';

const anvilWithRpc: Chain = {
	...anvil,
	rpcUrls: {
		...anvil.rpcUrls,
		default: {
			...anvil.rpcUrls.default,
			http: [ANVIL_RPC_URL],
		},
		public: {
			...anvil.rpcUrls.public,
			http: [ANVIL_RPC_URL],
		},
	},
};

export const SUPPORTED_CHAINS: Record<number, Chain> = {
	[anvilWithRpc.id]: anvilWithRpc,
	[sepolia.id]: sepolia,
};

export const DEFAULT_CHAIN_ID = anvilWithRpc.id;
export const DEFAULT_RPC_URL = ANVIL_RPC_URL;

export const wagmiConfig = createConfig({
	chains: Object.values(SUPPORTED_CHAINS),
	transports: {
		[anvilWithRpc.id]: http(ANVIL_RPC_URL),
		[sepolia.id]: http(),
	},
});

export const getChainConfig = (chainId: number): Chain | null => SUPPORTED_CHAINS[chainId] ?? null;

export const getRpcUrlForChain = (chainId: number): string | null => {
	const chain = getChainConfig(chainId);
	const url = chain?.rpcUrls?.default?.http?.[0];
	return url ?? null;
};

export const useCurrentChainId = (): number => {
	const chainId = useChainId();
	return chainId || DEFAULT_CHAIN_ID;
};
