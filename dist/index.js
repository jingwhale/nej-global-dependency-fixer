"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var path = require("path");
var fs = require("fs");
var generator = require("babel-generator");
var mkdirp = require("mkdirp");
var helpers_1 = require("./helpers");
var logger_1 = require("./utils/logger");
var resolveGlobalDependencies_1 = require("./helpers/resolveGlobalDependencies");
var getProjectInfo_1 = require("./helpers/getProjectInfo");
function run(options) {
    if (options.logLevels) {
        logger_1.logger.levels = options.logLevels;
    }
    return resolveGlobalDependencies_1.resolveGlobalDependencies(getProjectInfo_1.getProjectInfo(options)).then(function (pi) {
        var projectInfo = pi;
        for (var _i = 0, _a = projectInfo.files; _i < _a.length; _i++) {
            var file = _a[_i];
            if (!options.noWrite || !options.noWrite.test(file.filePath)) {
                var code = generator.default(file.ast, {
                    comments: true,
                    minified: false,
                });
                var outDir = options.outDir || options.projectDir;
                var filePath = path.resolve(outDir, file.filePath.replace(helpers_1.normalizeSlashes(projectInfo.projectDir) + '/', ''));
                mkdirp.sync(path.dirname(filePath));
                fs.writeFileSync(filePath, code.code, {
                    encoding: 'utf-8',
                });
            }
        }
        for (var _b = 0, _c = projectInfo.errors; _b < _c.length; _b++) {
            var error = _c[_b];
            logger_1.logger.error(error.message);
        }
        for (var _d = 0, _e = projectInfo.warningLogs; _d < _e.length; _d++) {
            var warning = _e[_d];
            logger_1.logger.warning(warning);
        }
        if (options.logFilename) {
            logger_1.logger.logToFile(options.logFilename);
        }
    });
}
exports.run = run;
//# sourceMappingURL=index.js.map