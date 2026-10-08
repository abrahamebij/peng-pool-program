use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::state::*;
use crate::errors::PengPoolError;

#[derive(Accounts)]
pub struct EnterRun<'info> {
    #[account(mut)]
    pub player: Signer<'info>,

    #[account(
        mut,
        seeds = [b"pool_round", pool_round.round_id.to_le_bytes().as_ref()],
        bump = pool_round.round_bump
    )]
    pub pool_round: Account<'info, PoolRound>,

    #[account(
        mut,
        seeds = [b"vault", pool_round.round_id.to_le_bytes().as_ref()],
        bump = pool_round.vault_bump
    )]
    pub vault: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = player_token_account.owner == player.key(),
        constraint = player_token_account.mint == pool_round.token_mint
    )]
    pub player_token_account: Account<'info, TokenAccount>,

    #[account(
        init_if_needed,
        payer = player,
        space = PlayerStats::LEN,
        seeds = [
            b"player_stats",
            pool_round.round_id.to_le_bytes().as_ref(),
            player.key().as_ref()
        ],
        bump
    )]
    pub player_stats: Account<'info, PlayerStats>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<EnterRun>) -> Result<()> {
    let clock = Clock::get()?;
    let pool_round = &mut ctx.accounts.pool_round;

    require!(clock.unix_timestamp < pool_round.end_time, PengPoolError::RoundEnded);

    // Transfer entry bet from player to pool vault PDA
    let cpi_accounts = Transfer {
        from: ctx.accounts.player_token_account.to_account_info(),
        to: ctx.accounts.vault.to_account_info(),
        authority: ctx.accounts.player.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    token::transfer(cpi_ctx, pool_round.entry_fee)?;

    // Update pool state
    pool_round.total_pot = pool_round.total_pot
        .checked_add(pool_round.entry_fee)
        .ok_or(PengPoolError::MathOverflow)?;
    pool_round.total_runs = pool_round.total_runs
        .checked_add(1)
        .ok_or(PengPoolError::MathOverflow)?;

    // Update player stats
    let player_stats = &mut ctx.accounts.player_stats;
    if player_stats.total_runs == 0 && player_stats.player == Pubkey::default() {
        player_stats.player = ctx.accounts.player.key();
        player_stats.round_id = pool_round.round_id;
        player_stats.bump = ctx.bumps.player_stats;
    }
    player_stats.total_runs = player_stats.total_runs
        .checked_add(1)
        .ok_or(PengPoolError::MathOverflow)?;
    player_stats.active_tickets = player_stats.active_tickets
        .checked_add(1)
        .ok_or(PengPoolError::MathOverflow)?;

    msg!(
        "Player {} entered run for Round #{}. Total pot now: {} (active tickets: {})",
        ctx.accounts.player.key(),
        pool_round.round_id,
        pool_round.total_pot,
        player_stats.active_tickets
    );

    Ok(())
}
