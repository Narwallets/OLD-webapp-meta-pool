import * as c from "../util/conversions.js"
import * as d from "../util/document.js"

import * as okCancel from "../components/ok-cancel-singleton.js"

import { wallet } from "../wallet-api/wallet.js"
import { CONTRACT_ACCOUNT, metaPool } from "../contracts/meta-pool.js"

import { ExtendedAccountData } from "../data/extended-account.js"

import {show as Dashboard_show} from "./dashboard.js"
import { show as LiquidityProvider_show } from "./liquidity-provider.js"

import type { AnyElement, ClickHandler } from "../util/document.js"
import { isValidAmount } from "../util/valid.js"


//-----------------
// page init
//-----------------
function init() {

    const backLink = new d.El("#my-account.page .back-link");
    backLink.onClick(Dashboard_show);

    d.onClickId("deposit-and-stake", depositAndStakeClicked);
    d.onClickId("sell", sellClicked);
    d.onClickId("deposit", depositClicked);
    d.onClickId("withdraw", withdrawClicked);
    d.onClickId("stake", stakeAvailabeClicked);
    d.onClickId("start-unstake", unstakeClicked);
    //d.onClickId("complete-unstake", completeUnstakeClicked);

    d.onClickId("refresh-account", refreshAccountClicked);
    d.onClickId("enter-ns-liquidity-provider", liquidityProviderClicked);

    d.byId("sell-slippage").addEventListener("input", sellSlippageMoved);
    

    //d.onClickId("close-account", closeAccountClicked);

    showButtons()

}

//slippage slider moved, adjust all numbers
function sellSlippageMoved(ev:Event){
    const slippage = Number((ev.target as HTMLInputElement).value)/10
    slippageDisplay(slippage)
}
function slippageDisplay(slippage:number){

    d.qs("#sell-slippage-display").innerText = slippage + ""

    const sellstnear = c.toNum(d.qs("#sell-confirmation-stnear").innerText)
    const originalNear=c.toNum(d.qs("#original-sell-confirmation-near").innerText)
    const newNear = originalNear * (1-slippage/100)
    d.qs("#sell-confirmation-near").innerText = c.toStringDec(newNear)

}


//-----------------
export async function show(reposition?: string) {
    try {
        init();
        await getAccountData()
        showAccountData()
        d.showPage("my-account")
        if (reposition) {
            switch (reposition) {
                case "stake": {
                    stakeAvailabeClicked()
                    break;
                }
            }
        }
    }
    catch (ex) {
        d.showErr(ex.message);
    }
}

let cachedAccountData: ExtendedAccountData;
let cachedAccountExpire = 0;
let cachedAccountId = ""

async function getAccountData(): Promise<ExtendedAccountData> {

    wallet.checkConnected()
    cachedAccountExpire = 0 //cache disabled
    if (cachedAccountId != wallet.accountId || Date.now() > cachedAccountExpire) {
        const accInfo = await metaPool.get_account_info(wallet.accountId);
        cachedAccountData = new ExtendedAccountData(accInfo);
        cachedAccountId = wallet.accountId;
        cachedAccountExpire = Date.now() + 60 * 1 * 1000; //1 min
    }

    return cachedAccountData;
}

async function forceRefreshAccountData() {
    cachedAccountExpire = 0
    return await getAccountData()
}

function showAccountData() {
    d.applyTemplate("my-account-info", "my-account-template", cachedAccountData)
}


type StateResult = {
    amount: string; // "27101097909936818225912322116"
    block_hash: string; //"DoTW1Tpp3TpC9egBe1xFJbbEb6vYxbT33g9GHepiYL5a"
    block_height: number; //20046823
    code_hash: string; //"11111111111111111111111111111111"
    locked: string; //"0"
    storage_paid_at: number; // 0
    storage_usage: number; //2080
}


function onCancelHandler(){
    showButtons()
}

function ifWalletConnectedShowSubPage(subPageId: string, onOKHandler: ClickHandler) {
    try {
        d.hideErr()
        wallet.checkConnected()
        d.showSubPage(subPageId)
        okCancel.show_onOK(onOKHandler,onCancelHandler)
    }
    catch (ex) {
        d.showErr(ex.message)
    }

}


async function withdrawClicked() {
    await forceRefreshAccountData()
    ifWalletConnectedShowSubPage('withdraw-subpage', performWithdraw)
    d.byId("max-withdraw").innerText = c.toStringDec(cachedAccountData.available)
}


//----------------------
function depositClicked() {
    ifWalletConnectedShowSubPage('deposit-subpage', performDeposit)
    const amountText = d.qs("#deposit-amount")
    amountText.value = "100"
    amountText.el.focus()
}


