import * as c from "../util/conversions.js"

import { GetAccountInfoResult } from "../contracts/div-pool.js";

/**
 * processed contract user account data to show on the DApp
 */
export class ExtendedAccountData {

  accountInfo: GetAccountInfoResult;
  type = ""; //future use :"lock.c"
  nearAccount: string = "";
  available: number = 0;
  skash: number = 0;
  unstaked: number = 0;
  tripMeterStart: Date;
  tripMeterRewards: number = 0;
  remainingTimeString: string = "";
  nslp_shares: number;
  nslp_share_value: number;
  g_skash: number;

  constructor(accountInfo: GetAccountInfoResult) {
    this.accountInfo = accountInfo;
    this.nearAccount = accountInfo.account_id
    this.available = c.yton(accountInfo.available)
    this.skash = c.yton(accountInfo.skash)
    this.unstaked = c.yton(accountInfo.unstaked)
    this.tripMeterStart = new Date(+accountInfo.trip_start)
    this.tripMeterRewards = c.yton(accountInfo.trip_rewards)
    this.nslp_shares = c.yton(accountInfo.nslp_shares)
    this.nslp_share_value = c.yton(accountInfo.nslp_share_value)
    this.g_skash = c.yton(accountInfo.g_skash)
  }

  get inThePool(): number {
    return this.skash + this.unstaked;
  }

}
