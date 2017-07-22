import { ServiceReference, ServiceReferenceExtended } from './ServiceReference'
import { ServiceCommand, ServiceCommandResponse } from './Command'
import { Connection, ResponseCallback } from 'webdav-client'
import { WatchFileResponse } from './Core'
import { call } from './Call'

export interface TraceInfo<T>
{
    data : T,
    path : string,
    outputs : { [method : string] : string[] },
    mainOutput : string
}

export interface ServiceActionInvokeOptions
{
    url ?: string
    action : string
    body ?: string | Buffer
}

export class Service extends Connection
{
    uid : string

    saveQueue : (() => void)[];
    saving : boolean;
    referenceInformation : ServiceReference;

    commands : {
        [name : string] : (data : any, done : (response ?: any) => void) => void
    };

    constructor(name : string, environmentUrl : string, public shared : boolean = true)
    {
        super({
            url: environmentUrl,
            username : name
        })

        this.uid = process.pid + '_' + Date.now() + '_' + Math.random().toString() + '_' + Math.random().toString();

        this.commands = { };
        this.saveQueue = [ ];
        this.saving = false;
    }
/*
    reserveWriteClose(root : string, data : any, callback : (error : Error, path : string) => void)
    {
        this.request({
            url: root,
            method: 'BIND',
            body: data.constructor === String ? data : JSON.stringify(data)
        }, (e, res, body) => {
            if(e)
                return setTimeout(() => this.reserveWriteClose(root, data, callback), 1000);
            
            callback(null, res.headers['bind-path'] as string);
        })
    }
*/

/*
    updateProcessInformation(callback ?: () => void) : void
    updateProcessInformation(interval : number, callback ?: () => void) : void
    updateProcessInformation(_interval : number | (() => void), _callback ?: () => void) : void
    {
        const callback = _callback ? _callback : _interval as () => void;
        const interval = _interval !== undefined && _interval !== null && _interval.constructor === Number ? _interval as number : 0;

        if(interval > 0)
        {
            setInterval(() => this.updateProcessInformation(callback), interval);
            return;
        }

        this.putObject('/process/' + this.uid + '.json', {
            service: this.options.username,
            lastUpdate: Date.now(),
            pid: process.pid
        }, (e) => {
            if(e)
                return process.nextTick(() => this.updateProcessInformation(callback));

            if(callback)
                callback();
        })
    }*/

    loadConfiguration(callback : (data : any) => void) : void
    loadConfiguration<T>(callback : (data : T) => void) : void
    loadConfiguration(interval : number, callback : (data : any) => void) : void
    loadConfiguration<T>(interval : number, callback : (data : T) => void) : void
    loadConfiguration<T>(_interval : number | ((data : T) => void), _callback ?: (data : T) => void) : void
    {
        const callback = _callback ? _callback : _interval as (data : T) => void;
        const interval = _callback ? _interval as number : 0;

        if(interval > 0)
        {
            setInterval(() => this.loadConfiguration(callback), interval);
            return;
        }

        this.getObject<T>('/services/' + this.options.username + '/.config.json', (e, data) => {
            callback(data);
        })
    }

    saveConfiguration(data : any, callback ?: () => void) : void
    saveConfiguration<T>(data : T, callback ?: () => void) : void
    saveConfiguration<T>(data : T, callback ?: () => void) : void
    {
        this.putObject<T>('/services/' + this.options.username + '/.config.json', data, (e) => {
            if(callback)
                callback();
        })
    }

    loadState(callback : (data : any) => void) : void
    loadState<T>(callback : (data : T) => void) : void
    loadState<T>(callback : (data : T) => void) : void
    {
        this.getObject<T>('/services/' + this.options.username + '/.state.json', (e, data) => {
            callback(data);
        })
    }

    saveState(data : any, callback ?: () => void) : void
    saveState<T>(data : T, callback ?: () => void) : void
    saveState<T>(data : T, callback ?: () => void) : void
    {
        this.saveQueue.push(() => {
            this.putObject('/services/' + this.options.username + '/.state.json', data, (e) => {
                process.nextTick(() => {
                    this.saving = false;
                    if(this.saveQueue.length > 0)
                    {
                        this.saving = true;
                        this.saveQueue.shift()();
                    }
                })
                if(callback)
                    callback();
            })
        });
        if(this.saving)
            return;

        this.saving = true;
        this.saveQueue.shift()();
    }

    log(text : string, more ?: any)
    {
        if(more)
            console.log(text, more.toString());
        else
            console.log(text);
    }
    error(text : string, more ?: any)
    {
        if(more)
            console.error(text, more.toString());
        else
            console.error(text);
    }

    sendCommand(service : string, command : string, data : any, callback ?: (error : Error, response : any) => void)
    sendCommand<T>(service : string, command : string, data : any, callback ?: (error : Error, response : T) => void)
    sendCommand<T>(service : string, command : string, data : any, callback ?: (error : Error, response : T) => void)
    {
        this.call<ServiceCommandResponse<T>, ServiceCommand>(service, 'command', {
            command,
            data
        }, (response : ServiceCommandResponse<T>, paths) => {
            this.dispose(paths);
            if(callback)
                callback(response.statusCode !== 200 ? new Error(response.statusMessage + ' (' + response.statusCode + ')') : null, response.data);
        })
    }

