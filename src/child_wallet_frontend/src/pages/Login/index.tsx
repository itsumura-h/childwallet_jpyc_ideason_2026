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
		<div class="min-h-screen w-full bg-gradient-to-b from-purple-400 via-pink-300 to-purple-300 flex flex-col items-center justify-center p-4 safe-area">
			<div class="w-full max-w-sm">

				{/* メインカード */}
				<div class="bg-white rounded-3xl shadow-2xl p-6 mb-6">
					<div class="text-center mb-6">
						<div class="text-5xl mb-3">🔐</div>
						<h2 class="text-2xl font-bold text-purple-600">ログインしよう</h2>
					</div>

					{/* ステータス表示 */}
					<div class="bg-gradient-to-r from-purple-100 to-pink-100 rounded-2xl p-4 mb-6">
						<p class="text-sm text-purple-700 font-semibold">
							{auth.isLoading ? '🔄 確認中...' : auth.isAuthenticated ? '✅ ログイン済み' : '⭕ ログインしてね'}
						</p>
					</div>

					{/* ログインボタン */}
					<button
						type="button"
						onClick={handleLogin}
						disabled={auth.isAuthenticated || auth.isLoading}
						class={`w-full py-4 px-6 rounded-2xl font-bold text-lg transition transform active:scale-95 ${
							auth.isAuthenticated || auth.isLoading
								? 'bg-gray-300 text-gray-600 cursor-not-allowed'
								: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg hover:shadow-xl'
						}`}
					>
						{auth.isLoading ? '確認中...' : 'ログインする'}
					</button>

					{/* 説明テキスト */}
					<p class="text-center text-sm text-gray-600 mt-4">
						きみだけの おさいふ だよ
					</p>
				</div>
			</div>
		</div>
	);
}
