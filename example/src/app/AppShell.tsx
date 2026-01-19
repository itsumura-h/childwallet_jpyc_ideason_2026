import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';

import { ConnectState } from '../components/ConnectState';
import { RegisterPanel } from '../components/RegisterPanel';

export function AppShell() {
	const { isConnected } = useAccount();

	return (
		<div class="min-h-screen bg-base-200" data-theme="corporate">
			<header class="navbar bg-base-100 shadow">
				<div class="max-w-6xl mx-auto w-full px-4">
					<div class="flex-1">
						<div class="text-lg font-semibold tracking-wide">レジQR</div>
						<div class="text-xs opacity-70">Sepolia / Anvil・ERC-20</div>
					</div>
					<div class="flex-none">
						<ConnectButton />
					</div>
				</div>
			</header>

			<main class="max-w-6xl mx-auto w-full px-4 py-10">
				<section class="grid gap-6">
					<div class="card bg-base-100 shadow">
						<div class="card-body gap-4">
							<h1 class="text-3xl font-semibold">レジ</h1>
							<p class="text-sm opacity-80">
								ウォレットを接続し、金額を入力してQRを表示してください。
								お客様がERC-20トークンで支払います。
							</p>
						</div>
					</div>

					{!isConnected ? <ConnectState /> : <RegisterPanel />}
				</section>
			</main>
		</div>
	);
}
