use anchor_lang::prelude::*;

#[error_code]
pub enum PengPoolError {
    #[msg("Round duration must be greater than zero.")]
    InvalidDuration,

    #[msg("Entry fee must be greater than zero.")]
    InvalidEntryFee,

    #[msg("This pool round has already ended.")]
    RoundEnded,

    #[msg("This pool round is still active; cannot claim before end time.")]
    RoundNotEnded,

    #[msg("This pool round is already finalized.")]
    RoundAlreadyFinalized,

    #[msg("The prize has already been claimed for this round.")]
    PrizeAlreadyClaimed,

    #[msg("No winner was recorded for this round.")]
    NoWinnerRecorded,

    #[msg("Unauthorized signer for this operation.")]
    Unauthorized,

    #[msg("Player does not have an active run ticket.")]
    NoActiveTicket,

    #[msg("Invalid time usage recorded.")]
    InvalidRunTime,

    #[msg("Provided winner account does not match the recorded round winner.")]
    WinnerMismatch,

    #[msg("Calculation overflow occurred.")]
    MathOverflow,

    #[msg("Invalid pool type for this instruction (native SOL vs SPL token mismatch).")]
    InvalidPoolType,
}
