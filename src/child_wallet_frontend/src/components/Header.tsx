import { useLocation } from 'preact-iso';

type HeaderProps = {
	isAuthenticated: boolean;
	isLoading: boolean;
	onLogout: () => Promise<void>;
	principal: string | null;
};

export function Header({ isAuthenticated, isLoading, onLogout, principal }: HeaderProps) {
	const { path, route } = useLocation();
	const principalLabel = principal ? `${principal.slice(0, 5)}...${principal.slice(-5)}` : null;

	const handleLogout = async () => {
		await onLogout();
		route('/', true);
	};

	return (
		<header class="sticky top-0 z-10 border-b border-white/5 bg-slate-900/70 backdrop-blur">
			<div class="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
				<a href="/" class="text-lg font-semibold tracking-tight text-white">
					Child Wallet
				</a>
				<nav class="flex flex-1 items-center justify-end gap-3 text-sm">
					<a
						href="/home"
						class={`rounded-full px-4 py-2 transition ${
							path === '/home' ? 'bg-white/15 text-white' : 'text-white/70 hover:text-white'
						}`}
					>
						ホーム
					</a>
					<a
						href="/404"
						class={`rounded-full px-4 py-2 transition ${
							path === '/404' ? 'bg-white/15 text-white' : 'text-white/70 hover:text-white'
						}`}
					>
						404
					</a>
					<div class="h-6 w-px bg-white/10" aria-hidden="true" />
					{isAuthenticated ? (
						<div class="flex items-center gap-3">
							<span class="rounded-full bg-white/10 px-3 py-1 text-xs font-mono text-white/80">
								{principalLabel ?? '認証済み'}
							</span>
							<button
								type="button"
								onClick={handleLogout}
								class="rounded-full bg-gradient-to-r from-sky-500 to-cyan-400 px-4 py-2 text-xs font-semibold text-slate-900 shadow-lg transition hover:shadow-sky-600/40"
							>
								ログアウト
							</button>
						</div>
					) : (
						<span class="text-xs text-white/60">{isLoading ? '認証確認中...' : '未ログイン'}</span>
					)}
				</nav>
			</div>
		</header>
	);
}
