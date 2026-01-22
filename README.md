```sh
cd /application/solidity
forge install
cd /application/solidity/script/JPYC
./deploy.sh
cd /application
pnpm i
make run
dfx deploy -y
dfx generate
cd /application/src/child_wallet_frontend
pnpm dev
```