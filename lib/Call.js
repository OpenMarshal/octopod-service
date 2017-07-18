"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Service_1 = require("./Service");
function call(coreUrl, service, method, inputData, callback) {
    var s = new Service_1.Service('', coreUrl);
    s.call(service, method, inputData, function (res, paths) {
        callback(res, paths, function () {
            s.dispose(paths);
        });
    });
}
exports.call = call;
