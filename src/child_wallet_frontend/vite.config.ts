import { defineConfig } from "vite";
import preact from "@preact/preset-vite";
import EnvironmentPlugin, {
  type EnvVarDefaults,
} from "vite-plugin-environment";
import tailwindcss from "@tailwindcss/vite";
import { icpBindgen } from "@icp-sdk/bindgen/plugins/vite";

import { config } from "dotenv";
config({ path: `${process.cwd()}/../../.env` });

const envVarsToInclude = [
  // put the ENV vars you want to expose here
  "DFX_VERSION",
  "DFX_NETWORK",
  "CANISTER_ID_INTERNET_IDENTITY",
  "CANISTER_ID_CHILD_WALLET_FRONTEND",
  "CANISTER_ID_CHILD_WALLET_BACKEND",
  "CANISTER_ID",
  "CANISTER_CANDID_PATH",
];
const esbuildEnvs = Object.fromEntries(
  envVarsToInclude.map(key => [
    `process.env.${key}`,
    JSON.stringify(process.env[key]),
  ])
);

const viteEnvMap: EnvVarDefaults = Object.fromEntries(
  envVarsToInclude.map(entry => [entry, undefined])
);


// https://vitejs.dev/config/
export default defineConfig({
	optimizeDeps: {
    esbuildOptions: {
      define: {
        global: "globalThis",
        ...esbuildEnvs,
      },
    },
  },
	plugins: [
		icpBindgen({
			didFile: '../declarations/child_wallet_backend/child_wallet_backend.did',
			outDir: './src/bindings/child_wallet_backend',
		}),
		icpBindgen({
			didFile: '../declarations/internet_identity/internet_identity.did',
			outDir: './src/bindings/internet_identity',
		}),
		preact({
			prerender: {
				enabled: true,
				renderTarget: '#app',
				additionalPrerenderRoutes: ['/404'],
				previewMiddlewareEnabled: true,
				previewMiddlewareFallback: '/404',
			},
		}),
		tailwindcss(),
    EnvironmentPlugin(viteEnvMap),
	],
});
