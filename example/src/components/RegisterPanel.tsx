import { useEffect, useMemo, useState } from 'preact/hooks';
import { formatUnits, parseUnits } from 'viem';
import { useConnection } from 'wagmi';
import { JPYC_ADDRESS } from '../config/env';
import { buildErc20TransferUri, buildQrImageUrl } from '../utils/qr';
import { useJpycContract } from '../config/contract';

export function RegisterPanel() {
	const { address, chain } = useConnection();
	const [amount, setAmount] = useState('');
	const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
	const tokenSymbol = 'JPYC';
	const tokenDecimals = 18;

	const canReadBalance = Boolean(address && JPYC_ADDRESS);

	const jpycContract = useJpycContract({ chainId: chain?.id });

	useEffect(() => {
		if (!canReadBalance) {
			return;
		}
		let active = true;
		let timeoutId: number | undefined;

		const schedule = () => {
			timeoutId = window.setTimeout(async () => {
				try {
					await jpycContract.readBalance();
				} finally {
					if (active) {
						schedule();
					}
				}
			}, 10000);
		};

		schedule();

		return () => {
			active = false;
			if (timeoutId) {
				clearTimeout(timeoutId);
			}
		};
	}, [canReadBalance, jpycContract.readBalance]);

	useEffect(() => {
		if (jpycContract.balance !== null) {
			setLastUpdated(new Date());
		}
	}, [jpycContract.balance]);

	const parsedAmount = useMemo(() => {
		if (!amount) {
			return null;
		}
		try {
			return parseUnits(amount, tokenDecimals);
		} catch {
			return null;
		}
	}, [amount, tokenDecimals]);

	const qrUri = useMemo(() => {
		if (!address || !JPYC_ADDRESS || !parsedAmount) {
			return '';
		}
		return buildErc20TransferUri(
			JPYC_ADDRESS,
			address,
			parsedAmount.toString()
		);
	}, [address, JPYC_ADDRESS, parsedAmount]);

	const qrSrc = useMemo(() => {
		if (!qrUri) {
			return '';
		}
		return buildQrImageUrl(qrUri);
	}, [qrUri]);

	return (
		<div class="grid gap-6 lg:grid-cols-[2fr,1fr]">
			<div class="card bg-base-100 shadow">
				<div class="card-body gap-6">
					<div class="flex flex-wrap items-center gap-2">
						<div class="badge badge-primary">接続済み</div>
						<div class="text-sm font-medium">{address}</div>
						{chain ? (
							<div class="badge badge-ghost">{chain.name}</div>
						) : (
							<div class="badge badge-warning">不明なチェーン</div>
						)}
					</div>

					<div class="grid gap-4">
						<label class="form-control">
							<span class="label-text">金額</span>
							<input
								class="input input-bordered"
								type="text"
								placeholder="0.00"
								value={amount}
								onInput={(event) => setAmount(event.currentTarget.value)}
							/>
							<span class="label-text-alt opacity-70">
								受取トークン: {tokenSymbol}（{tokenDecimals} decimals）
							</span>
						</label>
					</div>

					<div class="divider">QRコード</div>

					{qrUri ? (
						<div class="grid gap-4 md:grid-cols-[240px,1fr]">
							<div class="bg-base-200 rounded-box p-3">
								<img
									src={qrSrc}
									alt="Transfer QR"
									class="rounded-box w-[240px] h-[240px] object-contain"
								/>
							</div>
							<div class="grid gap-3">
								<div class="text-xs uppercase tracking-wide opacity-60">ペイロード</div>
								<textarea class="textarea textarea-bordered h-36" readOnly value={qrUri} />
								<button
									class="btn btn-outline btn-sm"
									onClick={() => navigator.clipboard.writeText(qrUri)}
								>
									URIをコピー
								</button>
							</div>
						</div>
					) : (
						<div class="alert alert-info">
							<span class="text-sm">
								有効な金額を入力してください。
							</span>
						</div>
					)}
				</div>
			</div>

			<div class="card bg-base-100 shadow">
				<div class="card-body gap-4">
					<h2 class="card-title">残高</h2>
					<div class="stats shadow">
						<div class="stat">
							<div class="stat-title">トークン残高</div>
							<div class="stat-value text-2xl">
								{jpycContract.balance !== null && JPYC_ADDRESS
									? formatUnits(jpycContract.balance, tokenDecimals)
									: '--'}
							</div>
							<div class="stat-desc">{tokenSymbol}</div>
						</div>
					</div>
					<div class="text-xs opacity-70 break-words">
						トークンコントラクト: {JPYC_ADDRESS ?? '--'}
					</div>
					<div class="text-xs opacity-70">
						最終更新: {lastUpdated ? lastUpdated.toLocaleTimeString() : '--'}
					</div>
					<div class="flex items-center gap-2">
						<button
							class="btn btn-sm btn-primary"
							disabled={!canReadBalance || jpycContract.isLoading}
							onClick={() => jpycContract.readBalance()}
						>
							{jpycContract.isLoading ? '更新中...' : '今すぐ更新'}
						</button>
						<span class="text-xs opacity-60">10秒ごとに自動更新します。</span>
					</div>
					{jpycContract.error ? (
						<div class="alert alert-error">
							<span class="text-sm">
								残高の取得に失敗しました。トークンアドレスを確認してください。
							</span>
						</div>
					) : null}
					{!canReadBalance ? (
						<div class="alert alert-warning">
							<span class="text-sm">
								残高を取得できません。VITE_JPYC_ADDRESS の設定を確認してください。
							</span>
						</div>
					) : null}
				</div>
			</div>
		</div>
	);
}
