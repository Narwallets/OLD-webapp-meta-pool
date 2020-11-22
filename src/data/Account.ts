import * as c from "../util/conversions.js"

//user NEAR accounts info type
export class Account {
  nearAccount: string="";
  available: string="";
  stake_shares: string="";
  rewards: string="";
  staked: string="";
  unstaked: string="";
  historicRewards: string="";
  expectedRewards: string=""

  // get totalInThePool():number {
  //     return this.staked + this.unStaked;
  // }
    
  }
  
  export class ExtendedAccountData {

    accountInfo: Account;
    type=""; //future use :"lock.c"
    nearAccount: string="";
    available: number=0;
    rewards: number=0;
    staked: number=0;
    unstaked: number=0;
    historicRewards: number=0;
    expectedRewards: number=0;
    remainingTimeString: string="";
    buyOrders: number=0;
    sellOrders: number=0;
  
    constructor(accountInfo:Account) {
        this.nearAccount = accountInfo.nearAccount;
        this.accountInfo = accountInfo;
        this.available = c.yton(accountInfo.available);
        this.rewards = c.yton(accountInfo.rewards);
        this.staked = c.yton(accountInfo.staked);
        this.unstaked = c.yton(accountInfo.unstaked);
        this.historicRewards = c.yton(accountInfo.historicRewards);
        this.expectedRewards = c.yton(accountInfo.expectedRewards);
    }

    get inThePool():number {
       return this.staked + this.rewards + this.unstaked;
    }

    get maxUnstake():number {
      return this.staked + this.rewards;
    }

}
