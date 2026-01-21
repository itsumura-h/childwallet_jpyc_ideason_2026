import type { Abi } from 'viem';

import JpycAbiJson from '../../../../solidity/out/JPYC.sol/JPYC.json';

export const JPYC_ABI = JpycAbiJson.abi;
export type JPYCAbi = typeof JPYC_ABI;
