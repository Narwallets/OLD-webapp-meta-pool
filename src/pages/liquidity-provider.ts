import * as c from "../util/conversions.js"
import * as d from "../util/document.js"

import * as okCancel from "../components/ok-cancel-singleton.js"

import { wallet } from "../wallet-api/wallet.js"
import { metaPool } from "../contracts/meta-pool.js"

import { ExtendedAccountData } from "../data/extended-account.js"

import {show as MyAccount_show} from "./my-account.js"

import type { AnyElement, ClickHandler } from "../util/document.js"
import { isValidAmount } from "../util/valid.js"


//-----------------
// page init
//-----------------
function init() {

    const backLink = new d.El("#nslp-page .back-link");
    backLink.onClick(MyAccount_show);

    d.onClickId("add-liquidity", addLiquidityClick);
    d.onClickId("remove-liquidity", removeLiquidityClick);

    showButtons()
}


//-----------------
export async function show() {
    try {
        init();
        await getAccountData()
        showAccountData()
        d.showPage("nslp-page")
    }
    catch (ex) {
        d.showErr(ex.message);
    }
}

let userAccount: ExtendedAccountData;
let lpData: ExtendedAccountData;
let currentNSLPFee: number;

async function getAccountData(): Promise<ExtendedAccountData> {

    wallet.checkConnected()
    const accInfo = await metaPool.get_account_info(wallet.accountId);
    userAccount = new ExtendedAccountData(accInfo);
    //cachedAccountId = wallet.accountId;

    const lpAccInfo = await metaPool.get_account_info("..NSLP..");
    lpData = new ExtendedAccountData(lpAccInfo);

    currentNSLPFee = await metaPool.nslp_get_discount_basis_points(0);

    return userAccount;
}

function showAccountData() {

    const templateData=Object.assign({
        user:userAccount,
        poolName:"NEAR/stNEAR",
        discount:currentNSLPFee/100,
        yourSharePct: lpData.nslp_shares==0? 0 : Math.round(userAccount.nslp_shares/lpData.nslp_shares  * 10000)/100,
        }, lpData)

    d.applyTemplate("nslp-info", "nslp-template", templateData)
}


function ifWalletConnectedShowSubPage(subPageId: string, OKHandler: ClickHandler) {
    try {
        d.hideErr()
        wallet.checkConnected()
        d.showSubPage(subPageId)
        okCancel.show_onOK(OKHandler,showButtons)
    }
    catch (ex) {
        d.showErr(ex.message)
    }

}

async function withdrawClicked() {
    await refreshAccount()
    ifWalletConnectedShowSubPage('withdraw-subpage', performWithdraw)
    d.byId("max-withdraw").innerText = c.toStringDec(userAccount.available)
}


//----------------------
function depositClicked() {
    ifWalletConnectedShowSubPage('deposit-subpage', performDeposit)
    const amountText = d.qs("#deposit-amount")
    amountText.value = "100"
    amountText.el.focus()
}


//----------------------
function addLiquidityClick() {
    try {

        const max = c.toStringDec(userAccount.available)
        d.byId("add-liquidity-max").innerText = max
        ifWalletConnectedShowSubPage("add-liquidity", performAddLiquidity)
        d.inputById("add-liquidity-amount").value = max

    } catch (ex) {
        d.showErr(ex.message)
    }
}

