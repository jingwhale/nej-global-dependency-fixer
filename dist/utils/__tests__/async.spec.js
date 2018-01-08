"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var async_1 = require("./../async");
var chai_1 = require("chai");
var bluebird = require("bluebird");
describe('Utils async', function () {
    describe('asyncForEach', function () {
        it('should loop in order', function () {
            var arr = [1, 2, 3];
            var res = [];
            return async_1.asyncForEach(arr, function (val) {
                return new bluebird.Promise(function (resolve) {
                    setTimeout(function () {
                        res.push(val);
                        resolve();
                    }, 1000);
                });
            }).then(function () {
                chai_1.expect(res).to.deep.eq([1, 2, 3]);
            });
        });
    });
});
//# sourceMappingURL=async.spec.js.map