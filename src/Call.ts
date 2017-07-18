import { Service } from './Service'

export function call(coreUrl : string, service : string, method : string, inputData : any, callback : (response : any, responsePaths : { [method : string] : string[] }) => void) : void
export function call<T>(coreUrl : string, service : string, method : string, inputData : any, callback : (response : T, responsePaths : { [method : string] : string[] }) => void) : void
export function call<T, Q>(coreUrl : string, service : string, method : string, inputData : Q, callback : (response : T, responsePaths : { [method : string] : string[] }) => void) : void
export function call<T, Q>(coreUrl : string, service : string, method : string, inputData : Q, callback : (response : T, responsePaths : { [method : string] : string[] }) => void) : void
{
    const s = new Service('', coreUrl);
    s.call<T, Q>(service, method, inputData, callback);
}
