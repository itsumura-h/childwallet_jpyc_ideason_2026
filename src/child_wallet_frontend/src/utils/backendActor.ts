import { AuthClient } from '@icp-sdk/auth/client';
import { HttpAgent } from '@icp-sdk/core/agent';
import type { _SERVICE as TEcdsaBackendService } from '../../../declarations/child_wallet_backend/child_wallet_backend.did';
import { canisterId as tEcdsaBackendCanisterId, createActor } from '../../../declarations/child_wallet_backend';

export const createBackendActor = async (authClient: AuthClient): Promise<TEcdsaBackendService> => {
  const identity = authClient.getIdentity();
  // Vite開発環境ではデフォルトで3000オリジンに向かうため、DFXホストを明示する
  const host = import.meta.env.VITE_DFX_HOST ?? 'http://127.0.0.1:4943';
  const agent = await HttpAgent.create({ identity, host });

  const isDev = import.meta.env.DEV || import.meta.env.MODE !== 'production';
  if (isDev) {
    try {
      console.info('[wallet] fetchRootKey against', host);
      await agent.fetchRootKey();
    } catch (error) {
      console.error('[wallet] fetchRootKey failed - host may be wrong', error);
      throw error;
    }
  }

  // The declarations were generated with @dfinity/agent, but we're using @icp-sdk/core/agent
  // Both HttpAgent implementations are compatible at runtime despite type differences
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const actor = createActor(tEcdsaBackendCanisterId, {
    agent: agent as any,
  }) as TEcdsaBackendService;

  return actor;
};
