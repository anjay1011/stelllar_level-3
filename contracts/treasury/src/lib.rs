#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Address, Env, Vec};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    TournamentPool(u32),
    PlayerDeposit(u32, Address),
    TournamentPlayers(u32),
    TournamentAdmin(u32),
}

#[contract]
pub struct TreasuryContract;

#[contractimpl]
impl TreasuryContract {
    /// Register a tournament contract as the authorized admin for a tournament.
    /// Must be called before any deposits or fund operations.
    /// The admin address should be the tournament contract that will invoke
    /// release_prize and refund_all for this tournament.
    pub fn register_tournament(env: Env, tournament_id: u32, admin: Address) {
        let key = DataKey::TournamentAdmin(tournament_id);

        if env.storage().persistent().has(&key) {
            return;
        }

        env.storage().persistent().set(&key, &admin);

        env.events().publish(
            (symbol_short!("reg_tourn"), tournament_id),
            admin,
        );
    }

    /// Deposit entry fee for a player into a tournament pool
    pub fn deposit(env: Env, tournament_id: u32, player: Address, amount: i128) {
        player.require_auth();

        let current_pool: i128 = env
            .storage()
            .persistent()
            .get(&DataKey::TournamentPool(tournament_id))
            .unwrap_or(0);

        let new_pool = current_pool + amount;
        env.storage()
            .persistent()
            .set(&DataKey::TournamentPool(tournament_id), &new_pool);

        env.storage().persistent().set(
            &DataKey::PlayerDeposit(tournament_id, player.clone()),
            &amount,
        );

        let mut players: Vec<Address> = env
            .storage()
            .persistent()
            .get(&DataKey::TournamentPlayers(tournament_id))
            .unwrap_or_else(|| Vec::new(&env));

        if !players.contains(&player) {
            players.push_back(player.clone());
            env.storage().persistent().set(
                &DataKey::TournamentPlayers(tournament_id),
                &players,
            );
        }

        env.events().publish(
            (symbol_short!("deposit"), tournament_id),
            (player, amount),
        );
    }

    /// Release prize pool to the tournament winner.
    /// Only callable if the registered tournament contract (admin) has authorized
    /// this invocation. In Soroban's authorization model, the admin must appear
    /// in the auth tree for this specific function call.
    pub fn release_prize(env: Env, tournament_id: u32, winner: Address) -> i128 {
        let admin: Address = env
            .storage()
            .persistent()
            .get(&DataKey::TournamentAdmin(tournament_id))
            .unwrap_or_else(|| panic!("tournament not registered"));

        admin.require_auth();

        let pool: i128 = env
            .storage()
            .persistent()
            .get(&DataKey::TournamentPool(tournament_id))
            .unwrap_or(0);

        env.storage()
            .persistent()
            .set(&DataKey::TournamentPool(tournament_id), &0i128);

        env.events().publish(
            (symbol_short!("payout"), tournament_id),
            (winner.clone(), pool),
        );

        pool
    }

    /// Refund all players for a cancelled tournament.
    /// Only callable if the registered tournament contract (admin) has authorized
    /// this invocation.
    pub fn refund_all(env: Env, tournament_id: u32) -> i128 {
        let admin: Address = env
            .storage()
            .persistent()
            .get(&DataKey::TournamentAdmin(tournament_id))
            .unwrap_or_else(|| panic!("tournament not registered"));

        admin.require_auth();

        let pool: i128 = env
            .storage()
            .persistent()
            .get(&DataKey::TournamentPool(tournament_id))
            .unwrap_or(0);

        let players: Vec<Address> = env
            .storage()
            .persistent()
            .get(&DataKey::TournamentPlayers(tournament_id))
            .unwrap_or_else(|| Vec::new(&env));

        for player in players.iter() {
            let deposit: i128 = env
                .storage()
                .persistent()
                .get(&DataKey::PlayerDeposit(tournament_id, player.clone()))
                .unwrap_or(0);

            if deposit > 0 {
                env.storage().persistent().set(
                    &DataKey::PlayerDeposit(tournament_id, player.clone()),
                    &0i128,
                );
                env.events().publish(
                    (symbol_short!("refund"), tournament_id),
                    (player.clone(), deposit),
                );
            }
        }

        env.storage()
            .persistent()
            .set(&DataKey::TournamentPool(tournament_id), &0i128);

        pool
    }

    /// Get current prize pool balance for a tournament
    pub fn get_pool(env: Env, tournament_id: u32) -> i128 {
        env.storage()
            .persistent()
            .get(&DataKey::TournamentPool(tournament_id))
            .unwrap_or(0)
    }

    /// Get individual player deposit for a tournament
    pub fn get_player_deposit(env: Env, tournament_id: u32, player: Address) -> i128 {
        env.storage()
            .persistent()
            .get(&DataKey::PlayerDeposit(tournament_id, player))
            .unwrap_or(0)
    }

    /// Get all registered player addresses for a tournament
    pub fn get_tournament_players(env: Env, tournament_id: u32) -> Vec<Address> {
        env.storage()
            .persistent()
            .get(&DataKey::TournamentPlayers(tournament_id))
            .unwrap_or_else(|| Vec::new(&env))
    }
}

#[cfg(test)]
mod test;
