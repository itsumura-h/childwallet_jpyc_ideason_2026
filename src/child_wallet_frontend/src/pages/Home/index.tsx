import { useLocation } from 'preact-iso';
import type { UseIcpAuthResult } from '../../hooks/icpAuth';
import { useEvmAddress } from '../../hooks/useEvmAddress';

type HomeProps = {
	auth: UseIcpAuthResult;
};

export function Home({ auth }: HomeProps) {
	const evm = useEvmAddress(auth);
	const { route } = useLocation();
	return (
		<div class="min-h-screen w-full bg-gradient-to-b from-green-300 via-blue-300 to-purple-300 p-4 safe-area flex flex-col items-center justify-start">
			<div class="w-full max-w-sm pt-6 space-y-5">

				{/* メインカード - ウォレットアドレス表示 */}
				<div class="bg-white rounded-3xl shadow-2xl p-6">
					<div class="text-center mb-6">
						<p class="text-sm text-gray-500 font-semibold mb-3">🎯 ウォレットアドレス</p>
						<div class="bg-gradient-to-r from-blue-100 to-purple-100 rounded-2xl p-6">
							{evm.isLoading ? (
								<div class="flex items-center justify-center gap-2">
									<span class="text-2xl">⏳</span>
									<p class="text-lg text-gray-600 font-semibold">読み込み中...</p>
								</div>
							) : evm.evmAddress ? (
								<div>
									<p class="text-xs text-gray-600 mb-2">コピーして つかおう！</p>
									<p class="font-mono text-sm text-purple-700 font-bold break-all">
										{evm.evmAddress}
									</p>
									<button
										type="button"
										onClick={() => {
											if (evm.evmAddress) {
												navigator.clipboard.writeText(evm.evmAddress);
												alert('✅ コピーしました！');
											}
										}}
										class="mt-4 w-full py-2 px-4 bg-gradient-to-r from-blue-400 to-purple-400 text-white font-bold rounded-xl active:scale-95 transition transform"
									>
										📋 コピーする
									</button>
								</div>
							) : (
								<div class="text-center">
									<p class="text-lg text-red-500 font-semibold">❌ アドレスを取得できませんでした</p>
									<button
										type="button"
										onClick={() => evm.refresh()}
										class="mt-4 py-2 px-4 bg-orange-400 text-white font-bold rounded-xl active:scale-95 transition transform"
									>
										🔄 もう一度やってみる
									</button>
								</div>
							)}
						</div>
					</div>
				</div>

				{/* おかねを おくる */}
				<button
					type="button"
					onClick={() => route('/payment')}
					class="w-full py-3 px-4 bg-gradient-to-r from-green-400 via-blue-400 to-purple-400 text-white font-bold rounded-2xl shadow-lg active:scale-95 transition transform"
				>
					<span class="text-xl mr-2">💸</span>
					おかねを おくる
				</button>

				{/* ログアウトボタン */}
				<button
					type="button"
					onClick={auth.logout}
					class="w-full py-3 px-4 bg-gradient-to-r from-red-400 to-pink-400 text-white font-bold rounded-2xl shadow-lg active:scale-95 transition transform"
				>
					<span class="text-xl mr-2">👋</span>
					ログアウト
				</button>
			</div>
		</div>
	);
}
