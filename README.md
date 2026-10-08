# Peng-Pool Solana Program (Anchor)

> **Solana Mobile Hackathon (Clock In)**
> Competitive Time-Trial Arcade Pool on Solana Mobile.

## Overview
Peng-Pool is the on-chain competitive backbone for **Peng-Balls**. Players bet DevCoin (or $SKR / SPL tokens) into a weekly prize pool to enter timed maze runs.
- **Winner takes 90%** of the weekly accumulated pool.
- **10%** goes to protocol maintenance / fee recipient.
- **Leaderboard**: Win completions are tracked by millisecond elapsed time. The player with the lowest time at the end of the round wins the pool.
- **Stats**: Every win and loss is permanently accounted for on-chain.

---

## On-Chain Accounts

| Account | PDA Seeds | Description |
|---|---|---|
| `PoolRound` | `["pool_round", round_id]` | Holds round timing, accumulated pot, current lowest time & winning player address |
| `Vault` | `["vault", round_id]` | PDA-controlled SPL token escrow holding pool entry bets |
| `Leaderboard` | `["leaderboard", round_id]` | Sorted top-10 fastest runs for quick mobile display |
| `PlayerStats` | `["player_stats", round_id, player_pubkey]` | Per-player stats: total runs, wins, losses, personal best time |

---

## Instructions

1. `initialize_pool(round_id, entry_fee, duration_seconds)`
   - Creates the pool round, PDA escrow vault, and empty top-10 leaderboard.
   - For weekly rounds, `duration_seconds = 604800` (7 days).

2. `enter_run()`
   - Transfers the `entry_fee` from the player's token account into the vault PDA.
   - Increments the pool pot and issues an active run ticket for the player.

3. `record_run_result(is_win, time_ms)`
   - Consumes an active ticket.
   - If `is_win = false`: Increments loss counter for the player and pool.
   - If `is_win = true`: Updates personal best, updates round leader if lowest time, and inserts into the top-10 leaderboard.

4. `claim_prize()`
   - Can only be executed once `Clock::unix_timestamp >= end_time`.
   - Transfers **90%** of `total_pot` to the winning player with the lowest recorded time.
   - Transfers **10%** of `total_pot` to the fee recipient.
   - Marks the round as finalized and prize claimed.

---

## Build & Test

### Prerequisites
- [Rust & Cargo](https://rustup.rs/)
- [Solana CLI](https://docs.solanalabs.com/cli/install) (v1.18+)
- [Anchor CLI](https://www.anchor-lang.com/docs/installation) (v0.30.1+)
- Node.js & Yarn

### Setup & Tests
```bash
# Install dependencies
yarn install

# Build the Anchor program
anchor build

# Run local integration tests
anchor test
```

### Deploy to Devnet
```bash
# Configure Solana CLI for Devnet
solana config set --url https://api.devnet.solana.com

# Fund your deployer keypair
solana airdrop 2

# Sync program ID in lib.rs and Anchor.toml
anchor keys sync

# Build & Deploy
anchor build
anchor deploy --provider.cluster devnet
```
