"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var t = require("babel-types");
var constants_1 = require("./../constants");
var helpers_1 = require("./../helpers");
var lodash_1 = require("lodash");
var logger_1 = require("./../utils/logger");
var bluebird = require("bluebird");
var async_1 = require("./../utils/async");
var inquirer = require("inquirer");
function resolveGlobalDependencies(projectInfo) {
    return bluebird.Promise.resolve()
        .then(function () {
        var files = projectInfo.files;
        var nejPathAliases = projectInfo.nejPathAliases || {};
        return async_1.asyncForEach(files, function (file) {
            var depsToInject = [];
            var absDependencyFileList = helpers_1.getAbsDependencyFileList(file.filePath, file.dependencyFileListPath
                ? lodash_1.map(file.dependencyFileListPath.node.elements, function (e) { return e.value; })
                : [], nejPathAliases, projectInfo.projectDir);
            return bluebird.Promise.resolve()
                .then(function () {
                var depFileListCheckMap = {};
                for (var _i = 0, absDependencyFileList_1 = absDependencyFileList; _i < absDependencyFileList_1.length; _i++) {
                    var fp = absDependencyFileList_1[_i];
                    depFileListCheckMap[fp] = true;
                }
                return async_1.asyncForEach(file.symbols, function (symbol) {
                    var resolvedDepToInject;
                    return bluebird.Promise.resolve()
                        .then(function () {
                        var assignmentToItselfSymbolFileList = projectInfo.symbolMap[helpers_1.getNamespacePropertyName(lodash_1.extend(lodash_1.cloneDeep(symbol), {
                            assignmentType: constants_1.SYMBOL_ASSIGNMENT_TYPE.ASSIGNMENT_TO_ITSELF,
                        }))] || [];
                        var assignmentNotToItselfSymbolFileList = projectInfo.symbolMap[helpers_1.getNamespacePropertyName(lodash_1.extend(lodash_1.cloneDeep(symbol), {
                            assignmentType: constants_1.SYMBOL_ASSIGNMENT_TYPE.ASSIGNMENT_NOT_TO_ITSELF,
                        }))] || [];
                        var hasAssignmentToItself = false;
                        for (var _i = 0, assignmentToItselfSymbolFileList_1 = assignmentToItselfSymbolFileList; _i < assignmentToItselfSymbolFileList_1.length; _i++) {
                            var atisf = assignmentToItselfSymbolFileList_1[_i];
                            if (atisf.filePath === file.filePath) {
                                hasAssignmentToItself = true;
                                break;
                            }
                        }
                        if (symbol.assignmentType === constants_1.SYMBOL_ASSIGNMENT_TYPE.NOT_ASSIGNMENT &&
                            !hasAssignmentToItself) {
                            var symbolFileList = lodash_1.uniqBy(lodash_1.filter(assignmentToItselfSymbolFileList.concat(assignmentNotToItselfSymbolFileList), function (f) { return f.filePath !== file.filePath; }), function (f) { return f.filePath; });
                            var hasDepForSymbol = false;
                            for (var _a = 0, symbolFileList_1 = symbolFileList; _a < symbolFileList_1.length; _a++) {
                                var sf = symbolFileList_1[_a];
                                if (depFileListCheckMap[sf.filePath]) {
                                    hasDepForSymbol = true;
                                    symbol.resolvedDependencyFilename = sf.filePath;
                                    break;
                                }
                            }
                            if (!hasDepForSymbol && symbolFileList.length > 1) {
                                if (projectInfo.conflictResolutionStrategy) {
                                    var resolvedFile = projectInfo.conflictResolutionStrategy(file, symbolFileList, symbol, projectInfo);
                                    if (resolvedFile) {
                                        resolvedDepToInject = helpers_1.normalizeDepPathToInject(resolvedFile.filePath, nejPathAliases, projectInfo.projectDir);
                                        logger_1.logger.info("Resolved 1 file conflict with custom conflict " +
                                            ("resolution strategy in " + file.filePath + ". ") +
                                            ("Resolved to " + resolvedDepToInject));
                                    }
                                    else if (resolvedFile === false) {
                                        resolvedDepToInject = constants_1.CONSTANTS.NO_RESOLVE_PROMPT;
                                    }
                                }
                                if (!resolvedDepToInject) {
                                    if (projectInfo.promptConflict) {
                                        logger_1.logger.info('Prompting resolution conflict:');
                                        return inquirer
                                            .prompt([
                                            {
                                                name: 'selectedFilePath',
                                                message: "Please select a dependency for " +
                                                    (symbol.propertyName + " ") +
                                                    ("in " + file.filePath),
                                                type: 'list',
                                                choices: lodash_1.map(symbolFileList, function (f) { return f.filePath; }).concat(constants_1.CONSTANTS.NO_RESOLVE_PROMPT),
                                            },
                                        ])
                                            .then(function (answers) {
                                            logger_1.logger.info('Prompting resolution conflict over');
                                            logger_1.logger.debug("Selected file path: " + answers.selectedFilePath);
                                            if (answers.selectedFilePath !== constants_1.CONSTANTS.NO_RESOLVE_PROMPT) {
                                                resolvedDepToInject = helpers_1.normalizeDepPathToInject(answers.selectedFilePath, nejPathAliases, projectInfo.projectDir);
                                            }
                                            else {
                                                resolvedDepToInject = constants_1.CONSTANTS.NO_RESOLVE_PROMPT;
                                            }
                                        });
                                    }
                                    else {
                                        projectInfo.errors.push(new Error("Resolution Failed in " + file.filePath + ": " +
                                            ("Multiple files with the same symbol " + symbol.propertyName + " are found. ") +
                                            "Please resolve the dependency manaully. \n" +
                                            "Files: \n" +
                                            lodash_1.map(symbolFileList, function (f) { return f.filePath; }).join('\n')));
                                    }
                                }
                            }
                            else if (!hasDepForSymbol && symbolFileList.length > 0) {
                                resolvedDepToInject = helpers_1.normalizeDepPathToInject(symbolFileList[0].filePath, nejPathAliases, projectInfo.projectDir);
                            }
                        }
                        return;
                    })
                        .then(function () {
                        if (resolvedDepToInject && resolvedDepToInject !== constants_1.CONSTANTS.NO_RESOLVE_PROMPT) {
                            symbol.resolvedDependencyFilename = resolvedDepToInject;
                            depsToInject.push(resolvedDepToInject);
                        }
                    });
                });
            })
                .then(function () {
                depsToInject = lodash_1.uniq(depsToInject);
                var dependencyVarList = file.functionDefinitionPath.node.params;
                if (file.dependencyFileListPath) {
                    file.dependencyFileListPath.replaceWith(t.arrayExpression(file.dependencyFileListPath.node.elements.concat(lodash_1.map(depsToInject, function (d) { return t.stringLiteral(d); }))));
                    if (dependencyVarList.length > absDependencyFileList.length) {
                        (_a = file.functionDefinitionPath.node.params).splice.apply(_a, [absDependencyFileList.length,
                            0].concat(lodash_1.map(depsToInject, function () { return t.identifier(helpers_1.getRandomPlaceholderName()); })));
                    }
                    if (depsToInject.length) {
                        logger_1.logger.info("Resolved " + depsToInject.length + " dependencies in " + file.filePath);
                        logger_1.logger.info("Resolved dependencies: \n" + ("" + lodash_1.map(depsToInject, function (f) { return "    " + f; }).join('\n')));
                    }
                }
                else {
                    projectInfo.warningLogs.push("Can not find the dependency list in " + file.filePath + ": May be caused by not using array " + "expression or not having dependency list");
                }
                var _a;
            });
        });
    })
        .then(function () {
        return projectInfo;
    });
}
exports.resolveGlobalDependencies = resolveGlobalDependencies;
//# sourceMappingURL=resolveGlobalDependencies.js.map