import { AuthClient } from '@icp-sdk/auth/client';
import { HttpAgent } from '@icp-sdk/core/agent';
import {createActor, type Child_wallet_backend } from "../bindings/child_wallet_backend/child_wallet_backend";

const canisterId = import.meta.env.VITE_CANISTER_ID_CHILD_WALLET_BACKEND;

export type BackendActor = Child_wallet_backend;

export const createBackendActor = async (authClient: AuthClient): Promise<Child_wallet_backend> => {
  const identity = authClient.getIdentity();
  // Vite開発環境ではデフォルトで3000オリジンに向かうため、DFXホストを明示する
  const host = import.meta.env.VITE_DFX_HOST ?? 'http://127.0.0.1:4943';
  
  const isDev = import.meta.env.DEV || import.meta.env.MODE !== 'production';
  
  console.debug('[backendActor] Creating HttpAgent with host:', host, 'isDev:', isDev);
  
  // @icp-sdk/core/agent を使用
  const agent = await HttpAgent.create({ identity, host });

  if (isDev) {
    try {
      console.info('[wallet] fetchRootKey against', host);
      await agent.fetchRootKey();
      console.info('[wallet] fetchRootKey succeeded');
    } catch (error) {
      console.warn('[wallet] fetchRootKey failed but continuing (this is expected in local dev)', error);
      // 開発環境では失敗しても続行
      // ローカル DFX では証明書が自己署名であるため、検証エラーが起こる場合がある
    }
  }

  const actor = createActor(canisterId, { agent });

  console.debug('[backendActor] Actor created for canister:', canisterId);
  
  return actor;
};
