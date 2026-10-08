use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};
use crate::state::*;
use crate::errors::PengPoolError;

#[derive(Accounts)]
#[instruction(round_id: u64)]
pub struct InitializePool<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    /// CHECK: Safe recipient for 10% protocol fees
    pub fee_recipient: AccountInfo<'info>,

    pub token_mint: Account<'info, Mint>,

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
        token::mint = token_mint,
        token::authority = vault,
        seeds = [b"vault", round_id.to_le_bytes().as_ref()],
        bump
    )]
    pub vault: Account<'info, TokenAccount>,

    #[account(
        init,
        payer = authority,
        space = Leaderboard::LEN,
        seeds = [b"leaderboard", round_id.to_le_bytes().as_ref()],
        bump
    )]
    pub leaderboard: Account<'info, Leaderboard>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(
    ctx: Context<InitializePool>,
    round_id: u64,
    entry_fee: u64,
    duration_seconds: i64,
) -> Result<()> {
    require!(duration_seconds > 0, PengPoolError::InvalidDuration);
    require!(entry_fee > 0, PengPoolError::InvalidEntryFee);

    let clock = Clock::get()?;
    let pool_round = &mut ctx.accounts.pool_round;

    pool_round.authority = ctx.accounts.authority.key();
    pool_round.fee_recipient = ctx.accounts.fee_recipient.key();
    pool_round.round_id = round_id;
    pool_round.start_time = clock.unix_timestamp;
    pool_round.end_time = clock.unix_timestamp + duration_seconds;
    pool_round.entry_fee = entry_fee;
    pool_round.token_mint = ctx.accounts.token_mint.key();
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

    let leaderboard = &mut ctx.accounts.leaderboard;
    leaderboard.round_id = round_id;
    leaderboard.entries = Vec::with_capacity(MAX_LEADERBOARD_ENTRIES);
    leaderboard.bump = ctx.bumps.leaderboard;

    msg!(
        "PengPool Round #{} initialized: entry_fee={}, ends_at={}",
        round_id,
        entry_fee,
        pool_round.end_time
    );

    Ok(())
}
