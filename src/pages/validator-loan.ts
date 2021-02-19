import * as c from "../util/conversions.js"
import * as d from "../util/document.js"

import * as okCancel from "../components/ok-cancel-singleton.js"
import {ifWalletConnectedShowSubPage} from "../util/common.js"

import { wallet } from "../wallet-api/wallet.js"
import { metaPool, VLoanInfo } from "../contracts/meta-pool.js"

import {show as MyAccount_show} from "./my-account.js"

import type { AnyElement, ClickHandler } from "../util/document.js"
import { checkPositiveAmount } from "../util/valid.js"

const statuses = ["DRAFT","ACTIVE","REJECTED","APPROVED","FEE_PAID","EXECUTING","COMPLETED"]
const DRAFT=0;
const ACTIVE=1;
const APPROVED=3;
const COMPLETED=6;

//Vloaninfo converted. e.g. u128 y => number N
type VLoanInfoExt = {
    //original contract data
    raw: VLoanInfo,

    //set to current connected account
    staking_pool_owner_id: string,
    //total requested 
    amount_requested_near:number, //u128
    //committed fee
    //The validator commits to have their fee at x%, x amount of epochs
    //100 => 1% , 250=>2.5%, etc. -- max: 10000=>100%
    commited_fee: number, //u16,

    //status: set by requester: draft, active / set by owner: rejected, accepted, implemented
    status_text: string,

    //set by owner. if status=accepted how much will be taken from the user account as fee to move to status=implemented
    loan_fee_near:number, // u128,
    
}

//-----------------
// page init
//-----------------
function init() {

    const backLink = new d.El("#vloan-page .back-link");
    backLink.onClick(MyAccount_show);

    d.onClickId("vloan-modify-request", vLoanModifyClick);
    d.onClickId("vloan-activate-request", vLoanActivateClick);
    d.onClickId("vloan-deactivate-request", vLoanDeactivateClick);
    d.onClickId("vloan-take", vLoanTakeClick);
    d.onClickId("vloan-delete", vLoanDeleteClick);

    showButtons()
}


//-----------------
export async function show() {
    try {
        init();
        await getVLoanInfo()
        showVLoanInfo()
        d.showPage("vloan-page")
    }
    catch (ex) {
        d.showErr(ex.message);
    }
}

let data: VLoanInfo;
let dataExt: VLoanInfoExt;

async function getVLoanInfo() {
    wallet.checkConnected()
    data = await metaPool.get_vloan_request(wallet.accountId);
    dataExt = {
        raw: data,
        staking_pool_owner_id:wallet.accountId, 
        status_text: statuses[data.status],
        amount_requested_near:c.yton(data.amount_requested),
        commited_fee: data.commited_fee/100, //u16, basis points
        loan_fee_near: c.yton(data.loan_fee),
        };
    return;
}


function showVLoanInfo() {
    d.applyTemplate("vloan-info", "vloan-template", dataExt)
}

//----------------------
function vLoanModifyClick() {
    try {
        if (data.status!=DRAFT) throw Error("You can only modify DRAFT requests")
        ifWalletConnectedShowSubPage("vloan-modify", VLoanModify_okClicked, showButtons);
        d.inputById("vloan_amount_near").value = c.toStringDec(dataExt.amount_requested_near);
        d.inputById("staking_pool_account_id").value = data.staking_pool_account_id;
        d.inputById("commited_fee").value = c.toStringDec(dataExt.commited_fee);
        d.inputById("commited_fee_duration").value = data.commited_fee_duration.toString();
        d.inputById("information_url").value = data.information_url;
    } catch (ex) {
        d.showErr(ex.message)
    }
}
//-------
function vLoanActivateClick() {
    try {
        ifWalletConnectedShowSubPage("vloan-activate", VLoanActivate_okClicked, showButtons)
    } catch (ex) {
        d.showErr(ex.message)
    }
}
//-------
function vLoanDeactivateClick() {
    try {
        ifWalletConnectedShowSubPage("vloan-deactivate", VLoanDeactivate_okClicked, showButtons)
    } catch (ex) {
        d.showErr(ex.message)
    }
}
//-------
function vLoanTakeClick() {
    try {
        ifWalletConnectedShowSubPage("vloan-take", VLoanTake_okClicked, showButtons)
    } catch (ex) {
        d.showErr(ex.message)
    }
}
//-------
function vLoanDeleteClick() {
    try {
        ifWalletConnectedShowSubPage("vloan-delete", VLoanDelete_okClicked, showButtons)
    } catch (ex) {
        d.showErr(ex.message)
    }
}



//----------------------
async function VLoanModify_okClicked() {
    okCancel.disable();
    d.showWait()
    try {

        const amountRequested = d.getNumber("input#vloan_amount_near");
        if (amountRequested < 1000) throw Error("min amount is 1000 Near");

        // const stat_select = (d.byId("vloan-status") as HTMLInputElement);
        // const new_status = parseInt(stat_select.value);
        // if (isNaN(new_status)||new_status<0||new_status>=statuses.length) throw Error("Invalid status: "+new_status);

        await metaPool.set_vloan_request(
            amountRequested,
            d.inputById("staking_pool_account_id").value,
            d.getNumber("input#commited_fee"),
            d.getNumber("input#commited_fee_duration"),
            d.inputById("information_url").value
            );

        //refresh acc info
        await refreshAccount()

        d.showSuccess("Request Updated")
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
async function VLoanActivate_okClicked() {
    okCancel.disable();
    d.showWait()
    try {

        if (data.status==ACTIVE) throw Error("Request is already ACTIVE");
        await metaPool.vloan_activate(5);

        //refresh acc info
        await refreshAccount()

        d.showSuccess("Request Activated")
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
async function VLoanDeactivate_okClicked() {
    okCancel.disable();
    d.showWait()
    try {

        if (data.status!=ACTIVE && data.status!=APPROVED && data.status!=COMPLETED) throw Error("Request is Not ACTIVE|APPROVED|COMPLETED");
        await metaPool.vloan_convert_back_to_draft();

        //refresh acc info
        await refreshAccount()

        d.showSuccess("Request converted to DRAFT")
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
async function VLoanTake_okClicked() {
    okCancel.disable();
    d.showWait()
    try {

        if (data.status!=APPROVED) throw Error("Request is not APPROVED");
        await metaPool.vloan_take();

        //refresh acc info
        await refreshAccount()

        d.showSuccess("Fee paid, loan taked, staking will begin shortly")
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
async function VLoanDelete_okClicked() {
    okCancel.disable();
    d.showWait()
    try {
        await metaPool.vloan_delete();

        //refresh acc info
        await refreshAccount()

        d.showSuccess("staking loan request deleted")
        //back to my-account page
        MyAccount_show()

    }
    catch (ex) {
        d.showErr(ex.message)
    }
    finally {
        d.hideWait()
        okCancel.enable();
    }
}

//-------------------------------
function showButtons() {
    d.showSubPage("vloan-buttons")
    okCancel.hide()
}

//-------------------------------------------
async function refreshAccount() {
    await getVLoanInfo()
    showVLoanInfo()
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
