#![cfg(test)]

use super::*;
use soroban_sdk::testutils::{Address as _, MockAuth, MockAuthInvoke};
use soroban_sdk::{Env, IntoVal};

#[test]
fn test_deposit_and_release() {
    let env = Env::default();
    let contract_id = env.register_contract(None, TreasuryContract);
    let client = TreasuryContractClient::new(&env, &contract_id);

    let tournament_admin = Address::generate(&env);
    client.register_tournament(&1, &tournament_admin);

    let player1 = Address::generate(&env);
    let player2 = Address::generate(&env);

    env.mock_all_auths();

    client.deposit(&1, &player1, &100);
    client.deposit(&1, &player2, &100);

    assert_eq!(client.get_pool(&1), 200);

    let payout = client.release_prize(&1, &player1);
    assert_eq!(payout, 200);
    assert_eq!(client.get_pool(&1), 0);
}

#[test]
fn test_refund_all() {
    let env = Env::default();
    let contract_id = env.register_contract(None, TreasuryContract);
    let client = TreasuryContractClient::new(&env, &contract_id);

    let tournament_admin = Address::generate(&env);
    client.register_tournament(&1, &tournament_admin);

    let player1 = Address::generate(&env);
    let player2 = Address::generate(&env);

    env.mock_all_auths();

    client.deposit(&1, &player1, &50);
    client.deposit(&1, &player2, &50);

    assert_eq!(client.get_pool(&1), 100);

    let refunded = client.refund_all(&1);
    assert_eq!(refunded, 100);
    assert_eq!(client.get_pool(&1), 0);
}

#[test]
fn test_release_prize_unregistered_tournament() {
    let env = Env::default();
    let contract_id = env.register_contract(None, TreasuryContract);
    let client = TreasuryContractClient::new(&env, &contract_id);

    env.mock_all_auths();

    let player = Address::generate(&env);

    // Tournament not registered — should panic with "tournament not registered"
    let res = client.try_release_prize(&1, &player);
    assert!(res.is_err());
}

#[test]
fn test_refund_all_unregistered_tournament() {
    let env = Env::default();
    let contract_id = env.register_contract(None, TreasuryContract);
    let client = TreasuryContractClient::new(&env, &contract_id);

    env.mock_all_auths();

    // Tournament not registered — should panic with "tournament not registered"
    let res = client.try_refund_all(&1);
    assert!(res.is_err());
}

#[test]
fn test_release_prize_unauthorized() {
    let env = Env::default();
    let contract_id = env.register_contract(None, TreasuryContract);
    let client = TreasuryContractClient::new(&env, &contract_id);

    // Register tournament with a specific admin address
    let tournament_admin = Address::generate(&env);
    client.register_tournament(&1, &tournament_admin);

    let player = Address::generate(&env);

    // Only mock auth for deposit (player), not for release_prize (admin).
    // When release_prize calls admin.require_auth(), it will fail because
    // the admin address is not in the auth tree.
    env.mock_auths(&[MockAuth {
        address: &player,
        invoke: &MockAuthInvoke {
            contract: &contract_id,
            fn_name: "deposit",
            args: (&1u32, &player, &100i128).into_val(&env),
            sub_invokes: &[],
        },
    }]);

    client.deposit(&1, &player, &100);

    // release_prize should fail — admin has not authorized
    let res = client.try_release_prize(&1, &player);
    assert!(res.is_err());
}

#[test]
fn test_refund_all_unauthorized() {
    let env = Env::default();
    let contract_id = env.register_contract(None, TreasuryContract);
    let client = TreasuryContractClient::new(&env, &contract_id);

    let tournament_admin = Address::generate(&env);
    client.register_tournament(&1, &tournament_admin);

    let player = Address::generate(&env);

    // Only mock auth for deposit (player), not for refund_all (admin)
    env.mock_auths(&[MockAuth {
        address: &player,
        invoke: &MockAuthInvoke {
            contract: &contract_id,
            fn_name: "deposit",
            args: (&1u32, &player, &50i128).into_val(&env),
            sub_invokes: &[],
        },
    }]);

    client.deposit(&1, &player, &50);

    // refund_all should fail — admin has not authorized
    let res = client.try_refund_all(&1);
    assert!(res.is_err());
}

#[test]
fn test_get_player_deposit() {
    let env = Env::default();
    let contract_id = env.register_contract(None, TreasuryContract);
    let client = TreasuryContractClient::new(&env, &contract_id);

    let tournament_admin = Address::generate(&env);
    client.register_tournament(&1, &tournament_admin);

    let player1 = Address::generate(&env);
    let player2 = Address::generate(&env);

    env.mock_all_auths();

    client.deposit(&1, &player1, &100);
    client.deposit(&1, &player2, &250);

    assert_eq!(client.get_player_deposit(&1, &player1), 100);
    assert_eq!(client.get_player_deposit(&1, &player2), 250);

    // Non-existent player returns 0
    let player3 = Address::generate(&env);
    assert_eq!(client.get_player_deposit(&1, &player3), 0);
}

#[test]
fn test_get_tournament_players() {
    let env = Env::default();
    let contract_id = env.register_contract(None, TreasuryContract);
    let client = TreasuryContractClient::new(&env, &contract_id);

    let tournament_admin = Address::generate(&env);
    client.register_tournament(&1, &tournament_admin);

    env.mock_all_auths();

    // Empty before any deposits
    let players = client.get_tournament_players(&1);
    assert_eq!(players.len(), 0);

    let player1 = Address::generate(&env);
    let player2 = Address::generate(&env);

    client.deposit(&1, &player1, &50);
    client.deposit(&1, &player2, &75);

    let players = client.get_tournament_players(&1);
    assert_eq!(players.len(), 2);
    assert!(players.contains(&player1));
    assert!(players.contains(&player2));

    // Duplicate deposit does not add player twice
    client.deposit(&1, &player1, &50);
    let players = client.get_tournament_players(&1);
    assert_eq!(players.len(), 2);
}

#[test]
fn test_register_tournament_idempotent() {
    let env = Env::default();
    let contract_id = env.register_contract(None, TreasuryContract);
    let client = TreasuryContractClient::new(&env, &contract_id);

    let admin1 = Address::generate(&env);
    let admin2 = Address::generate(&env);

    client.register_tournament(&1, &admin1);

    // Second registration with different admin should be a no-op
    client.register_tournament(&1, &admin2);

    // admin1 should still be the registered admin
    env.mock_all_auths();
    let player = Address::generate(&env);
    client.deposit(&1, &player, &100);

    // release_prize with admin1 should succeed
    let payout = client.release_prize(&1, &player);
    assert_eq!(payout, 100);
}
