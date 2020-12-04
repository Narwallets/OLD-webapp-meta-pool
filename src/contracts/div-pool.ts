//----------------------------------
// DIVERSIFYING STAKING POOL smart-contract proxy
// https://github.com/Narwallets/diversifying-staking-pool
//----------------------------------

import {ntoy} from "../util/conversions.js"
import {Wallet} from "../wallet-api/wallet.js"

//export const CONTRACT_ACCOUNT = "diversifying-pool.guildnet"
export const CONTRACT_ACCOUNT = "diversifying.pool.testnet"

//struct returned from get_account_info
export type GetAccountInfoResult = {
    account_id: string;
    /// The available balance that can be withdrawn
    available: string; //U128,
    /// The amount of SKASH owned (computed from the shares owned)
    skash: string; //U128,
    /// The amount of rewards (rewards = total_staked - skash_amount) and (total_owned = skash + rewards)
    unstaked: string; //U128,
    /// The epoch height when the unstaked was requested
    /// The fund will be locked for NUM_EPOCHS_TO_UNLOCK epochs
    /// unlock epoch = unstaked_requested_epoch_height + NUM_EPOCHS_TO_UNLOCK 
    unstaked_requested_epoch_height: string; //U64,
    ///if env::epoch_height()>=account.unstaked_requested_epoch_height+NUM_EPOCHS_TO_UNLOCK
    can_withdraw: boolean,
    /// total amount the user holds in this contract: account.availabe + account.staked + current_rewards + account.unstaked
    total: string; //U128,

    //-- STATISTICAL DATA --
    // User's statistical data
    // These fields works as a car's "trip meter". The user can reset them to zero.
    /// trip_start: (timpestamp in nanoseconds) this field is set at account creation, so it will start metering rewards
    trip_start: string, //U64,
    /// How many skashs the user had at "trip_start". 
    trip_start_skash: string, //U128,
    /// how much the user staked since trip start. always incremented
    trip_accum_stakes: string, //U128,
    /// how much the user unstaked since trip start. always incremented
    trip_accum_unstakes: string, //U128,
    /// to compute trip_rewards we start from current_skash, undo unstakes, undo stakes and finally subtract trip_start_skash
    /// trip_rewards = current_skash + trip_accum_unstakes - trip_accum_stakes - trip_start_skash;
    /// trip_rewards = current_skash + trip_accum_unstakes - trip_accum_stakes - trip_start_skash;
    trip_rewards: string, //U128,
}

//JSON compatible struct returned from get_contract_info
export type ContractInfo = {
    /// The account ID of the owner.
    owner_account_id: string,
    owner_fee_basis_points: number, //u16,

    /// This amount increments with deposits and decrements with for_staking
    /// increments with complete_unstake and decrements with user withdrawals from the contract
    /// withdrawals from the pools can include rewards
    /// since statking is delayed and in batches it only eventually matches env::balance()
    total_available: string, //U128,

    /// The total amount of tokens selected for staking by the users 
    /// not necessarily what's actually staked since staking can be done in batches
    total_for_staking: string, //U128,
    /// we remember how much we sent to the pools, so it's easy to compute staking rewards
    /// total_actually_staked: Amount actually sent to the staking pools and staked - NOT including rewards
    /// During heartbeat(), If !staking_paused && total_for_staking<total_actually_staked, then the difference gets staked in 100kN batches
    total_actually_staked: string, //U128, 

    // how many "shares" were minted. Everytime someone "stakes" he "buys pool shares" with the staked amount
    // the share price is computed so if he "sells" the shares on that moment he recovers the same near amount
    // staking produces rewards, so share_price = total_for_staking/total_shares
    // when someone "unstakes" she "burns" X shares at current price to recoup Y near
    total_stake_shares: string,

    /// The total amount of tokens selected for unstaking by the users 
    /// not necessarily what's actually unstaked since unstaking can be done in batches
    total_for_unstaking: string, //U128,
    /// The total amount of tokens actually unstaked (the tokens are in the staking pools)
    /// During heartbeat(), If !staking_paused && total_for_unstaking<total_actually_unstaked, then the difference gets unstaked in 100kN batches
    total_actually_unstaked: string, //U128,

    /// The total amount of tokens actually unstaked AND retrieved from the pools (the tokens are here)
    /// During heartbeat(), If sp.pending_withdrawal && sp.epoch_for_withdraw == env::epoch_height then all funds are retrieved from the sp
    /// When the funds are actually retrieved, total_actually_unstaked is decremented
    total_actually_unstaked_and_retrieved: string, //U128,

    /// the staking pools will add rewards to the staked amount on each epoch
    /// here we store the accumulatred amount only for stats purposes. This amount can only grow
    accumulated_staked_rewards: string, 

    /// no auto-staking. true while changing staking pools
    staking_paused: boolean, 

    accounts_count: string,//U64,

    //count of pools to diversify in
    staking_pools_count: string, //U64, 
}

//singleton class
export class DivPool {
    
    contractAccount:string;

    constructor( contractAccount:string)
    {
        this.contractAccount = contractAccount
    }
    
    get_contract_info(wallet:Wallet) : Promise<ContractInfo> {
        return wallet.view(this.contractAccount,"get_contract_info",{})
    }

    get_account_info(wallet:Wallet) : Promise<GetAccountInfoResult> {
        return wallet.view(this.contractAccount,"get_account_info",{account_id:wallet.accountId})
    }

    deposit(wallet:Wallet, nearsToDeposit:number) : Promise<any> {
        return wallet.call(this.contractAccount, "deposit", {}, 25, nearsToDeposit)
    }
    withdraw(wallet:Wallet, nearsToWithdraw:number) : Promise<any> {
        return wallet.call(this.contractAccount, "withdraw", {amount:ntoy(nearsToWithdraw)}, 25)
    }

}

//singleton export
export const divPool = new DivPool(CONTRACT_ACCOUNT);

