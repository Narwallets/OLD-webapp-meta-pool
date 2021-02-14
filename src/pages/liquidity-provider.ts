import * as c from "../util/conversions.js"
import * as d from "../util/document.js"

import * as okCancel from "../components/ok-cancel-singleton.js"
import {ifWalletConnectedShowSubPage} from "../util/common.js"

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


//----------------------
function addLiquidityClick() {
    try {

        const max = c.toStringDec(userAccount.available)
        d.byId("add-liquidity-max").innerText = max
        ifWalletConnectedShowSubPage("add-liquidity", performAddLiquidity, showButtons)
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
        d.byId("remove-liquidity-max").innerText = c.toStringDec(acc.nslp_share_value)
        ifWalletConnectedShowSubPage("remove-liquidity", performRemoveLiquidity, showButtons)

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
