import { useEffect } from 'preact/hooks';
import { useLocation } from 'preact-iso';
import { identityProvider, type UseIcpAuthResult } from '../../hooks/icpAuth';

type LoginProps = {
	auth: UseIcpAuthResult;
};

export function Login({ auth }: LoginProps) {
	const { route } = useLocation();

	// ログイン済みならホームへ遷移
	useEffect(() => {
		if (!auth.isLoading && auth.isAuthenticated) {
			route('/home', true);
		}
	}, [auth.isAuthenticated, auth.isLoading, route]);

	const handleLogin = async () => {
		const success = await auth.login();
		if (success) {
			route('/home', true);
		}
	};

	return (
		<div class="flex min-h-[70vh] items-center justify-center">
			<div class="w-full max-w-xl rounded-2xl border border-white/10 bg-white/5 p-10 shadow-2xl shadow-sky-900/40 backdrop-blur">
				<p class="text-xs uppercase tracking-[0.25em] text-sky-300">internet identity</p>
				<h1 class="mt-3 text-3xl font-semibold text-white">Child Wallet へログイン</h1>
				<p class="mt-3 text-sm text-white/70">
					Internet Identityで本人確認を行い、認証済みのセッションを開始します。
				</p>

				<div class="mt-6 rounded-xl border border-white/10 bg-slate-900/70 px-4 py-3 text-xs text-white/70">
					<div class="flex items-center justify-between gap-2">
						<span class="text-white/60">Provider</span>
						<span class="truncate font-mono text-[11px] text-sky-200">{identityProvider}</span>
					</div>
					<div class="mt-2 flex items-center justify-between text-white/60">
						<span>状態</span>
						<span class="text-white">
							{auth.isLoading ? '確認中...' : auth.isAuthenticated ? 'ログイン済み' : '未ログイン'}
						</span>
					</div>
				</div>

				<button
					type="button"
					onClick={handleLogin}
					disabled={auth.isAuthenticated || auth.isLoading}
					class={`mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-400 px-6 py-3 text-base font-semibold text-slate-900 shadow-lg shadow-sky-700/40 transition ${
						auth.isAuthenticated || auth.isLoading ? 'cursor-not-allowed opacity-70' : 'hover:-translate-y-0.5'
					}`}
				>
					<span>Internet Identityでログイン</span>
				</button>

				<ul class="mt-6 space-y-2 text-xs text-white/60">
					<li>・ログイン済みでトップに戻ると自動でホームへ遷移します。</li>
					<li>・セッションが切れた場合は自動的にログイン画面に戻ります。</li>
				</ul>
			</div>
		</div>
	);
}
