#![no_std]
use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, symbol_short, Address, Env, String, Vec,
};
use treasury::TreasuryContractClient;

/// Tournament Status Enum representing contract states
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum TournamentStatus {
    Draft = 0,
    RegistrationOpen = 1,
    RegistrationClosed = 2,
    Ongoing = 3,
    Completed = 4,
    PrizeReleased = 5,
    Cancelled = 6,
}

/// Storage keys for Tournament Contract
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    TournamentCount,
    TournamentData(u32),
    Players(u32),
}

/// Tournament data structure
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Tournament {
    pub id: u32,
    pub name: String,
    pub organizer: Address,
    pub treasury_id: Address,
    pub entry_fee: i128,
    pub max_players: u32,
    pub status: TournamentStatus,
    pub winner: Option<Address>,
    pub prize_pool: i128,
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    NotFound = 1,
    Unauthorized = 2,
    InvalidStatus = 3,
    TournamentFull = 4,
    AlreadyRegistered = 5,
    WinnerNotSet = 6,
}

#[contract]
pub struct TournamentContract;

#[contractimpl]
impl TournamentContract {
    /// Create a new tournament in Draft state
    pub fn create_tournament(
        env: Env,
        organizer: Address,
        name: String,
        entry_fee: i128,
        max_players: u32,
        treasury_id: Address,
    ) -> u32 {
        organizer.require_auth();

        let mut count: u32 = env
            .storage()
            .persistent()
            .get(&DataKey::TournamentCount)
            .unwrap_or(0);

        count += 1;

        let tournament = Tournament {
            id: count,
            name: name.clone(),
            organizer: organizer.clone(),
            treasury_id: treasury_id.clone(),
            entry_fee,
            max_players,
            status: TournamentStatus::Draft,
            winner: None,
            prize_pool: 0,
        };

        env.storage()
            .persistent()
            .set(&DataKey::TournamentData(count), &tournament);
        env.storage().persistent().set(&DataKey::TournamentCount, &count);

        // Register this tournament with Treasury so the contract is authorized
        // for fund operations (release_prize, refund_all).
        let treasury_client = TreasuryContractClient::new(&env, &treasury_id);
        let tournament_addr = env.current_contract_address();
        treasury_client.register_tournament(&count, &tournament_addr);

        env.events().publish(
            (symbol_short!("created"), count),
            (organizer, entry_fee, max_players),
        );

        count
    }

    /// Open registration for a tournament
    pub fn open_registration(env: Env, tournament_id: u32, organizer: Address) -> Result<(), Error> {
        organizer.require_auth();

        let mut tournament: Tournament = env
            .storage()
            .persistent()
            .get(&DataKey::TournamentData(tournament_id))
            .ok_or(Error::NotFound)?;

        if tournament.organizer != organizer {
            return Err(Error::Unauthorized);
        }

        if tournament.status != TournamentStatus::Draft {
            return Err(Error::InvalidStatus);
        }

        tournament.status = TournamentStatus::RegistrationOpen;
        env.storage()
            .persistent()
            .set(&DataKey::TournamentData(tournament_id), &tournament);

        env.events().publish(
            (symbol_short!("reg_open"), tournament_id),
            tournament.status.clone(),
        );

        Ok(())
    }

    /// Register a player and trigger inter-contract payment call to Treasury
    pub fn register_player(env: Env, tournament_id: u32, player: Address) -> Result<(), Error> {
        player.require_auth();

        let mut tournament: Tournament = env
            .storage()
            .persistent()
            .get(&DataKey::TournamentData(tournament_id))
            .ok_or(Error::NotFound)?;

        if tournament.status != TournamentStatus::RegistrationOpen {
            return Err(Error::InvalidStatus);
        }

        let mut players: Vec<Address> = env
            .storage()
            .persistent()
            .get(&DataKey::Players(tournament_id))
            .unwrap_or_else(|| Vec::new(&env));

        if players.len() >= tournament.max_players {
            return Err(Error::TournamentFull);
        }

        if players.contains(&player) {
            return Err(Error::AlreadyRegistered);
        }

        // Inter-contract call: Invoke Treasury deposit function
        let treasury_client = TreasuryContractClient::new(&env, &tournament.treasury_id);
        treasury_client.deposit(&tournament_id, &player, &tournament.entry_fee);

        players.push_back(player.clone());
        tournament.prize_pool += tournament.entry_fee;

        env.storage()
            .persistent()
            .set(&DataKey::Players(tournament_id), &players);
        env.storage()
            .persistent()
            .set(&DataKey::TournamentData(tournament_id), &tournament);

        env.events().publish(
            (symbol_short!("reg_plyr"), tournament_id),
            (player, tournament.entry_fee),
        );

        Ok(())
    }

    /// Close registration for a tournament
    pub fn close_registration(env: Env, tournament_id: u32, organizer: Address) -> Result<(), Error> {
        organizer.require_auth();

        let mut tournament: Tournament = env
            .storage()
            .persistent()
            .get(&DataKey::TournamentData(tournament_id))
            .ok_or(Error::NotFound)?;

        if tournament.organizer != organizer {
            return Err(Error::Unauthorized);
        }

        if tournament.status != TournamentStatus::RegistrationOpen {
            return Err(Error::InvalidStatus);
        }

        tournament.status = TournamentStatus::RegistrationClosed;
        env.storage()
            .persistent()
            .set(&DataKey::TournamentData(tournament_id), &tournament);

        env.events().publish(
            (symbol_short!("reg_close"), tournament_id),
            tournament.status.clone(),
        );

        Ok(())
    }

