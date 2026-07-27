# ============================================================
# ChainMate — Deployment & Development Makefile
# ============================================================
#
# Usage:
#   make test          — Run all tests (contracts + frontend)
#   make build         — Build contracts and frontend
#   make deploy-testnet — Deploy contracts to Stellar testnet
#   make clean         — Clean build artifacts
#
# Prerequisites:
#   - Rust + wasm32-unknown-unknown target
#   - soroban CLI (cargo install soroban-cli)
#   - Node.js 18+ and npm
# ============================================================

.PHONY: test test-contracts test-frontend build build-contracts build-frontend \
        deploy-testnet init-contracts clean lint typecheck

# ─── Test ───────────────────────────────────────────────────

test: test-contracts test-frontend

test-contracts:
	@echo "═══ Running Smart Contract Tests ═══"
	cd contracts && cargo test --verbose

test-frontend:
	@echo "═══ Running Frontend Tests ═══"
	cd frontend && npm test -- --run

# ─── Build ──────────────────────────────────────────────────

build: build-contracts build-frontend

build-contracts:
	@echo "═══ Building Contracts ═══"
	cd contracts && cargo build --release

build-frontend:
	@echo "═══ Building Frontend ═══"
	cd frontend && npm run build

# ─── Lint & TypeCheck ──────────────────────────────────────

lint:
	cd frontend && npm run lint

typecheck:
	cd frontend && npx tsc --noEmit

# ─── Deploy to Testnet ─────────────────────────────────────

NETWORK?=testnet
TOKEN?=$(shell soroban keys list --network $(NETWORK) 2>/dev/null | head -1)

deploy-testnet: build-contracts
	@echo "═══ Deploying Tournament Contract to $(NETWORK) ═══"
	cd contracts && soroban contract deploy \
		--wasm target/release/tournament.wasm \
		--network $(NETWORK) \
		--source $(TOKEN)
	@echo ""
	@echo "═══ Deploying Treasury Contract to $(NETWORK) ═══"
	cd contracts && soroban contract deploy \
		--wasm target/release/treasury.wasm \
		--network $(NETWORK) \
		--source $(TOKEN)
	@echo ""
	@echo "Update .env.local with the new contract IDs"

# ─── Clean ──────────────────────────────────────────────────

clean:
	cd contracts && cargo clean
	cd frontend && rm -rf .next node_modules/.cache
