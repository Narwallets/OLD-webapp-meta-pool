import * as d from "../util/document.js"
import * as c from "../util/conversions.js"


import { ExtendedAccountData } from "../data/ExtendedAccount.js"
import { show as MyAccountPage_show } from "./my-account.js"

import { wallet } from "../wallet-api/wallet.js"

//--------------------------
function init() {
  d.onClickId("enter-my-account", myAccountClicked);
}

//--------------------------
export function show() {

  init()

  d.hideErr()

  let dashboardInfo = {
    total: 10000000,
    historicRewards: 145232.23,
    skash: 9432545,
    lastRewards: 12663,
    skashSellMarket: 432553,
    skashBuyMarket: 275424,
    timeToRewardsString: "7hs 45min",
    expectedRewards: 14566,
    numberOfPools: 22,
    averageFee: 1.8
  }
  //show dashboard info
  d.applyTemplate("dashboard", "dashboard-template", dashboardInfo)

  document.querySelectorAll("#dashboard .number").forEach(el => {
    if (el instanceof HTMLDivElement) {
      el.innerText = el.innerText.replace(".00", "")
    }
  })
  d.showPage("main-page")

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

