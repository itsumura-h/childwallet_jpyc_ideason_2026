import { createPublicClient, http } from 'viem';
import { DEFAULT_CHAIN_ID, DEFAULT_RPC_URL, getChainConfig, getRpcUrlForChain } from '../config/wagmi';

type ViemPublicClient = ReturnType<typeof createPublicClient>;

const clients = new Map<number, ViemPublicClient>();

const buildClient = (chainId: number): ViemPublicClient => {
	const chain = getChainConfig(chainId);
	if (!chain) {
		throw new Error(`未対応のチェーンIDです: ${chainId}`);
	}

	const rpcUrl = getRpcUrlForChain(chainId) ?? DEFAULT_RPC_URL;

	return createPublicClient({
		chain,
		transport: http(rpcUrl),
	});
};

export const getPublicClient = (chainId: number = DEFAULT_CHAIN_ID): ViemPublicClient => {
	const cached = clients.get(chainId);
	if (cached) {
		return cached;
	}

	const client = buildClient(chainId);
	clients.set(chainId, client);
	return client;
};

export const publicClient = getPublicClient();
