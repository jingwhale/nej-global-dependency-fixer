"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var t = require("babel-types");
var index_1 = require("./index");
var lodash_1 = require("lodash");
var constants_1 = require("../constants");
var logger_1 = require("../utils/logger");
var rgaLogger = new logger_1.Logger(['debug'], 'removeGlobalAccessors');
function removeGlobalAccessors(projectInfo) {
    for (var _i = 0, _a = projectInfo.files; _i < _a.length; _i++) {
        var file = _a[_i];
        rgaLogger.debug("Processing file " + file.filePath);
        var depFileVarMap = {};
        if (file.dependencyFileListPath) {
            var depVarList = file.functionDefinitionPath.node.params;
            var depFileList = index_1.getAbsDependencyFileList(file.filePath, lodash_1.map(file.dependencyFileListPath.node.elements, function (e) {
                return e.value;
            }), projectInfo.nejPathAliases, projectInfo.projectDir);
            for (var i = 0, l = depFileList.length; i < l; i++) {
                var depFile = depFileList[i];
                if (t.isStringLiteral(depFile) && depVarList[i]) {
                    depFileVarMap[depFile.value] = depVarList[i];
                }
            }
            var _loop_1 = function (symbol) {
                if (symbol.assignmentType === constants_1.SYMBOL_ASSIGNMENT_TYPE.NOT_ASSIGNMENT) {
                    rgaLogger.debug("Processing symbol " + symbol.propertyName);
                    if (!symbol.path) {
                        projectInfo.errors.push(new Error("The symbol " + symbol.propertyName + " in file " + file.filePath + " " +
                            "does not have a node path"));
                        return "continue";
                    }
                    if (!symbol.resolvedDependencyFilename) {
                        projectInfo.errors.push(new Error("The symbol " + symbol.propertyName + " in file " + file.filePath + " " +
                            "does not have a resolved dependency filename"));
                        return "continue";
                    }
                    var fileObj = projectInfo.filePathMap[symbol.resolvedDependencyFilename];
                    if (!fileObj) {
                        projectInfo.errors.push(new Error("The filename " + symbol.resolvedDependencyFilename + " does not " + "match any known file"));
                        return "continue";
                    }
                    if (!fileObj.export) {
                        projectInfo.errors.push(new Error("The file " + fileObj.filePath + " does not have " + "any global accessor exports resolved"));
                        return "continue";
                    }
                    if (!lodash_1.find(fileObj.export.exportedMembers, function (m) { return m.identifier.name === symbol.propertyName; })) {
                        projectInfo.errors.push(new Error("The symbol " + symbol.propertyName + " in file " + file.filePath + " " +
                            ("is not in exported members of the file " + fileObj.filePath)));
                        return "continue";
                    }
                    var memExpPath = symbol.path.parentPath;
                    if (!index_1.isMemberExpressionPath(memExpPath)) {
                        projectInfo.errors.push(new Error("The symbol " + symbol.propertyName + " in file " + file.filePath + " " +
                            "is not in a valid member expression"));
                        return "continue";
                    }
                    if (!depFileVarMap[fileObj.filePath]) {
                        projectInfo.errors.push(new Error("The file " + fileObj.filePath + " is not included " + "in the dependency file list"));
                        return "continue";
                    }
                    var objectPath = memExpPath.get('object');
                    objectPath.replaceWith(t.identifier(depFileVarMap[fileObj.filePath].name));
                    rgaLogger.debug("Replaced the symbol with the dep var and got " + memExpPath.node);
                }
            };
            for (var _b = 0, _c = file.symbols; _b < _c.length; _b++) {
                var symbol = _c[_b];
                _loop_1(symbol);
            }
            lodash_1.forOwn(file.namespaceBindingMap, function (bindingInfo) {
                for (var _i = 0, _a = bindingInfo.bindings; _i < _a.length; _i++) {
                    var binding = _a[_i];
                    if (!binding.referencePaths.length) {
                        rgaLogger.debug("Removing " + binding.path.node);
                        binding.path.remove();
                    }
                }
            });
        }
    }
}
exports.removeGlobalAccessors = removeGlobalAccessors;
//# sourceMappingURL=removeGlobalAccessors.js.map