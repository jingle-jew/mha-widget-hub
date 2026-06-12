export function readJson(key,fallback){try{return JSON.parse(localStorage.getItem(key)||"")??fallback}catch{return fallback}}
export function writeJson(key,value){try{localStorage.setItem(key,JSON.stringify(value))}catch{}}