//----------------------
function depositAndStakeClicked() {
    try {

        ifWalletConnectedShowSubPage("deposit-and-stake", performDepositAndStake)

    } catch (ex) {
        d.showErr(ex.message)
    }
}
//----------------------
async function performDepositAndStake() {
    okCancel.disable();
    d.showWait()
    try {

        const amountToStake = d.getNumber("input#deposit-and-stake");
        if (amountToStake < 5) throw Error("Stake at least 5 Near");

        await metaPool.deposit_and_stake(amountToStake)

        //refresh acc info
        await refreshAccount()

        d.showSuccess("Staked "+c.toStringDec(amountToStake)+" NEAR")
        showButtons()

    }
    catch (ex) {
        d.showErr(ex.message)
    }
    finally {
        d.hideWait()
        okCancel.enable();
    }
}

//----------------------
function stakeAvailabeClicked() {
    try {

        const acc = cachedAccountData
        d.byId("buy-stake-max").innerText = c.toStringDec(acc.available)
        ifWalletConnectedShowSubPage("buy-stake-stnear", performBuyStake)
        d.inputById("buy-stake-amount").value = c.toStringDec(acc.available)

    } catch (ex) {
        d.showErr(ex.message)
    }
}


//----------------------
async function performBuyStake() {
    okCancel.disable();
    d.showWait()
    try {

        const amountToStake = d.getNumber("input#buy-stake-amount");
        if (amountToStake < 5) throw Error("Stake at least 5 Near");

        await metaPool.buy_stnear_stake(amountToStake)

        //refresh acc info
        await refreshAccount()

        d.showSuccess("Staked "+c.toStringDec(amountToStake)+" NEAR")
        showButtons()

    }
    catch (ex) {
        d.showErr(ex.message)
    }
    finally {
        d.hideWait()
        okCancel.enable();
    }
}


//----------------------
function sellClicked(){
    try {

        const acc = cachedAccountData
        d.byId("sell-stnear-max").innerText = c.toStringDec(acc.stnear)

        ifWalletConnectedShowSubPage("sell-stnear", sellOKClicked)

    } catch (ex) {
        d.showErr(ex.message)
    }

}

//----------------------
async function sellOKClicked() {
    try {
        const info = cachedAccountData
        const stnearToSell = d.getNumber("input#sell-amount")

        let nearToReceiveU128String = await metaPool.get_near_amount_sell_stnear(stnearToSell)
        let nearToReceive = Math.trunc(c.yton(nearToReceiveU128String)*100)/100 //on the promised NEAR *TRUNCATE* to 2 decimals

        //d.inputById("stake-with-staking-pool").value = selectedAccountData.accountInfo.stakingPool || ""
        d.byId("sell-confirmation-stnear").innerText = c.toStringDec(stnearToSell)
        d.byId("original-sell-confirmation-near").innerText = c.toStringDec(nearToReceive)

        d.inputById("sell-slippage").value="5"; //0-10 => 0%-1%
        slippageDisplay(0.5)

        ifWalletConnectedShowSubPage("sell-stnear-confirmation", performSell)

    } catch (ex) {
        d.showErr(ex.message)
    }
}



//-------------------------------------
async function performSell() {
    try {

        okCancel.disable()
        d.showWait()

        const stnearToSell = c.toNum(d.byId("sell-confirmation-stnear").innerText)
        let minExpectedNear=c.toNum(d.byId("sell-confirmation-near").innerText)

        let receivedYoctos = await metaPool.sell_stnear(stnearToSell, minExpectedNear)
        d.showSuccess("Success: received " + c.toStringDec(c.yton(receivedYoctos)) + " NEAR"); //"\u{24c3}")

        await refreshAccount()
        showButtons()
    }
    catch (ex) {
        d.showErr(ex.message)
    }
    finally {
        d.hideWait()
        okCancel.enable()
    }

}

//-------------------------------------
//TODO
async function unstakeClicked() {
    try {
        d.showWait()
        ifWalletConnectedShowSubPage("unstake", performUnstake)

    } catch (ex) {
        d.showErr(ex.message)
    }
    finally {
        d.hideWait()
        okCancel.enable()
    }

}

// //-----------------------
// function fixUserAmountInY(amount: number, yoctosMax: string): string {

//     let yoctosResult = yoctosMax //default => all 
//     //if 2NEAR or more remains, we take user input amount
//     if (amount + 2 < c.yton(yoctosResult)) { 
//         yoctosResult = c.ntoy(amount) 
//     }
//     //check against our max
//     else if (amount > 2 + c.yton(yoctosMax)) { //only if it's +2 above max
//         throw Error("Max amount is " + c.toStringDec(c.yton(yoctosMax)))
//         //----------------
//     }
//     return yoctosResult
// }

//TODO
async function performUnstake() {
    //normal accounts
    try {
        okCancel.disable();
        d.showWait()

        const amount = c.toNum(d.inputById("unstake-amount").value);
        if (!isValidAmount(amount)) throw Error("Amount is not valid");

        await metaPool.unstake(amount)

        d.showSuccess("Unstake requested, you must wait 3-4 epochs (40-54hs) before unstaked-withdrawal")
        
        await refreshAccount()

        showButtons()

    }
    catch (ex) {
        d.showErr(ex.message)
    }
    finally {
        d.hideWait()
        okCancel.enable();
    }
}

