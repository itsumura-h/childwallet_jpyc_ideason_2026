type AppEnvType = 'development' | 'production' | 'test';
type ServiceEnvType = 'frontend';
type WalletConnectProjectIdType = string;

interface EnvironmentConfig {
	VITE_WALLETCONNECT_PROJECT_ID: WalletConnectProjectIdType;
}

type RequiredEnvVars = {
	[service in ServiceEnvType]: {
		[env in AppEnvType]: Array<keyof EnvironmentConfig>;
	};
};

const requiredEnvVars: RequiredEnvVars = {
	frontend: {
		production: ['VITE_WALLETCONNECT_PROJECT_ID'],
		development: [],
		test: [],
	},
};

const defaultValues: EnvironmentConfig = {
	VITE_WALLETCONNECT_PROJECT_ID: '',
};

export const APP_ENV: AppEnvType = (function () {
	const env = import.meta.env.MODE;
	if (!env) {
		throw new Error('MODE is not defined');
	}
	if (!['development', 'production', 'test'].includes(env)) {
		throw new Error('MODE is not development, production, test');
	}
	return env as AppEnvType;
})();

export const SERVICE_ENV: ServiceEnvType = 'frontend';

export const WALLETCONNECT_PROJECT_ID: WalletConnectProjectIdType = (function () {
	const requiredEnvs = requiredEnvVars[SERVICE_ENV][APP_ENV];
	if (!requiredEnvs.includes('VITE_WALLETCONNECT_PROJECT_ID')) {
		return defaultValues.VITE_WALLETCONNECT_PROJECT_ID;
	}

	const env = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;
	if (!env) {
		throw new Error('VITE_WALLETCONNECT_PROJECT_ID is not defined');
	}
	return env as WalletConnectProjectIdType;
})();
