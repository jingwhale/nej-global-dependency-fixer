"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var bluebird = require("bluebird");
function asyncForEach(arr, fn) {
    var p = bluebird.Promise.resolve();
    for (var i = 0, l = arr.length; i < l; i++) {
        p = p.then((function (index) {
            return function () {
                return fn(arr[index], index);
            };
        })(i));
    }
    return p.catch(function (err) { return err; });
}
exports.asyncForEach = asyncForEach;
//# sourceMappingURL=async.js.map