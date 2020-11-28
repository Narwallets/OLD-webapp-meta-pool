import * as c from "../util/conversions.js"
import * as d from "../util/document.js"

import { options } from "../data/options.js"

import * as near from "../wallet-api/lib/near-rpc.js"
import { develMode, wallet } from "../wallet-api/wallet.js"

import { ExtendedAccountData } from "../data/ExtendedAccount.js"
import { localStorageSet } from "../data/util.js"

import * as Main from "./main.js"

import type { AnyElement, ClickHandler } from "../util/document.js"
import { CONTRACT_ACCOUNT, divPool } from "../contracts/div-pool.js"

//-----------------
// page init
let okCancelRow: d.El
let confirmBtn: d.El
let cancelBtn: d.El

function init() {

    //accountAmount.onInput(amountInput);

    okCancelRow = new d.El(".footer .ok-cancel")
    confirmBtn = new d.El("#account-selected-action-confirm")
    cancelBtn = new d.El("#account-selected-action-cancel")

    const backLink = new d.El("#my-account.page .back-link");
    backLink.onClick(Main.show);

    d.onClickId("stake", stakeClicked);
    d.onClickId("unstake", unstakeClicked);
    d.onClickId("deposit", depositClicked);
    d.onClickId("withdraw", withdrawClicked);
    d.onClickId("close-account", closeAccountClicked);

    showButtons(); //2nd or third entry - always show the buttons

    confirmBtn.onClick(confirmClicked);
    cancelBtn.onClick(cancelClicked);

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
                    stakeClicked()
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
    cachedAccountExpire = 0
    if (cachedAccountId != wallet.accountId || Date.now() > cachedAccountExpire) {
        const accInfo = await divPool.get_account_info(wallet);
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


let confirmFunction: (ev: Event) => void = function (ev) { }

function showOKCancel(OKHandler: d.ClickHandler) {
    confirmFunction = OKHandler
    okCancelRow.show()
    enableOKCancel()
}
function disableOKCancel() {
    confirmBtn.disabled = true
    cancelBtn.disabled = true
}
function enableOKCancel() {
    confirmBtn.disabled = false
    cancelBtn.disabled = false
}

function walletConnectedSubPage(subPageId: string, OKHandler: ClickHandler) {
    try {
        d.hideErr()
        wallet.checkConnected()
        d.showSubPage(subPageId)
        showOKCancel(OKHandler)
    }
    catch (ex) {
        d.showErr(ex.message)
    }

}


async function withdrawClicked() {
    walletConnectedSubPage('withdraw-subpage', performWithdraw)
    await forceRefreshAccountData()
    d.byId("max-withdraw").innerText = c.toStringDec(cachedAccountData.available)
}


//----------------------
function depositClicked() {
    walletConnectedSubPage('deposit-subpage', performDeposit)
    const amountText = d.qs("#deposit-amount")
    amountText.value="100"
    amountText.el.focus()
}


//----------------------
function stakeClicked() {
    try {
        const info = cachedAccountData
        const stakeAmountBox = d.inputById("stake-amount")
        let performer = performStake //default
        let amountToStake
        if (info.available > 0) {
            amountToStake = info.unstaked
        }
        else {
            amountToStake = info.available + info.rewards
        }

        if (info.type == "lock.c") {
            //checkOwnerAccessThrows("stake")
            performer = performLockupContractStake
            stakeAmountBox.disabled = true
            stakeAmountBox.classList.add("bg-lightblue")
        }
        else {
            stakeAmountBox.disabled = false
            stakeAmountBox.classList.remove("bg-lightblue")
        }

        if (amountToStake < 0) amountToStake = 0;

        walletConnectedSubPage("account-selected-stake", performer)
        //d.inputById("stake-with-staking-pool").value = selectedAccountData.accountInfo.stakingPool || ""
        d.byId("max-stake-amount").innerText = c.toStringDec(amountToStake)
        stakeAmountBox.value = c.toStringDec(amountToStake)

    } catch (ex) {
        d.showErr(ex.message)
    }


}

//----------------------
async function performStake() {
    //normal accounts
    disableOKCancel();
    d.showWait()
    try {

        const newStakingPool = d.inputById("stake-with-staking-pool").value.trim();
        if (!near.isValidAccountID(newStakingPool)) throw Error("Staking pool Account Id is invalid");

        //if (!selectedAccountData.accountInfo.privateKey) throw Error("you need full access on " + selectedAccountData.nearAccount);

        //const amountToStake = info.lastBalance - info.staked - 36
        const amountToStake = c.toNum(d.inputById("stake-amount").value);
        if (!near.isValidAmount(amountToStake)) throw Error("Amount should be a positive integer");
        if (amountToStake < 5) throw Error("Stake at least 5 Near");

        //refresh status
        //refreshSelectedAccount()

        let actualSP = "";//selectedAccountData.accountInfo.stakingPool

        let poolAccInfo = { //empty info
            account_id: '',
            unstaked_balance: '0',
            staked_balance: '0',
            can_withdraw: false
        };

        if (actualSP) { //there's a selected SP

            //ask the actual SP how much is staked
            poolAccInfo = await near.getStakingPoolAccInfo(cachedAccountData.nearAccount, actualSP)

            if (actualSP != newStakingPool) { //requesting a change of SP

                if (poolAccInfo.unstaked_balance != "0" || poolAccInfo.staked_balance != "0") {
                    const staked = c.yton(poolAccInfo.staked_balance)
                    const inThePool = c.yton(poolAccInfo.unstaked_balance) + staked
                    throw Error(`Already staking with ${actualSP}. Unstake & withdraw first. In the pool:${inThePool}, staked: ${c.toStringDec(staked)}`);
                    //----------------------
                }

                //if ZERO in the pool, unselect current staking pool
                actualSP = ""
                //selectedAccountData.accountInfo.stakingPool = ""
            }
        }

        if (!actualSP) {
            //select the new staking pool
            //selectedAccountData.accountInfo.stakingPool = newStakingPool
            poolAccInfo = await near.getStakingPoolAccInfo(cachedAccountData.nearAccount, newStakingPool)
        }

        const privateKey = ""

        if (poolAccInfo.unstaked_balance != "0") { //deposited but unstaked, stake
            //just re-stake (maybe the user asked unstaking but now regrets it)
            const amountToStakeY = fixUserAmountInY(amountToStake, poolAccInfo.unstaked_balance)
            if (amountToStakeY == poolAccInfo.unstaked_balance) {
                await near.call_method(newStakingPool, "stake_all", {}, cachedAccountData.nearAccount, privateKey, near.ONE_TGAS.muln(125))
            }
            else {
                await near.call_method(newStakingPool, "stake", { amount: amountToStakeY }, cachedAccountData.nearAccount, privateKey, near.ONE_TGAS.muln(125))
            }
        }
        else { //no unstaked funds
            //deposit and stake
            await near.call_method(newStakingPool, "deposit_and_stake", {},
                cachedAccountData.nearAccount,
                "", //selectedAccountData.accountInfo.privateKey,
                near.ONE_TGAS.muln(125),
                amountToStake
            )
        }


        //refresh status
        //refreshSelectedAccount()

        d.showSuccess("Success")
        showButtons()

    }
    catch (ex) {
        d.showErr(ex.message)
    }
    finally {
        d.hideWait()
        enableOKCancel();
    }
}

//----------------------
async function performLockupContractStake() {
    try {

        disableOKCancel();
        d.showWait()
        /*
        const newStakingPool = d.inputById("stake-with-staking-pool").value.trim();
        if (!near.isValidAccountID(newStakingPool)) throw Error("Staking pool Account Id is invalid");

        const info = selectedAccountData.accountInfo
        if (!info.ownerId) throw Error("unknown ownerId");

        const owner = getAccountRecord(info.ownerId)
        if (!owner.privateKey) throw Error("you need full access on " + info.ownerId);

        //const amountToStake = info.lastBalance - info.staked - 36
        const amountToStake = c.toNum(d.inputById("stake-amount").value);
        if (!near.isValidAmount(amountToStake)) throw Error("Amount should be a positive integer");
        if (amountToStake < 5) throw Error("Stake at least 5 NEAR");

        const lc = new LockupContract(info)
        await lc.stakeWith(info.ownerId,
            newStakingPool,
            amountToStake,
            owner.privateKey)

        global.saveSecureState()
        //refresh status
        refreshSelectedAccount()

        d.showSuccess("Success")
        */
        showButtons()

    }
    catch (ex) {
        d.showErr(ex.message)
    }
    finally {
        d.hideWait()
        enableOKCancel();
    }

}

//-------------------------------------
async function unstakeClicked() {
    try {
        d.showWait()
        const info = cachedAccountData
        let performer = performUnstake//default
        const amountBox = d.inputById("unstake-amount")
        const optionWU = d.qs("#option-unstake-withdraw")
        d.byId("unstake-from-staking-pool").innerText = ""
        optionWU.hide()
        if (info.type == "lock.c") {
            //lockup - allways full amount
            d.qs("#unstake-ALL-label").show()
            //checkOwnerAccessThrows("unstake")
            performer = performLockupContractUnstake
            amountBox.disabled = true
            amountBox.classList.add("bg-lightblue")
        }
        else {
            //normal account can choose amounts
            d.qs("#unstake-ALL-label").hide()
            amountBox.disabled = false
            amountBox.classList.remove("bg-lightblue")
        }
        walletConnectedSubPage("account-selected-unstake", performer)
        disableOKCancel()

        //---refresh first
        //await refreshSelectedAccount()

        // if (!selectedAccountData.accountInfo.stakingPool) {
        //     showButtons()
        //     throw Error("No staking pool associated whit this account. Stake first")
        // }


        let amountForTheField;
        const amountToWithdraw = cachedAccountData.unstaked
        if (amountToWithdraw > 0) {
            d.inputById("radio-withdraw").checked = true
            amountForTheField = amountToWithdraw
        }
        else {
            d.inputById("radio-unstake").checked = true
            amountForTheField = cachedAccountData.skash
            if (amountForTheField == 0) throw Error("No funds on the pool")
        }
        if (info.type != "lock.c") optionWU.show()


        //d.byId("unstake-from-staking-pool").innerText = info.stakingPool || ""
        d.inputById("unstake-amount").value = c.toStringDec(amountForTheField)
        enableOKCancel()

    } catch (ex) {
        d.showErr(ex.message)
    }
    finally {
        d.hideWait()
        enableOKCancel()
    }

}

//-----------------------
function fixUserAmountInY(amount: number, yoctosMax: string): string {

    let yoctosResult = yoctosMax //default => all 
    if (amount + 1 < c.yton(yoctosResult)) {
        yoctosResult = near.ntoy(amount) //only if it's less of what's available, we take the input amount
    }
    else if (amount > 1 + c.yton(yoctosMax)) { //only if it's +1 above max
        throw Error("Max amount is " + c.toStringDec(c.yton(yoctosMax)))
        //----------------
    }
    return yoctosResult
}

async function performUnstake() {
    //normal accounts
    try {
        disableOKCancel();
        d.showWait()

        const modeWithraw = (d.inputById("radio-withdraw").checked)
        const modeUnstake = !modeWithraw

        const amount = c.toNum(d.inputById("unstake-amount").value);
        if (!near.isValidAmount(amount)) throw Error("Amount is not valid");

        //if (!selectedAccountData.accountInfo.privateKey) throw Error("you need full access on " + selectedAccountData.nearAccount);

        const actualSP = "";//selectedAccountData.accountInfo.stakingPool
        if (!actualSP) throw Error("No staking pool selected in this account");

        //check if it's staked or just in the pool but unstaked
        const poolAccInfo = await near.getStakingPoolAccInfo(cachedAccountData.nearAccount, actualSP)
        const privateKey = ""

        if (modeWithraw) {

            if (poolAccInfo.unstaked_balance == "0") throw Error("No funds unstaked for withdraw")

            //if (!poolAccInfo.can_withdraw) throw Error("Funds are unstaked but you must wait (36-48hs) after unstaking to withdraw")

            //ok we've unstaked funds we can withdraw 
            let yoctosToWithdraw = fixUserAmountInY(amount, poolAccInfo.unstaked_balance) // round user amount
            if (yoctosToWithdraw == poolAccInfo.unstaked_balance) {
                await near.call_method(actualSP, "withdraw_all", {}, cachedAccountData.nearAccount, privateKey, near.ONE_TGAS.muln(125))
            }
            else {
                await near.call_method(actualSP, "withdraw", { amount: yoctosToWithdraw }, cachedAccountData.nearAccount, privateKey, near.ONE_TGAS.muln(125))
            }
            d.showSuccess(c.toStringDec(c.yton(yoctosToWithdraw)) + " withdrew from the pool")
            //----------------
        }

        else { //mode unstake
            //here we've staked balance in the pool, call unstake

            if (poolAccInfo.staked_balance == "0") throw Error("No funds staked to unstake")

            let yoctosToUnstake = fixUserAmountInY(amount, poolAccInfo.staked_balance) // round user amount
            if (yoctosToUnstake == poolAccInfo.staked_balance) {
                await near.call_method(actualSP, "unstake_all", {}, cachedAccountData.nearAccount, privateKey, near.ONE_TGAS.muln(125))
            }
            else {
                await near.call_method(actualSP, "unstake", { amount: yoctosToUnstake }, cachedAccountData.nearAccount, privateKey, near.ONE_TGAS.muln(125))
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
        enableOKCancel();
    }
}

async function performLockupContractUnstake() {
    try {

        disableOKCancel();
        d.showWait()
        /*
        const info = selectedAccountData.accountInfo
        if (!info.ownerId) throw Error("unknown ownerId");

        const owner = getAccountRecord(info.ownerId)
        if (!owner.privateKey) throw Error("you need full access on " + info.ownerId);

        const lc = new LockupContract(info)

        const message = await lc.unstakeAndWithdrawAll(info.ownerId, owner.privateKey)
        d.showSuccess(message)

        //refresh status
        refreshSelectedAccount()
        */
        showButtons()

    }
    catch (ex) {
        d.showErr(ex.message)
    }
    finally {
        d.hideWait()
        enableOKCancel();
    }

}



async function performDeposit() {
    try {
        //if (!selectedAccountData.accountInfo.privateKey) throw Error("Account is read-only")
        const nearsToDeposit = d.getNumber("#deposit-amount")

        if (!d.isPositive(nearsToDeposit)) throw Error("Amount should be > 0");

        disableOKCancel()
        d.showWait()

        await divPool.deposit(wallet,nearsToDeposit)

        showButtons()

        //TODO transaction history per network
        //const transactionInfo={sender:sender, action:"transferred", amount:amountToSend, receiver:toAccName}
        //global.state.transactions[Network.current].push(transactionInfo)

        d.showSuccess("Success: " + wallet.accountId + " deposited " + c.toStringDec(nearsToDeposit) + "\u{24c3}")

        //internalReflectTransfer(selectedAccountData.nearAccount, toAccName, amountToSend)

    }
    catch (ex) {
        d.showErr(ex.message)
    }
    finally {
        d.hideWait()
        enableOKCancel()
    }

}

async function performWithdraw() {
    try {
        //if (!selectedAccountData.accountInfo.privateKey) throw Error("Account is read-only")
        const amount = d.getNumber("#withdraw-amount")

        if (!d.isPositive(amount)) throw Error("Amount should be > 0");
        if (amount > cachedAccountData.available) throw Error("max amount is " + c.toStringDec(cachedAccountData.available));

        disableOKCancel()
        d.showWait()

        await wallet.call(CONTRACT_ACCOUNT, "withdraw", {}, 25, amount)
        //await near.send(selectedAccountData.nearAccount, toAccName, amountToSend, privateKey)

        showButtons()

        //TODO transaction history per network
        //const transactionInfo={sender:sender, action:"transferred", amount:amountToSend, receiver:toAccName}
        //global.state.transactions[Network.current].push(transactionInfo)

        d.showSuccess("Success: " + wallet.accountId + " withdrew " + c.toStringDec(amount) + "\u{24c3}")

        //internalReflectTransfer(selectedAccountData.nearAccount, toAccName, amountToSend)

    }
    catch (ex) {
        d.showErr(ex.message)
    }
    finally {
        d.hideWait()
        enableOKCancel()
    }

}


function exploreButtonClicked() {
    localStorageSet({ reposition: "account", account: cachedAccountData.nearAccount })
    chrome.windows.create({
        url: "",//Network.currentInfo().explorerUrl + "accounts/" + selectedAccountData.nearAccount,
        state: "maximized"
    });
}

//---------------------------------------------

type PoolInfo = {
    name: string;
    slashed: string;
    stake: string;
    stakeY: string;
    uptime: number;
    fee?: number;
}

//---------------------------------------------
export async function searchThePools(exAccData: ExtendedAccountData): Promise<boolean> {

    const doingDiv = d.showMsg("Searching Pools...", "info", -1)
    d.showWait()
    let lastAmountFound = 0
    try {

        let checked: Record<string, boolean> = {}

        const validators = await near.getValidators()
        const allOfThem = validators.current_validators.concat(validators.next_validators, validators.prev_epoch_kickout, validators.current_proposals)

        for (let pool of allOfThem) {
            if (!checked[pool.account_id]) {
                doingDiv.innerText = "Pool " + pool.account_id;
                let isStakingPool = true
                let poolAccInfo;
                try {
                    poolAccInfo = await near.getStakingPoolAccInfo(exAccData.nearAccount, pool.account_id)
                } catch (ex) {
                    if (ex.message.indexOf("cannot find contract code for account") != -1) {
                        //validator is not a staking pool - ignore
                        isStakingPool = false
                    }
                    else throw (ex)
                }
                checked[pool.account_id] = true
                if (isStakingPool && poolAccInfo) {
                    const amount = c.yton(poolAccInfo.unstaked_balance) + c.yton(poolAccInfo.staked_balance)
                    if (amount > 0) {
                        d.showSuccess(`Found! ${c.toStringDec(amount)} on ${pool.account_id}`)
                        if (amount > lastAmountFound) { //save only one
                            /*exAccData.accountInfo.stakingPool = pool.account_id;
                            exAccData.accountInfo.staked = near.yton(poolAccInfo.staked_balance)
                            exAccData.accountInfo.unStaked = near.yton(poolAccInfo.unstaked_balance)
                            exAccData.inThePool = exAccData.accountInfo.staked + exAccData.accountInfo.unStaked
                            exAccData.accountInfo.stakingPoolPct = await near.getStakingPoolFee(pool.account_id)
                            */
                            lastAmountFound = amount
                        }
                    }
                }
            }
        }
    }
    catch (ex) {
        d.showErr(ex.message)
    }
    finally {
        doingDiv.remove()
        d.hideWait()
        return (lastAmountFound > 0)
    }

}

//---------------------------------------
async function DeleteAccount() {
    d.showWait()
    d.hideErr()
    try {

        //if (!selectedAccountData.accountInfo.privateKey) throw Error("Account is Read-Only")
        //await refreshSelectedAccount() //refresh account to have updated balance

        d.showSubPage("account-selected-delete")
        //d.inputById("send-balance-to-account-name").value = selectedAccountData.accountInfo.ownerId || ""

        showOKCancel(AccountDeleteOKClicked)

    }
    catch (ex) {
        d.showErr(ex.message)
    }
    finally {
        d.hideWait()
    }
}

//-----------------------------------
async function AccountDeleteOKClicked() {
    if (!cachedAccountData || !cachedAccountData.accountInfo) return;
    try {

        d.showWait()

        const privateKey = "";//selectedAccountData.accountInfo.privateKey;
        if (!privateKey) throw Error("Account is Read-Only")

        const toDeleteAccName = d.inputById("delete-account-name-confirm").value
        if (toDeleteAccName != cachedAccountData.nearAccount) throw Error("The account name to delete don't match")

        const beneficiary = d.inputById("send-balance-to-account-name").value
        if (!beneficiary) throw Error("Enter the beneficiary account")

        const result = await near.delete_account(toDeleteAccName, privateKey, beneficiary)

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

//-----------------------------------
async function AddPublicKeyToLockupOKClicked() {
    if (!cachedAccountData || !cachedAccountData.accountInfo) return;
    try {
        d.showWait()
        showButtons()
    }
    catch (ex) {
        d.showErr(ex.message)
    }
    finally {
        d.hideWait()
    }
}

//-----------------------------------
function makeReadOnlyOKClicked() {
    const confirmAccName = d.inputById("account-name-confirm").value
    if (confirmAccName != cachedAccountData.nearAccount) {
        d.showErr("Names don't match")
    }
    else {
        //selectedAccountData.accountInfo.privateKey = undefined

        //selectedAccountData.accessStatus = "Read Only"
        d.showMsg("Account access removed", "success")
        //showAccountData(selectedAccountData.nearAccount)
        showButtons()
    }
}




function confirmClicked(ev: Event) {
    try {
        if (confirmFunction) confirmFunction(ev);
    }
    catch (ex) {
        d.showErr(ex.message);
    }
    finally {
    }
}

function showButtons() {
    d.showSubPage("account-selected-buttons")
    okCancelRow.hide()
    //if (showingMore()) moreLessClicked()
}

function cancelClicked() {
    showButtons()
    okCancelRow.hide()
}


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
        Main.show()
    }
    catch (ex) {
        d.showErr(ex.message)
    }
}

async function refreshClicked(ev: Event) {

    d.showWait()
    try {
        //await refreshSelectedAccount()
        d.showSuccess("Account data refreshed")
    }
    catch (ex) {
        d.showErr(ex.message)
    }
    finally {
        d.hideWait()
    }
}
