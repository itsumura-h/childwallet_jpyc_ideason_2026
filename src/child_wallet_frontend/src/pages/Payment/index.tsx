import { useEffect, useRef, useState } from 'preact/hooks';
import { useLocation } from 'preact-iso';
import type { UseIcpAuthResult } from '../../hooks/icpAuth';
import type {
	Html5Qrcode,
	Html5QrcodeFullConfig,
	Html5QrcodeSupportedFormats,
} from 'html5-qrcode';

const QR_REGION_ID = 'payment-qr-reader';
type Html5QrcodeModule = typeof import('html5-qrcode');

type PaymentProps = {
	auth: UseIcpAuthResult;
};

export function Payment({ auth }: PaymentProps) {
	const { route } = useLocation();
	const errorLogged = useRef(false);
	const [scanStatus, setScanStatus] = useState('カメラを起動しています...');
	const [scanResult, setScanResult] = useState<string | null>(null);
	const [rescanKey, setRescanKey] = useState(0);

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
					}
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

					<div class="flex gap-3">
						<button
							type="button"
							onClick={() => setRescanKey((v) => v + 1)}
							class="flex-1 py-3 px-4 bg-gradient-to-r from-green-400 to-blue-400 text-white font-bold rounded-2xl shadow-lg active:scale-95 transition transform"
						>
							🔄 もう一度よみとる
						</button>
						<button
							type="button"
							onClick={() => route('/home')}
							class="flex-1 py-3 px-4 bg-gradient-to-r from-purple-400 to-pink-400 text-white font-bold rounded-2xl shadow-lg active:scale-95 transition transform"
						>
							🏠 もどる
						</button>
					</div>
				</div>

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
