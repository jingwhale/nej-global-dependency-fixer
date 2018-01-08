"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var glob = require("glob");
var path = require("path");
var fs = require("fs");
var babylon = require("babylon");
var constants_1 = require("./../constants");
var helpers_1 = require("./../helpers");
var lodash_1 = require("lodash");
var logger_1 = require("./../utils/logger");
var logger = new logger_1.Logger(['error', 'debug', 'info', 'warning']);
function getProjectInfo(options) {
    var symbolMap = {};
    var filePathMap = {};
    var files = [];
    var errors = [];
    var warningLogs = [];
    var searchPattern = path.resolve(options.projectDir, "**/**/*" + constants_1.CONSTANTS.FILE_EXT);
    logger.debug("Searching for files in " + searchPattern + " ...");
    var filePathList = lodash_1.map(glob.sync(searchPattern, {
        ignore: options.exclude,
        absolute: true,
    }), function (f) {
        return '/' + helpers_1.normalizeSlashes(f);
    });
    logger.debug("Found " + filePathList.length + " files.");
    for (var _i = 0, filePathList_1 = filePathList; _i < filePathList_1.length; _i++) {
        var filePath = filePathList_1[_i];
        var fileContent = void 0;
        try {
            fileContent = fs
                .readFileSync(filePath, {
                encoding: 'utf-8',
            })
                .toString();
        }
        catch (error) {
            errors.push(new Error(error.message + (" " + filePath)));
            logger.debug(error.message);
            logger.debug("Error happened when reading file " + filePath + ".");
        }
        if (!fileContent || !new RegExp(constants_1.CONSTANTS.NEJ_GLOBAL_ACCESSOR).test(fileContent)) {
            continue;
        }
        logger.debug("Parsing file " + filePath + " ...");
        var ast = babylon.parse(fileContent);
        var functionDefinitionPath = helpers_1.getNejFunctionDefinitionPath(ast);
        var scopes = helpers_1.getAllNonBlockScopes(ast);
        if (functionDefinitionPath && scopes.length) {
            var namespaceBindingMap = helpers_1.getNamespaceBindingMap(scopes, helpers_1.getGlobalAccessorCallPaths(scopes, helpers_1.getGlobalAccessorMemberExpPaths(ast)));
            var fileObj = {
                symbols: helpers_1.getSymbolsFromNamespaceBindingMap(namespaceBindingMap, options.removeNejP),
                filePath: filePath,
                dependencyFileListPath: helpers_1.getNejDependencyFileListPath(ast),
                functionDefinitionPath: functionDefinitionPath,
                namespaceBindingMap: namespaceBindingMap,
                ast: ast,
            };
            logger.debug("Parsed " + filePath + " and found symbols: ", JSON.stringify(fileObj.symbols.map(function (s) { return helpers_1.getNamespacePropertyName(s); }), null, '  '));
            files.push(fileObj);
            filePathMap[filePath] = fileObj;
            for (var _a = 0, _b = fileObj.symbols; _a < _b.length; _a++) {
                var symbol = _b[_a];
                var name_1 = helpers_1.getNamespacePropertyName(symbol);
                var sfarr = symbolMap[name_1];
                if (!sfarr) {
                    sfarr = symbolMap[name_1] = [];
                }
                sfarr.push(fileObj);
            }
        }
        else {
            errors.push(new Error("Invalid code in " + filePath + ": Please use a valid NEJ module."));
        }
    }
    return {
        filePathMap: filePathMap,
        files: files,
        symbolMap: symbolMap,
        projectDir: helpers_1.normalizeSlashes(options.projectDir),
        errors: [],
        nejPathAliases: options.nejPathAliases,
        warningLogs: warningLogs,
        conflictResolutionStrategy: options.conflictResolutionStrategy,
        promptConflict: options.promptConflict,
    };
}
exports.getProjectInfo = getProjectInfo;
//# sourceMappingURL=getProjectInfo.js.map