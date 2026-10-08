use anchor_lang::prelude::*;

pub const MAX_LEADERBOARD_ENTRIES: usize = 10;
pub const WINNER_PERCENTAGE: u64 = 90;
pub const PROTOCOL_FEE_PERCENTAGE: u64 = 10;

#[account]
#[derive(Default)]
pub struct PoolRound {
    /// Authority who initializes and administers the round
    pub authority: Pubkey,
    /// Address that receives the 10% protocol / maintenance fee
    pub fee_recipient: Pubkey,
    /// Sequential round identifier (e.g. 1, 2, 3...)
    pub round_id: u64,
    /// Unix timestamp when the round opens
    pub start_time: i64,
    /// Unix timestamp when the round closes (start_time + 7 days)
    pub end_time: i64,
    /// Entry bet in token base units (e.g., DevCoin or $SKR)
    pub entry_fee: u64,
    /// SPL Token mint for the entry bet
    pub token_mint: Pubkey,
    /// PDA token account holding the pooled escrow funds
    pub vault: Pubkey,
    /// Total accumulated tokens in the prize pool
    pub total_pot: u64,
    /// Best (lowest) win time recorded this round in milliseconds
    pub best_time_ms: u32,
    /// Current winning player address holding the lowest time
    pub current_winner: Pubkey,
    /// Total number of runs initiated this round
    pub total_runs: u32,
    /// Total number of winning completions
    pub total_wins: u32,
    /// Total number of losses (caught by enemy or quit)
    pub total_losses: u32,
    /// Whether round has ended and been finalized
    pub is_finalized: bool,
    /// Whether the 90% prize payout has been claimed
    pub prize_claimed: bool,
    /// PDA bump for the token vault
    pub vault_bump: u8,
    /// PDA bump for this pool round account
    pub round_bump: u8,
}

impl PoolRound {
    pub const LEN: usize = 8 + // discriminator
        32 + // authority
        32 + // fee_recipient
        8 +  // round_id
        8 +  // start_time
        8 +  // end_time
        8 +  // entry_fee
        32 + // token_mint
        32 + // vault
        8 +  // total_pot
        4 +  // best_time_ms
        32 + // current_winner
        4 +  // total_runs
        4 +  // total_wins
        4 +  // total_losses
        1 +  // is_finalized
        1 +  // prize_claimed
        1 +  // vault_bump
        1 +  // round_bump
        64;  // padding for future upgrades
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Default, PartialEq)]
pub struct LeaderboardEntry {
    pub player: Pubkey,
    pub time_ms: u32,
    pub recorded_at: i64,
}

#[account]
pub struct Leaderboard {
    pub round_id: u64,
    pub entries: Vec<LeaderboardEntry>,
    pub bump: u8,
}

impl Leaderboard {
    pub const LEN: usize = 8 + // discriminator
        8 + // round_id
        4 + (MAX_LEADERBOARD_ENTRIES * (32 + 4 + 8)) + // vector prefix + entries
        1 + // bump
        32; // padding
}

#[account]
#[derive(Default)]
pub struct PlayerStats {
    pub player: Pubkey,
    pub round_id: u64,
    pub total_runs: u32,
    pub wins: u32,
    pub losses: u32,
    pub best_time_ms: u32,
    pub active_tickets: u32,
    pub bump: u8,
}

impl PlayerStats {
    pub const LEN: usize = 8 + // discriminator
        32 + // player
        8 +  // round_id
        4 +  // total_runs
        4 +  // wins
        4 +  // losses
        4 +  // best_time_ms
        4 +  // active_tickets
        1 +  // bump
        32;  // padding
}