async function performWithdrawUnstaked() {
    //normal accounts
    try {
        okCancel.disable();
        d.showWait()

        //const amount = c.toNum(d.inputById("withdraw-unstaked-amount").value);
        //if (!isValidAmount(amount)) throw Error("Amount is not valid");

        const recovered_amount = await metaPool.finish_unstake()

        d.showSuccess(c.toStringDec(c.yton(recovered_amount)) + " withdrew from the pool")

        await refreshAccount()

        showButtons()

    }
    catch (ex) {
        d.showErr(ex.message)
    }
    finally {
        d.hideWait()
        okCancel.enable();
    }
}


async function performDeposit() {
    try {

        const nearsToDeposit = d.getNumber("#deposit-amount")
        if (!isValidAmount(nearsToDeposit)) throw Error("Amount should be positive");

        okCancel.disable()

        const timeoutSecs = (wallet.network == "testnet" ? 20 : 300);
        d.showWait(timeoutSecs) //5 min timeout, give the user time to approve

        await metaPool.deposit(nearsToDeposit)

        showButtons()

        d.showSuccess("Success: " + wallet.accountId + " deposited " + c.toStringDec(nearsToDeposit) + "\u{24c3}")

        await refreshAccount()

    }
    catch (ex) {
        d.showErr(ex.message)
    }
    finally {
        d.hideWait()
        okCancel.enable()
    }

}

async function performWithdraw() {
    try {

        okCancel.disable()
        d.showWait()

        const amount = d.getNumber("#withdraw-amount")

        if (!isValidAmount(amount)) throw Error("Amount should be positive");
        if (amount > cachedAccountData.available) throw Error("max amount is " + c.toStringDec(cachedAccountData.available));

        await metaPool.withdraw(amount)

        showButtons()

        d.showSuccess("Success: " + wallet.accountId + " withdrew " + c.toStringDec(amount) + "\u{24c3}")

        await refreshAccount()

    }
    catch (ex) {
        d.showErr(ex.message)
    }
    finally {
        d.hideWait()
        okCancel.enable()
    }

}



//---------------------------------------
//TODO
async function DeleteAccountClicked() {
    d.showWait()
    d.hideErr()
    try {

        //if (!selectedAccountData.accountInfo.privateKey) throw Error("Account is Read-Only")
        //await refreshSelectedAccount() //refresh account to have updated balance

        d.showSubPage("account-selected-delete")
        //d.inputById("send-balance-to-account-name").value = selectedAccountData.accountInfo.ownerId || ""

        okCancel.show_onOK(DeleteAccount, onCancelHandler)

    }
    catch (ex) {
        d.showErr(ex.message)
    }
    finally {
        d.hideWait()
    }
}

//-----------------------------------
async function DeleteAccount() {
//TODO
    if (!cachedAccountData || !cachedAccountData.accountInfo) return;
    try {

        d.showWait()

        const privateKey = "";//selectedAccountData.accountInfo.privateKey;
        if (!privateKey) throw Error("Account is Read-Only")

        const toDeleteAccName = d.inputById("delete-account-name-confirm").value
        if (toDeleteAccName != cachedAccountData.nearAccount) throw Error("The account name to delete don't match")

        const beneficiary = d.inputById("send-balance-to-account-name").value
        if (!beneficiary) throw Error("Enter the beneficiary account")

        //const result = await near.delete_account(toDeleteAccName, privateKey, beneficiary)

        d.showSuccess("Account Deleted")

        //internalReflectTransfer(selectedAccountData.nearAccount, beneficiary, selectedAccountData.accountInfo.lastBalance)

        showButtons()
    }
    catch (ex) {
        d.showErr(ex.message)
    }
    finally {
        d.hideWait()
    }
}



//-------------------------------
function showButtons() {
    d.showSubPage("account-selected-buttons")
    okCancel.hide()
}

//-------------------------------------------
//TODO
function closeAccountClicked(ev: Event) {
    try {
        ev.preventDefault();

        if (cachedAccountData.accountInfo) { //.privateKey){
            //has full access - remove access first
            //accessStatusClicked()
            return;
        }

        //remove
        //delete global.SecureState.accounts[""][selectedAccountData.nearAccount]; //Network.current
        //persist
        //global.saveSecureState()
        //return to main page
        Dashboard_show()
    }
    catch (ex) {
        d.showErr(ex.message)
    }
}

//-------------------------------------------
async function refreshAccount() {
    await getAccountData()
    showAccountData()
}
async function refreshAccountClicked(ev: Event) {
    try {
        await refreshAccount()
        d.showSuccess("Account refreshed")
    }
    catch (ex) {
        d.showErr(ex.message)
    }
}

async function liquidityProviderClicked(ev: Event) {
  try {
    wallet.checkConnected()
    LiquidityProvider_show()
  }
  catch (ex) {
    d.showErr(ex.message);
  }
}

