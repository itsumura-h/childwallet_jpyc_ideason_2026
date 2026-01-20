import { useEffect } from 'preact/hooks';
import { LocationProvider, Router, Route, hydrate, prerender as ssr, useLocation } from 'preact-iso';

import { useIcpAuth } from './hooks/icpAuth';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Payment } from './pages/Payment';
import { NotFound } from './pages/_404';
import './style.css';

function AppShell() {
	const auth = useIcpAuth();
	const { path, route } = useLocation();

	// Guard routes based on authentication state
	useEffect(() => {
		if (auth.isLoading) return;

		if (!auth.isAuthenticated && path !== '/') {
			route('/', true);
			return;
		}

		if (auth.isAuthenticated && path === '/') {
			route('/home', true);
		}
	}, [auth.isAuthenticated, auth.isLoading, path, route]);

	// Periodically refresh the session to detect expiry
	useEffect(() => {
		if (auth.isLoading) return;

		const refreshInterval = setInterval(() => {
			auth.refresh();
		}, 60 * 1000);

		return () => clearInterval(refreshInterval);
	}, [auth.refresh, auth.isLoading]);

	return (
		<main class="w-full h-screen">
			<Router>
				<Route path="/" component={() => <Login auth={auth} />} />
				<Route path="/home" component={() => <Home auth={auth} />} />
				<Route path="/payment" component={() => <Payment auth={auth} />} />
				<Route default component={NotFound} />
			</Router>
		</main>
	);
}

export function App() {
	return (
		<LocationProvider>
			<AppShell />
		</LocationProvider>
	);
}

if (typeof window !== 'undefined') {
	hydrate(<App />, document.getElementById('app'));
}

export async function prerender(data) {
	return await ssr(<App {...data} />);
}
