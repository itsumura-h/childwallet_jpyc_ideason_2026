import { useEffect, useMemo, useState } from 'preact/hooks';
import { formatUnits, isAddress, parseUnits } from 'viem';
import { useAccount, useReadContract } from 'wagmi';

import { ERC20_ABI } from '../config/erc20';
import { TOKEN_PRESETS } from '../config/tokens';
import { buildErc20TransferUri, buildQrImageUrl } from '../utils/qr';

export function RegisterPanel() {
	const { address, chain } = useAccount();
	const [amount, setAmount] = useState('');
	const [tokenAddress, setTokenAddress] = useState('');
	const [tokenSymbol, setTokenSymbol] = useState('TOKEN');
	const [tokenDecimals, setTokenDecimals] = useState(18);
	const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

	useEffect(() => {
		if (!chain?.id) {
			return;
		}
		const preset = TOKEN_PRESETS[chain.id];
		if (!preset) {
			return;
		}
		setTokenAddress(preset.address);
		setTokenSymbol(preset.symbol);
		setTokenDecimals(preset.decimals);
	}, [chain?.id]);

	const tokenAddressValue = isAddress(tokenAddress)
		? (tokenAddress as `0x${string}`)
		: undefined;
	const canReadBalance = Boolean(address && tokenAddressValue);

	const { data: balance, refetch, isFetching, error } = useReadContract({
		address: tokenAddressValue,
		abi: ERC20_ABI,
		functionName: 'balanceOf',
		args: address ? [address] : undefined,
		query: {
			enabled: canReadBalance,
			refetchOnWindowFocus: false,
		},
	});

	useEffect(() => {
		if (!canReadBalance) {
			return;
		}
		let active = true;
		let timeoutId: number | undefined;

		const schedule = () => {
			timeoutId = window.setTimeout(async () => {
				try {
					await refetch();
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
	}, [canReadBalance, refetch]);

	useEffect(() => {
		if (balance !== undefined) {
			setLastUpdated(new Date());
		}
	}, [balance]);

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
		if (!address || !tokenAddressValue || !parsedAmount) {
			return '';
		}
		return buildErc20TransferUri(
			tokenAddressValue,
			address,
			parsedAmount.toString()
		);
	}, [address, tokenAddressValue, parsedAmount]);

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
						</label>

						<div class="grid gap-4 md:grid-cols-2">
							<label class="form-control">
								<span class="label-text">トークンアドレス</span>
								<input
									class="input input-bordered font-mono text-xs"
									type="text"
									placeholder="0x..."
									value={tokenAddress}
									onInput={(event) => setTokenAddress(event.currentTarget.value)}
								/>
							</label>
							<label class="form-control">
								<span class="label-text">トークンシンボル</span>
								<input
									class="input input-bordered"
									type="text"
									placeholder="TOKEN"
									value={tokenSymbol}
									onInput={(event) => setTokenSymbol(event.currentTarget.value)}
								/>
							</label>
							<label class="form-control">
								<span class="label-text">トークンDecimals</span>
								<input
									class="input input-bordered"
									type="number"
									min="0"
									max="18"
									value={tokenDecimals}
									onInput={(event) =>
										setTokenDecimals(
											Math.min(
												18,
												Math.max(0, Number(event.currentTarget.value) || 0)
											)
										)
									}
								/>
							</label>
						</div>
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
								有効な金額とERC-20トークンアドレスを入力してください。
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
								{balance !== undefined && tokenAddressValue
									? formatUnits(balance, tokenDecimals)
									: '--'}
							</div>
							<div class="stat-desc">{tokenSymbol}</div>
						</div>
					</div>
					<div class="text-xs opacity-70">
						最終更新: {lastUpdated ? lastUpdated.toLocaleTimeString() : '--'}
					</div>
					<div class="flex items-center gap-2">
						<button
							class="btn btn-sm btn-primary"
							disabled={!canReadBalance || isFetching}
							onClick={() => refetch()}
						>
							{isFetching ? '更新中...' : '今すぐ更新'}
						</button>
						<span class="text-xs opacity-60">10秒ごとに自動更新します。</span>
					</div>
					{error ? (
						<div class="alert alert-error">
							<span class="text-sm">
								残高の取得に失敗しました。トークンアドレスを確認してください。
							</span>
						</div>
					) : null}
					{!canReadBalance ? (
						<div class="alert alert-warning">
							<span class="text-sm">
								残高を取得するには有効なERC-20トークンアドレスを設定してください。
							</span>
						</div>
					) : null}
				</div>
			</div>
		</div>
	);
}
