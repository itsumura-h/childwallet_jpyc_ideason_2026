import { secp256k1 } from '@noble/curves/secp256k1.js';
import { type Address, bytesToHex, getAddress, hexToBytes, keccak256 } from 'viem';

export const DEFAULT_WALLET_NONCE = 1;

const toPrefixedHex = (value: string): `0x${string}` => {
  return value.startsWith('0x') ? (value as `0x${string}`) : (`0x${value}` as `0x${string}`);
};

// 先頭に0xを付けない生のHEX文字列
export const publicKeyToHex = (publicKey: Uint8Array | number[]): string => {
  return bytesToHex(Uint8Array.from(publicKey)).replace(/^0x/, '');
};

export const publicKeyToEvmAddress = (publicKey: Uint8Array | number[]): Address => {
  const compressed = Uint8Array.from(publicKey);
  if (compressed.length === 0) {
    throw new Error('Public key is empty.');
  }

  // Backend returns a compressed secp256k1 key; decompress then hash
  // viemのbytesToHexは0xプレフィックスを付与するため、nobleには外した値を渡す
  const compressedHex = bytesToHex(compressed).replace(/^0x/, '');
  const uncompressed = secp256k1.Point.fromHex(compressedHex).toBytes(false);
  const hash = keccak256(uncompressed.slice(1)); // drop 0x04 prefix
  const addressBytes = hexToBytes(hash).slice(-20);
  const addressHex = toPrefixedHex(bytesToHex(addressBytes));

  return getAddress(addressHex);
};
