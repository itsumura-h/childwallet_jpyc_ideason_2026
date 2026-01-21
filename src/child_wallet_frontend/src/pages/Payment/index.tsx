import { useEffect, useRef, useState } from 'preact/hooks';
import { useLocation } from 'preact-iso';
import type { UseIcpAuthResult } from '../../hooks/icpAuth';
import type {
	Html5Qrcode,
	Html5QrcodeFullConfig,
	Html5QrcodeSupportedFormats,
} from 'html5-qrcode';
import {
	type Address,
	type Hex,
	formatUnits,
	getAddress,
	http,
	isAddress,
} from 'viem';
import { DEFAULT_RPC_URL, getChainConfig, getRpcUrlForChain, useCurrentChainId } from '../../config/wagmi';
import { createIcpWalletClient } from '../../hooks/icpWalletClient';
import { getPublicClient } from '../../hooks/client';
import { JPYC_ABI, JPYC_ADDRES_LIST } from '../../hooks/erc20';
import { useEvmAddress } from '../../hooks/useEvmAddress';

const QR_REGION_ID = 'payment-qr-reader';
type Html5QrcodeModule = typeof import('html5-qrcode');

type ParsedTransferPayload = {
	tokenAddress: Address;
	receiver: Address;
	rawAmount: string;
	amount: bigint;
};

const parseErc20TransferPayload = (payload: string): ParsedTransferPayload => {
	const trimmed = payload.trim();
	const normalized = trimmed.startsWith('ethereum://')
		? `ethereum:${trimmed.slice('ethereum://'.length)}`
		: trimmed;

	if (!normalized.startsWith('ethereum:')) {
		throw new Error('ethereum: で始まるペイロードじゃないみたい');
	}

	const withoutScheme = normalized.slice('ethereum:'.length);
	const [pathPart, query] = withoutScheme.split('?');

	if (!pathPart || !query) {
		throw new Error('transfer のパラメータが足りないよ');
	}

	const [tokenAddressRaw, action] = pathPart.split('/');
	if (!tokenAddressRaw || action !== 'transfer') {
		throw new Error('transfer 用のQRじゃないかも');
	}

	const params = new URLSearchParams(query);
	const receiverRaw = params.get('address');
	const amountRaw = params.get('uint256');

	if (!receiverRaw || !amountRaw) {
		throw new Error('address と uint256 が必要だよ');
	}

	if (!isAddress(tokenAddressRaw)) {
		throw new Error('トークンアドレスの形式がまちがっているみたい');
	}
	if (!isAddress(receiverRaw)) {
		throw new Error('おくりさきアドレスの形式がまちがっているみたい');
	}

	let amount: bigint;
	try {
		amount = BigInt(amountRaw);
	} catch {
		throw new Error('uint256 が数値としてよめなかったよ');
	}

	if (amount <= 0n) {
		throw new Error('0 より大きい金額を指定してね');
	}

	return {
		tokenAddress: getAddress(tokenAddressRaw),
		receiver: getAddress(receiverRaw),
		rawAmount: amountRaw,
		amount,
	};
};

type PaymentProps = {
	auth: UseIcpAuthResult;
};

