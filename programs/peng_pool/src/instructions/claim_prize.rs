use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::state::*;
use crate::errors::PengPoolError;

#[derive(Accounts)]
pub struct ClaimPrize<'info> {
    /// Anyone can trigger the permissionless payout once round ends
    #[account(mut)]
    pub caller: Signer<'info>,

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

    /// CHECK: Must match the current recorded winner in pool_round
    #[account(
        constraint = winner.key() == pool_round.current_winner @ PengPoolError::WinnerMismatch
    )]
    pub winner: AccountInfo<'info>,

    #[account(
        mut,
        constraint = winner_token_account.owner == pool_round.current_winner,
        constraint = winner_token_account.mint == pool_round.token_mint
    )]
    pub winner_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = fee_token_account.owner == pool_round.fee_recipient,
        constraint = fee_token_account.mint == pool_round.token_mint
    )]
    pub fee_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<ClaimPrize>) -> Result<()> {
    let clock = Clock::get()?;
    let pool_round = &mut ctx.accounts.pool_round;

    require!(clock.unix_timestamp >= pool_round.end_time, PengPoolError::RoundNotEnded);
    require!(!pool_round.prize_claimed, PengPoolError::PrizeAlreadyClaimed);
    require!(pool_round.current_winner != Pubkey::default(), PengPoolError::NoWinnerRecorded);

    let total_pot = pool_round.total_pot;
    require!(total_pot > 0, PengPoolError::InvalidEntryFee);

    // 90% goes to the winner with lowest time
    let winner_amount = (total_pot as u128 * WINNER_PERCENTAGE as u128 / 100) as u64;
    // 10% protocol / maintenance fee
    let fee_amount = total_pot.saturating_sub(winner_amount);

    let round_id_bytes = pool_round.round_id.to_le_bytes();
    let vault_seeds: &[&[&[u8]]] = &[&[
        b"vault",
        round_id_bytes.as_ref(),
        &[pool_round.vault_bump],
    ]];

    // 1. Transfer 90% to winner
    if winner_amount > 0 {
        let transfer_winner_cpi = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.vault.to_account_info(),
                to: ctx.accounts.winner_token_account.to_account_info(),
                authority: ctx.accounts.vault.to_account_info(),
            },
            vault_seeds,
        );
        token::transfer(transfer_winner_cpi, winner_amount)?;
    }

    // 2. Transfer 10% to protocol fee recipient
    if fee_amount > 0 {
        let transfer_fee_cpi = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.vault.to_account_info(),
                to: ctx.accounts.fee_token_account.to_account_info(),
                authority: ctx.accounts.vault.to_account_info(),
            },
            vault_seeds,
        );
        token::transfer(transfer_fee_cpi, fee_amount)?;
    }

    pool_round.prize_claimed = true;
    pool_round.is_finalized = true;

    msg!(
        "PRIZE DISTRIBUTED for Round #{}: Winner {} received 90% ({}), Fee recipient received 10% ({})",
        pool_round.round_id,
        pool_round.current_winner,
        winner_amount,
        fee_amount
    );

    Ok(())
}