//----------------------
async function performAddLiquidity() {
    okCancel.disable();
    d.showWait()
    try {

        const amountToAdd = d.getNumber("input#add-liquidity-amount");
        if (amountToAdd < 100) throw Error("add at least 100 Near");

        await metaPool.nslp_add_liquidity(amountToAdd)

        //refresh acc info
        await refreshAccount()

        d.showSuccess("Added "+c.toStringDec(amountToAdd)+" NEAR")
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
function removeLiquidityClick(){
    try {

        const acc = userAccount
        d.byId("remove-liquidity-max").innerText = c.toStringDec(acc.stnear)
        ifWalletConnectedShowSubPage("remove-liquidity", performRemoveLiquidity)

    } catch (ex) {
        d.showErr(ex.message)
    }

}


//-------------------------------------
async function performRemoveLiquidity() {
    try {

        okCancel.disable()
        d.showWait()

        const liquidityToRemove = d.getNumber("input#remove-liquidity-amount")
        await metaPool.nslp_remove_liquidity(liquidityToRemove)
        d.showSuccess("Success: removed " + c.toStringDec(liquidityToRemove) + " from the LP"); //"\u{24c3}")

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
        const info = userAccount
        let performer = performUnstake//default
        const amountBox = d.inputById("unstake-amount")
        const optionWU = d.qs("#option-unstake-withdraw")
        d.byId("unstake-from-staking-pool").innerText = ""
        optionWU.hide()
        if (info.type == "lock.c") {
            //lockup - allways full amount
            d.qs("#unstake-ALL-label").show()
            //checkOwnerAccessThrows("unstake")
            //performer = performLockupContractUnstake
            amountBox.disabled = true
            amountBox.classList.add("bg-lightblue")
        }
        else {
            //normal account can choose amounts
            d.qs("#unstake-ALL-label").hide()
            amountBox.disabled = false
            amountBox.classList.remove("bg-lightblue")
        }
        ifWalletConnectedShowSubPage("account-selected-unstake", performer)
        okCancel.disable()

        //---refresh first
        //await refreshSelectedAccount()

        // if (!selectedAccountData.accountInfo.stakingPool) {
        //     showButtons()
        //     throw Error("No staking pool associated whit this account. Stake first")
        // }


        let amountForTheField;
        const amountToWithdraw = userAccount.unstaked
        if (amountToWithdraw > 0) {
            d.inputById("radio-withdraw").checked = true
            amountForTheField = amountToWithdraw
        }
        else {
            d.inputById("radio-unstake").checked = true
            amountForTheField = userAccount.stnear
            if (amountForTheField == 0) throw Error("No funds on the pool")
        }
        if (info.type != "lock.c") optionWU.show()


        //d.byId("unstake-from-staking-pool").innerText = info.stakingPool || ""
        d.inputById("unstake-amount").value = c.toStringDec(amountForTheField)
        okCancel.enable()

    } catch (ex) {
        d.showErr(ex.message)
    }
    finally {
        d.hideWait()
        okCancel.enable()
    }

}

//-----------------------
function fixUserAmountInY(amount: number, yoctosMax: string): string {

    let yoctosResult = yoctosMax //default => all 
    if (amount + 1 < c.yton(yoctosResult)) {
        yoctosResult = c.ntoy(amount) //only if it's less of what's available, we take the input amount
    }
    else if (amount > 1 + c.yton(yoctosMax)) { //only if it's +1 above max
        throw Error("Max amount is " + c.toStringDec(c.yton(yoctosMax)))
        //----------------
    }
    return yoctosResult
}

//TODO
async function performUnstake() {
    //normal accounts
    try {
        okCancel.disable();
        d.showWait()

        const modeWithraw = (d.inputById("radio-withdraw").checked)
        const modeUnstake = !modeWithraw

        const amount = c.toNum(d.inputById("unstake-amount").value);
        //if (!near.isValidAmount(amount)) throw Error("Amount is not valid");

        //if (!selectedAccountData.accountInfo.privateKey) throw Error("you need full access on " + selectedAccountData.nearAccount);

        const actualSP = "";//selectedAccountData.accountInfo.stakingPool
        if (!actualSP) throw Error("No staking pool selected in this account");

        //check if it's staked or just in the pool but unstaked
        const poolAccInfo = await wallet.view(actualSP, "get_Account_info",{account_id:userAccount.nearAccount})
        const privateKey = ""

        if (modeWithraw) {

            if (poolAccInfo.unstaked_balance == "0") throw Error("No funds unstaked for withdraw")

            //if (!poolAccInfo.can_withdraw) throw Error("Funds are unstaked but you must wait (36-48hs) after unstaking to withdraw")

            //ok we've unstaked funds we can withdraw 
            let yoctosToWithdraw = fixUserAmountInY(amount, poolAccInfo.unstaked_balance) // round user amount
            if (yoctosToWithdraw == poolAccInfo.unstaked_balance) {
                //await near.call_method(actualSP, "withdraw_all", {}, cachedAccountData.nearAccount, privateKey, near.ONE_TGAS.muln(125))
            }
            else {
                //await near.call_method(actualSP, "withdraw", { amount: yoctosToWithdraw }, cachedAccountData.nearAccount, privateKey, near.ONE_TGAS.muln(125))
            }
            d.showSuccess(c.toStringDec(c.yton(yoctosToWithdraw)) + " withdrew from the pool")
            //----------------
        }

        else { //mode unstake
            //here we've staked balance in the pool, call unstake

            if (poolAccInfo.staked_balance == "0") throw Error("No funds staked to unstake")

            let yoctosToUnstake = fixUserAmountInY(amount, poolAccInfo.staked_balance) // round user amount
            if (yoctosToUnstake == poolAccInfo.staked_balance) {
                //await near.call_method(actualSP, "unstake_all", {}, cachedAccountData.nearAccount, privateKey, near.ONE_TGAS.muln(125))
            }
            else {
                //await near.call_method(actualSP, "unstake", { amount: yoctosToUnstake }, cachedAccountData.nearAccount, privateKey, near.ONE_TGAS.muln(125))
            }
            d.showSuccess("Unstake requested, you must wait (36-48hs) for withdrawal")
        }

        //refresh status
        //refreshSelectedAccount()

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
        if (amount > userAccount.available) throw Error("max amount is " + c.toStringDec(userAccount.available));

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

        okCancel.show_onOK(DeleteAccount, showButtons)

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
    if (!userAccount || !userAccount.accountInfo) return;
    try {

        d.showWait()

        const privateKey = "";//selectedAccountData.accountInfo.privateKey;
        if (!privateKey) throw Error("Account is Read-Only")

        const toDeleteAccName = d.inputById("delete-account-name-confirm").value
        if (toDeleteAccName != userAccount.nearAccount) throw Error("The account name to delete don't match")

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
    d.showSubPage("nslp-buttons")
    okCancel.hide()
}


//-------------------------------------------
async function refreshAccount() {
    await getAccountData()
    showAccountData()
}
async function refreshAccountClicked(ev: Event) {
    try {
        refreshAccount()
        d.showSuccess("Account refreshed")
    }
    catch (ex) {
        d.showErr(ex.message)
    }
}
