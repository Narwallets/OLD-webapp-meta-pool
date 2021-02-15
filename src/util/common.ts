import * as d from "../util/document.js"
import * as okCancel from "../components/ok-cancel-singleton.js"
import { wallet } from "../wallet-api/wallet.js"

export function ifWalletConnectedShowSubPage(subPageId: string, OKHandler: d.ClickHandler, CancelHandler: d.ClickHandler) {
    try {
        d.hideErr()
        wallet.checkConnected()
        d.showSubPage(subPageId)
        okCancel.show_onOK(OKHandler,CancelHandler)
    }
    catch (ex) {
        d.showErr(ex.message)
    }
}
