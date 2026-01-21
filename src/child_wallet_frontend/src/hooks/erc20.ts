import {sepolia, anvil} from 'viem/chains';
import type { Address } from 'viem';
import JpycAbiJson from '../../../../solidity/out/JPYC.sol/JPYC.json';

export const JPYC_ABI = JpycAbiJson.abi;
export type JPYCAbi = typeof JPYC_ABI;

export const JPYC_ADDRES_LIST = {
  [sepolia.id]: '0xE7C3D8C9a439feDe00D2600032D5dB0Be71C3c29' as Address,
  [anvil.id]: '0x5FbDB2315678afecb367f032d93F642f64180aa3' as Address,
} as const;
