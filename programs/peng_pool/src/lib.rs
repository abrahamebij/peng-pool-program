use anchor_lang::prelude::*;

pub mod errors;
pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("PengPooL11111111111111111111111111111111111");

#[program]
pub mod peng_pool {
    use super::*;

    /// Initializes a new weekly pool round, PDA token vault, and leaderboard
    pub fn initialize_pool(
        ctx: Context<InitializePool>,
        round_id: u64,
        entry_fee: u64,
        duration_seconds: i64,
    ) -> Result<()> {
        instructions::initialize_pool::handler(ctx, round_id, entry_fee, duration_seconds)
    }

    /// Player bets DevCoin/SKR entry fee into the weekly pool to play a run
    pub fn enter_run(ctx: Context<EnterRun>) -> Result<()> {
        instructions::enter_run::handler(ctx)
    }

    /// Records the game run result (win or loss) and time usage in ms
    pub fn record_run_result(
        ctx: Context<RecordRunResult>,
        is_win: bool,
        time_ms: u32,
    ) -> Result<()> {
        instructions::record_result::handler(ctx, is_win, time_ms)
    }

    /// Concludes the weekly round and transfers 90% of pool to the lowest-time winner, and 10% fee
    pub fn claim_prize(ctx: Context<ClaimPrize>) -> Result<()> {
        instructions::claim_prize::handler(ctx)
    }
}
