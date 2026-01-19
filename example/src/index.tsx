import { hydrate, prerender as ssr } from 'preact-iso';
import './style.css';
import { AppShell } from './app/AppShell';
import WalletProvider from './config/provider';

export function App() {
	return (
		<WalletProvider>
			<AppShell />
		</WalletProvider>
	);
}

if (typeof window !== 'undefined') {
	hydrate(<App />, document.getElementById('app'));
}

export async function prerender(data) {
	return await ssr(<App {...data} />);
}