    reference()
    reference(callback : (error : Error) => void)
    reference(options : ServiceReference, callback : (error : Error) => void)
    reference(options : ServiceReference)
    reference(_options ?: ServiceReference | ((error : Error) => void), _callback ?: (error : Error) => void)
    {
        const options = _options && _options.constructor !== Function ? _options as ServiceReference : this.referenceInformation;
        const callback = _callback ? _callback : _options && _options.constructor === Function ? _options as ((error : Error) => void) : undefined;

        const body : ServiceReferenceExtended = JSON.parse(JSON.stringify(options ? options : {}));
        body.name = this.options.username;

        if(!body.inputs)
            body.inputs = {};
        if(!body.inputs['command'])
            body.inputs['command'] = {
                isVolatile: true,
                flushed: true,
                mainOutputMethod: 'command-result',
                outputs: {
                    'command-result': 1
                }
            };

        this.invokeServiceAction({
            action: 'reference-service',
            body: JSON.stringify(body)
        }, (e, res, body) => {
            if(!e)
            {
                this.bindMethod<ServiceCommand>('command', (data, info) => {
                    const command = this.commands[data.command];

                    if(!command)
                        return this.putObject(info.mainOutput, {
                            statusCode: 404,
                            statusMessage: 'Command not found'
                        }, (e) => { })

                    command(data.data, (response ?: any) => {
                        this.dispose(info);
                        this.putObject(info.mainOutput, {
                            statusCode: 200,
                            statusMessage: 'Ok',
                            data: response
                        }, (e) => { })
                    });
                })
            }

            const updateProcessInformation = () =>
            {
                this.putObject('/process/' + this.uid + '.json', {
                    service: this.options.username,
                    lastUpdate: Date.now(),
                    pid: process.pid
                }, (e) => {
                    if(e)
                    {
                        setTimeout(() => updateProcessInformation(), 1000);
                        return;
                    }

                    setTimeout(() => updateProcessInformation(), 10000);
                })
            }
            updateProcessInformation();
            
            if(callback)
                callback(e);
        })
    }

    dispose<T>(info : TraceInfo<T>, callback ?: () => void)
    dispose(paths : { [method : string] : string[] }, callback ?: () => void)
    dispose<T>(info : TraceInfo<T> | { [method : string] : string[] }, callback ?: () => void)
    {
        let nb = 1;
        const del = (path) => {
            ++nb;
            process.nextTick(() => {
                this.delete(path, (e) => {
                    if(e)
                        return del(path);

                    if(--nb === 0 && callback)
                        callback();
                })
            })
        }

        const ainfo : any = info;

        if(ainfo.path && ainfo.path.constructor === String && ainfo.outputs && ainfo.mainOutput && ainfo.mainOutput.constructor === String)
        { // info : TraceInfo<T>
            del((info as TraceInfo<T>).path);
        }
        else
        { // info : { [method : string] : string[] }
            const paths = info as { [method : string] : string[] };
            
            for(const method in paths)
                for(const path of paths[method])
                    del(path);
        }

        --nb;
    }

    invokeServiceAction(options : ServiceActionInvokeOptions, callback : ResponseCallback) : void
    {
        this.request({
            url: options.url ? options.url : '/',
            method: 'TRACE',
            headers: {
                'service-action': options.action,
                'etag': this.uid
            },
            body: options.body
        }, (e, res, body) => callback(e, res, body));
    }

    bindMethod<T>(method : string, callbackOnInput : (data : T, info : TraceInfo<T>) => void) : void
    {
        const reengage = () => setTimeout(() => this.bindMethod(method, callbackOnInput), 1000);

        this.invokeServiceAction({
            url: '/services/' + this.options.username + '/' + method,
            action: 'check-service-input'
        }, (e, res, body) => {
            if(e)
                return reengage();

            const tis : TraceInfo<T>[] = JSON.parse(body.toString());
            tis.forEach((ti) => callbackOnInput(ti.data, ti));

            reengage();
        })
    }

    watchFolder(path : string, callback : (response : WatchFileResponse) => void) : void
    {
        const reengage = () => setTimeout(() => this.watchFolder(path, callback), 1000);

        this.invokeServiceAction({
            url: path,
            action: 'watch-folder'
        }, (e, res, body) => {
            if(e)
                return reengage();

            const tis : WatchFileResponse[] = JSON.parse(body.toString());
            tis.forEach((ti) => callback(ti));

            reengage();
        })
    }
    watchFile(path : string, callback : (response : WatchFileResponse) => void) : void
    {
        const reengage = () => setTimeout(() => this.watchFolder(path, callback), 1000);

        this.invokeServiceAction({
            url: path,
            action: 'watch-file'
        }, (e, res, body) => {
            if(e)
                return reengage();

            callback(JSON.parse(body.toString()));

            reengage();
        })
    }

    call(service : string, method : string, inputData : any, callback : (response : any, responsePaths : { [method : string] : string[] }, cleanup : () => void) => void) : void
    call<T>(service : string, method : string, inputData : any, callback : (response : T, responsePaths : { [method : string] : string[] }, cleanup : () => void) => void) : void
    call<T, Q>(service : string, method : string, inputData : Q, callback : (response : T, responsePaths : { [method : string] : string[] }, cleanup : () => void) => void) : void
    call<T, Q>(service : string, method : string, inputData : Q, callback : (response : T, responsePaths : { [method : string] : string[] }, cleanup : () => void) => void) : void
    {
        this.invokeServiceAction({
            url: '/services/' + service + '/' + method,
            action: 'call-service',
            body: JSON.stringify(inputData)
        }, (e, res, body) => {
            const info = JSON.parse(body.toString());

            const reengage = () => {
                this.getObject<T>(info.mainOutput, (e, body) => {
                    if(e || res.statusCode >= 400)
                        return setTimeout(() => reengage(), 1000);

                    callback(body, info.outputs, () => {
                        this.dispose(info.outputs);
                    });
                })
            }
            reengage();
        });
    }
}
