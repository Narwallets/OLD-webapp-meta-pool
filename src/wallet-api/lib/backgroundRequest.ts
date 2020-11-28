//requests made to the extension's background.js
type requestInfo = {
    requestId:number,
    payload: any,
    resolve: Function,
    reject: Function,
}
const requests:requestInfo[]=[];
let requestId=0; //incremental request-id

//result from the extension
export type RequestResult = {
    requestId:number,
    err?:string,
    data?:any,
}

//queue a request, return a Promise
export function backgroundRequest(requestPayload:any):Promise<any>{
    return new Promise((resolve,reject)=>{
        const request:requestInfo = {requestId:++requestId, payload: requestPayload, reject:reject, resolve:resolve}
        requests.push(request)
        requestPayload.requestId=requestId; //add requestId to payload
        if (!requestPayload.dest) requestPayload.dest="ext";
        //broadcast (injected content script will process it)
        window.postMessage(requestPayload, "*")
    })
}

//called when the resolved msg comes back
export function processRequestResolved(msg:any){

    let inx=requests.findIndex(req => req.requestId==msg.requestId);
    if (inx>=0){
        //remove it from the array
        let r=requests.splice(inx,1)[0];
        //reject or resolve promise
        if (msg.err){
            return r.reject(Error(msg.err));
        }
        else {
            return r.resolve(msg.data);
        }
    }
    else {
        console.error("requestId NOT FOUND ",msg)        
    }
    
}
