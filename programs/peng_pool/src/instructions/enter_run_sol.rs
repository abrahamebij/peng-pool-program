use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::PengPoolError;

#[derive(Accounts)]
pub struct EnterRunSol<'info> {
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
        seeds = [b"vault_sol", pool_round.round_id.to_le_bytes().as_ref()],
        bump = pool_round.vault_bump
    )]
    pub vault: Account<'info, SolVault>,

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

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<EnterRunSol>) -> Result<()> {
    let clock = Clock::get()?;
    let pool_round = &mut ctx.accounts.pool_round;

    require!(clock.unix_timestamp < pool_round.end_time, PengPoolError::RoundEnded);
    require!(pool_round.is_native(), PengPoolError::InvalidPoolType);

    // Transfer entry fee (lamports) from player to vault PDA via System Program
    let cpi_context = CpiContext::new(
        ctx.accounts.system_program.to_account_info(),
        anchor_lang::system_program::Transfer {
            from: ctx.accounts.player.to_account_info(),
            to: ctx.accounts.vault.to_account_info(),
        },
    );
    anchor_lang::system_program::transfer(cpi_context, pool_round.entry_fee)?;

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
        "Player {} entered SOL run for Round #{}. Total pot: {} lamports (active tickets: {})",
        ctx.accounts.player.key(),
        pool_round.round_id,
        pool_round.total_pot,
        player_stats.active_tickets
    );

    Ok(())
}
