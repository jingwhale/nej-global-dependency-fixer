"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var t = require("babel-types");
var index_1 = require("./index");
var lodash_1 = require("lodash");
var constants_1 = require("../constants");
var logger_1 = require("../utils/logger");
var cgaLogger = new logger_1.Logger(['debug'], 'collectGlobalAccessorExports');
function collectGlobalAccessorExports(projectInfo) {
    var _loop_1 = function (file) {
        if (file.dependencyFileListPath) {
            cgaLogger.debug("Processing file " + file.filePath);
            var depList = file.dependencyFileListPath.node.elements;
            cgaLogger.debug("The dependency list of the file is", lodash_1.map(depList, function (dep) { return dep.value; }));
            var depVarList = file.functionDefinitionPath.node.params;
            cgaLogger.debug("The dependency var list of the file is", lodash_1.map(depVarList, function (depVar) { return depVar.name; }));
            var depVarListLength = depVarList.length;
            var depListLength = depList.length;
            var hasDirectExportAlready = false;
            var hasExportVar = false;
            if (depListLength > depVarListLength) {
                var insertedParams = [];
                for (var i = depVarListLength, l = depListLength; i < l; i++) {
                    var depFile = depList[i];
                    if (t.isStringLiteral(depFile)) {
                        insertedParams.push(t.identifier(index_1.getDepVarNameFromDepFilename(index_1.replaceWithNejPathAliases(depFile.value, projectInfo.nejPathAliases || {}, false))));
                    }
                    else {
                        insertedParams.push(t.identifier(index_1.getRandomPlaceholderName()));
                    }
                }
                depVarList.splice.apply(depVarList, [depVarListLength, 0].concat(insertedParams));
            }
            else if (depListLength < depVarListLength) {
                hasDirectExportAlready = true;
                hasExportVar = true;
            }
            cgaLogger.debug("After adding missing dependency vars, now is", lodash_1.map(depVarList, function (depVar) { return depVar.name; }));
            var retStatements = index_1.getReturnStatementPathsInScope(file.ast, file.functionDefinitionPath.scope);
            cgaLogger.debug("The return statements of the file is", retStatements);
            var exportedNamespaces_1 = [];
            if (retStatements.length) {
                hasDirectExportAlready = true;
                if (retStatements.length > 1) {
                    projectInfo.errors.push(new Error("The file " + file.filePath + " has more than" +
                        "1 top-level return statement: Failed to collect export info of the file."));
                    return "continue";
                }
                else {
                    var isReturnArgGlobalAccessorBindings_1 = false;
                    var returnArg_1 = retStatements[0].node.argument;
                    if (t.isIdentifier(returnArg_1)) {
                        lodash_1.forOwn(file.namespaceBindingMap, function (info, ns) {
                            for (var _i = 0, _a = info.bindings; _i < _a.length; _i++) {
                                var binding = _a[_i];
                                if (t.isIdentifier(binding.path.node) && binding.path.node.name === returnArg_1.name) {
                                    isReturnArgGlobalAccessorBindings_1 = true;
                                    exportedNamespaces_1.push(ns);
                                    break;
                                }
                            }
                        });
                    }
                    else if (t.isCallExpression(returnArg_1) && index_1.isNejGlobalAccessorMemberExp(returnArg_1.callee)) {
                        isReturnArgGlobalAccessorBindings_1 = true;
                        var firstArg = returnArg_1.arguments[0];
                        if (t.isStringLiteral(firstArg) && firstArg.value) {
                            exportedNamespaces_1.push(firstArg.value);
                        }
                    }
                    if (!isReturnArgGlobalAccessorBindings_1) {
                        projectInfo.errors.push(new Error("The file " + file.filePath + " does not return the same object" +
                            "as used in the global acessor exports: Failed to collect export info of the file."));
                        return "continue";
                    }
                }
            }
            var shouldHaveExport = true;
            var assignmentSymbols = lodash_1.filter(file.symbols, function (symbol) { return symbol.assignmentType !== constants_1.SYMBOL_ASSIGNMENT_TYPE.NOT_ASSIGNMENT; });
            if (!hasDirectExportAlready && !assignmentSymbols.length) {
                shouldHaveExport = false;
            }
            cgaLogger.debug("The return statements of the file is", retStatements);
            cgaLogger.debug("The file " + (hasDirectExportAlready ? 'has' : 'does not have') + " direct exports");
            cgaLogger.debug("The file should " + (shouldHaveExport ? '' : 'not ') + "have exports");
            var exportedMembers = [];
            var exportVarIdentifier = t.identifier(index_1.getRandomExportVarName());
            if (!hasDirectExportAlready && shouldHaveExport) {
                depVarList.push(exportVarIdentifier);
            }
            else if (hasExportVar) {
                exportVarIdentifier = depVarList[depListLength];
            }
            cgaLogger.debug("The export var of the file is " + exportVarIdentifier.name);
            for (var _i = 0, assignmentSymbols_1 = assignmentSymbols; _i < assignmentSymbols_1.length; _i++) {
                var symbol = assignmentSymbols_1[_i];
                cgaLogger.debug("Processing the assignment symbol " + symbol.propertyName + " of file " + file.filePath);
                var symbolPath = symbol.path;
                if (symbolPath) {
                    cgaLogger.debug("Got the symbol path");
                    var memExpPath = symbolPath.parentPath;
                    if (index_1.isMemberExpressionPath(memExpPath)) {
                        cgaLogger.debug("Got the parent path of the symbol path");
                        var objectPath = memExpPath.get('object');
                        objectPath.replaceWith(t.identifier(exportVarIdentifier.name));
                        cgaLogger.debug("Replace the symbol with export var and got", memExpPath.node);
                        var propIdentifier = index_1.getIdentifierFromMemberExpressionProperty(memExpPath.node.property);
                        if (propIdentifier) {
                            exportedMembers.push({
                                identifier: propIdentifier,
                                namespace: symbol.nejNamespace,
                            });
                            exportedNamespaces_1.push(symbol.nejNamespace);
                        }
                        else {
                            projectInfo.errors.push(new Error("The symbol " + symbol.propertyName + " in file " + file.filePath + " " +
                                "can not be recognized statically and collected as exported members"));
                        }
                    }
                    else {
                        projectInfo.errors.push(new Error("The symbol " + symbol.propertyName + " in file " + file.filePath + " " +
                            "is invalid: it is not in a member expression"));
                    }
                }
                else {
                    projectInfo.errors.push(new Error("The symbol " + symbol.propertyName + " should have a path."));
                }
            }
            var exportVarBinding = file.functionDefinitionPath.scope.getBinding(exportVarIdentifier.name);
            if (exportVarBinding) {
                for (var _a = 0, _b = exportVarBinding.referencePaths; _a < _b.length; _a++) {
                    var refPath = _b[_a];
                    if (t.isMemberExpression(refPath.parent)) {
                        var propIdentifier = index_1.getIdentifierFromMemberExpressionProperty(refPath.parent.property);
                        if (propIdentifier) {
                            exportedMembers.push({
                                identifier: propIdentifier,
                            });
                        }
                        else {
                            projectInfo.errors.push(new Error("The property " + refPath.parent.property + " in file " + file.filePath + " " +
                                "can not be recognized statically and collected as exported members"));
                        }
                    }
                }
            }
            exportedMembers = lodash_1.uniqBy(exportedMembers, function (e) { return e.identifier.name + (e.namespace || ''); });
            file.export = {
                exportedMembers: exportedMembers,
                exportedNamespaces: lodash_1.uniq(exportedNamespaces_1),
            };
        }
    };
    for (var _i = 0, _a = projectInfo.files; _i < _a.length; _i++) {
        var file = _a[_i];
        _loop_1(file);
    }
}
exports.collectGlobalAccessorExports = collectGlobalAccessorExports;
//# sourceMappingURL=collectGlobalAccessorExports.js.map