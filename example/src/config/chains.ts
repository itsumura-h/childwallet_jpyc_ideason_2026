/**
 * 対応チェーン設定
 * 
 * Exampleアプリケーションがサポートするすべてのチェーンの定義
 */

import { useChainId } from 'wagmi';
import { sepolia, anvil } from 'wagmi/chains';
import type { Chain } from 'viem';
import { http } from 'wagmi';

const DefaultChain = anvil;

// Anvilのカスタム設定 (localhost:8545)
const anvilRpcUrl = "http://localhost:8545";

const anvilCustom = {
  ...anvil,
  rpcUrls: {
    ...anvil.rpcUrls,
    default: {
      http: [anvilRpcUrl],
    },
    public: {
      http: [anvilRpcUrl],
    },
  },
} as const;

/**
 * wagmi 用チェーン設定（AppKitProvider で使用）
 * 
 * - Sepolia: Ethereum テストネット（本番に近い）
 * - Anvil: ローカル開発用ノード (http://localhost:8545)
 * 
 * @note AppKitProvider の wagmiConfig.chains で使用される
 */
export const WAGMI_CHAINS = [
  sepolia,
  anvilCustom,
] as const;

/**
 * サポート対象チェーン一覧（チェーン ID をキーとした検索用マップ）
 * 
 * ChainSelector、ethClient 等で使用される
 */
export const SUPPORTED_CHAINS: Record<number, Chain> = {
  [sepolia.id]: sepolia,
  [anvil.id]: anvilCustom,
};

export const WAGMI_TRANSPORTS = {
  [sepolia.id]: http(),
  [anvil.id]: http(anvilRpcUrl),
} as const;

/**
 * wagmiから現在接続中のチェーンIDを取得するカスタムフック
 * 
 * @returns 現在のチェーンID（wagmiから取得）
 */
export function useCurrentChainId(): number {
  const chainId = useChainId();
  return chainId || DefaultChain.id; // フォールバック: Anvil
}

/**
 * チェーンIDからチェーン設定を取得
 */
export function getChainConfig(chainId: number): Chain {
  return SUPPORTED_CHAINS[chainId];
}

/**
 * チェーンIDのリストを取得
 */
export function getChainIds(): number[] {
  return Object.keys(SUPPORTED_CHAINS).map((key: string) => parseInt(key));
}
