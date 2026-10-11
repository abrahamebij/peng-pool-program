import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import {
  createMint,
  createAccount,
  mintTo,
  getAccount,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { Keypair, PublicKey } from "@solana/web3.js";
import { expect } from "chai";
import { BN } from "bn.js";

describe("peng_pool integration tests", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  // In typical anchor workspace:
  // const program = anchor.workspace.PengPool as Program;
  const program = anchor.workspace.PengPool as Program<any>;

  const authority = provider.wallet;
  const feeRecipient = Keypair.generate();
  const player1 = Keypair.generate();
  const player2 = Keypair.generate();

  let devcoinMint: PublicKey;
  let player1TokenAccount: PublicKey;
  let player2TokenAccount: PublicKey;
  let feeTokenAccount: PublicKey;

  const roundId = new BN(1);
  const entryFee = new BN(100_000_000); // 100 devcoins (6 decimals)
  const durationSeconds = new BN(5); // 5 seconds for rapid testing

  let poolRoundPda: PublicKey;
  let vaultPda: PublicKey;
  let leaderboardPda: PublicKey;

  before(async () => {
    // Airdrop SOL to players
    const sig1 = await provider.connection.requestAirdrop(player1.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL);
    const sig2 = await provider.connection.requestAirdrop(player2.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL);
    await provider.connection.confirmTransaction(sig1);
    await provider.connection.confirmTransaction(sig2);

    // Create test DevCoin token mint
    devcoinMint = await createMint(
      provider.connection,
      (authority as any).payer,
      authority.publicKey,
      null,
      6
    );

    // Create token accounts
    player1TokenAccount = await createAccount(
      provider.connection,
      (authority as any).payer,
      devcoinMint,
      player1.publicKey
    );

    player2TokenAccount = await createAccount(
      provider.connection,
      (authority as any).payer,
      devcoinMint,
      player2.publicKey
    );

    feeTokenAccount = await createAccount(
      provider.connection,
      (authority as any).payer,
      devcoinMint,
      feeRecipient.publicKey
    );

    // Mint tokens to players
    await mintTo(
      provider.connection,
      (authority as any).payer,
      devcoinMint,
      player1TokenAccount,
      authority.publicKey,
      1_000_000_000 // 1,000 devcoins
    );

    await mintTo(
      provider.connection,
      (authority as any).payer,
      devcoinMint,
      player2TokenAccount,
      authority.publicKey,
      1_000_000_000 // 1,000 devcoins
    );

    // Derive PDAs
    const roundIdBuffer = roundId.toArrayLike(Buffer, "le", 8);
    [poolRoundPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("pool_round"), roundIdBuffer],
      program.programId
    );
    [vaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), roundIdBuffer],
      program.programId
    );
    [leaderboardPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("leaderboard"), roundIdBuffer],
      program.programId
    );
  });

  it("1. Initializes weekly pool round #1", async () => {
    await program.methods
      .initializePool(roundId, entryFee, durationSeconds)
      .accounts({
        authority: authority.publicKey,
        feeRecipient: feeRecipient.publicKey,
        tokenMint: devcoinMint,
        poolRound: poolRoundPda,
        vault: vaultPda,
        leaderboard: leaderboardPda,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    const pool = await program.account.poolRound.fetch(poolRoundPda);
    expect(pool.roundId.toNumber()).to.equal(1);
    expect(pool.entryFee.toNumber()).to.equal(entryFee.toNumber());
    expect(pool.totalPot.toNumber()).to.equal(0);
    expect(pool.currentWinner.toBase58()).to.equal(PublicKey.default.toBase58());
  });

  it("2. Player 1 enters run and bets entry fee into pool", async () => {
    const roundIdBuffer = roundId.toArrayLike(Buffer, "le", 8);
    const [player1StatsPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("player_stats"), roundIdBuffer, player1.publicKey.toBuffer()],
      program.programId
    );

    await program.methods
      .enterRun()
      .accounts({
        player: player1.publicKey,
        poolRound: poolRoundPda,
        vault: vaultPda,
        playerTokenAccount: player1TokenAccount,
        playerStats: player1StatsPda,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([player1])
      .rpc();

    const pool = await program.account.poolRound.fetch(poolRoundPda);
    expect(pool.totalPot.toNumber()).to.equal(entryFee.toNumber());
    expect(pool.totalRuns).to.equal(1);

    const stats = await program.account.playerStats.fetch(player1StatsPda);
    expect(stats.activeTickets).to.equal(1);
    expect(stats.totalRuns).to.equal(1);
  });

  it("3. Player 1 loses run (caught by enemy ball)", async () => {
    const roundIdBuffer = roundId.toArrayLike(Buffer, "le", 8);
    const [player1StatsPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("player_stats"), roundIdBuffer, player1.publicKey.toBuffer()],
      program.programId
    );

    await program.methods
      .recordRunResult(false, 0)
      .accounts({
        player: player1.publicKey,
        poolRound: poolRoundPda,
        playerStats: player1StatsPda,
        leaderboard: leaderboardPda,
      })
      .signers([player1])
      .rpc();

    const stats = await program.account.playerStats.fetch(player1StatsPda);
    expect(stats.activeTickets).to.equal(0);
    expect(stats.losses).to.equal(1);
    expect(stats.wins).to.equal(0);

    const pool = await program.account.poolRound.fetch(poolRoundPda);
    expect(pool.totalLosses).to.equal(1);
    expect(pool.totalWins).to.equal(0);
  });

  it("4. Player 1 enters again and wins with time 62.40s (62400 ms)", async () => {
    const roundIdBuffer = roundId.toArrayLike(Buffer, "le", 8);
    const [player1StatsPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("player_stats"), roundIdBuffer, player1.publicKey.toBuffer()],
      program.programId
    );

    // Buy ticket
    await program.methods
      .enterRun()
      .accounts({
        player: player1.publicKey,
        poolRound: poolRoundPda,
        vault: vaultPda,
        playerTokenAccount: player1TokenAccount,
        playerStats: player1StatsPda,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([player1])
      .rpc();

    // Record 62400 ms win
    await program.methods
      .recordRunResult(true, 62400)
      .accounts({
        player: player1.publicKey,
        poolRound: poolRoundPda,
        playerStats: player1StatsPda,
        leaderboard: leaderboardPda,
      })
      .signers([player1])
      .rpc();

    const pool = await program.account.poolRound.fetch(poolRoundPda);
    expect(pool.bestTimeMs).to.equal(62400);
    expect(pool.currentWinner.toBase58()).to.equal(player1.publicKey.toBase58());
  });

  it("5. Player 2 enters and wins with a faster time: 45.10s (45100 ms)", async () => {
    const roundIdBuffer = roundId.toArrayLike(Buffer, "le", 8);
    const [player2StatsPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("player_stats"), roundIdBuffer, player2.publicKey.toBuffer()],
      program.programId
    );

    // Buy ticket
    await program.methods
      .enterRun()
      .accounts({
        player: player2.publicKey,
        poolRound: poolRoundPda,
        vault: vaultPda,
        playerTokenAccount: player2TokenAccount,
        playerStats: player2StatsPda,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([player2])
      .rpc();

    // Record 45100 ms win
    await program.methods
      .recordRunResult(true, 45100)
      .accounts({
        player: player2.publicKey,
        poolRound: poolRoundPda,
        playerStats: player2StatsPda,
        leaderboard: leaderboardPda,
      })
      .signers([player2])
      .rpc();

    // Verify Player 2 is now the leader with lowest time
    const pool = await program.account.poolRound.fetch(poolRoundPda);
    expect(pool.bestTimeMs).to.equal(45100);
    expect(pool.currentWinner.toBase58()).to.equal(player2.publicKey.toBase58());
    expect(pool.totalPot.toNumber()).to.equal(entryFee.toNumber() * 3); // 3 runs entered total

    // Verify leaderboard rankings: Rank 1 is Player 2, Rank 2 is Player 1 (with wins & losses)
    const lb = await program.account.leaderboard.fetch(leaderboardPda);
    expect(lb.entries.length).to.equal(2);
    expect(lb.entries[0].player.toBase58()).to.equal(player2.publicKey.toBase58());
    expect(lb.entries[0].timeMs).to.equal(45100);
    expect(lb.entries[0].wins).to.equal(1);
    expect(lb.entries[0].losses).to.equal(0);
    expect(lb.entries[1].player.toBase58()).to.equal(player1.publicKey.toBase58());
    expect(lb.entries[1].timeMs).to.equal(62400);
    expect(lb.entries[1].wins).to.equal(1);
    expect(lb.entries[1].losses).to.equal(1);
  });

  it("6. Round ends: Winner claims 90% of pool, 10% fee to protocol", async () => {
    // Wait for the test duration to elapse (5s)
    await new Promise((r) => setTimeout(r, 6000));

    const totalPot = entryFee.toNumber() * 3;
    const expectedWinnerPrize = Math.floor((totalPot * 90) / 100);
    const expectedFee = totalPot - expectedWinnerPrize;

    const winnerInitialBalance = (await getAccount(provider.connection, player2TokenAccount)).amount;

    await program.methods
      .claimPrize()
      .accounts({
        caller: authority.publicKey,
        poolRound: poolRoundPda,
        vault: vaultPda,
        winner: player2.publicKey,
        winnerTokenAccount: player2TokenAccount,
        feeTokenAccount: feeTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    const winnerFinalBalance = (await getAccount(provider.connection, player2TokenAccount)).amount;
    const feeBalance = (await getAccount(provider.connection, feeTokenAccount)).amount;

    expect(Number(winnerFinalBalance - winnerInitialBalance)).to.equal(expectedWinnerPrize);
    expect(Number(feeBalance)).to.equal(expectedFee);

    const pool = await program.account.poolRound.fetch(poolRoundPda);
    expect(pool.prizeClaimed).to.be.true;
    expect(pool.isFinalized).to.be.true;
  });

  it("7. Native SOL Pool: Initializes, enters run, records result, and claims prize", async () => {
    const solRoundId = new BN(2);
    const solEntryFee = new BN(50_000_000); // 0.05 SOL in lamports
    const solDuration = new BN(4); // 4 seconds

    const roundIdBuffer = solRoundId.toArrayLike(Buffer, "le", 8);
    const [solPoolPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("pool_round"), roundIdBuffer],
      program.programId
    );
    const [solVaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault_sol"), roundIdBuffer],
      program.programId
    );
    const [solLbPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("leaderboard"), roundIdBuffer],
      program.programId
    );
    const [player1SolStatsPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("player_stats"), roundIdBuffer, player1.publicKey.toBuffer()],
      program.programId
    );

    // Initialize Native SOL pool
    await program.methods
      .initializePoolSol(solRoundId, solEntryFee, solDuration)
      .accounts({
        authority: authority.publicKey,
        feeRecipient: feeRecipient.publicKey,
        poolRound: solPoolPda,
        vault: solVaultPda,
        leaderboard: solLbPda,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    const solPool = await program.account.poolRound.fetch(solPoolPda);
    expect(solPool.roundId.toNumber()).to.equal(2);
    expect(solPool.entryFee.toNumber()).to.equal(solEntryFee.toNumber());
    expect(solPool.tokenMint.toBase58()).to.equal(PublicKey.default.toBase58()); // default = Native SOL

    // Player 1 enters Native SOL run
    await program.methods
      .enterRunSol()
      .accounts({
        player: player1.publicKey,
        poolRound: solPoolPda,
        vault: solVaultPda,
        playerStats: player1SolStatsPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([player1])
      .rpc();

    // Record win (38200 ms)
    await program.methods
      .recordRunResult(true, 38200)
      .accounts({
        player: player1.publicKey,
        poolRound: solPoolPda,
        playerStats: player1SolStatsPda,
        leaderboard: solLbPda,
      })
      .signers([player1])
      .rpc();

    const lbSol = await program.account.leaderboard.fetch(solLbPda);
    expect(lbSol.entries.length).to.equal(1);
    expect(lbSol.entries[0].player.toBase58()).to.equal(player1.publicKey.toBase58());
    expect(lbSol.entries[0].timeMs).to.equal(38200);
    expect(lbSol.entries[0].wins).to.equal(1);

    // Wait for round duration (4s)
    await new Promise((r) => setTimeout(r, 5000));

    // Claim prize in Native SOL
    const player1BalBefore = await provider.connection.getBalance(player1.publicKey);
    await program.methods
      .claimPrizeSol()
      .accounts({
        caller: authority.publicKey,
        poolRound: solPoolPda,
        vault: solVaultPda,
        winner: player1.publicKey,
        feeRecipient: feeRecipient.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const player1BalAfter = await provider.connection.getBalance(player1.publicKey);
    const expectedSolPrize = Math.floor((solEntryFee.toNumber() * 90) / 100);
    expect(player1BalAfter - player1BalBefore).to.equal(expectedSolPrize);
  });
});
