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
  bytesToHex,
  createWalletClient,
  http,
  keccak256,
  serializeTransaction,
  hashMessage,
  serializeSignature,
  hexToBytes,
} from 'viem';
import { toAccount } from 'viem/accounts';
import { secp256k1 } from '@noble/curves/secp256k1.js';
import { AuthClient } from '@icp-sdk/auth/client';
import { createBackendActor, type BackendActor } from '../utils/backendActor';
import { DEFAULT_WALLET_NONCE, publicKeyToEvmAddress, publicKeyToHex } from '../utils/evmAddress';

const ensurePublicKey = async (actor: BackendActor, nonce: number) => {
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
  actor: BackendActor,
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
  actor: BackendActor,
  nonce: number = DEFAULT_WALLET_NONCE,
): Promise<{ address: Address; publicKeyHex: string; publicKeyBytes: Uint8Array }> => {
  const publicKey = await fetchPublicKeyWithFallback(actor, nonce);
  const publicKeyBytes = Uint8Array.from(publicKey);
  const address = publicKeyToEvmAddress(publicKey);
  const publicKeyHex = publicKeyToHex(publicKey);

  return { address, publicKeyHex, publicKeyBytes };
};

/**
 * 注: 署名時は必ずtoIcpAccountで確定したnonceを使用する必要があります。
 * localStorageから別のnonceを取得すると、公開鍵が見つからないエラーが発生します。
 * 現在は、nonceは createIcpWalletClient のパラメータで明示的に指定されています。
 */

const toIcpAccount = async (
  authClient: AuthClient,
  nonce: number = DEFAULT_WALLET_NONCE,
): Promise<LocalAccount> => {
  const actor = await createBackendActor(authClient);  
  
  console.debug('[ICP Wallet] toIcpAccount: Ensuring public key with nonce:', nonce);
  await ensurePublicKey(actor, nonce);
  console.debug('[ICP Wallet] toIcpAccount: Public key ensured for nonce:', nonce);
  const { address, publicKeyBytes } = await resolveAddress(actor, nonce);

  const deriveSignatureWithRecovery = (
    signature: Uint8Array | number[],
    messageHash: Uint8Array,
  ): { signature: Signature; serialized: Hex } => {
    const compactSig = Uint8Array.from(signature);
    const hash = Uint8Array.from(messageHash);

    // 署名は64バイト (r:32, s:32) で返ってくる
    if (compactSig.length !== 64) {
      throw new Error(`Invalid signature length: ${compactSig.length * 2} hex chars, expected 128`);
    }

    let recoveryBit: number | null = null;
    for (let rec = 0; rec < 2; rec++) {
      try {
        const recoveredSig = new Uint8Array(65);
        recoveredSig[0] = rec;
        recoveredSig.set(compactSig, 1);

        const recovered = secp256k1.recoverPublicKey(recoveredSig, hash, { prehash: false });
        const matches =
          recovered.length === publicKeyBytes.length &&
          recovered.every((byte, idx) => byte === publicKeyBytes[idx]);
        console.debug('[ICP Wallet] deriveSignatureWithRecovery: recovery', rec, 'match:', matches);
        if (matches) {
          recoveryBit = rec;
          break;
        }
      } catch (error) {
        console.warn('[ICP Wallet] deriveSignatureWithRecovery: recovery failed for bit', rec, error);
      }
    }

    if (recoveryBit !== 0 && recoveryBit !== 1) {
      throw new Error('Failed to derive recovery bit from ICP signature');
    }

    const r = bytesToHex(compactSig.slice(0, 32)) as Hex;
    const s = bytesToHex(compactSig.slice(32, 64)) as Hex;
    const v = 27n + BigInt(recoveryBit);

    console.debug('[ICP Wallet] Parsed signature - r:', r, 's:', s, 'v:', v.toString());

    const sig: Signature = { r, s, v };
    const serialized = serializeSignature(sig);

    return { signature: sig, serialized };
  };

  const signMessage = async ({
    message,
  }: {
    message: SignableMessage;
  }): Promise<Hex> => {
    const hash = hashMessage(message);
    const hashBytes = hexToBytes(hash);
    console.debug('[ICP Wallet] signMessage: Using nonce:', nonce);
    const { signature } = await actor.sign(hashBytes, nonce);
    const { serialized } = deriveSignatureWithRecovery(signature, hashBytes);
    return serialized;
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
    try {
      console.debug('[ICP Wallet] Starting transaction signature');
      console.debug('[ICP Wallet] Transaction object:', {
        to: (transaction as any).to,
        from: (transaction as any).from,
        data: (transaction as any).data?.slice(0, 66) + '...',
        value: (transaction as any).value,
        gas: (transaction as any).gas,
        gasPrice: (transaction as any).gasPrice,
        nonce: (transaction as any).nonce,
      });
      
      const serialized = args.serializer(transaction) as string;
      console.debug('[ICP Wallet] Transaction serialized:', typeof serialized, (serialized as string).length, 'bytes');
      console.debug('[ICP Wallet] Serialized transaction (first 50 chars):', (serialized as string).slice(0, 50));
      
      const hash = keccak256(serialized as `0x${string}`);
      console.debug('[ICP Wallet] Transaction hash:', hash);
      
      const hashBytes = hexToBytes(hash);
      console.debug('[ICP Wallet] Hash bytes length:', hashBytes.length);
      console.debug('[ICP Wallet] Calling actor.sign with nonce:', nonce);
      
      const { signature } = await actor.sign(hashBytes, nonce);
      console.debug('[ICP Wallet] Signature received, length:', Array.isArray(signature) ? signature.length : (signature as Uint8Array).length);
      console.debug('[ICP Wallet] Signature (first 20 bytes):', Array.from((signature as Uint8Array | number[]).slice(0, 20)).map(b => b.toString(16).padStart(2, '0')).join(' '));

      const { signature: parsedSignature } = deriveSignatureWithRecovery(signature, hashBytes);

      console.debug('[ICP Wallet] Re-serializing transaction with signature...');
      const signedTx = args.serializer(transaction, parsedSignature);
      const signedTxStr = signedTx as unknown as string;
      console.debug('[ICP Wallet] Signed transaction (first 50 chars):', signedTxStr.slice(0, 50));
      console.debug('[ICP Wallet] Signed transaction length:', signedTxStr.length, 'bytes');
      
      return signedTx;
    } catch (error) {
      console.error('[ICP Wallet] Transaction signature failed:', error);
      throw error;
    }
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
  console.debug('[ICP Wallet] createIcpWalletClient called with options:', {
    nonce: options.nonce,
    chain: options.chain?.name,
    transportUrl: (options.transport as any)?.url,
  });
  
  if (!(await options.authClient.isAuthenticated())) {
    throw new Error('Auth client must be authenticated before creating wallet client.');
  }

  const nonce = options.nonce ?? DEFAULT_WALLET_NONCE;
  console.debug('[ICP Wallet] Creating ICP account with nonce:', nonce);
  
  const account = await toIcpAccount(options.authClient, nonce);
  console.debug('[ICP Wallet] ICP account created:', {
    address: account.address,
    type: account.type,
  });
  
  const walletClient = createWalletClient({
    account,
    chain: options.chain,
    transport: options.transport ?? http(), // transportがundefinedまたは未指定の場合はダミー値を使用
  });
  
  console.debug('[ICP Wallet] Wallet client created successfully:', {
    address: walletClient.account?.address,
    chain: walletClient.chain?.name,
    mode: (walletClient as any).mode,
  });

  return walletClient;
}
