use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::PengPoolError;

#[derive(Accounts)]
#[instruction(round_id: u64)]
pub struct InitializePoolSol<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    /// CHECK: Safe recipient for 10% protocol fees
    pub fee_recipient: AccountInfo<'info>,

    #[account(
        init,
        payer = authority,
        space = PoolRound::LEN,
        seeds = [b"pool_round", round_id.to_le_bytes().as_ref()],
        bump
    )]
    pub pool_round: Account<'info, PoolRound>,

    #[account(
        init,
        payer = authority,
        space = SolVault::LEN,
        seeds = [b"vault_sol", round_id.to_le_bytes().as_ref()],
        bump
    )]
    pub vault: Account<'info, SolVault>,

    #[account(
        init,
        payer = authority,
        space = Leaderboard::LEN,
        seeds = [b"leaderboard", round_id.to_le_bytes().as_ref()],
        bump
    )]
    pub leaderboard: Account<'info, Leaderboard>,

    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(
    ctx: Context<InitializePoolSol>,
    round_id: u64,
    entry_fee_lamports: u64,
    duration_seconds: i64,
) -> Result<()> {
    require!(duration_seconds > 0, PengPoolError::InvalidDuration);
    require!(entry_fee_lamports > 0, PengPoolError::InvalidEntryFee);

    let clock = Clock::get()?;
    let pool_round = &mut ctx.accounts.pool_round;

    pool_round.authority = ctx.accounts.authority.key();
    pool_round.fee_recipient = ctx.accounts.fee_recipient.key();
    pool_round.round_id = round_id;
    pool_round.start_time = clock.unix_timestamp;
    pool_round.end_time = clock.unix_timestamp + duration_seconds;
    pool_round.entry_fee = entry_fee_lamports;
    pool_round.token_mint = Pubkey::default(); // Native SOL indicator
    pool_round.vault = ctx.accounts.vault.key();
    pool_round.total_pot = 0;
    pool_round.best_time_ms = 0;
    pool_round.current_winner = Pubkey::default();
    pool_round.total_runs = 0;
    pool_round.total_wins = 0;
    pool_round.total_losses = 0;
    pool_round.is_finalized = false;
    pool_round.prize_claimed = false;
    pool_round.vault_bump = ctx.bumps.vault;
    pool_round.round_bump = ctx.bumps.pool_round;

    let vault = &mut ctx.accounts.vault;
    vault.round_id = round_id;
    vault.bump = ctx.bumps.vault;

    let leaderboard = &mut ctx.accounts.leaderboard;
    leaderboard.round_id = round_id;
    leaderboard.entries = Vec::with_capacity(MAX_LEADERBOARD_ENTRIES);
    leaderboard.bump = ctx.bumps.leaderboard;

    msg!(
        "PengPool Native SOL Round #{} initialized: entry_fee_lamports={}, ends_at={}",
        round_id,
        entry_fee_lamports,
        pool_round.end_time
    );

    Ok(())
}
