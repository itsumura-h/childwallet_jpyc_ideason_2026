import {
  type Address,
  type Chain,
  type Hex,
  type LocalAccount,
  type RpcSchema,
  type WalletClient,
  type HttpTransport,
  type SignableMessage,
  type Signature,
  type TransactionSerializable,
  type SerializeTransactionFn,
  type TypedData,
  type TypedDataDefinition,
  createWalletClient,
  http,
  keccak256,
  serializeTransaction,
  hashMessage,
  serializeSignature,
  hexToBytes,
} from 'viem';
import { toAccount } from 'viem/accounts';
import { AuthClient } from '@icp-sdk/auth/client';
import type { _SERVICE as TEcdsaBackendService } from '../../../declarations/child_wallet_backend/child_wallet_backend.did';
import { createBackendActor } from '../utils/backendActor';
import { DEFAULT_WALLET_NONCE, publicKeyToEvmAddress, publicKeyToHex } from '../utils/evmAddress';

const ensurePublicKey = async (actor: TEcdsaBackendService, nonce: number) => {
  try {
    const { publicKey } = await actor.getPublicKey(nonce);
    return publicKey;
  } catch (error) {
    console.warn('Failed to fetch existing public key, requesting a new one.', error);
    const { publicKey } = await actor.createPublicKey(nonce);
    return publicKey;
  }
};

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

const getStoredNonce = (defaultNonce: number): number => {
  let currentNonce = defaultNonce;
  if (typeof window !== 'undefined') {
    try {
      const raw = window.localStorage.getItem('child-wallet:evm-address');
      if (raw) {
        const stored = JSON.parse(raw);
        currentNonce = stored.nonce ?? defaultNonce;
      }
    } catch {
      // localStorageから取得失敗時はデフォルトのnonceを使用
    }
  }
  return currentNonce;
};

const toIcpAccount = async (
  authClient: AuthClient,
  nonce: number = DEFAULT_WALLET_NONCE,
): Promise<LocalAccount> => {
  const actor = await createBackendActor(authClient);
  await ensurePublicKey(actor, nonce);
  const { address } = await resolveAddress(actor, nonce);

  const signMessage = async ({
    message,
  }: {
    message: SignableMessage;
  }): Promise<Hex> => {
    const hash = hashMessage(message);
    const hashBytes = hexToBytes(hash);
    const currentNonce = getStoredNonce(nonce);
    const { signature } = await actor.sign(hashBytes, currentNonce);
    
    // Uint8Array | number[] を16進文字列に変換
    const sigHex = Array.from(signature as Uint8Array | number[])
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    // 署名は65バイト (130文字) である必要がある
    if (sigHex.length !== 130) {
      throw new Error(`Invalid signature length: ${sigHex.length}, expected 130`);
    }
    
    const r = '0x' + sigHex.slice(0, 64);
    const s = '0x' + sigHex.slice(64, 128);
    let v = parseInt(sigHex.slice(128, 130), 16);
    
    // Ethereumの署名では、v値は27または28である必要がある
    // recovery IDが0または1の場合、27を加算する
    if (v < 27) {
      v += 27;
    }
    
    console.log('Parsed signature - r:', r, 's:', s, 'v:', v);
    
    const sig: Signature = {
      r: r as Hex,
      s: s as Hex,
      v: BigInt(v),
    };
    
    return serializeSignature(sig);
  };

  const signTransaction = async<
    TTransactionSerializable extends TransactionSerializable,
  >(
    transaction: TTransactionSerializable,
    args?: {
      serializer?: SerializeTransactionFn<TTransactionSerializable>;
    }
  ): Promise<Hex> => {
    if (!args?.serializer) {
      return signTransaction(transaction, {
        serializer: serializeTransaction,
      });
    }
    const serialized = args.serializer(transaction);
    const hash = keccak256(serialized as `0x${string}`);
    const hashBytes = hexToBytes(hash);
    const currentNonce = getStoredNonce(nonce);
    const { signature } = await actor.sign(hashBytes, currentNonce);

    // Uint8Array | number[] を16進文字列に変換
    const sigHex = Array.from(signature as Uint8Array | number[])
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    // 署名は65バイト (130文字) である必要がある
    if (sigHex.length !== 130) {
      throw new Error(`Invalid signature length: ${sigHex.length}, expected 130`);
    }
    
    const r = '0x' + sigHex.slice(0, 64);
    const s = '0x' + sigHex.slice(64, 128);
    let v = parseInt(sigHex.slice(128, 130), 16);
    
    // Ethereumの署名では、v値は27または28である必要がある
    // recovery IDが0または1の場合、27を加算する
    if (v < 27) {
      v += 27;
    }
    
    console.log('Parsed signature - r:', r, 's:', s, 'v:', v);
    
    const sig: Signature = {
      r: r as Hex,
      s: s as Hex,
      v: BigInt(v),
    };
    
    return args.serializer(transaction, sig);
  };

  const signTypedData = async <
    typedData extends TypedData | Record<string, unknown>,
    primaryType extends keyof typedData | 'EIP712Domain' = keyof typedData,
  >(
    _typedData: TypedDataDefinition<typedData, primaryType>,
  ): Promise<Hex> => {
    throw new Error('Typed data signing is not supported yet for ICP wallet.');
  };

  return toAccount({
    address,
    signMessage,
    signTransaction,
    signTypedData,
  });
};

export interface CreateIcpWalletOptions {
  authClient: AuthClient;
  chain: Chain;
  transport?: HttpTransport | undefined;
  nonce?: number;
}

// export type IcpWalletClient<TChain extends Chain = Chain> = WalletClient<HttpTransport, TChain, LocalAccount>;
export type IcpWalletClient = WalletClient<HttpTransport, Chain, LocalAccount, RpcSchema>;

export async function createIcpWalletClient(
  options: CreateIcpWalletOptions,
): Promise<IcpWalletClient> {
  if (!(await options.authClient.isAuthenticated())) {
    throw new Error('Auth client must be authenticated before creating wallet client.');
  }

  const nonce = options.nonce ?? DEFAULT_WALLET_NONCE;
  const account = await toIcpAccount(options.authClient, nonce);
  const walletClient = createWalletClient({
    account,
    chain: options.chain,
    transport: options.transport ?? http(), // transportがundefinedまたは未指定の場合はダミー値を使用
  });

  return walletClient;
}
