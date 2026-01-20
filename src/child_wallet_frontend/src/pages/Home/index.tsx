import type { UseIcpAuthResult } from '../../hooks/icpAuth';

type HomeProps = {
	auth: UseIcpAuthResult;
};

export function Home({ auth }: HomeProps) {
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
