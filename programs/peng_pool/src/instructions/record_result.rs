use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::PengPoolError;

#[derive(Accounts)]
pub struct RecordRunResult<'info> {
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
        seeds = [
            b"player_stats",
            pool_round.round_id.to_le_bytes().as_ref(),
            player.key().as_ref()
        ],
        bump = player_stats.bump,
        constraint = player_stats.player == player.key() @ PengPoolError::Unauthorized
    )]
    pub player_stats: Account<'info, PlayerStats>,

    #[account(
        mut,
        seeds = [b"leaderboard", pool_round.round_id.to_le_bytes().as_ref()],
        bump = leaderboard.bump
    )]
    pub leaderboard: Account<'info, Leaderboard>,
}

pub fn handler(ctx: Context<RecordRunResult>, is_win: bool, time_ms: u32) -> Result<()> {
    let clock = Clock::get()?;
    let pool_round = &mut ctx.accounts.pool_round;
    let player_stats = &mut ctx.accounts.player_stats;
    let leaderboard = &mut ctx.accounts.leaderboard;

    require!(clock.unix_timestamp < pool_round.end_time, PengPoolError::RoundEnded);
    require!(player_stats.active_tickets > 0, PengPoolError::NoActiveTicket);

    // Consume one active run ticket
    player_stats.active_tickets -= 1;

    if is_win {
        require!(time_ms > 0, PengPoolError::InvalidRunTime);

        pool_round.total_wins = pool_round.total_wins.saturating_add(1);
        player_stats.wins = player_stats.wins.saturating_add(1);

        // Update player's personal best time
        if player_stats.best_time_ms == 0 || time_ms < player_stats.best_time_ms {
            player_stats.best_time_ms = time_ms;
        }

        // Check if this run is the new round-leading lowest time
        if pool_round.best_time_ms == 0 || time_ms < pool_round.best_time_ms {
            pool_round.best_time_ms = time_ms;
            pool_round.current_winner = ctx.accounts.player.key();

            msg!(
                "NEW LEADER! Player {} set new best time: {} ms ({:.2} s)",
                ctx.accounts.player.key(),
                time_ms,
                time_ms as f64 / 1000.0
            );
        }

        // Update Top-50 leaderboard with wins and losses (deduplicate so each player holds their personal best)
        if let Some(existing) = leaderboard.entries.iter_mut().find(|e| e.player == ctx.accounts.player.key()) {
            if time_ms < existing.time_ms {
                existing.time_ms = time_ms;
                existing.recorded_at = clock.unix_timestamp;
            }
            existing.wins = player_stats.wins;
            existing.losses = player_stats.losses;
        } else {
            leaderboard.entries.push(LeaderboardEntry {
                player: ctx.accounts.player.key(),
                time_ms,
                wins: player_stats.wins,
                losses: player_stats.losses,
                recorded_at: clock.unix_timestamp,
            });
        }
        leaderboard.entries.sort_by_key(|e| e.time_ms);
        if leaderboard.entries.len() > MAX_LEADERBOARD_ENTRIES {
            leaderboard.entries.truncate(MAX_LEADERBOARD_ENTRIES);
        }

        msg!(
            "Run WON by {}: {} ms. Personal best: {} ms (Wins: {}, Losses: {}). Active tickets remaining: {}",
            ctx.accounts.player.key(),
            time_ms,
            player_stats.best_time_ms,
            player_stats.wins,
            player_stats.losses,
            player_stats.active_tickets
        );
    } else {
        pool_round.total_losses = pool_round.total_losses.saturating_add(1);
        player_stats.losses = player_stats.losses.saturating_add(1);

        // Keep leaderboard entry loss count accurate if this player is on the leaderboard
        if let Some(existing) = leaderboard.entries.iter_mut().find(|e| e.player == ctx.accounts.player.key()) {
            existing.losses = player_stats.losses;
        }

        msg!(
            "Run LOST (caught/failed) by {}. Total losses: {}. Active tickets remaining: {}",
            ctx.accounts.player.key(),
            player_stats.losses,
            player_stats.active_tickets
        );
    }

    Ok(())
}
