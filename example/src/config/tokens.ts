import { anvil, sepolia } from 'wagmi/chains';

export type TokenPreset = {
	address: string;
	symbol: string;
	decimals: number;
};

export const TOKEN_PRESETS: Record<number, TokenPreset> = {
	[sepolia.id]: {
		address: '',
		symbol: 'TOKEN',
		decimals: 18,
	},
	[anvil.id]: {
		address: '',
		symbol: 'TOKEN',
		decimals: 18,
	},
};
