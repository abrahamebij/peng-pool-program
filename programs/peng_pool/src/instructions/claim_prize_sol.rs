use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::PengPoolError;

#[derive(Accounts)]
pub struct ClaimPrizeSol<'info> {
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
        seeds = [b"vault_sol", pool_round.round_id.to_le_bytes().as_ref()],
        bump = pool_round.vault_bump
    )]
    pub vault: Account<'info, SolVault>,

    /// CHECK: Must match the current recorded winner in pool_round
    #[account(
        mut,
        constraint = winner.key() == pool_round.current_winner @ PengPoolError::WinnerMismatch
    )]
    pub winner: AccountInfo<'info>,

    /// CHECK: Must match the recorded fee recipient in pool_round
    #[account(
        mut,
        constraint = fee_recipient.key() == pool_round.fee_recipient @ PengPoolError::Unauthorized
    )]
    pub fee_recipient: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<ClaimPrizeSol>) -> Result<()> {
    let clock = Clock::get()?;
    let pool_round = &mut ctx.accounts.pool_round;

    require!(clock.unix_timestamp >= pool_round.end_time, PengPoolError::RoundNotEnded);
    require!(pool_round.is_native(), PengPoolError::InvalidPoolType);
    require!(!pool_round.prize_claimed, PengPoolError::PrizeAlreadyClaimed);
    require!(pool_round.current_winner != Pubkey::default(), PengPoolError::NoWinnerRecorded);

    let total_pot = pool_round.total_pot;
    require!(total_pot > 0, PengPoolError::InvalidEntryFee);

    // 90% to winner, 10% fee
    let winner_amount = (total_pot as u128 * WINNER_PERCENTAGE as u128 / 100) as u64;
    let fee_amount = total_pot.saturating_sub(winner_amount);

    let vault_info = ctx.accounts.vault.to_account_info();
    let winner_info = ctx.accounts.winner.to_account_info();
    let fee_recipient_info = ctx.accounts.fee_recipient.to_account_info();

    // Verify vault has enough lamports to cover prize distribution
    require!(
        vault_info.lamports() >= winner_amount.saturating_add(fee_amount),
        PengPoolError::MathOverflow
    );

    // 1. Direct transfer 90% lamports to winner
    if winner_amount > 0 {
        **vault_info.try_borrow_mut_lamports()? = vault_info
            .lamports()
            .checked_sub(winner_amount)
            .ok_or(PengPoolError::MathOverflow)?;
        **winner_info.try_borrow_mut_lamports()? = winner_info
            .lamports()
            .checked_add(winner_amount)
            .ok_or(PengPoolError::MathOverflow)?;
    }

    // 2. Direct transfer 10% lamports to fee recipient
    if fee_amount > 0 {
        **vault_info.try_borrow_mut_lamports()? = vault_info
            .lamports()
            .checked_sub(fee_amount)
            .ok_or(PengPoolError::MathOverflow)?;
        **fee_recipient_info.try_borrow_mut_lamports()? = fee_recipient_info
            .lamports()
            .checked_add(fee_amount)
            .ok_or(PengPoolError::MathOverflow)?;
    }

    pool_round.prize_claimed = true;
    pool_round.is_finalized = true;

    msg!(
        "NATIVE SOL PRIZE DISTRIBUTED for Round #{}: Winner {} received 90% ({} lamports), Fee recipient received 10% ({} lamports)",
        pool_round.round_id,
        pool_round.current_winner,
        winner_amount,
        fee_amount
    );

    Ok(())
}
