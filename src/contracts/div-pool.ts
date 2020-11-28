import {Wallet} from "../wallet-api/wallet.js"

//export const CONTRACT_ACCOUNT = "diversifying-pool.guildnet"
export const CONTRACT_ACCOUNT = "dev-1606363533605-3483100"
export const NETWORK = "testnet"

//struct returned from get_account_info
export type AccountInfo = {
    account_id: string;
    /// The available balance that can be withdrawn
    available: string; //U128,
    /// The amount of SKASH owned (computed from the shares owned)
    skash: string; //U128,
    /// The amount of rewards (rewards = total_staked - skash_amount) and (total_owned = skash + rewards)
    rewards: string; //U128,
    /// Accumulated rewards during the lifetime of this account. 
    historic_rewards: string; //U128,
    /// The amount unstaked waiting for withdraw
    unstaked: string; //U128,
    /// The epoch height when the unstaked was requested
    /// The fund will be locked for NUM_EPOCHS_TO_UNLOCK epochs
    /// unlock epoch = unstaked_requested_epoch_height + NUM_EPOCHS_TO_UNLOCK 
    unstaked_requested_epoch_height: string; //U64,
    ///if env::epoch_height()>=account.unstaked_requested_epoch_height+NUM_EPOCHS_TO_UNLOCK
    can_withdraw: boolean,
    /// total amount the user holds in this contract: account.availabe + account.staked + current_rewards + account.unstaked
    total: string; //U128,
}

//singleton export
export class DivPool {
    
    contractAccount:string;

    constructor( contractAccount:string)
    {
        this.contractAccount = contractAccount
    }

    get_account_info(wallet:Wallet) : Promise<AccountInfo> {
        return wallet.view(this.contractAccount,"get_account_info",{account_id:wallet.accountId})
    }

    deposit(wallet:Wallet, nearsToDeposit:number) : Promise<any> {
        return wallet.call(this.contractAccount, "deposit", {}, 25, nearsToDeposit)
    }
}

export const divPool = new DivPool(CONTRACT_ACCOUNT);

