// data/util.js

// get for simpler items
export async function localStorageGet(code:string):Promise<any> {
  return new Promise((resolve, reject) => {
    try {
      const obj = localStorage.getItem(code)
      if (obj!=null) return resolve(JSON.parse(obj))
      return resolve(undefined);
    }
    catch (err) {
      console.error("CRITICAL. localStorage.get('"+code+"') failed", err.message);
      reject()
    }
    finally { }
  });
}
// get & remove for simpler items
export async function localStorageGetAndRemove(code:string) :Promise<any> {
  const value = await localStorageGet(code)
  localStorageRemove(code)
  return value
}
// set for simpler items
export function localStorageSet(payload:any) {
  for(let key in payload){
    localStorage.set(key,JSON.stringify(payload[key]))
  }
}
// remove for simpler items
export function localStorageRemove(code:string) {
  localStorage.removeItem(code)
}

// recover for complex objects like state
export async function localStorageRetrieve(title:string,code:string,defaultValue:any):Promise<any> {
    const result = await localStorageGet(code);
    if (Object.keys(result).length == 0) Object.assign(result, defaultValue);
    return result
}

export function localStorageSave(title:string,code:string,value:any) {
  const payload:Record<string,any>={}    
  payload[code]=value
  localStorageSet(payload)
}
  