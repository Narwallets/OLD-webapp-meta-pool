import * as d from "./util/document.js"
import * as global from "./data/global.js"
import { recoverOptions } from "./data/options.js"
import * as Main from "./pages/main.js"

import { isValidEmail } from "./util/email.js"

//import { addListeners as CreateUser_addListeners } from "./pages/create-pass.js"
//import { addListeners as ImportOrCreate_addListeners } from "./pages/import-or-create.js"
//import { addListeners as Import_addListeners } from "./pages/import.js"

import { show as MyAccountPage_show } from "./pages/my-account.js"
import { localStorageGet, localStorageGetAndRemove, localStorageRemove, localStorageSet } from "./data/util.js"


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

async function unlockClicked(ev :Event) {

  const emailEl = d.inputById("unlock-email")
  const passEl = d.inputById("unlock-pass")

  const email = emailEl.value
  if (!isValidEmail(email)) {
    d.showErr("Invalid email");
    return;
  }

  //if (!global.State.usersList.includes( email)){
  //  d.showErr("User already exists");
  //  return;
  //}

  const password = passEl.value;
  passEl.value = ""

  try {
    await global.unlockSecureState(email, password)
    Main.show()
    if (global.getNetworkAccountsCount() == 0) {
      d.showPage(IMPORT_OR_CREATE); //auto-add account after unlock
    }
    else {
      tryReposition(); //try reposition
    }
  }
  catch (ex) {
    d.showErr(ex.message);
  }

}

function hambClicked() {
  hamb.toggleClass("open")
  aside.toggleClass("open")
}

function asideLock() {
  global.lock()
  hambClicked();
  d.showPage(UNLOCK)
  d.inputById("unlock-email").value = global.State.currentUser;

}
function asideAccounts() {
  hambClicked();
  Main.show();
}

function asideIsUnlocked() {
  hambClicked();
  if (!global.unlocked) {
    d.showPage(UNLOCK)
    d.showErr("You need to unlock the wallet first")
    return false;
  }
  return true;
}

function securityOptions() {

  //close moreless because options can change behavior
  const buttonsMore = new d.All(".buttons-more")
  buttonsMore.addClass("hidden")
  d.qs("#moreless").innerText = "More..."

  d.showPage("security-options")
  d.inputById("auto-unlock-seconds").value = global.getAutoUnlockSeconds().toString()
  d.inputById("advanced-mode").checked = global.SecureState.advancedMode ? true : false;
  d.onClickId("save-settings", saveSecurityOptions)
  d.onClickId("cancel-security-settings", Main.show)
}

function saveSecurityOptions(ev:Event) {
  try {
    ev.preventDefault()

    const checkElem = document.getElementById("advanced-mode") as HTMLInputElement
    global.SecureState.advancedMode = checkElem.checked

    const aulSecs = Number(d.inputById("auto-unlock-seconds").value)
    if (isNaN(aulSecs)) throw Error("Invalid auto unlock seconds")
    global.SecureState.autoUnlockSeconds = aulSecs

    global.saveSecureState()
    Main.show()
    d.showSuccess("Options saved")
  }
  catch (ex) {
    d.showErr(ex.message)
  }
}

function asideOptions() {
  if (asideIsUnlocked()) {
    securityOptions()
  }
  // chrome.windows.create({
  //     url: chrome.runtime.getURL("options/options.html")
  // });
}

function asideCreateUserClicked() {
  hambClicked();
  d.showPage(WELCOME_NEW_USER_PAGE)
}
function asideAddAccount() {
  if (asideIsUnlocked()) {
    d.showPage(IMPORT_OR_CREATE)
  }
}

function asideChangePassword() {
  if (asideIsUnlocked()) {
    d.showPage("change-password")
  }
}

function addAccountClicked() {
  d.showPage(IMPORT_OR_CREATE)
}

async function tryReposition() {
  const reposition = await localStorageGetAndRemove("reposition")
  switch (reposition) {
    case "create-user": { //was creating user but maybe jumped to terms-of-use
      welcomeCreatePassClicked()
      d.inputById("email").value = await localStorageGetAndRemove("email")
      break;
    }
    case "account": case "stake":  {
      const account = await localStorageGetAndRemove("account")
      if (account) MyAccountPage_show(reposition)
    }
  }
}

// ---------------------
// DOM Loaded - START
// ---------------------
async function onLoad() {

  hamb.onClick(hambClicked)

  //clear err messages on click
  d.onClickId("err-div", () => {
    const errDiv = d.byId("err-div")
    while (errDiv.firstChild) errDiv.firstChild.remove()
  });


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

  Main.show()

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

async function tryAutoUnlock(unlockSHA:string) :Promise<boolean> {
  if (unlockSHA) {
    //auto-unlock is enabled
    //try unlocking
    try {
      await global.unlockSecureStateSHA(global.State.currentUser, unlockSHA);
      //if unlock succeeded
      global.saveOnUnload.unlockSHA = unlockSHA;
      Main.show(); //show acc list
      return true;
    }
    catch (ex) {
      //invalid pass-SHA or other error
      d.showErr(ex.message);
      return false;
    }
  }
  return false;
}

document.addEventListener('DOMContentLoaded', onLoad);

