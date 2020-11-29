import {BatchTransaction, FunctionCall, Transfer} from "./batch-transaction.js"

import * as TX from "./lib/transaction.js"
import type { BN as BNType } from '../../bundled-types/BN.js';
declare var BN: typeof BNType;
import * as near from "./lib/near-rpc.js"
import {setRpcUrl} from "./lib/utils/json-rpc.js"
import {backgroundRequest, processRequestResolved} from "./lib/backgroundRequest.js"

//--------------------------
//-- DEVEL MODE SINGLETON --
//--------------------------

class DevelModeSingleton {

    enabled =  false
    accountId = ""
    privateKey = ""

    enable(accountId:string, privateKey:string){
        this.enabled= true;
        this.accountId= accountId;
        this.privateKey=privateKey;
    }

    disable(){
        this.enabled=false;
    }

}
export let develMode = new DevelModeSingleton();

//requests made to the extension
type requestInfo = {
    payload:any,
    resolve: Function,
    reject: Function,
}
const requests:requestInfo[]=[];
let requestId=0; //incremental request-id


//----------------------------------------
//-- LISTEN to "message" from injected content script
//-- msg path is ext-> content-script-> here-> dispatchEvent("wallet-connected"|"wallet-disconnected"|"wallet-event")
//-- process by raising 'wallet-event'  
//----------------------------------------
console.log("wallet.ts addEventListener(message)")
window.addEventListener("message", 
    function(event) {
        console.log("wallet-ts messagelistener",event.data.dest, event.data);
        if (event.source != window) return; //only internal messages (from the injected content script)
        if (event.data.dest!="page") return;
        msgReceivedFromContentScript(event.data)
    }
    , false)
;

function msgReceivedFromContentScript(msg:Record<string,any>){
    
    console.log("msg ext->page: " + JSON.stringify(msg));

    //handle connect and disconnect
    if (msg.code=="connect"){
        const response={dest:"ext", code:"connected", relayer:"wallet-api", version:"0.1", network:wallet.network, err:""}
        if (!msg.data || msg.data.network!=wallet.network){
            //respond back what network we're working in
            response.err="The web page requires an account on "+wallet.network;
            window.postMessage(response,"*")
            return;
        }
        //turn on connected flags
        wallet._isConnected = true;
        wallet._accountId = msg.data.accountId;
        //respond back so the wallet knows we're listening
        window.postMessage(response,"*")
    }
    else if (msg.code=="disconnect"){
        if (wallet.isConnected) {      
            wallet.disconnect(); //dispatchs event, does it all
        }   
        return;
    }
    else if (msg.code=="request-resolved"){
        //find & resolve the request by requestId 
        processRequestResolved(msg);
    }

    //Also dispatchEvent to the DApp can react to extension-wallet events
    let eventKey:string = eventFromCode(msg.code);
    const eventInfo = 
        new CustomEvent(
            eventKey,
            { detail:{
                source:'ext',
                code: msg.code,
                err: msg.err,
                data: msg.data,
                }
            })
    console.log("document.dispatchEvent "+ eventInfo.type) 
    document.dispatchEvent(eventInfo);
}

function eventFromCode(code:string):string{
    switch(code){
        case "connect": return "wallet-connected";
        case "disconnect": return "wallet-disconnected";
        default: return 'wallet-event';
    }
}

/* ----------------
Known events:
  connected = {
        code: 'connected',
        source:'ext',
        dest:'page',
        err: undefined,
        data: {
            accountId: "${user_account_id}"
        },
  }
*/

type EventHandler = (this:Document,ev:any)=>any;

//-----------------------------
//-- SINGLETON WALLET class  --
//-----------------------------
export class Wallet {
    
    _isConnected: boolean =false;
    _accountId: string="";
    _network="mainnet"; //default required network. Users will be required to connect accounts from mainnet
    
    get accountId():string{
        return this._accountId;
    }

    get network(){ return this._network }
    set network(value:string){
        this._network = value;
        setRpcUrl(`https://rpc.${value}.near.org/`)
    }

    // Note: Connection is started from the extension, so web pages don't get any info before the user decides to "connect"
    // Also pages don't need to create buttons/options to connect to different wallets, as long all wallets connect with pages by the same API

    get isConnected() {return this._isConnected}
   
    disconnect(){
        console.log("wallet.disconnect") 
        document.dispatchEvent(new CustomEvent("wallet-disconnected"));
        if (this._isConnected) window.postMessage({dest:"ext",code:"disconnect"},"*"); //inform the extension
        this._isConnected = false;
        this._accountId = "";
        
    }

    connectionHelp(){
        window.open("http://www.narwallets.com/help/connect-to-web-app")
    }

    /**
     * isConnected or trhrows "wallet not connected"
     */
    checkConnected() {
        if (!this._isConnected) {
            throw Error("Wallet is not connected. Open the wallet extension and click 'Connect to Web Page'")
        }
    }

    /**
     * ASYNC. Applies the transaction in the NEAR blockchain
     */
    async apply (bt:BatchTransaction):Promise<any>{

        wallet.checkConnected()
        
        if (develMode.enabled){
            const actions: TX.Action[]=[];
            for(let item of bt.items){
                if (item instanceof FunctionCall){
                    actions.push(TX.functionCall(item.method, item.args, near.ONE_TGAS.muln(item.Tgas), near.ONE_NEAR.muln(item.attachedNear)))
                }
                else if(item instanceof Transfer){
                    actions.push(TX.transfer(near.ONE_NEAR.muln(item.attachedNear)))
                }
            }
            return near.broadcast_tx_commit_actions(actions, this.accountId, bt.receiver, develMode.privateKey)
        }

        //normal mode - ask the extension to broadcast the transaction
        //register request. Promise will be resolved when the response arrives
        const requestPayload={dest:"ext", code:"apply", tx:bt}
        return backgroundRequest(requestPayload);
    }

    /**
     * Just a single contract "view" call
     */
    async view (contract:string, method:string, args:Record<string,any>):Promise<any>{
        wallet.checkConnected()
        
        if (develMode.enabled){
            return near.view(contract,method,args)
        }

        //normal mode - ask the extension to make the view-call
        const requestPayload={dest:"ext", code:"view", contract:contract, method:method, args:args}
        return backgroundRequest(requestPayload);
    }

    /**
     * A single contract "payable" fn call
     */
    async call(contract:string, method:string, args:Record<string,any>, TGas:number, attachedNEAR:number):Promise<any>{
        const bt=new BatchTransaction(contract)
        bt.addItem(new FunctionCall(method,args,TGas,attachedNEAR))
        return this.apply(bt)
    }

    //to add event listeners
    onConnect(handler:EventHandler){
        document.addEventListener<any>("wallet-connected",handler)
    }
    onDisconnect(handler:EventHandler){
        document.addEventListener<any>("wallet-disconnected",handler)
    }
}
//-----------------
// SINGLETON EXPORT
//-----------------
export let wallet = new Wallet();
