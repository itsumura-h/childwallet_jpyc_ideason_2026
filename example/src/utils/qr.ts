export function buildErc20TransferUri(
	tokenAddress: `0x${string}`,
	receiverAddress: `0x${string}`,
	rawAmount: string
) {
	return `ethereum:${tokenAddress}/transfer?address=${receiverAddress}&uint256=${rawAmount}`;
}

export function buildQrImageUrl(payload: string) {
	return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(payload)}`;
}
