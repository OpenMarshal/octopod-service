/// <reference types="node" />
import { ServiceReference } from './ServiceReference';
import { Connection, ResponseCallback } from 'webdav-client';
export interface TraceInfo<T> {
    data: T;
    path: string;
    outputs: {
        [method: string]: string[];
    };
    mainOutput: string;
}
export interface ServiceActionInvokeOptions {
    url?: string;
    action: string;
    body?: string | Buffer;
}
export declare class Service extends Connection {
    shared: boolean;
    uid: string;
    saveQueue: (() => void)[];
    saving: boolean;
    commands: {
        [name: string]: (data: any, done: (response?: any) => void) => void;
    };
    constructor(name: string, environmentUrl: string, shared?: boolean);
    loadConfiguration(callback: (data: any) => void): void;
    loadConfiguration<T>(callback: (data: T) => void): void;
    loadConfiguration(interval: number, callback: (data: any) => void): void;
    loadConfiguration<T>(interval: number, callback: (data: T) => void): void;
    saveConfiguration(data: any, callback?: () => void): void;
    saveConfiguration<T>(data: T, callback?: () => void): void;
    loadState(callback: (data: any) => void): void;
    loadState<T>(callback: (data: T) => void): void;
    saveState(data: any, callback?: () => void): void;
    saveState<T>(data: T, callback?: () => void): void;
    log(text: string, more?: any): void;
    error(text: string, more?: any): void;
    sendCommand(service: string, command: string, data: any, callback?: (error: Error, response: any) => void): any;
    sendCommand<T>(service: string, command: string, data: any, callback?: (error: Error, response: T) => void): any;
    reference(options: ServiceReference, callback?: (error: Error) => void): void;
    dispose<T>(info: TraceInfo<T>, callback?: () => void): any;
    dispose(paths: {
        [method: string]: string[];
    }, callback?: () => void): any;
    invokeServiceAction(options: ServiceActionInvokeOptions, callback: ResponseCallback): void;
    bindMethod<T>(method: string, callbackOnInput: (data: T, info: TraceInfo<T>) => void): void;
    call<T, Q>(service: string, method: string, inputData: Q, callback: (response: T, responsePaths: {
        [method: string]: string[];
    }) => void): void;
}