    /// Start tournament match execution
    pub fn start_tournament(env: Env, tournament_id: u32, organizer: Address) -> Result<(), Error> {
        organizer.require_auth();

        let mut tournament: Tournament = env
            .storage()
            .persistent()
            .get(&DataKey::TournamentData(tournament_id))
            .ok_or(Error::NotFound)?;

        if tournament.organizer != organizer {
            return Err(Error::Unauthorized);
        }

        if tournament.status != TournamentStatus::RegistrationClosed {
            return Err(Error::InvalidStatus);
        }

        tournament.status = TournamentStatus::Ongoing;
        env.storage()
            .persistent()
            .set(&DataKey::TournamentData(tournament_id), &tournament);

        env.events().publish(
            (symbol_short!("started"), tournament_id),
            tournament.status.clone(),
        );

        Ok(())
    }

    /// Declare final winner of the tournament
    pub fn declare_winner(
        env: Env,
        tournament_id: u32,
        organizer: Address,
        winner: Address,
    ) -> Result<(), Error> {
        organizer.require_auth();

        let mut tournament: Tournament = env
            .storage()
            .persistent()
            .get(&DataKey::TournamentData(tournament_id))
            .ok_or(Error::NotFound)?;

        if tournament.organizer != organizer {
            return Err(Error::Unauthorized);
        }

        if tournament.status != TournamentStatus::Ongoing {
            return Err(Error::InvalidStatus);
        }

        tournament.winner = Some(winner.clone());
        tournament.status = TournamentStatus::Completed;

        env.storage()
            .persistent()
            .set(&DataKey::TournamentData(tournament_id), &tournament);

        env.events().publish(
            (symbol_short!("winner"), tournament_id),
            (winner, tournament.prize_pool),
        );

        Ok(())
    }

    /// Release prize pool via Treasury inter-contract invocation
    pub fn release_prize(env: Env, tournament_id: u32, organizer: Address) -> Result<i128, Error> {
        organizer.require_auth();

        let mut tournament: Tournament = env
            .storage()
            .persistent()
            .get(&DataKey::TournamentData(tournament_id))
            .ok_or(Error::NotFound)?;

        if tournament.organizer != organizer {
            return Err(Error::Unauthorized);
        }

        if tournament.status != TournamentStatus::Completed {
            return Err(Error::InvalidStatus);
        }

        let winner = tournament.winner.clone().ok_or(Error::WinnerNotSet)?;

        // Inter-contract call: Invoke Treasury release_prize function
        let treasury_client = TreasuryContractClient::new(&env, &tournament.treasury_id);
        let payout = treasury_client.release_prize(&tournament_id, &winner);

        tournament.status = TournamentStatus::PrizeReleased;

        env.storage()
            .persistent()
            .set(&DataKey::TournamentData(tournament_id), &tournament);

        env.events().publish(
            (symbol_short!("payout"), tournament_id),
            (winner, payout),
        );

        Ok(payout)
    }

    /// Cancel tournament and refund all registered players via Treasury
    pub fn cancel_tournament(env: Env, tournament_id: u32, organizer: Address) -> Result<i128, Error> {
        organizer.require_auth();

        let mut tournament: Tournament = env
            .storage()
            .persistent()
            .get(&DataKey::TournamentData(tournament_id))
            .ok_or(Error::NotFound)?;

        if tournament.organizer != organizer {
            return Err(Error::Unauthorized);
        }

        if tournament.status == TournamentStatus::PrizeReleased
            || tournament.status == TournamentStatus::Cancelled
        {
            return Err(Error::InvalidStatus);
        }

        // Inter-contract call: Invoke Treasury refund_all function
        let treasury_client = TreasuryContractClient::new(&env, &tournament.treasury_id);
        let refunded_amount = treasury_client.refund_all(&tournament_id);

        tournament.status = TournamentStatus::Cancelled;

        env.storage()
            .persistent()
            .set(&DataKey::TournamentData(tournament_id), &tournament);

        env.events().publish(
            (symbol_short!("cancelled"), tournament_id),
            refunded_amount,
        );

        Ok(refunded_amount)
    }

    /// Get tournament by ID
    pub fn get_tournament(env: Env, tournament_id: u32) -> Result<Tournament, Error> {
        env.storage()
            .persistent()
            .get(&DataKey::TournamentData(tournament_id))
            .ok_or(Error::NotFound)
    }

    /// Get registered players for a tournament
    pub fn get_players(env: Env, tournament_id: u32) -> Vec<Address> {
        env.storage()
            .persistent()
            .get(&DataKey::Players(tournament_id))
            .unwrap_or_else(|| Vec::new(&env))
    }

    /// Get total number of tournaments created
    pub fn get_tournament_count(env: Env) -> u32 {
        env.storage()
            .persistent()
            .get(&DataKey::TournamentCount)
            .unwrap_or(0)
    }
}

#[cfg(test)]
mod test;
