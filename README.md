# ChainMate

> **Advanced Stellar dApp** -- Decentralized chess tournament platform built on Stellar Soroban smart contracts. Create tournaments, collect entry fees on-chain, and distribute prizes automatically through trustless smart contract escrow.

[![CI/CD Pipeline](https://github.com/anjay1011/stelllar_level-3/actions/workflows/ci.yml/badge.svg)](https://github.com/anjay1011/stelllar_level-3/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-amber.svg)](LICENSE)

**Live Demo:** [https://stelllar-level-3.vercel.app](https://stelllar-level-3.vercel.app)

## Features

- **On-chain tournaments** -- Create, manage, and play through tournaments with all state transitions recorded on Stellar
- **Smart contract escrow** -- Entry fees are locked in a Soroban treasury contract; no custodian, no trust required
- **Automated payouts** -- Prize pools are released to the winner's wallet via a single contract invocation
- **Full refunds** -- Cancel a tournament at any time and all players get their XLM back automatically
- **Freighter wallet** -- Connect with the [Freighter](https://freighter.app) browser extension to sign transactions
- **Real-time event streaming** -- Live on-chain event polling with 15-second intervals and pause/resume controls
- **Tournament lifecycle** -- Draft → Open → Close → Start → Declare Winner → Release Prize (or Cancel + Refund)
- **Mobile responsive** -- Full responsive UI built with Tailwind CSS, works on phones, tablets, and desktop
- **Production security** -- CSP headers, auth guards, typed error pipeline, no private keys in frontend

## Architecture

```
┌─────────────┐     Freighter      ┌──────────────────┐     Soroban RPC     ┌──────────────────┐
│   Browser    │ ◄──────────────►  │   Next.js 16     │ ◄───────────────►  │  Stellar Testnet  │
│  (Freighter) │   signTransaction  │   Frontend        │   SDK v16 Client   │  Soroban Contracts│
└─────────────┘                    └──────────────────┘                     └──────────────────┘
```

The frontend never holds private keys. All write operations go through Freighter, which signs transactions locally and returns the signed XDR. The SDK submits and polls for confirmation automatically.

Two Soroban contracts handle the protocol:

| Contract | Responsibility |
|----------|---------------|
| **Tournament** | Tournament lifecycle, player registration, status transitions, winner declaration |
| **Treasury** | XLM escrow, deposits, prize payouts, refunds. Authorized by the tournament contract |

The tournament contract makes **inter-contract calls** to treasury for fund operations. The treasury verifies that its registered admin (the tournament contract address) has authorized each fund transfer.

### Inter-Contract Communication Flow

```
User ──► Tournament Contract ──► Treasury Contract
         register_player()       deposit()
         release_prize()         release_prize()
         cancel_tournament()     refund_all()
         create_tournament()     register_tournament()
```

## Tech Stack

### Smart Contracts

| Component | Technology |
|-----------|-----------|
| Language | Rust (edition 2021, `#![no_std]`) |
| Framework | Soroban SDK v26.1.0 |
| Testing | `soroban-sdk` testutils (13 tests) |
| Target | `wasm32-unknown-unknown` (Soroban VM) |

### Frontend

| Component | Technology |
|-----------|-----------|
| Framework | Next.js 16.2 (App Router, Turbopack) |
| Language | TypeScript 5 (strict mode) |
| UI | React 19, Tailwind CSS 4 |
| Animations | Framer Motion 12 |
| Blockchain SDK | `@stellar/stellar-sdk` v16.1 |
| Wallet | `@stellar/freighter-api` v6.0 |
| Testing | Vitest 4.1 + React Testing Library |

### DevOps

| Component | Technology |
|-----------|-----------|
| CI/CD | GitHub Actions (2-job parallel pipeline) |
| Deployment | Vercel (frontend), Soroban CLI (contracts) |
| Build | Cargo (Rust), npm (frontend) |

## Folder Structure

```
chainmate/
├── .github/workflows/
│   └── ci.yml                          # CI/CD pipeline (contract tests, frontend tests, deploy)
├── Makefile                            # Build, test, and deployment commands
├── contracts/                          # Soroban smart contracts (Rust workspace)
│   ├── Cargo.toml                      # Workspace config + release profile
│   ├── Cargo.lock
│   ├── tournament/
│   │   ├── Cargo.toml
│   │   └── src/
│   │       ├── lib.rs                  # Tournament contract (lifecycle + player management)
│   │       └── test.rs                 # 4 integration tests
│   └── treasury/
│       ├── Cargo.toml
│       └── src/
│           ├── lib.rs                  # Treasury contract (escrow + payouts)
│           └── test.rs                 # 9 integration tests
│
└── frontend/                           # Next.js application
    ├── package.json
    ├── next.config.ts                  # Security headers, CSP
    ├── vitest.config.mts               # Test configuration
    ├── .env.example                    # Environment variable docs
    ├── src/
    │   ├── __tests__/                  # Frontend tests (30 tests)
    │   │   ├── setup.ts                # Test setup (jest-dom matchers)
    │   │   ├── mock-data.test.ts       # Helper function tests
    │   │   ├── components.test.tsx     # Shared component tests
    │   │   └── contracts.test.ts       # Contract integration tests
    │   ├── app/                        # Next.js App Router pages
    │   │   ├── layout.tsx              # Root layout + WalletProvider
    │   │   ├── page.tsx                # Landing page
    │   │   ├── tournaments/
    │   │   │   ├── page.tsx            # Browse tournaments
    │   │   │   └── [id]/page.tsx       # Tournament detail + join (with retry logic)
    │   │   └── dashboard/
    │   │       ├── page.tsx            # Organizer dashboard (with live event polling)
    │   │       ├── create/page.tsx     # Create tournament form
    │   │       └── manage/[id]/page.tsx# Manage tournament lifecycle
    │   ├── components/
    │   │   ├── layout/                 # Navbar, Footer
    │   │   ├── shared/                 # StatusBadge, LoadingSkeleton, EmptyState, ErrorState
    │   │   └── tournament/             # TournamentCard, BracketView
    │   ├── lib/
    │   │   ├── constants.ts            # Network config (RPC URL, network name)
    │   │   ├── mock-data.ts            # Type definitions + UI helpers (formatXLM, timeAgo, etc.)
    │   │   ├── utils.ts                # cn() utility (clsx + tailwind-merge)
    │   │   └── stellar/                # Blockchain integration layer
    │   │       ├── client.ts           # Soroban RPC server + contract IDs
    │   │       ├── wallet.ts           # Freighter wallet connection
    │   │       ├── transactions.ts     # Generic transaction pipeline (sign, send, poll)
    │   │       ├── contracts.ts        # Typed contract read/write functions
    │   │       ├── events.ts           # One-shot event fetching
    │   │       └── useEventPolling.ts  # Real-time event polling hook
    │   └── providers/
    │       └── WalletProvider.tsx       # React context for wallet state
    └── tailwind.config.ts
```

## Smart Contract Overview

### Tournament Contract

Manages the full lifecycle of a chess tournament. Each tournament has an organizer, entry fee, player cap, and a status that progresses through a strict state machine.

```
Draft ──► RegistrationOpen ──► RegistrationClosed ──► Ongoing ──► Completed ──► PrizeReleased
  │                                      │
  └──────────────► Cancelled ◄───────────┘
```

**Functions:**

| Method | Auth | Description |
|--------|------|-------------|
| `create_tournament` | Organizer | Creates tournament in Draft state and registers with Treasury |
| `open_registration` | Organizer | Draft → RegistrationOpen |
| `register_player` | Player | Pays entry fee via Treasury inter-contract call; adds player |
| `close_registration` | Organizer | RegistrationOpen → RegistrationClosed |
| `start_tournament` | Organizer | RegistrationClosed → Ongoing |
| `declare_winner` | Organizer | Ongoing → Completed; records winner address |
| `release_prize` | Organizer | Completed → PrizeReleased; invokes Treasury payout |
| `cancel_tournament` | Organizer | Any non-terminal → Cancelled; invokes Treasury refund |
| `get_tournament` | -- | Read tournament data by ID |
| `get_players` | -- | Read registered player addresses |
| `get_tournament_count` | -- | Total tournaments created |

### Treasury Contract

Handles all XLM custody. Each tournament gets its own isolated pool. The tournament contract address is registered as the admin, so only the tournament contract can authorize fund releases.

**Functions:**

| Method | Auth | Description |
|--------|------|-------------|
| `register_tournament` | -- | Registers tournament contract as admin (idempotent) |
| `deposit` | Player | Deposits entry fee into tournament pool |
| `release_prize` | Tournament admin | Transfers full pool to winner |
| `refund_all` | Tournament admin | Zeros pool and clears all player deposits |
| `get_pool` | -- | Current pool balance |
| `get_player_deposit` | -- | Individual deposit amount |
| `get_tournament_players` | -- | All player addresses for a tournament |

**Security model:** `release_prize` and `refund_all` call `admin.require_auth()`, where admin is the tournament contract address. This means only the tournament contract (through Soroban's authorization tree) can move funds. Individual users cannot call these directly.

## Setup

### Prerequisites

- [Rust](https://rustup.rs/) (stable toolchain)
- [Soroban CLI](https://soroban.stellar.org/docs/getting-started/installation) (`soroban`)
- [Node.js](https://nodejs.org/) >= 18
- [Freighter](https://freighter.app) browser extension (for wallet interaction)

Install the Soroban CLI and WASM target:

```bash
cargo install --locked soroban-cli
rustup target add wasm32-unknown-unknown
```

### Environment Variables

Copy `.env.example` to `.env.local` in the `frontend/` directory:

```bash
cp frontend/.env.example frontend/.env.local
```

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_TOURNAMENT_CONTRACT_ID` | Yes | Stellar contract ID for the tournament contract |
| `NEXT_PUBLIC_TREASURY_CONTRACT_ID` | Yes | Stellar contract ID for the treasury contract |
| `NEXT_PUBLIC_SIMULATION_PUBLIC_KEY` | No | Override simulation account (defaults to deployer) |
| `NEXT_PUBLIC_DEPLOYER_SECRET` | No | Override deployer secret for simulation |

## Running Locally

### 1. Clone and install

```bash
git clone https://github.com/anjay1011/stelllar_level-3.git
cd stelllar_level-3

# Install frontend dependencies
cd frontend
npm install
```

### 2. Deploy contracts to Testnet

```bash
cd contracts

# Build WASM files
soroban contract build

# Deploy treasury
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/treasury.wasm \
  --network testnet

# Deploy tournament
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/tournament.wasm \
  --network testnet
```

Note the returned contract IDs. Initialize the tournament contract with the treasury address:

```bash
soroban contract invoke \
  --id <TOURNAMENT_CONTRACT_ID> \
  --network testnet \
  -- initialize \
  --admin <YOUR_STELLAR_ADDRESS> \
  --treasury_id <TREASURY_CONTRACT_ID>
```

### 3. Set environment variables

Update `frontend/.env.local` with the deployed contract IDs.

### 4. Run the frontend

```bash
cd frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Testing

### Smart Contracts (13 tests)

```bash
cd contracts
cargo test
```

Tests use `soroban-sdk`'s `testutils` feature, which runs contracts in an in-memory simulated environment. No network calls required.

| Contract | Tests | Covers |
|----------|-------|--------|
| Tournament | 4 | Create, count, cancel+refund, full lifecycle |
| Treasury | 9 | Deposit, release, refund, auth checks, idempotent registration, player queries |

### Frontend (30 tests)

```bash
cd frontend
npm test -- --run
```

| Test File | Tests | Covers |
|-----------|-------|--------|
| `mock-data.test.ts` | 13 | formatXLM, formatDate, formatTime, timeAgo, statusConfig |
| `components.test.tsx` | 12 | StatusBadge, ErrorState, LoadingSkeleton rendering and interaction |
| `contracts.test.ts` | 5 | statusNumToEnum mapping for all 7 statuses + fallback |

### CI Checks

```bash
# Lint
npm run lint

# Type check
npx tsc --noEmit

# Production build
npm run build
```

## CI/CD Pipeline

GitHub Actions runs on every push and PR to `main`:

```yaml
┌─────────────────────┐     ┌─────────────────────────┐
│  Contract Tests      │     │  Frontend Tests          │
│  cargo test          │     │  npm run lint            │
│  cargo build         │     │  tsc --noEmit            │
│                      │     │  vitest --run            │
│                      │     │  npm run build           │
└──────────┬──────────┘     └────────────┬────────────┘
           │                              │
           └──────────┬───────────────────┘
                      │
           ┌──────────▼──────────┐
           │  Deploy (main only) │
           │  Vercel Production  │
           └─────────────────────┘
```

**Pipeline steps:**
1. **Contract Tests** -- Builds and tests Rust contracts
2. **Frontend CI** -- Lint, typecheck, run 30 frontend tests, production build
3. **Deploy Preview** -- On PRs: deploys a preview URL
4. **Deploy Production** -- On main push: deploys to Vercel production

## Deployment

### Frontend (Vercel)

```bash
# Push to GitHub and connect the repo to Vercel
# Set environment variables in Vercel dashboard:
#   NEXT_PUBLIC_TOURNAMENT_CONTRACT_ID
#   NEXT_PUBLIC_TREASURY_CONTRACT_ID
```

### Contracts (Testnet)

For persistent deployments, use `soroban contract deploy` with `--network testnet`. For mainnet, switch to `--network public` and ensure adequate XLM funding.

Or use the Makefile:

```bash
make deploy-testnet
```

## Production Security

- **CSP Headers** -- Content Security Policy configured in `next.config.ts`
- **Security Headers** -- X-Frame-Options, X-Content-Type-Options, Referrer-Policy, XSS-Protection
- **Auth Guards** -- All state-changing contract functions require `require_auth()`
- **Treasury Isolation** -- Each tournament has its own isolated escrow pool
- **No Private Keys** -- Frontend never stores or transmits private keys
- **Typed Errors** -- 12+ error types classified with discriminated union types
- **Retry Logic** -- Exponential backoff retry for newly created tournaments
- **Cancellation Pattern** -- All async state updates use cancelled flags

## Contract Addresses (Testnet)

| Contract | Address |
|----------|---------|
| Tournament | `CAO3D6J2UTK7OBTLGBS5AR5VRBR24I6VLSNCKZ2ARM3FNSZYEJLSW6MU` |
| Treasury | `CDJ4HN63K52SRX7KELT77QS7V4RJNOXVSPR5XHU63LYTBTKRZSZ35BCV` |

## License

MIT
