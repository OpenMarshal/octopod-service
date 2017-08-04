"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var webdav_client_1 = require("webdav-client");
var Service = (function (_super) {
    __extends(Service, _super);
    function Service(name, environmentUrl, shared) {
        if (shared === void 0) { shared = true; }
        var _this = _super.call(this, {
            url: environmentUrl,
            username: name
        }) || this;
        _this.shared = shared;
        _this.uid = process.pid + '_' + Date.now() + '_' + Math.random().toString() + '_' + Math.random().toString();
        _this.commands = {};
        _this.saveQueue = [];
        _this.saving = false;
        _this.events = {
            error: function (e) { throw e; }
        };
        return _this;
    }
    Service.prototype.loadConfiguration = function (_interval, _callback) {
        var _this = this;
        var callback = _callback ? _callback : _interval;
        var interval = _callback ? _interval : 0;
        if (interval > 0) {
            setInterval(function () { return _this.loadConfiguration(callback); }, interval);
            return;
        }
        this.getObject('/services/' + this.options.username + '/.config.json', function (e, data) {
            callback(data);
        });
    };
    Service.prototype.saveConfiguration = function (data, callback) {
        this.putObject('/services/' + this.options.username + '/.config.json', data, function (e) {
            if (callback)
                callback();
        });
    };
    Service.prototype.loadState = function (callback) {
        this.getObject('/services/' + this.options.username + '/.state.json', function (e, data) {
            callback(data);
        });
    };
    Service.prototype.saveState = function (data, callback) {
        var _this = this;
        this.saveQueue.push(function () {
            _this.putObject('/services/' + _this.options.username + '/.state.json', data, function (e) {
                process.nextTick(function () {
                    _this.saving = false;
                    if (_this.saveQueue.length > 0) {
                        _this.saving = true;
                        _this.saveQueue.shift()();
                    }
                });
                if (callback)
                    callback();
            });
        });
        if (this.saving)
            return;
        this.saving = true;
        this.saveQueue.shift()();
    };
    Service.prototype.log = function (text, more) {
        if (more)
            console.log(text, more.toString());
        else
            console.log(text);
    };
    Service.prototype.error = function (text, more) {
        if (more)
            console.error(text, more.toString());
        else
            console.error(text);
    };
    Service.prototype.sendCommand = function (service, command, data, callback) {
        var _this = this;
        this.call(service, 'command', {
            command: command,
            data: data
        }, function (response, paths) {
            _this.dispose(paths);
            if (callback)
                callback(response.statusCode !== 200 ? new Error(response.statusMessage + ' (' + response.statusCode + ')') : null, response.data);
        });
    };
    Service.prototype.reference = function (_options, _callback) {
        var _this = this;
        var options = _options && _options.constructor !== Function ? _options : this.referenceInformation;
        var callback = _callback ? _callback : _options && _options.constructor === Function ? _options : undefined;
        var body = JSON.parse(JSON.stringify(options ? options : {}));
        body.name = this.options.username;
        if (!body.inputs)
            body.inputs = {};
        if (!body.inputs['command'])
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
        }, function (e, res, body) {
            if (!e) {
                _this.bindMethod('command', function (data, info) {
                    var command = _this.commands[data.command];
                    if (!command)
                        return _this.putObject(info.mainOutput, {
                            statusCode: 404,
                            statusMessage: 'Command not found'
                        }, function (e) { });
                    command(data.data, function (response) {
                        _this.dispose(info);
                        _this.putObject(info.mainOutput, {
                            statusCode: 200,
                            statusMessage: 'Ok',
                            data: response
                        }, function (e) { });
                    });
                });
            }
            var updateProcessInformation = function () {
                _this.putObject('/process/' + _this.uid + '.json', {
                    service: _this.options.username,
                    lastUpdate: Date.now(),
                    pid: process.pid
                }, function (e) {
                    if (e) {
                        setTimeout(function () { return updateProcessInformation(); }, 1000);
                        return;
                    }
                    setTimeout(function () { return updateProcessInformation(); }, 10000);
                });
            };
            updateProcessInformation();
            if (callback)
                callback(e);
        });
    };
    Service.prototype.dispose = function (info, callback) {
        var _this = this;
        var nb = 1;
        var del = function (path) {
            ++nb;
            process.nextTick(function () {
                _this.delete(path, function (e) {
                    if (e)
                        return del(path);
                    if (--nb === 0 && callback)
                        callback();
                });
            });
        };
        var ainfo = info;
        if (ainfo.path && ainfo.path.constructor === String && ainfo.outputs && ainfo.mainOutput && ainfo.mainOutput.constructor === String) {
            del(info.path);
        }
        else {
            var paths = info;
            for (var method in paths)
                for (var _i = 0, _a = paths[method]; _i < _a.length; _i++) {
                    var path = _a[_i];
                    del(path);
                }
        }
        --nb;
    };
    Service.prototype.invokeServiceAction = function (options, callback) {
        this.request({
            url: options.url ? options.url : '/',
            method: 'TRACE',
            headers: {
                'service-action': options.action,
                'etag': this.uid
            },
            body: options.body
        }, function (e, res, body) { return callback(e, res, body); });
    };
    Service.prototype.bindMethod = function (method, callbackOnInput) {
        var _this = this;
        var reengage = function () { return setTimeout(function () { return _this.bindMethod(method, callbackOnInput); }, 1000); };
        this.invokeServiceAction({
            url: '/services/' + this.options.username + '/' + method,
            action: 'check-service-input'
        }, function (e, res, body) {
            if (e)
                return reengage();
            var tis = JSON.parse(body.toString());
            tis.forEach(function (ti) { return callbackOnInput(ti.data, ti); });
            reengage();
        });
    };
    Service.prototype.watchFolder = function (path, callback) {
        var _this = this;
        var reengage = function () { return setTimeout(function () { return _this.watchFolder(path, callback); }, 1000); };
        this.invokeServiceAction({
            url: path,
            action: 'watch-folder'
        }, function (e, res, body) {
            if (e)
                return reengage();
            var tis = JSON.parse(body.toString());
            tis.forEach(function (ti) { return callback(ti); });
            reengage();
        });
    };
    Service.prototype.watchFile = function (path, callback) {
        var _this = this;
        var reengage = function () { return setTimeout(function () { return _this.watchFolder(path, callback); }, 1000); };
        this.invokeServiceAction({
            url: path,
            action: 'watch-file'
        }, function (e, res, body) {
            if (e)
                return reengage();
            callback(JSON.parse(body.toString()));
            reengage();
        });
    };
    Service.prototype.on = function (event, callback) {
        this.events[event] = callback ? callback : function (e) { throw e; };
        return this;
    };
    Service.prototype.writeToService = function (service, method, data, callback) {
        var _this = this;
        this.call('core', 'reserve-file', {
            service: service,
            method: method
        }, function (path, paths) {
            _this.dispose(paths);
            var write = function () {
                _this.putObject(path.path, data, function (e) {
                    if (e)
                        return write();
                    callback();
                });
            };
            write();
        });
    };
    Service.prototype.call = function (service, method, inputData, callback) {
        var _this = this;
        var recall = function () {
            _this.call(service, method, inputData, callback);
        };
        this.invokeServiceAction({
            url: '/services/' + service + '/' + method,
            action: 'call-service',
            body: JSON.stringify(inputData)
        }, function (e, res, body) {
            if (e || res.statusCode >= 400)
                return setTimeout(function () { return recall(); }, 1000);
            var info = JSON.parse(body.toString());
            var reengage = function () {
                _this.getObject(info.mainOutput, function (e, body) {
                    if (e || res.statusCode >= 400)
                        return setTimeout(function () { return reengage(); }, 1000);
                    callback(body, info.outputs, function () {
                        _this.dispose(info.outputs);
                    });
                });
            };
            reengage();
        });
    };
    Service.prototype.callEx = function (service, method, inputData, callback) {
        var _this = this;
        this.invokeServiceAction({
            url: '/services/' + service + '/' + method,
            action: 'call-service',
            body: JSON.stringify(inputData)
        }, function (e, res, body) {
            if (e)
                return _this.events.error(e);
            if (res.statusCode >= 400)
                return _this.events.error(new Error(res.statusCode + ' - ' + res.statusMessage));
            var info = JSON.parse(body.toString());
            var reengage = function () {
                _this.getObject(info.mainOutput, function (e, body) {
                    if (e || res.statusCode >= 400)
                        return setTimeout(function () { return reengage(); }, 1000);
                    callback(body, info.outputs, function () {
                        _this.dispose(info.outputs);
                    });
                });
            };
            reengage();
        });
    };
    return Service;
}(webdav_client_1.Connection));
exports.Service = Service;
