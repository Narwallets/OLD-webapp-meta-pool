import * as TX from "./lib/transaction.js"
import type { BN as BNType } from '../../bundled-types/BN.js';
declare var BN: typeof BNType;
import * as near from "./lib/near-rpc.js"

//--------------------------
//-- DEVEL MODE SINGLETON --
//--------------------------

export let develMode = {

    enabled: false,
    accountId:"",
    privateKey: "",

    enable: function (accountId:string, privateKey:string){
        this.enabled= true;
        this.accountId= accountId;
        this.privateKey=privateKey;
    },

    disable: function(){
        this.enabled=false;
    }

}

//-----------------
//-- TRANSACTION --
//-----------------

export class Transaction {
    items: TransactionItem[] = []
    constructor(
        public receiver:string,
    ){}

    addItem(item:TransactionItem){
        this.items.push(item)
    }
}

export class TransactionItem {
}

export class FunctionCall extends TransactionItem{
    constructor(
        public method:string,
        public args: Record<string,any>,
        public Tgas: number = 50,
        public attachedNEAR: number = 0,
    ){
        super()
    }
}
export class Transfer extends TransactionItem{
    constructor(
        public attachedNEAR:number
    ){
        super()
    }
}

//----------------------
//-- WALLET SINGLETON --
//----------------------

let _isConnected: boolean =false;
let _accountId: string;

export let wallet = {
    
    get accountId():string{
        return _accountId;
    },


    /**
     * connect:ASYNC: Connects to Narwallets chrome-extension-wallet or THROWS
     */
    connect: async function(): Promise<any> {
        
        _isConnected = false;

        if (develMode.enabled){
            _isConnected = true;
            _accountId= develMode.accountId;
            return;
        }

        //here try to connect
        throw Error("ERR: API not availabe yet")

        throw Error("ERR: Narwallets is not installed or the user rejected the connection")
    },

    disconnect: function(){
        _isConnected = false;
    },

    get isConnected() {return _isConnected},
    
    /**
     * isConnected or trhrows "wallet not connected"
     */
    checkConnected() {if (!_isConnected) throw Error("wallet is not connected")},

    /**
     * ASYNC. Applies the transaction in the NEAR blockchain
     */
    apply: async function (tx:Transaction):Promise<any>{

        wallet.checkConnected()
        
        if (develMode.enabled){
            const actions: TX.Action[]=[];
            for(let item of tx.items){
                if (item instanceof FunctionCall){
                    actions.push(TX.functionCall(item.method, item.args, near.ONE_TGAS.muln(item.Tgas), near.ONE_NEAR.muln(item.attachedNEAR)))
                }
                else if(item instanceof Transfer){
                    actions.push(TX.transfer(near.ONE_NEAR.muln(item.attachedNEAR)))
                }
            }
            return near.broadcast_tx_commit_actions(actions, this.accountId, tx.receiver, develMode.privateKey)
        }

        //normal mode
        throw Error("ERR: API not availabe yet")
    },

    /**
     * Just a single contract "view" call
     */
    view: async function (contract:string, method:string, args:Record<string,any>){
        return near.view(contract,method,args)
    },

    /**
     * A single contract "payable" fn call
     */
    call: async function (contract:string, method:string, args:Record<string,any>, TGas:number, attachedNEAR:number):Promise<any>{
        const tx=new Transaction(contract)
        tx.addItem(new FunctionCall(method,args,TGas,attachedNEAR))
        return this.apply(tx)
    }

}
