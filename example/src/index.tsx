import { hydrate, prerender as ssr } from 'preact-iso';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';

import '@rainbow-me/rainbowkit/styles.css';
import './style.css';
import { AppShell } from './app/AppShell';
import { wagmiConfig } from './config/wagmi';

const queryClient = new QueryClient();

export function App() {
	return (
		<QueryClientProvider client={queryClient}>
			<WagmiProvider config={wagmiConfig}>
				<RainbowKitProvider>
					<AppShell />
				</RainbowKitProvider>
			</WagmiProvider>
		</QueryClientProvider>
	);
}

if (typeof window !== 'undefined') {
	hydrate(<App />, document.getElementById('app'));
}

export async function prerender(data) {
	return await ssr(<App {...data} />);
}
