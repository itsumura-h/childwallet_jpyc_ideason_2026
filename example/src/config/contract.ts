import { useState, useCallback } from 'preact/hooks';
import { 
  Address,
  TransactionReceipt, 
  getContract, 
  type WalletClient, 
  type PublicClient, 
} from 'viem';
import 'viem/window';
import { useConnection, useWalletClient, usePublicClient } from 'wagmi';
import { JPYC_ABI } from './erc20';
import { JPYC_ADDRESS } from './env';

interface UseJpycContractOptions {
  chainId?: number;
}

interface JpycContractState {
  balance: bigint | null;
  isLoading: boolean;
  error: string | null;
  transactionHash: string | null;
  transactionReceipt: TransactionReceipt | null;
}

/**
 * ウォレットが指定チェーンにいることを確認し、必要に応じて切り替え
 * 
 * EIP-1193 の wallet_switchEthereumChain RPC を使用
 */
async function ensureWalletChain(
  targetChainId: number,
  walletClient: WalletClient,
): Promise<void> {
  try {
    await walletClient.switchChain({ id: targetChainId });
  } catch (error: unknown) {
    // ユーザーがキャンセルした場合は無視
    if (error instanceof Error && error.message.includes('User rejected')) {
      throw new Error('チェーン切り替えがキャンセルされました');
    }
    // チェーンが見つからない場合もスキップ（見つからないなら既に目的のチェーン）
    return;
  }
}

/**
 * Counter スマートコントラクト操作 Hook
 * 
 * @param counterAddress - Counter コントラクトアドレス
 * @param chainId - ターゲットチェーン（デフォルト: 31337 = Anvil ローカルノード）
 * @returns 状態（currentNumber, isLoading, error, transactionHash, transactionReceipt）とメソッド群
 */
export function useJpycContract({ chainId = 31337 }: UseJpycContractOptions) {
  const [state, setState] = useState<JpycContractState>({
    balance: null,
    isLoading: false,
    error: null,
    transactionHash: null,
    transactionReceipt: null,
  });
  const { address } = useConnection();

  /**
   * Public Client を取得（読み取り専用アクセス用）
   * 
   * Viem の Public Client は、readContract、getEvents、watchContractEvent などの
   * 読み取り操作に使用されます。
   * @see https://viem.sh/docs/clients/public
   */
  const publicClient = usePublicClient();

  /**
   * Wallet Client を取得（署名・トランザクション送信用）
   * 
   * wagmi のアクティブコネクタに紐づく Wallet Client を使用して
   * writeContract などの署名操作を実行します。
   * @see https://viem.sh/docs/clients/wallet
   */
  const { data: walletClient } = useWalletClient({ chainId });

  // walletClient が存在することを前提に contract インスタンスを生成
  // walletClient なしで読み取り操作のみを行う場合は別途対応
  // @ts-ignore - walletClient が必須として扱う
  const contract = getContract({
    address: JPYC_ADDRESS,
    abi: JPYC_ABI,
    client: {
      public: publicClient!,
      wallet: walletClient!,
    },
  });

  /**
   * Counter の現在値を読み取る
   * 
   * contract.read.number() で型安全に number() 関数を呼び出し
   * @see https://viem.sh/docs/contract/readContract
   */
  const readBalance = useCallback(async () => {
    try {
      if (!publicClient) {
        throw new Error('Public client not available');
      }

      // contract.read.number() を呼び出し（型安全）
      // viemのコントラクトインスタンスメソッドを使用してコントラクト読み取り
      const balance = await contract.read.balanceOf([address as Address]);

      setState((prev) => ({
        ...prev,
        error: null,
        isLoading: false,
        balance: balance,
      }));

      return balance;
    } catch (error: unknown) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to read counter value',
        isLoading: false,
      }));
      throw error;
    }
  }, [publicClient, chainId]);

  return {
    ...state,
    readBalance,
  };
}
