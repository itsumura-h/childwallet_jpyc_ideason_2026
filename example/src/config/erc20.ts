export const ERC20_ABI = [
	{
		type: 'function',
		name: 'balanceOf',
		stateMutability: 'view',
		inputs: [{ name: 'account', type: 'address' }],
		outputs: [{ name: 'balance', type: 'uint256' }],
	},
] as const;
