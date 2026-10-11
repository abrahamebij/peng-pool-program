use anchor_lang::prelude::*;

pub mod errors;
pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("Mh2yn8cR99LYd88UcihsCnbXatss89VKxYZU9W6WQEj");

#[program]
pub mod peng_pool {
    use super::*;

    /// Initializes a new weekly pool round with SPL token vault ($SKR) and Top 50 leaderboard
    pub fn initialize_pool(
        ctx: Context<InitializePool>,
        round_id: u64,
        entry_fee: u64,
        duration_seconds: i64,
    ) -> Result<()> {
        instructions::initialize_pool::handler(ctx, round_id, entry_fee, duration_seconds)
    }

    /// Initializes a new weekly pool round with Native SOL vault and Top 50 leaderboard
    pub fn initialize_pool_sol(
        ctx: Context<InitializePoolSol>,
        round_id: u64,
        entry_fee_lamports: u64,
        duration_seconds: i64,
    ) -> Result<()> {
        instructions::initialize_pool_sol::handler(ctx, round_id, entry_fee_lamports, duration_seconds)
    }

    /// Player bets SPL token ($SKR) entry fee into weekly pool
    pub fn enter_run(ctx: Context<EnterRun>) -> Result<()> {
        instructions::enter_run::handler(ctx)
    }

    /// Player bets Native SOL entry fee into weekly pool
    pub fn enter_run_sol(ctx: Context<EnterRunSol>) -> Result<()> {
        instructions::enter_run_sol::handler(ctx)
    }

    /// Records the game run result (win or loss) and time usage in ms for Top 50 ranking
    pub fn record_run_result(
        ctx: Context<RecordRunResult>,
        is_win: bool,
        time_ms: u32,
    ) -> Result<()> {
        instructions::record_result::handler(ctx, is_win, time_ms)
    }

    /// Concludes SPL token weekly round and transfers 90% prize to winner and 10% fee
    pub fn claim_prize(ctx: Context<ClaimPrize>) -> Result<()> {
        instructions::claim_prize::handler(ctx)
    }

    /// Concludes Native SOL weekly round and transfers 90% prize to winner and 10% fee
    pub fn claim_prize_sol(ctx: Context<ClaimPrizeSol>) -> Result<()> {
        instructions::claim_prize_sol::handler(ctx)
    }
}
