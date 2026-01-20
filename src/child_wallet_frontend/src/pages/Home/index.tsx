import type { UseIcpAuthResult } from '../../hooks/icpAuth';
import { useEvmAddress } from '../../hooks/useEvmAddress';

type HomeProps = {
	auth: UseIcpAuthResult;
};

export function Home({ auth }: HomeProps) {
	const evm = useEvmAddress(auth);
	return (
		<div class="space-y-6">
			<section class="rounded-2xl border border-white/10 bg-white/5 p-8 shadow-lg shadow-sky-900/30">
				<p class="text-sm uppercase tracking-[0.2em] text-sky-300">Session</p>
				<h1 class="mt-2 text-3xl font-semibold text-white">ログイン中です</h1>
				<p class="mt-3 text-sm text-white/70">
					Internet Identityのセッションが有効な間、Child Walletの機能にアクセスできます。
				</p>
				<div class="mt-5 rounded-xl border border-white/10 bg-black/30 px-4 py-3 font-mono text-sm text-sky-100">
					<span class="text-white/60">Principal:</span>{' '}
					{auth.principal ?? 'Principalを取得できませんでした'}
				</div>
				<div class="mt-3 grid gap-3 md:grid-cols-2">
					<div class="rounded-xl border border-white/10 bg-slate-900/60 px-4 py-3">
						<p class="text-xs uppercase tracking-[0.2em] text-sky-200">EVM Address</p>
						<p class="mt-2 font-mono text-sm text-white/90">
							{evm.evmAddress ?? (evm.isLoading ? '取得中...' : '未取得')}
						</p>
						<p class="mt-1 text-xs text-white/60">nonce: {evm.nonce}</p>
					</div>
					<div class="rounded-xl border border-white/10 bg-slate-900/60 px-4 py-3">
						<p class="text-xs uppercase tracking-[0.2em] text-sky-200">Public Key</p>
						<p class="mt-2 font-mono text-xs text-white/70 break-all">
							{evm.publicKeyHex ?? (evm.isLoading ? '取得中...' : '未取得')}
						</p>
					</div>
				</div>
				<div class="mt-3 flex items-center gap-3">
					<button
						type="button"
						onClick={() => evm.refresh()}
						disabled={evm.isLoading}
						class={`rounded-lg px-4 py-2 text-sm font-semibold text-slate-900 shadow-md transition ${
							evm.isLoading
								? 'cursor-not-allowed bg-white/30 text-white/70'
								: 'bg-gradient-to-r from-sky-500 to-cyan-400 hover:-translate-y-0.5'
						}`}
					>
						{evm.isLoading ? '更新中...' : 'アドレスを再取得'}
					</button>
					{evm.error ? <span class="text-xs text-red-300">{evm.error}</span> : null}
				</div>
			</section>

			<section class="grid gap-4 md:grid-cols-3">
				<Card
					title="ウォレットを確認"
					body="子ウォレットのEVMアドレスや署名機能にアクセスするための下準備が完了しています。"
				/>
				<Card
					title="セッションを維持"
					body="定期的に認証状態をチェックし、セッション切れを検知したら自動的にログイン画面へ戻ります。"
				/>
				<Card
					title="次の実装"
					body="バックエンド連携や残高表示など、必要な画面をこのホームから広げていけます。"
				/>
			</section>
		</div>
	);
}

type CardProps = {
	title: string;
	body: string;
};

function Card({ title, body }: CardProps) {
	return (
		<div class="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/70 via-slate-900 to-slate-950 p-6 shadow-lg shadow-sky-900/30">
			<h2 class="text-lg font-semibold text-white">{title}</h2>
			<p class="mt-2 text-sm text-white/70">{body}</p>
		</div>
	);
}
