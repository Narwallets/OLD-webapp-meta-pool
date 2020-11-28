import * as c from "../util/conversions.js"

import {AccountInfo} from "../contracts/div-pool.js";

  export class ExtendedAccountData {

    accountInfo: AccountInfo;
    type=""; //future use :"lock.c"
    nearAccount: string="";
    available: number=0;
    rewards: number=0;
    skash: number=0;
    unstaked: number=0;
    historicRewards: number=0;
    remainingTimeString: string="";
    buyOrders: number=0;
    sellOrders: number=0;
  
    constructor(accountInfo:AccountInfo) {
        this.accountInfo = accountInfo;
        this.nearAccount = accountInfo.account_id
        this.available = c.yton(accountInfo.available)
        this.rewards = c.yton(accountInfo.rewards)
        this.skash = c.yton(accountInfo.skash)
        this.unstaked = c.yton(accountInfo.unstaked)
        this.historicRewards = c.yton(accountInfo.historic_rewards)
    }

    get inThePool():number {
       return this.skash + this.rewards + this.unstaked;
    }

    get maxUnstake():number {
      return this.skash + this.rewards;
    }

}
