import {
  type Address,
  type Chain,
  type Hex,
  type LocalAccount,
  type RpcSchema,
  type WalletClient,
  type HttpTransport,
  createWalletClient,
  http,
} from 'viem';
import { toAccount } from 'viem/accounts';
import { AuthClient } from '@icp-sdk/auth/client';
import type { _SERVICE as TEcdsaBackendService } from '../../../declarations/child_wallet_backend/child_wallet_backend.did';
import { createBackendActor } from '../utils/backendActor';
import { DEFAULT_WALLET_NONCE, publicKeyToEvmAddress, publicKeyToHex } from '../utils/evmAddress';

const fetchPublicKeyWithFallback = async (
  actor: TEcdsaBackendService,
  nonce: number,
): Promise<Uint8Array | number[]> => {
  try {
    const { publicKey } = await actor.getPublicKey(nonce);
    return publicKey;
  } catch (error) {
    // 公開鍵が未生成の場合のみ生成を試みる
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes('public key not found')) {
      throw error;
    }

    const { publicKey } = await actor.createPublicKey(nonce);
    return publicKey;
  }
};

const resolveAddress = async (
  actor: TEcdsaBackendService,
  nonce: number = DEFAULT_WALLET_NONCE,
): Promise<{ address: Address; publicKeyHex: string }> => {
  const publicKey = await fetchPublicKeyWithFallback(actor, nonce);
  const address = publicKeyToEvmAddress(publicKey);
  const publicKeyHex = publicKeyToHex(publicKey);

  return { address, publicKeyHex };
};

const toIcpAccount = async (authClient: AuthClient): Promise<LocalAccount> => {
  const actor = await createBackendActor(authClient);
  const { address, publicKeyHex } = await resolveAddress(actor, DEFAULT_WALLET_NONCE);
  console.info('Resolved EVM address from public key:', publicKeyHex);

  const notImplemented = async (): Promise<Hex> => {
    throw new Error('EVM signing is not implemented yet for the ICP wallet.');
  };

  return toAccount({
    address,
    signMessage: notImplemented,
    signTransaction: notImplemented,
    signTypedData: notImplemented,
  });
};

export interface CreateIcpWalletOptions {
  authClient: AuthClient;
  chain: Chain;
  transport?: HttpTransport | undefined;
}

// export type IcpWalletClient<TChain extends Chain = Chain> = WalletClient<HttpTransport, TChain, LocalAccount>;
export type IcpWalletClient = WalletClient<HttpTransport, Chain, LocalAccount, RpcSchema>;

export async function createIcpWalletClient(
  options: CreateIcpWalletOptions,
): Promise<IcpWalletClient> {
  if (!(await options.authClient.isAuthenticated())) {
    throw new Error('Auth client must be authenticated before creating wallet client.');
  }

  const account = await toIcpAccount(options.authClient);
  const walletClient = createWalletClient({
    account,
    chain: options.chain,
    transport: options.transport ?? http(), // transportがundefinedまたは未指定の場合はダミー値を使用
  });

  return walletClient;
}
