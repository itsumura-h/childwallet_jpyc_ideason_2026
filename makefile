exec:
	docker compose up -d
	docker compose exec app bash

stop:
	docker compose stop

diff:
	git diff --cached > .diff

anvil:
	docker compose logs -f anvil

run:
	dfx killall
	rm -rf .dfx
	dfx start --clean --background --host 0.0.0.0:4943 --domain localhost --domain 0.0.0.0

backend:
	dfx deploy child_wallet_backend
