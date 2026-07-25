# ChainMate

Decentralized chess tournament platform built on Stellar Soroban smart contracts. Create tournaments, collect entry fees on-chain, and distribute prizes automatically through trustless smart contract escrow.

## Features

- **On-chain tournaments** -- Create, manage, and play through tournaments with all state transitions recorded on Stellar
- **Smart contract escrow** -- Entry fees are locked in a Soroban treasury contract; no custodian, no trust required
- **Automated payouts** -- Prize pools are released to the winner's wallet via a single contract invocation
- **Full refunds** -- Cancel a tournament at any time and all players get their XLM back automatically
- **Freighter wallet** -- Connect with the [Freighter](https://freighter.app) browser extension to sign transactions
- **Real-time activity** -- Tournament events are read directly from Soroban RPC ledger events
- **Tournament lifecycle** -- Draft → Open → Close → Start → Declare Winner → Release Prize (or Cancel + Refund)

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

The tournament contract makes inter-contract calls to treasury for fund operations. The treasury verifies that its registered admin (the tournament contract address) has authorized each fund transfer.

## Tech Stack

### Smart Contracts

| Component | Technology |
|-----------|-----------|
| Language | Rust (edition 2021, `#![no_std]`) |
| Framework | Soroban SDK v26.1.0 |
| Target | `wasm32-unknown-unknown` (Soroban VM) |

### Frontend

| Component | Technology |
|-----------|-----------|
| Framework | Next.js 16.2 (App Router, Turbopack) |
| Language | TypeScript 5 |
| UI | React 19, Tailwind CSS 4 |
| Animations | Framer Motion 12 |
| Blockchain SDK | `@stellar/stellar-sdk` v16.1 |
| Wallet | `@stellar/freighter-api` v6.0 |

## Folder Structure

```
chainmate/
├── contracts/                          # Soroban smart contracts (Rust workspace)
│   ├── Cargo.toml                      # Workspace config
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
    ├── next.config.ts
    ├── src/
    │   ├── app/                        # Next.js App Router pages
    │   │   ├── layout.tsx              # Root layout + WalletProvider
    │   │   ├── page.tsx                # Landing page
    │   │   ├── globals.css
    │   │   ├── tournaments/
    │   │   │   ├── page.tsx            # Browse tournaments
    │   │   │   └── [id]/page.tsx       # Tournament detail + join
    │   │   └── dashboard/
    │   │       ├── page.tsx            # Organizer dashboard
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
    │   │       └── contracts.ts        # Typed contract read/write functions
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

Create a `.env.local` in the `frontend/` directory:

```env
# Deployed contract addresses (set after deploying contracts)
NEXT_PUBLIC_TOURNAMENT_CONTRACT_ID=your_tournament_contract_id
NEXT_PUBLIC_TREASURY_CONTRACT_ID=your_treasury_contract_id
```

The app ships with placeholder contract IDs. You must deploy the contracts and set these variables before the frontend can interact with the chain.

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_TOURNAMENT_CONTRACT_ID` | Stellar contract ID for the tournament contract |
| `NEXT_PUBLIC_TREASURY_CONTRACT_ID` | Stellar contract ID for the treasury contract |

The following are hardcoded in `frontend/src/lib/constants.ts` and can be overridden as needed:

| Constant | Default | Description |
|----------|---------|-------------|
| `STELLAR_NETWORK` | `"TESTNET"` | Stellar network to use |
| `SOROBAN_RPC_URL` | `https://soroban-testnet.stellar.org` | Soroban RPC endpoint |

## Running Locally

### 1. Clone and install

```bash
git clone <repo-url>
cd chainmate

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

Update `frontend/.env.local` with the deployed contract IDs:

```env
NEXT_PUBLIC_TOURNAMENT_CONTRACT_ID=<deployed_tournament_id>
NEXT_PUBLIC_TREASURY_CONTRACT_ID=<deployed_treasury_id>
```

### 4. Run the frontend

```bash
cd frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Testing

### Smart Contracts

Run the full test suite (13 tests across both contracts):

```bash
cd contracts
cargo test
```

Tests use `soroban-sdk`'s `testutils` feature, which runs contracts in an in-memory simulated environment. No network calls required.

| Contract | Tests | Covers |
|----------|-------|--------|
| Tournament | 4 | Create, count, cancel+refund, full lifecycle |
| Treasury | 9 | Deposit, release, refund, auth checks, idempotent registration, player queries |

### Frontend

```bash
cd frontend

# Lint
npm run lint

# Type check
npx tsc --noEmit

# Production build
npm run build
```

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

## Future Improvements

- [ ] **On-chain timestamps** -- Store `created_at` and `starts_at` on the contract to remove fabricated dates on the frontend
- [ ] **Batch reads** -- Add a `get_all_tournaments` contract method to avoid O(N) RPC calls from the frontend
- [ ] **Event indexing** -- Use a Soroban event indexer or external service (e.g., Stellar SDK event streaming) for efficient activity feed
- [ ] **Bracket generation** -- On-chain or verifiable bracket seeding for single-elimination tournaments
- [ ] **Multi-winner support** -- 1st/2nd/3rd prize tiers with percentage-based treasury splits
- [ ] **Tournament deposits** -- Organizer posts a bond to prevent no-shows
- [ ] **`#[contractevent]` migration** -- Replace deprecated `events().publish` calls with Soroban SDK v26+ event macro
- [ ] **Next.js App Router optimizations** -- Server Components for static tournament listings, streaming Suspense boundaries
- [ ] **Testnet automation** -- CI/CD pipeline for contract deployment + integration tests
- [ ] **Mainnet deployment** -- Security audit + production deployment on Stellar Public Network

## License

MIT
