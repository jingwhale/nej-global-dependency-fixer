"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var chalk = require("chalk");
var mkdirp = require("mkdirp");
var path = require("path");
var fs = require("fs");
var Chance = require("chance");
var chance = new Chance();
var Logger = (function () {
    function Logger(levels, mark) {
        if (mark === void 0) { mark = ''; }
        this.setLevels(levels);
        this.logs = '';
        this.mark = mark;
        this.markColor = chance.color({
            format: 'hex',
        });
    }
    Object.defineProperty(Logger.prototype, "levels", {
        set: function (val) {
            this.setLevels(val);
        },
        enumerable: true,
        configurable: true
    });
    Logger.prototype.info = function () {
        var messages = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            messages[_i] = arguments[_i];
        }
        this.log.apply(this, ['info', 'blue'].concat(messages));
    };
    Logger.prototype.error = function () {
        var messages = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            messages[_i] = arguments[_i];
        }
        this.log.apply(this, ['error', 'red'].concat(messages));
    };
    Logger.prototype.warning = function () {
        var messages = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            messages[_i] = arguments[_i];
        }
        this.log.apply(this, ['warning', 'yellow'].concat(messages));
    };
    Logger.prototype.debug = function () {
        var messages = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            messages[_i] = arguments[_i];
        }
        this.log.apply(this, ['debug', 'magenta'].concat(messages));
    };
    Logger.prototype.logToFile = function (p) {
        mkdirp.sync(path.dirname(p));
        fs.writeFileSync(p, this.logs, {
            encoding: 'utf-8',
        });
    };
    Logger.prototype.log = function (level, color) {
        var messages = [];
        for (var _i = 2; _i < arguments.length; _i++) {
            messages[_i - 2] = arguments[_i];
        }
        if (this.levelMap[level]) {
            messages.push('\n', '\n');
            (_a = console.log).call.apply(_a, [console,
                chalk.default.keyword(color)(level + ": "),
                chalk.default.hex(this.markColor)(this.mark)].concat(messages));
            this.logs += level + ": " + messages.join(' ');
        }
        var _a;
    };
    Logger.prototype.setLevels = function (levels) {
        this.levelMap = {};
        for (var _i = 0, levels_1 = levels; _i < levels_1.length; _i++) {
            var level = levels_1[_i];
            this.levelMap[level] = true;
        }
    };
    return Logger;
}());
exports.Logger = Logger;
exports.logger = new Logger(['error', 'debug', 'info', 'warning']);
//# sourceMappingURL=logger.js.map