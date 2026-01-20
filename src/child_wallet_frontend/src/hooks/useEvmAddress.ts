import { useCallback, useEffect, useState } from 'preact/hooks';
import type { Address } from 'viem';
import type { _SERVICE as TEcdsaBackendService } from '../../../declarations/child_wallet_backend/child_wallet_backend.did';
import { createBackendActor } from '../utils/backendActor';
import { DEFAULT_WALLET_NONCE, publicKeyToEvmAddress, publicKeyToHex } from '../utils/evmAddress';
import type { UseIcpAuthResult } from './icpAuth';

type StoredEvmAddress = {
  principal: string;
  nonce: number;
  publicKeyHex: string;
  evmAddress: Address;
  updatedAt: number;
};

export type UseEvmAddressResult = {
  evmAddress: Address | null;
  nonce: number;
  publicKeyHex: string | null;
  isLoading: boolean;
  error: string | null;
  refresh: (nonceOverride?: number) => Promise<void>;
};

const STORAGE_KEY = 'child-wallet:evm-address';

const toErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const fetchPublicKeyWithFallback = async (
  actor: TEcdsaBackendService,
  nonce: number,
): Promise<Uint8Array | number[]> => {
  try {
    const response = await actor.getPublicKey(nonce);
    const { publicKey } = response;
    return publicKey;
  } catch (error) {
    const message = toErrorMessage(error);
    if (!message.includes('public key not found')) {
      throw error;
    }

    const response = await actor.createPublicKey(nonce);
    const { publicKey } = response;
    return publicKey;
  }
};

export const useEvmAddress = (auth: UseIcpAuthResult): UseEvmAddressResult => {
  const [evmAddress, setEvmAddress] = useState<Address | null>(null);
  const [publicKeyHex, setPublicKeyHex] = useState<string | null>(null);
  const [nonce, setNonce] = useState<number>(DEFAULT_WALLET_NONCE);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFromStorage = useCallback((): StoredEvmAddress | null => {
    if (typeof window === 'undefined' || !auth.principal) {
      return null;
    }

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return null;
      }

      const parsed = JSON.parse(raw) as StoredEvmAddress;
      if (parsed.principal !== auth.principal) {
        return null;
      }

      return parsed;
    } catch {
      return null;
    }
  }, [auth.principal]);

  const persist = useCallback(
    (payload: StoredEvmAddress) => {
      if (typeof window === 'undefined') {
        return;
      }

      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      } catch {
        // ignore
      }
    },
    [],
  );

  const refresh = useCallback(
    async (nonceOverride?: number) => {
      if (!auth.isAuthenticated || !auth.authClient || !auth.principal) {
        return;
      }

      const targetNonce = nonceOverride ?? DEFAULT_WALLET_NONCE;
      console.log('[isLoading] SET TRUE - refresh start');
      setIsLoading(true);
      setError(null);

      try {
        const actor = await createBackendActor(auth.authClient);
        const publicKey = await fetchPublicKeyWithFallback(actor, targetNonce);
        const address = publicKeyToEvmAddress(publicKey);
        const publicKeyHexValue = publicKeyToHex(publicKey);

        const payload: StoredEvmAddress = {
          principal: auth.principal,
          nonce: targetNonce,
          publicKeyHex: publicKeyHexValue,
          evmAddress: address,
          updatedAt: Date.now(),
        };

        setNonce(targetNonce);
        setPublicKeyHex(publicKeyHexValue);
        setEvmAddress(address);
        persist(payload);
        console.log('[isLoading] SUCCESS - data fetched');
      } catch (fetchError) {
        console.log('[isLoading] ERROR - ', toErrorMessage(fetchError));
        setError(toErrorMessage(fetchError));
      } finally {
        console.log('[isLoading] SET FALSE - finally block');
        setIsLoading(false);
      }
    },
    [auth.authClient, auth.isAuthenticated, auth.principal, persist],
  );

  useEffect(() => {
    if (!auth.isAuthenticated || !auth.principal || !auth.authClient) {
      console.log('[isLoading] SET FALSE - unauthenticated');
      setEvmAddress(null);
      setPublicKeyHex(null);
      setError(null);
      setNonce(DEFAULT_WALLET_NONCE);
      setIsLoading(false);
      return;
    }

    const stored = loadFromStorage();
    if (stored) {
      console.log('[isLoading] SET FALSE - loaded from storage');
      setNonce(stored.nonce ?? DEFAULT_WALLET_NONCE);
      setPublicKeyHex(stored.publicKeyHex);
      setEvmAddress(stored.evmAddress);
      setIsLoading(false);
      setError(null);
      return;
    }

    console.log('[isLoading] CALLING refresh - storage miss');
    void refresh(DEFAULT_WALLET_NONCE);
  }, [auth.authClient, auth.isAuthenticated, auth.principal]);

  return {
    evmAddress,
    nonce,
    publicKeyHex,
    isLoading,
    error,
    refresh,
  };
};
