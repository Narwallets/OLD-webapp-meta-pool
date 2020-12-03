import * as d from "./util/document.js"

import * as InitialPage from "./pages/initial.js"
import * as Dashboard from "./pages/dashboard.js"

import { wallet } from "./wallet-api/wallet.js"

import { isValidEmail } from "./util/email.js"

//import { addListeners as CreateUser_addListeners } from "./pages/create-pass.js"
//import { addListeners as ImportOrCreate_addListeners } from "./pages/import-or-create.js"
//import { addListeners as Import_addListeners } from "./pages/import.js"

import { show as MyAccountPage_show } from "./pages/my-account.js"


import * as bip39 from "../bundled-types/bip39-light"


const AUTO_LOCK_SECONDS = 15; //auto-lock wallet after 1hr

//--- content sections at MAIN popup.html
const WELCOME_NEW_USER_PAGE = "welcome-new-user-page"
const CREATE_USER = "create-user"

const UNLOCK = "unlock"

const MAIN_PAGE = "main-page"
const ADD_ACCOUNT = "add-account"
const IMPORT_OR_CREATE = "import-or-create"


const TYPE = "type"
const NAME = "name"
const BALANCE = "balance"
const STAKED = "staked"
const AVAILABLE = "available"

const DATA_CODE = "data-code"

const hamb = new d.El(".hamb")
const aside = new d.El("aside")

// function clicked(ev :Event) {
//   console.log("click!");
//   console.log(ev);
//   chrome.runtime.getBackgroundPage(function (backgroundPageWindow ?: Window ) {
//     if (backgroundPageWindow!=undefined) {
//       const bp = backgroundPageWindow  as unknown as BackgroundPage ;
//       let result = bp.backgroundFunction("Get Posts click!");
//       console.log("background page says: ", result);
//     }

//   })
// }


function welcomeCreatePassClicked() {
  d.showPage(CREATE_USER)
}


function hambClicked() {
  hamb.toggleClass("open")
  aside.toggleClass("open")
}

function asideAccounts() {
  hambClicked();
  InitialPage.show();
}


function securityOptions() {

  //close moreless because options can change behavior
  const buttonsMore = new d.All(".buttons-more")
  buttonsMore.addClass("hidden")
  d.qs("#moreless").innerText = "More..."

  d.showPage("security-options")
  d.onClickId("save-settings", saveSecurityOptions)
  d.onClickId("cancel-security-settings", InitialPage.show)
}

function saveSecurityOptions(ev:Event) {
  try {
    ev.preventDefault()

    const checkElem = document.getElementById("advanced-mode") as HTMLInputElement


    const aulSecs = Number(d.inputById("auto-unlock-seconds").value)
    if (isNaN(aulSecs)) throw Error("Invalid auto unlock seconds")



    InitialPage.show()
    d.showSuccess("Options saved")
  }
  catch (ex) {
    d.showErr(ex.message)
  }
}


function asideCreateUserClicked() {
  hambClicked();
  d.showPage(WELCOME_NEW_USER_PAGE)
}

function addAccountClicked() {
  d.showPage(IMPORT_OR_CREATE)
}

async function tryReposition() {
  //const reposition = await localStorageGetAndRemove("reposition")
  /*
  switch (reposition) {
    case "create-user": { //was creating user but maybe jumped to terms-of-use
      welcomeCreatePassClicked()
      //d.inputById("email").value = await localStorageGetAndRemove("email")
      break;
    }
    case "account": case "stake":  {
      const account = "" //await localStorageGetAndRemove("account")
      if (account) MyAccountPage_show(reposition)
    }
  }
    */
  }

function connectionInfoClicked(){
  const div = d.byId("connection-info")
  if (!wallet.isConnected) wallet.connectionHelp()
}

function walletConnected(ev:CustomEvent){
  const div = d.byId("connection-info")
  div.innerText = ev.detail.data.accountId;
  div.classList.add("connected")
  d.showSuccess("wallet connected")
  Dashboard.show()
}
function walletDisconnected(ev:CustomEvent){
  const div = d.byId("connection-info")
  div.innerText = "Not connected";
  div.classList.remove("connected")
  d.showSuccess("wallet disconnected")
  InitialPage.show()
}

// ---------------------
// DOM Loaded - START
// ---------------------
async function onLoad() {

  //TESTING MODE 
  wallet.network ="testnet"

  hamb.onClick(hambClicked)

  //clear err messages on click
  d.onClickId("err-div", () => {
    const errDiv = d.byId("err-div")
    while (errDiv.firstChild) errDiv.firstChild.remove()
  });

  d.onClickId("connection-info", connectionInfoClicked);

  wallet.onConnect(walletConnected)
  wallet.onDisconnect(walletDisconnected)


  //d.onClickId(UNLOCK, unlockClicked);
  //d.onEnterKey("unlock-pass", unlockClicked)

  //d.onClickId(ADD_ACCOUNT, addAccountClicked);

  //aside
  //d.qs("aside #lock").onClick(asideLock);
  //d.qs("aside #accounts").onClick(asideAccounts);
  //d.qs("aside #create-user").onClick(asideCreateUserClicked);
  //d.qs("aside #add-account").onClick(asideAddAccount);
  //d.qs("aside #change-password").onClick(asideChangePassword);
  //d.qs("aside #options").onClick(asideOptions);
  //new d.El(".aside #contact).asideContact);
  //new d.El(".aside #about).asideAbout);

  InitialPage.show()

  /*
  //restore State from chrome.storage.local
  try {

    await recoverOptions();
    await global.recoverState();
    //console.log(global.State)

    if (!global.State.dataVersion) {
      global.clearState();
    }
    if (global.State.usersList.length == 0) {
      //no users => welcome new User
      d.showPage(WELCOME_NEW_USER_PAGE)
      tryReposition();
      return; //***
    }

    d.showPage(UNLOCK); //DEFAULT: ask the user to unlock SecureState
    //showPage clears all input fields, set ddefault value after show-page
    d.inputById("unlock-email").value = global.State.currentUser;

    if (global.State.currentUser) { //we have a "last-user"
      //try to get auto-unlock key
      const uk = await localStorageGetAndRemove("uk")
      const exp = await localStorageGetAndRemove("exp")
      if (exp && Date.now() < exp && uk) { //maybe we can auto-unlock
        if (await tryAutoUnlock(uk)) { //if we succeed
          tryReposition(); //try reposition
        }
      }

    }

  }
  catch (ex) {
    d.showErr(ex.message)
    d.showPage(UNLOCK); //ask the user to unlock SecureState
  }
  finally {
  }
  */
}

document.addEventListener('DOMContentLoaded', onLoad);

