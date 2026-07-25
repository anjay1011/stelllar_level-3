#![cfg(test)]

use super::*;
use soroban_sdk::testutils::Address as _;
use soroban_sdk::{Env, String};
use treasury::TreasuryContract;

fn setup_test_env<'a>(env: &'a Env) -> (TournamentContractClient<'a>, Address, Address) {
    env.mock_all_auths();

    let treasury_id = env.register_contract(None, TreasuryContract);
    let tournament_id = env.register_contract(None, TournamentContract);

    let client = TournamentContractClient::new(env, &tournament_id);
    let organizer = Address::generate(env);

    (client, organizer, treasury_id)
}

#[test]
fn test_create_tournament() {
    let env = Env::default();
    let (client, organizer, treasury_id) = setup_test_env(&env);

    let t_id = client.create_tournament(
        &organizer,
        &String::from_str(&env, "Stellar Grand Prix"),
        &100,
        &8,
        &treasury_id,
    );

    assert_eq!(t_id, 1);

    let t = client.get_tournament(&t_id);
    assert_eq!(t.status, TournamentStatus::Draft);
    assert_eq!(t.entry_fee, 100);
    assert_eq!(t.max_players, 8);
}

#[test]
fn test_get_tournament_count() {
    let env = Env::default();
    let (client, organizer, treasury_id) = setup_test_env(&env);

    assert_eq!(client.get_tournament_count(), 0);

    client.create_tournament(
        &organizer,
        &String::from_str(&env, "Tournament One"),
        &50,
        &4,
        &treasury_id,
    );
    assert_eq!(client.get_tournament_count(), 1);

    client.create_tournament(
        &organizer,
        &String::from_str(&env, "Tournament Two"),
        &100,
        &8,
        &treasury_id,
    );
    assert_eq!(client.get_tournament_count(), 2);
}

#[test]
fn test_full_tournament_lifecycle() {
    let env = Env::default();
    let (client, organizer, treasury_id) = setup_test_env(&env);

    // 1. Create
    let t_id = client.create_tournament(
        &organizer,
        &String::from_str(&env, "Cosmic Championship"),
        &50,
        &2,
        &treasury_id,
    );

    // 2. Open Registration
    client.open_registration(&t_id, &organizer);
    let t = client.get_tournament(&t_id);
    assert_eq!(t.status, TournamentStatus::RegistrationOpen);

    // 3. Register Players (Inter-contract deposit to Treasury)
    let player1 = Address::generate(&env);
    let player2 = Address::generate(&env);

    client.register_player(&t_id, &player1);
    client.register_player(&t_id, &player2);

    let players = client.get_players(&t_id);
    assert_eq!(players.len(), 2);

    let t = client.get_tournament(&t_id);
    assert_eq!(t.prize_pool, 100);

    // 4. Duplicate Registration Fails
    let res = client.try_register_player(&t_id, &player1);
    assert!(res.is_err());

    // 5. Close Registration & Start
    client.close_registration(&t_id, &organizer);
    client.start_tournament(&t_id, &organizer);
    let t = client.get_tournament(&t_id);
    assert_eq!(t.status, TournamentStatus::Ongoing);

    // 6. Declare Winner
    client.declare_winner(&t_id, &organizer, &player1);
    let t = client.get_tournament(&t_id);
    assert_eq!(t.status, TournamentStatus::Completed);
    assert_eq!(t.winner, Some(player1.clone()));

    // 7. Release Prize (Inter-contract release via Treasury)
    let payout = client.release_prize(&t_id, &organizer);
    assert_eq!(payout, 100);

    let t = client.get_tournament(&t_id);
    assert_eq!(t.status, TournamentStatus::PrizeReleased);
}

#[test]
fn test_cancel_tournament_refunds() {
    let env = Env::default();
    let (client, organizer, treasury_id) = setup_test_env(&env);

    let t_id = client.create_tournament(
        &organizer,
        &String::from_str(&env, "Cancelled Arena"),
        &75,
        &4,
        &treasury_id,
    );

    client.open_registration(&t_id, &organizer);

    let player1 = Address::generate(&env);
    client.register_player(&t_id, &player1);

    let refunded = client.cancel_tournament(&t_id, &organizer);
    assert_eq!(refunded, 75);

    let t = client.get_tournament(&t_id);
    assert_eq!(t.status, TournamentStatus::Cancelled);
}
