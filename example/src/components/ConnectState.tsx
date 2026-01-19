export function ConnectState() {
	return (
		<div class="card bg-base-100 shadow">
			<div class="card-body">
				<div class="flex items-center gap-3">
					<div class="badge badge-neutral badge-lg">ウォレット</div>
					<div>
						<div class="font-semibold">未接続</div>
						<div class="text-xs opacity-70">
							ヘッダーのボタンからRainbowKitで接続してください。
						</div>
					</div>
				</div>
				<div class="mt-4 alert alert-warning">
					<span class="text-sm">
						ウォレット接続を有効にするにはWalletConnectのProject IDを設定してください。
					</span>
				</div>
			</div>
		</div>
	);
}
