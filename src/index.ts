import * as d from "./util/document.js"

import * as InitialPage from "./pages/initial.js"
import * as Dashboard from "./pages/dashboard.js"

import { wallet } from "./wallet-api/wallet.js"

import { isValidEmail } from "./util/valid.js"

import { show as MyAccountPage_show } from "./pages/my-account.js"
import { divPool } from "./contracts/div-pool.js"

import {init as okCancel_init} from "./components/ok-cancel-singleton.js"

function connectionInfoClicked(){
  const div = d.byId("connection-info")
  if (!wallet.isConnected) wallet.connectionHelp()
}

function walletConnected(ev:CustomEvent){
  const div = d.byId("connection-info");
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

  //TESTING MODE NETWORK or mainnet
  wallet.network = "testnet" //"guildnet" //"mainnet"

  //init singleton components
  okCancel_init()

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

