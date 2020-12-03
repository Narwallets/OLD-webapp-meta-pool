import * as c from "../util/conversions.js"

import {GetAccountInfoResult} from "../contracts/div-pool.js";

  export class ExtendedAccountData {

    accountInfo: GetAccountInfoResult;
    type=""; //future use :"lock.c"
    nearAccount: string="";
    available: number=0;
    skash: number=0;
    unstaked: number=0;
    tripMeterStart: Date;
    tripMeterRewards: number=0;
    remainingTimeString: string="";
    buyOrders: number=0;
    sellOrders: number=0;
  
    constructor(accountInfo:GetAccountInfoResult) {
        this.accountInfo = accountInfo;
        this.nearAccount = accountInfo.account_id
        this.available = c.yton(accountInfo.available)
        this.skash = c.yton(accountInfo.skash)
        this.unstaked = c.yton(accountInfo.unstaked)
        this.tripMeterStart = new Date(+accountInfo.trip_start)
        this.tripMeterRewards = c.yton(accountInfo.trip_rewards)
    }

    get inThePool():number {
       return this.skash + this.unstaked;
    }

}