export function Payment({ auth }: PaymentProps) {
	const { route } = useLocation();
	const chainId = useCurrentChainId();
	const evm = useEvmAddress(auth);
	const errorLogged = useRef(false);
	const [scanStatus, setScanStatus] = useState('カメラを起動しています...');
	const [scanResult, setScanResult] = useState<string | null>(null);
	const [rescanKey, setRescanKey] = useState(0);
	const [manualInput, setManualInput] = useState('');
	const [parsedPayload, setParsedPayload] = useState<ParsedTransferPayload | null>(null);
	const [payloadError, setPayloadError] = useState<string | null>(null);
	const [isSending, setIsSending] = useState(false);
	const [sendStatus, setSendStatus] = useState("");
	const [sendError, setSendError] = useState<string | null>(null);
	const [txHash, setTxHash] = useState<Hex | null>(null);

	useEffect(() => {
		if (!scanResult) {
			return;
		}

		setParsedPayload(null);
		setPayloadError(null);
		setSendStatus(null);
		setSendError(null);
		setTxHash(null);

		try {
			const parsed = parseErc20TransferPayload(scanResult);
			const chain = getChainConfig(chainId);
			if (!chain) {
				throw new Error('このチェーンではJPYCのおくりこみができないよ');
			}

			const jpycAddress = JPYC_ADDRES_LIST[chain.id];
			if (!jpycAddress) {
				throw new Error('このチェーンのJPYCアドレスが設定されていないよ');
			}

			if (parsed.tokenAddress !== getAddress(jpycAddress)) {
				throw new Error('JPYCだけがおくれるよ');
			}

			setParsedPayload(parsed);
		} catch (err) {
			setPayloadError(err instanceof Error ? err.message : String(err));
		}
	}, [chainId, scanResult]);

	useEffect(() => {
		let html5qrcode: Html5Qrcode | null = null;
		let isCanceled = false;

		const startScanner = async () => {
			setScanResult(null);
			setScanStatus('カメラを起動しています...');
			errorLogged.current = false;

			try {
				const mod: Html5QrcodeModule = await import('html5-qrcode');
				if (isCanceled) return;

				const region = document.getElementById(QR_REGION_ID);
				if (!region) return;
				region.innerHTML = '';

				const { Html5Qrcode, Html5QrcodeSupportedFormats } = mod;
				const config: Html5QrcodeFullConfig = {
					formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE as Html5QrcodeSupportedFormats],
					verbose: false,
				};
				html5qrcode = new Html5Qrcode(QR_REGION_ID, config);

				await html5qrcode.start(
					{ facingMode: 'environment' },
					{ fps: 10, qrbox: 240 },
					async (decodedText) => {
						setScanResult(decodedText);
						setScanStatus('QRコードを読み取りました');
						if (html5qrcode) {
							try {
								await html5qrcode.stop();
							} catch {
								// ignore
							}
						}
					},
					(err) => {
						if (!errorLogged.current) {
							errorLogged.current = true;
							setScanStatus('カメラの起動を待っています...');
						}
						console.warn(err);
					},
				);
			} catch (err) {
				if (!isCanceled) {
					setScanStatus('カメラを起動できませんでした。HTTPSとカメラ許可を確認してね');
					console.error(err);
				}
			}
		};

		startScanner();

		return () => {
			isCanceled = true;
			if (html5qrcode) {
				// stop → clear は順番に await する
				(async () => {
					try {
						await html5qrcode?.stop();
					} catch {
						// ignore
					}
					try {
						await html5qrcode?.clear();
					} catch {
						// ignore
					}
				})();
			}
		};
	}, [rescanKey]);

	const handleSend = async () => {
		if (!parsedPayload) {
			setSendError(payloadError ?? 'ペイロードをよみとってね');
			return;
		}

		if (!auth.isAuthenticated || !auth.authClient) {
			setSendError('ログインしてから試してね');
			return;
		}

		if (evm.isLoading) {
			setSendError('ウォレットを準備しているよ、ちょっと待ってね');
			return;
		}

		if (evm.error) {
			setSendError(`ウォレット情報の取得に失敗しました: ${evm.error}`);
			return;
		}

		if (!evm.evmAddress) {
			setSendError('ウォレットアドレスを取得できなかったよ');
			return;
		}

		const chain = getChainConfig(chainId);
		if (!chain) {
			setSendError('このチェーンでは送金できないよ');
			return;
		}

		const jpycAddress = JPYC_ADDRES_LIST[chain.id];
		if (!jpycAddress) {
			setSendError('このチェーンのJPYCアドレスが設定されていないよ');
			return;
		}

		const normalizedJpycAddress = getAddress(jpycAddress);
		if (parsedPayload.tokenAddress !== normalizedJpycAddress) {
			setSendError('JPYCだけがおくれるよ');
			return;
		}

		const rpcUrl = getRpcUrlForChain(chain.id) ?? DEFAULT_RPC_URL;

		setIsSending(true);
		setSendError(null);
		setSendStatus('ウォレットを準備しています...');

		try {
			console.debug('[Payment] Starting wallet client creation with RPC URL:', rpcUrl);
			const walletClient = await createIcpWalletClient({
				authClient: auth.authClient,
				chain,
				transport: http(rpcUrl),
				nonce: evm.nonce,
			});
			console.debug('[Payment] Wallet client created successfully');

			setSendStatus('トランザクションを作成しています...');
			console.debug('[Payment] Starting transfer operation', {
				tokenAddress: parsedPayload.tokenAddress,
				receiver: parsedPayload.receiver,
				amount: parsedPayload.amount.toString(),
				fromAddress: evm.evmAddress,
				nonce: evm.nonce,
				rpcUrl,
				chain: chain.name,
			});
			
			console.debug('[Payment] Wallet client account:', walletClient.account?.address);
			console.debug('[Payment] Wallet client chain:', walletClient.chain?.name);
			
			// type assertion を使用して型チェック回避
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const hash = await walletClient.writeContract({
				address: parsedPayload.tokenAddress,
				abi: JPYC_ABI,
				functionName: 'transfer',
				args: [parsedPayload.receiver, parsedPayload.amount],
				account: walletClient.account!,
			} as any);
			
			console.debug('[Payment] Transaction hash received:', hash);

			setTxHash(hash);
			setSendStatus('チェーンに送信したよ。承認を待っています...');
			
			const selectedPublicClient = getPublicClient(chain.id);
			console.debug('[Payment] Waiting for transaction receipt...', {
				hash,
				chain: selectedPublicClient.chain?.name,
				rpcUrl,
			});
			
			const receipt = await selectedPublicClient.waitForTransactionReceipt({ hash });
			
			console.debug('[Payment] Transaction receipt received:', {
				blockNumber: receipt.blockNumber,
				blockHash: receipt.blockHash,
				transactionIndex: receipt.transactionIndex,
				status: receipt.status,
				gasUsed: receipt.gasUsed?.toString(),
			});
			
			setSendStatus('🎉 そうしん かんりょう！');
			setManualInput('');
			setScanResult(null);
		} catch (error) {
			console.error('[Payment] Error during transaction:', error);
			console.error('[Payment] Error type:', error?.constructor?.name);
			console.error('[Payment] Error stack:', error instanceof Error ? error.stack : 'no stack');
			
			if (error instanceof Error) {
				// ContractFunctionExecutionError の場合、details を確認
				const errObj = error as any;
				if (errObj.details) {
					console.error('[Payment] Error details:', errObj.details);
				}
				if (errObj.cause) {
					console.error('[Payment] Error cause:', errObj.cause);
				}
				if (errObj.url) {
					console.error('[Payment] Error URL:', errObj.url);
				}
			}
			
			const message = error instanceof Error ? error.message : String(error);
			setSendError(message);
			setSendStatus('送金に失敗しました');
		} finally {
			setIsSending(false);
		}
	};

	return (
		<div class="min-h-screen w-full bg-gradient-to-b from-purple-400 via-blue-300 to-green-200 p-4 safe-area flex flex-col items-center justify-start">
			<div class="w-full max-w-sm pt-6 space-y-5">
				<div class="bg-white rounded-3xl shadow-2xl p-6 space-y-4">
					<div class="text-center space-y-2">
						<div class="text-4xl">📷</div>
						<h1 class="text-xl font-bold text-purple-700">QRコードを よみとる</h1>
						<p class="text-sm text-gray-600">おかねを おくる ために QRコードを かざしてね</p>
					</div>

					<div class="bg-gradient-to-r from-purple-100 to-blue-100 rounded-2xl p-3 text-center">
						<p class="text-sm font-semibold text-purple-700">{scanStatus}</p>
						{scanResult ? (
							<p class="mt-2 text-xs text-gray-700 break-all">読み取り内容: {scanResult}</p>
						) : (
							<p class="mt-2 text-xs text-gray-600">カメラへのアクセスを許可してね</p>
						)}
					</div>

					<div class="rounded-2xl overflow-hidden border border-purple-200 shadow-inner bg-white">
						<div id={QR_REGION_ID} class="min-h-[320px]" />
					</div>

					<div class="gap-3">
						<button
							type="button"
							onClick={() => setRescanKey((v) => v + 1)}
							class="w-full py-3 px-4 bg-gradient-to-r from-green-400 to-blue-400 text-white font-bold rounded-2xl shadow-lg active:scale-95 transition transform"
						>
							🔄 もう一度よみとる
						</button>
					</div>
				</div>

				<div class="bg-white border border-purple-100 rounded-2xl p-4 shadow-inner space-y-3">
					<p class="text-sm font-semibold text-purple-700 text-center">ペイロードを 手入力する</p>
					<input
						type="text"
						value={manualInput}
						placeholder="ペイロードを入力してね"
						class="w-full rounded-xl border border-purple-200 px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-purple-300"
						onInput={(e) => setManualInput((e.target as HTMLInputElement).value)}
					/>
					<button
						type="button"
						onClick={() => {
							if (manualInput.trim().length === 0) {
								setScanStatus('ペイロードを入力してね');
								return;
							}
							setScanResult(manualInput.trim());
							setScanStatus('手入力のペイロードを設定しました');
						}}
						class="w-full py-2 px-3 bg-gradient-to-r from-blue-400 to-purple-400 text-white font-bold rounded-xl active:scale-95 transition transform"
					>
						✏️ このペイロードをつかう
					</button>
				</div>

				<div class="bg-white border border-purple-100 rounded-2xl p-4 shadow-inner space-y-3">
					{evm.error ? (
						<div class="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl p-3">
							ウォレットの読み込みに失敗したよ: {evm.error}
						</div>
					) : null}

					{payloadError ? (
						<div class="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl p-3">
							{payloadError}
						</div>
					) : parsedPayload ? (
						<div class="space-y-3">
							<div class="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-100 rounded-xl p-3 text-xs text-gray-700 space-y-1">
								<div class="break-all">おくりさき: {parsedPayload.receiver}</div>
								<div>きんがく: {formatUnits(parsedPayload.amount, 18)}JPYC</div>
							</div>

							{!txHash ? (
								<button
									type="button"
									disabled={isSending}
									onClick={handleSend}
									class={`w-full py-3 px-4 rounded-xl font-bold active:scale-95 transition transform ${
										isSending
											? 'bg-gray-300 text-gray-600 cursor-not-allowed'
											: 'bg-gradient-to-r from-green-400 via-blue-400 to-purple-400 text-white shadow-lg'
									}`}
								>
									{isSending ? 'おくってるよ...' : '🚀 この内容でおくる'}
								</button>
							) : null}

							{sendStatus ? (
								<div class="text-xs text-purple-700 bg-purple-50 border border-purple-100 rounded-xl p-3">
									{sendStatus}
								</div>
							) : null}
							{sendError ? (
								<div class="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl p-3 break-all">
									{sendError}
								</div>
							) : null}
							{txHash ? (
								<div class="text-[11px] text-gray-600 bg-gray-50 border border-gray-200 rounded-xl p-3 break-all">
									tx hash: {txHash}
								</div>
							) : null}
						</div>
					) : (
						<p class="text-xs text-gray-600">QR をよみとるか、ペイロードを入力するとここに内容がでるよ</p>
					)}
				</div>

				<button
					type="button"
					onClick={() => route('/home')}
					class="w-full py-3 px-4 bg-gradient-to-r from-red-400 to-pink-400 text-white font-bold rounded-2xl shadow-lg active:scale-95 transition transform"
				>
					<span class="text-xl mr-2">🏠</span>
					もどる
				</button>
			</div>
		</div>
	);
}
