import * as d from "../util/document.js"
import * as c from "../util/conversions.js"


import { ExtendedAccountData } from "../data/ExtendedAccount.js"
import { show as MyAccountPage_show } from "./my-account.js"

import { wallet } from "../wallet-api/wallet.js"
import { divPool } from "../contracts/div-pool.js"

async function dashboardRefresh(){

  d.hideErr()

  let contractInfo = await divPool.get_contract_info(wallet)

  let dashboardInfo =
  {
    total: c.toStringDec(c.yton(contractInfo.total_available)+c.yton(contractInfo.total_for_staking)+c.yton(contractInfo.total_for_unstaking)),
    historicRewards: c.toStringDec(c.yton(contractInfo.accumulated_staked_rewards)),
    skash: c.ytonString(contractInfo.total_for_staking),
    skashSellMarket: 432553,
    skashBuyMarket: 275424,
    timeToRewardsString: "7hs 45min",
    numberOfPools: 22,
    numberOfAccounts: 22,
  }
  //show dashboard info
  d.applyTemplate("dashboard", "dashboard-template", dashboardInfo)

  document.querySelectorAll("#dashboard .number").forEach(el => {
    if (el instanceof HTMLDivElement) {
      el.innerText = el.innerText.replace(".00", "")
    }
  })
  d.showPage("dashboard-page")
}

//--------------------------
export async function show() {

  d.onClickId("enter-my-account", myAccountClicked);
  d.onClickId("refresh-dashboard", dashboardRefresh);

  dashboardRefresh()

}

//---------------------------------------------------
//-- account item clicked => account selected Page --
//---------------------------------------------------
async function myAccountClicked(ev: Event) {
  try {
    wallet.checkConnected()
    MyAccountPage_show()
  }
  catch (ex) {
    d.showErr(ex.message);
  }
}

