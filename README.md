<h1 align="center">peng-pool-program</h1>

<p align="center"><b>The on-chain backbone of Peng Balls.</b><br/>
An Anchor program for weekly prize pools, plus the API the mobile game talks to.</p>

<p align="center">Built for <b>Clock In</b>, the Solana Mobile hackathon by Radiants.</p>

<p align="center">
  <a href="https://github.com/abrahamebij/peng-balls"><b>Game client repo</b></a> ·
  <a href="https://github.com/abrahamebij/peng-balls/releases/latest/download/pengBalls.apk"><b>Download APK</b></a> ·
  <a href="https://youtu.be/qEhcvXdnvpg"><b>Demo video</b></a> ·
  <a href="https://docs.google.com/presentation/d/1X4Nzr9cnJtR536Qe067KJcmHTTK55mwV3nDstssADbE/edit?usp=sharing"><b>Pitch deck</b></a>
</p>

[![Watch the demo](https://img.youtube.com/vi/qEhcvXdnvpg/maxresdefault.jpg)](https://youtu.be/qEhcvXdnvpg)

---

## Contents

1. [What this repo contains](#what-this-repo-contains)
2. [The idea in one minute](#the-idea-in-one-minute)
3. [Architecture](#architecture)
4. [On-chain program](#on-chain-program)
5. [Transaction model](#transaction-model)
6. [SOL and SKR handling](#sol-and-skr-handling)
7. [REST API](#rest-api)
8. [Fair play and anti-cheat](#fair-play-and-anti-cheat)
9. [Devnet proof](#devnet-proof)
10. [Run it yourself](#run-it-yourself)
11. [Repository map](#repository-map)
12. [Status and known limitations](#status-and-known-limitations)

---

## What this repo contains

| Part | Stack | Purpose |
|---|---|---|
| `programs/peng_pool` | Rust, Anchor | The Solana program: pools, escrow, run results, leaderboard, payouts |
| `server` | TypeScript, Express | REST API for the mobile game, deployable as a Node server or a Vercel serverless function |
| Client | TypeScript | Helper client for the program (see the repository map) |

The mobile game that uses all of this lives in [peng-balls](https://github.com/abrahamebij/peng-balls).

## The idea in one minute

Peng Balls is a time-trial arcade game. Each week there is a prize pool. Players stake an entry, play a run, and the fastest time wins **90% of the pot**. **10%** goes to the protocol.

This repo makes that trustworthy:

- The pot lives in a **program-owned escrow vault**, not in a wallet anyone controls.
- Run results update a **top 50 leaderboard** stored on-chain.
- The prize can only be claimed **after the round end time**, enforced by the Solana clock.

## Architecture

```
 Godot 4 mobile game (peng-balls)
        |
        |--- Mobile Wallet Adapter ---> Player wallet
        |                                   |
        |                                   v  signs entry and claim transactions
        |--- HTTPS ---> API server (server/, Vercel)
        |                       |
        v                       v
   Solana Devnet: peng_pool Anchor program
        |-- PDA escrow vault (total pot)
        |-- Round state (best time and leader)
        '-- Top 50 leaderboard, 90/10 payout at round end
```

- The **game** never holds funds. It asks the wallet to sign.
- The **API** serves pool and leaderboard data to the game and handles run validation and recording.
- The **program** is the source of truth for money and rankings.

## On-chain program

| | |
|---|---|
| Program ID | `2G9MvvQTCjFmNn3Bm98ibJ34cCsW2eXEoieWtsRiRnpf` |
| Network | Solana Devnet |
| Framework | Anchor (Rust) |
| Source | [`programs/peng_pool/src/lib.rs`](programs/peng_pool/src/lib.rs) |

**Instructions**

| Instruction | Who calls it | What it does |
|---|---|---|
| `initialize_pool` | Pool creator | Creates a weekly SPL-token round: entry fee, duration, escrow vault PDA, top 50 leaderboard |
| `initialize_pool_sol` | Pool creator | Same, for native SOL |
| `enter_run` | Player | Deposits the SPL entry stake into the vault and issues an active run ticket |
| `enter_run_sol` | Player | Same, for native SOL |
| `record_run_result` | Player flow, via the API | Records the finish time in milliseconds, updates wins, losses and personal best, and updates the top 50 |
| `claim_prize` | Winner | After the round end time, pays 90% of the pot to the fastest player and 10% as the protocol fee (SPL) |
| `claim_prize_sol` | Winner | Same, for native SOL |

**Accounts**

| Account | Role |
|---|---|
| Pool / round state | Entry fee, start and end time, total pot, current best time and leader |
| Escrow vault (PDA) | Holds the pot. Owned by the program, so only program logic can move funds |
| Run ticket | Proof that a player entered and has an active run |
| Leaderboard | Top 50 times for the round |
| Player stats | Wins, losses and personal best |

## Transaction model

**1. Pool creation.** `initialize_pool` (or `_sol`) creates the round with an entry fee and a duration, a vault PDA to hold the pot, and an empty leaderboard.

**2. Entry staking.** The player signs `enter_run` in their wallet. The entry fee moves from the player into the vault, and the program issues a run ticket.

**3. Run result.** After the game finishes, the time in milliseconds is validated by the API and submitted through `record_run_result`. The program updates the player's stats and writes the result to the leaderboard if it ranks.

**4. Leaderboard writes.** The leaderboard keeps the top 50 times. A faster time replaces a slower one and the round's best time and leader are updated.

**5. Round close.** Claims are blocked until `Clock::unix_timestamp >= end_time`.

**6. Payout.** The winner calls `claim_prize` (or `_sol`). The program transfers **90% of the pot** to the fastest player and **10%** to the protocol.

## SOL and SKR handling

Each pool is created for exactly one asset, so every entry and payout in that pool uses the same asset.

| Asset | Pool instruction | Entry | Payout |
|---|---|---|---|
| Native SOL | `initialize_pool_sol` | `enter_run_sol` | `claim_prize_sol` |
| SPL token (including SKR) | `initialize_pool` | `enter_run` | `claim_prize` |

SKR is supported through the SPL path, so Seeker users can stake the token they already hold. Devnet testing also uses a DevCoin SPL token.

## REST API

Base URL: `https://peng-pool-program.vercel.app/api`

| Endpoint | Purpose |
|---|---|
| `GET /pools` | Active weekly rounds: entry fee, pot size, time left, current leader |
| `GET /pools/:roundId/standings` | Top 50 ranked players and their times |
| `POST /pools/:roundId/enter` | Registers a player's entry transaction |
| `POST /runs/finish` | Validates and records a run time, returns the projected rank |

**Example**

```bash
curl https://peng-pool-program.vercel.app/api/pools
```

TODO: paste a short real JSON response here so judges can see the shape of the data.

The server is a single Express app in `server/src/index.ts`. It runs as a standalone Node process or as a Vercel serverless function.

## Fair play and anti-cheat

**Protected by the program**

- Funds sit in a PDA escrow vault, so only program logic can move them.
- A run ticket requires a real stake, so there is no free entry into a staked round.
- `claim_prize` is time-gated by the on-chain clock and cannot be called early.
- Payout shares are fixed in the program: 90% to the winner and 10% to the protocol.

**Protected by the API**

- Run results go through `POST /runs/finish`, which validates them before they are recorded. TODO: list the exact checks (for example ticket ownership, one result per ticket, plausible time bounds).

**Known limits, stated openly**

- Run time is measured inside the game client. A modified client is the main attack on any client-timed game, and this build does not yet fully prevent it.
- Planned hardening: signed run payloads, server-side plausibility checks against the maze layout, and replay verification of recorded inputs.
- Winners are also subject to the hackathon's technical review, so the code and history are open for inspection.

## Devnet proof

A full round on Devnet, so every claim above can be checked without running anything.

| Step | Transaction |
|---|---|
| Pool created | [Solscan](TODO-solscan-link?cluster=devnet) |
| Entry stake deposited | [Solscan](TODO-solscan-link?cluster=devnet) |
| Run result recorded | [Solscan](TODO-solscan-link?cluster=devnet) |
| Prize claimed | [Solscan](TODO-solscan-link?cluster=devnet) |

<p align="center">
  <img src="docs/screenshots/pool-state-explorer.png" width="70%" alt="Pool and vault accounts on a Devnet explorer" />
</p>

## Run it yourself

**Requirements:** Rust, Solana CLI, Anchor, Node.js 18 or newer.

**Program**

```bash
git clone https://github.com/abrahamebij/peng-pool-program
cd peng-pool-program
anchor build
anchor test
```

To deploy your own copy to Devnet:

```bash
solana config set --url devnet
anchor deploy --provider.cluster devnet
```

If you deploy your own program, update the program ID in `lib.rs`, `Anchor.toml` and the client.

**API server**

```bash
cd server
npm install
```

TODO: add the exact start command (for example `npm run dev`), list every environment variable, and commit an `.env.example` file with placeholder values.

No secrets are committed to this repository.

## Repository map

```
peng-pool-program/
  programs/
    peng_pool/
      src/lib.rs      Anchor program: all instructions and accounts
  server/
    src/index.ts      Express API: pools, standings, entries, run results
  (client)            TypeScript client for the program
```

TODO: replace the `(client)` line with the real folder name.

## Status and known limitations

| | |
|---|---|
| Anchor program deployed on Devnet | Yes |
| Pool creation, entry, run result and leaderboard | Yes |
| SOL and SPL (SKR) support | Yes |
| Prize claim at round end | Implemented. TODO: confirm tested end to end on Devnet. |
| Public REST API | Live on Vercel |
| Mainnet | Not yet |
| Security audit | Not yet. This is a hackathon build. |

**Known limitations**

- Devnet only. Amounts are test values.
- Client-timed runs, as described in [Fair play](#fair-play-and-anti-cheat).
- Single protocol fee destination and a fixed 90/10 split.

## Author

**Abraham Ebijuni** ([@abrahamebij](https://github.com/abrahamebij)), solo builder.

## License

Apache 2.0 License
