import { useCallback, useEffect, useMemo, useState } from 'preact/hooks';
import { useLocation } from 'preact-iso';
import { formatEther, formatUnits, getAddress, type Address } from 'viem';
import type { UseIcpAuthResult } from '../../hooks/icpAuth';
import { getPublicClient } from '../../hooks/client';
import { JPYC_ABI, JPYC_ADDRES_LIST } from '../../hooks/erc20';
import { useEvmAddress } from '../../hooks/useEvmAddress';
import { DEFAULT_CHAIN_ID, SUPPORTED_CHAINS, useCurrentChainId } from '../../config/wagmi';
import jpycLogo from '../../assets/jpyc.svg';

type HomeProps = {
	auth: UseIcpAuthResult;
};

type BalanceState = {
	eth: bigint | null;
	jpyc: bigint | null;
};

export function Home({ auth }: HomeProps) {
	const evm = useEvmAddress(auth);
	const { route } = useLocation();
	const currentChainId = useCurrentChainId();
	const [selectedChainId, setSelectedChainId] = useState<number>(currentChainId ?? DEFAULT_CHAIN_ID);
	const [balances, setBalances] = useState<BalanceState>({ eth: null, jpyc: null });
	const [balanceError, setBalanceError] = useState<string | null>(null);
	const [isBalanceLoading, setIsBalanceLoading] = useState(false);
	const [lastUpdated, setLastUpdated] = useState<number | null>(null);

	const chainOptions = useMemo(
		() => Object.values(SUPPORTED_CHAINS).map((chain) => ({ id: chain.id, name: chain.name })),
		[],
	);

	useEffect(() => {
		if (!currentChainId) {
			return;
		}
		setSelectedChainId(currentChainId);
	}, [currentChainId]);

	const selectedPublicClient = useMemo(() => getPublicClient(selectedChainId), [selectedChainId]);

	const jpycAddress = useMemo<Address | null>(() => {
		const raw = import.meta.env.VITE_JPYC_ADDRESS;
		const chainSpecific = JPYC_ADDRES_LIST[selectedChainId];
		const candidate = typeof raw === 'string' && raw.trim().length > 0 ? raw : chainSpecific;

		try {
			return getAddress(candidate);
		} catch {
			return null;
		}
	}, [selectedChainId]);

	const fetchBalances = useCallback(async () => {
		if (!evm.evmAddress) {
			return;
		}

		setIsBalanceLoading(true);
		setBalanceError(null);

		try {
			const ethBalancePromise = selectedPublicClient.getBalance({ address: evm.evmAddress });
			const jpycBalancePromise = jpycAddress
				? selectedPublicClient.readContract({
						address: jpycAddress,
						abi: JPYC_ABI,
						functionName: 'balanceOf',
						args: [evm.evmAddress],
					})
				: Promise.resolve<bigint | null>(null);

			const [ethBalance, jpycBalance] = await Promise.all([ethBalancePromise, jpycBalancePromise]);

			setBalances({
				eth: ethBalance,
				jpyc: jpycBalance ?? null,
			});
			setLastUpdated(Date.now());
		} catch (error) {
			setBalanceError(error instanceof Error ? error.message : String(error));
		} finally {
			setIsBalanceLoading(false);
		}
	}, [evm.evmAddress, jpycAddress, selectedPublicClient]);

	useEffect(() => {
		if (!evm.evmAddress || evm.isLoading) {
			return;
		}

		void fetchBalances();
		const timer = setInterval(() => {
			void fetchBalances();
		}, 10_000);

		return () => clearInterval(timer);
	}, [evm.evmAddress, evm.isLoading, fetchBalances]);

	useEffect(() => {
		setBalances({ eth: null, jpyc: null });
		setLastUpdated(null);
		setBalanceError(null);
	}, [selectedChainId]);

	return (
		<div class="min-h-screen w-full bg-gradient-to-b from-green-300 via-blue-300 to-purple-300 p-4 safe-area flex flex-col items-center justify-start">
			<div class="w-full max-w-sm pt-6 space-y-5">
				<div class="bg-white rounded-3xl shadow-2xl p-4 flex items-center justify-between gap-3">
					<div class="space-y-1">
						<p class="text-sm text-gray-500 font-semibold">⛓️ つかうチェーン</p>
						<p class="text-lg font-bold text-purple-700">
							{chainOptions.find((chain) => chain.id === selectedChainId)?.name ?? '未対応のチェーン'}
						</p>
					</div>
					<select
						class="w-36 rounded-xl border border-purple-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-300"
						value={selectedChainId}
						onChange={(event) => {
							const nextId = Number((event.target as HTMLSelectElement).value);
							setSelectedChainId(nextId);
							localStorage.setItem('chainId', nextId.toString());
						}}
					>
						{chainOptions.map((chain) => (
							<option value={chain.id} key={chain.id}>
								{chain.name}
							</option>
						))}
					</select>
				</div>

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

				{/* 残高カード - ETH / JPYC */}
				<div class="bg-white rounded-3xl shadow-2xl p-6 space-y-4">
					<div class="flex items-center justify-between">
						<p class="text-sm text-gray-500 font-semibold">💰 おさいふ</p>
						<button
							type="button"
							disabled={isBalanceLoading || !evm.evmAddress}
							onClick={() => fetchBalances()}
							class={`text-xs font-bold px-3 py-1 rounded-full border ${
								isBalanceLoading || !evm.evmAddress
									? 'border-gray-200 text-gray-400 bg-gray-100 cursor-not-allowed'
									: 'border-purple-200 text-purple-700 bg-purple-50 active:scale-95 transition transform'
							}`}
						>
							{isBalanceLoading ? '更新中...' : '🔄 いま更新'}
						</button>
					</div>

					{balanceError ? (
						<div class="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl p-3 break-all">
							{balanceError}
						</div>
					) : null}

					<div class="space-y-3">
						<div class="flex items-center justify-between bg-gradient-to-r from-blue-50 to-blue-100 rounded-2xl p-4 border border-blue-100">
							<div class="space-y-1">
								<p class="text-sm text-gray-500 font-semibold">ETH</p>
								<p class="text-xl font-bold text-blue-700">
									{balances.eth !== null
										? `${Number(formatEther(balances.eth)).toFixed(3)} ETH`
										: isBalanceLoading
											? '読み込み中...'
											: evm.evmAddress
												? '---'
												: 'アドレス未取得'}
								</p>
							</div>
							<span class="text-3xl">⛽️</span>
						</div>

						<div class="flex items-center justify-between bg-gradient-to-r from-yellow-50 via-green-50 to-blue-50 rounded-2xl p-4 border border-green-100">
							<div class="space-y-1">
								<p class="text-sm text-gray-500 font-semibold">JPYC</p>
								<p class="text-xl font-bold text-green-700">
									{balances.jpyc !== null
										? `${formatUnits(balances.jpyc, 18)} JPYC`
										: !jpycAddress
											? 'アドレス未設定'
											: isBalanceLoading
												? '読み込み中...'
												: evm.evmAddress
													? '---'
													: 'アドレス未取得'}
								</p>
								{!jpycAddress ? (
									<p class="text-[11px] text-red-500">このチェーンの JPYC アドレスが見つからないよ</p>
								) : null}
							</div>
							<img src={jpycLogo} alt="JPYC" class="h-9 w-9" />
						</div>

						<p class="text-[11px] text-gray-500 text-right">
							{lastUpdated ? `最終更新: ${new Date(lastUpdated).toLocaleTimeString()}` : '10秒ごとに自動更新するよ'}
						</p>
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
