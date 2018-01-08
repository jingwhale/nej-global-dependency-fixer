"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var t = require("babel-types");
var pathLib = require("path");
var constants_1 = require("./../constants");
var lodash_1 = require("lodash");
var babel_traverse_1 = require("babel-traverse");
var globalAccessor = constants_1.CONSTANTS.NEJ_GLOBAL_ACCESSOR.split('.');
function isNejGlobalAccessorMemberExp(memberExp) {
    return (t.isMemberExpression(memberExp) &&
        t.isIdentifier(memberExp.object) &&
        t.isIdentifier(memberExp.property) &&
        memberExp.object.name === globalAccessor[0] &&
        memberExp.property.name === globalAccessor[1]);
}
exports.isNejGlobalAccessorMemberExp = isNejGlobalAccessorMemberExp;
function isNejCopyMemberExp(memberExp) {
    return (t.isMemberExpression(memberExp) &&
        t.isIdentifier(memberExp.object) &&
        t.isIdentifier(memberExp.property) &&
        memberExp.object.name === globalAccessor[0] &&
        memberExp.property.name === 'copy');
}
exports.isNejCopyMemberExp = isNejCopyMemberExp;
function getGlobalAccessorMemberExpPaths(ast) {
    var ret = [];
    babel_traverse_1.default(ast, {
        MemberExpression: function (path) {
            if (isNejGlobalAccessorMemberExp(path.node)) {
                ret.push(path);
            }
        },
    });
    return ret;
}
exports.getGlobalAccessorMemberExpPaths = getGlobalAccessorMemberExpPaths;
function isAssignmentExpOrVariableDeclarator(node) {
    return t.isAssignmentExpression(node) || t.isVariableDeclarator(node);
}
exports.isAssignmentExpOrVariableDeclarator = isAssignmentExpOrVariableDeclarator;
function isPathInCallExpressionAsCallee(path) {
    return t.isCallExpression(path.parent) && path.parent.callee === path.node;
}
exports.isPathInCallExpressionAsCallee = isPathInCallExpressionAsCallee;
function isCallExpressionPath(path) {
    return t.isCallExpression(path.node);
}
exports.isCallExpressionPath = isCallExpressionPath;
function isMemberExpressionPath(path) {
    return t.isMemberExpression(path.node);
}
exports.isMemberExpressionPath = isMemberExpressionPath;
function getIdentifierFromAssignmentExpressionOrVariableDeclarator(node) {
    return (node.id || node.left);
}
exports.getIdentifierFromAssignmentExpressionOrVariableDeclarator = getIdentifierFromAssignmentExpressionOrVariableDeclarator;
function getAllRefToGlobalAccessorBindings(scopes, globalAccessorNonCallPaths) {
    var ret = [];
    for (var _i = 0, scopes_1 = scopes; _i < scopes_1.length; _i++) {
        var scope = scopes_1[_i];
        for (var _a = 0, globalAccessorNonCallPaths_1 = globalAccessorNonCallPaths; _a < globalAccessorNonCallPaths_1.length; _a++) {
            var path = globalAccessorNonCallPaths_1[_a];
            var node = path.node;
            if (isAssignmentExpOrVariableDeclarator(node)) {
                var id = getIdentifierFromAssignmentExpressionOrVariableDeclarator(node);
                var b = scope.getBinding(id.name);
                if (b) {
                    ret.push(b);
                }
            }
        }
        for (var _b = 0, ret_1 = ret; _b < ret_1.length; _b++) {
            var refBinding = ret_1[_b];
            ret = lodash_1.uniq(ret.concat(getAllRefToGlobalAccessorBindings(scopes, refBinding.referencePaths)));
        }
    }
    return ret;
}
exports.getAllRefToGlobalAccessorBindings = getAllRefToGlobalAccessorBindings;
function getAllNonBlockScopes(ast) {
    var ret = [];
    babel_traverse_1.default(ast, {
        Scope: function (path) {
            if (!t.isBlockStatement(path.node)) {
                ret.push(path.scope);
            }
        },
    });
    return ret;
}
exports.getAllNonBlockScopes = getAllNonBlockScopes;
function getGlobalAccessorCallPaths(scopes, globalAccessorMemberExpPaths) {
    var ret = [];
    var nonCallPaths = [];
    for (var _i = 0, globalAccessorMemberExpPaths_1 = globalAccessorMemberExpPaths; _i < globalAccessorMemberExpPaths_1.length; _i++) {
        var path = globalAccessorMemberExpPaths_1[_i];
        if (isPathInCallExpressionAsCallee(path) && isCallExpressionPath(path.parentPath)) {
            ret.push(path.parentPath);
        }
        else {
            nonCallPaths.push(path.parentPath);
        }
    }
    var refBindings = getAllRefToGlobalAccessorBindings(scopes, nonCallPaths);
    for (var _a = 0, refBindings_1 = refBindings; _a < refBindings_1.length; _a++) {
        var refBinding = refBindings_1[_a];
        for (var _b = 0, _c = refBinding.referencePaths; _b < _c.length; _b++) {
            var refPath = _c[_b];
            if (isPathInCallExpressionAsCallee(refPath)) {
                ret.push(refPath.parentPath);
            }
        }
    }
    return lodash_1.uniq(ret);
}
exports.getGlobalAccessorCallPaths = getGlobalAccessorCallPaths;
function recursivelyResolveBindings(scope, info, binding) {
    if (binding) {
        var refPaths = binding.referencePaths;
        for (var _i = 0, refPaths_1 = refPaths; _i < refPaths_1.length; _i++) {
            var rp = refPaths_1[_i];
            if (isAssignmentExpOrVariableDeclarator(rp.parent)) {
                var id = getIdentifierFromAssignmentExpressionOrVariableDeclarator(rp.parent);
                var idBinding = scope.getBinding(id.name);
                if (idBinding) {
                    info.bindings.push(idBinding);
                    recursivelyResolveBindings(scope, info, idBinding);
                }
            }
        }
    }
    else {
        var bindings = info.bindings;
        for (var _a = 0, bindings_1 = bindings; _a < bindings_1.length; _a++) {
            binding = bindings_1[_a];
            recursivelyResolveBindings(scope, info, binding);
        }
    }
}
exports.recursivelyResolveBindings = recursivelyResolveBindings;
function getNamespaceBindingMap(scopes, globalAccessorCallPaths) {
    var ret = {};
    var _loop_1 = function (scope) {
        for (var _i = 0, globalAccessorCallPaths_1 = globalAccessorCallPaths; _i < globalAccessorCallPaths_1.length; _i++) {
            var callPath = globalAccessorCallPaths_1[_i];
            var ns = '';
            if (callPath.node.arguments.length) {
                var nsNode = callPath.node.arguments[0];
                if (t.isStringLiteral(nsNode)) {
                    ns = nsNode.value;
                }
            }
            if (ns) {
                ret[ns] = ret[ns] || {
                    bindings: [],
                    globalAccessorCallPaths: [],
                };
                ret[ns].globalAccessorCallPaths.push(callPath);
                var idBindings = [];
                if (isAssignmentExpOrVariableDeclarator(callPath.parent)) {
                    var id = getIdentifierFromAssignmentExpressionOrVariableDeclarator(callPath.parent);
                    var idBinding = scope.getBinding(id.name);
                    if (idBinding) {
                        idBindings.push(idBinding);
                    }
                }
                else if (isNejGlobalAccessorMemberExp(callPath.node.callee) &&
                    t.isCallExpression(callPath.parent) &&
                    isNejCopyMemberExp(callPath.parent.callee) &&
                    callPath.listKey === 'arguments') {
                    var argPos = parseInt(callPath.key, 10) || 0;
                    for (var i = argPos + 1, l = callPath.parent.arguments.length; i < l; i++) {
                        var id = callPath.parent.arguments[i];
                        if (t.isIdentifier(id)) {
                            var idBinding = scope.getBinding(id.name);
                            if (idBinding) {
                                idBindings.push(idBinding);
                            }
                        }
                    }
                }
                if (idBindings.length) {
                    ret[ns].bindings = ret[ns].bindings.concat(idBindings);
                }
                ret[ns].bindings = lodash_1.uniq(ret[ns].bindings);
                ret[ns].globalAccessorCallPaths = lodash_1.uniq(ret[ns].globalAccessorCallPaths);
            }
        }
        lodash_1.forOwn(ret, function (info) {
            recursivelyResolveBindings(scope, info);
        });
    };
    for (var _i = 0, scopes_2 = scopes; _i < scopes_2.length; _i++) {
        var scope = scopes_2[_i];
        _loop_1(scope);
    }
    return ret;
}
exports.getNamespaceBindingMap = getNamespaceBindingMap;
function getSymbolAssignmentType(path) {
    var topMemExp = path.parent;
    var par = path.findParent(function (p) {
        if (t.isMemberExpression(p.node) && p.node.object === topMemExp) {
            topMemExp = p.node;
        }
        return !t.isMemberExpression(p.node);
    });
    if (par) {
        if (t.isAssignmentExpression(par.node) && par.node.left === path.parent) {
            return constants_1.SYMBOL_ASSIGNMENT_TYPE.ASSIGNMENT_TO_ITSELF;
        }
        else if (t.isAssignmentExpression(par.node) && par.node.left === topMemExp && path.parent !== topMemExp) {
            return constants_1.SYMBOL_ASSIGNMENT_TYPE.ASSIGNMENT_NOT_TO_ITSELF;
        }
    }
    return constants_1.SYMBOL_ASSIGNMENT_TYPE.NOT_ASSIGNMENT;
}
exports.getSymbolAssignmentType = getSymbolAssignmentType;
function isReturnSymbol(path) {
    return t.isReturnStatement(path.findParent(function (p) { return !t.isMemberExpression(p.node); }));
}
exports.isReturnSymbol = isReturnSymbol;
function getSymbolsFromNamespaceBindingMap(namespaceBindingMap, addPath) {
    if (addPath === void 0) { addPath = false; }
    var symbols = [];
    lodash_1.forOwn(namespaceBindingMap, function (val, nejNamespace) {
        for (var _i = 0, _a = val.bindings; _i < _a.length; _i++) {
            var binding = _a[_i];
            var refPaths = binding.referencePaths;
            for (var _b = 0, refPaths_2 = refPaths; _b < refPaths_2.length; _b++) {
                var refPath = refPaths_2[_b];
                if (t.isMemberExpression(refPath.parent)) {
                    var property = refPath.parent.property;
                    var propertyName = void 0;
                    if (t.isIdentifier(property)) {
                        propertyName = property.name;
                    }
                    else if (t.isStringLiteral(property)) {
                        propertyName = property.value;
                    }
                    if (propertyName && !isReturnSymbol(refPath)) {
                        symbols.push({
                            assignmentType: getSymbolAssignmentType(refPath),
                            nejNamespace: nejNamespace,
                            propertyName: propertyName,
                            path: addPath ? refPath.parentPath.get('property') : undefined,
                        });
                    }
                }
            }
        }
        for (var _c = 0, _d = val.globalAccessorCallPaths; _c < _d.length; _c++) {
            var callPath = _d[_c];
            if (t.isMemberExpression(callPath.parent) && t.isIdentifier(callPath.parent.property)) {
                var propertyName = callPath.parent.property.name;
                if (propertyName && !isReturnSymbol(callPath)) {
                    symbols.push({
                        assignmentType: getSymbolAssignmentType(callPath),
                        nejNamespace: nejNamespace,
                        propertyName: propertyName,
                        path: addPath ? callPath.parentPath.get('property') : undefined,
                    });
                }
            }
        }
    });
    return lodash_1.uniqBy(symbols, function (s) { return getNamespacePropertyName(s); });
}
exports.getSymbolsFromNamespaceBindingMap = getSymbolsFromNamespaceBindingMap;
function isNejDefine(path) {
    return ((t.isMemberExpression(path.node.callee) &&
        t.isIdentifier(path.node.callee.object) &&
        path.node.callee.object.name === 'NEJ' &&
        t.isIdentifier(path.node.callee.property) &&
        path.node.callee.property.name === 'define') ||
        (t.isIdentifier(path.node.callee) && path.node.callee.name === 'define'));
}
exports.isNejDefine = isNejDefine;
function getNejDependencyFileListPath(ast) {
    var ret;
    babel_traverse_1.default(ast, {
        CallExpression: function (path) {
            if (isNejDefine(path)) {
                for (var i = 0, l = path.node.arguments.length, arg = void 0; i < l; i++) {
                    arg = path.node.arguments[i];
                    if (t.isArrayExpression(arg)) {
                        ret = path.get("arguments." + i);
                    }
                }
                path.stop();
            }
        },
    });
    return ret;
}
exports.getNejDependencyFileListPath = getNejDependencyFileListPath;
function isFunction(node) {
    return t.isFunctionExpression(node) || t.isArrowFunctionExpression(node);
}
exports.isFunction = isFunction;
function getNejFunctionDefinitionPath(ast) {
    var functionDefinition;
    var functionDefinitionVar;
    babel_traverse_1.default(ast, {
        CallExpression: function (path) {
            if (isNejDefine(path)) {
                for (var i = 0, l = path.node.arguments.length; i < l; i++) {
                    var arg = path.node.arguments[i];
                    if (isFunction(arg)) {
                        functionDefinition = path.get("arguments." + i);
                    }
                    else if (t.isIdentifier(arg)) {
                        functionDefinitionVar = arg;
                    }
                }
                if (!functionDefinition && functionDefinitionVar) {
                    var functionDefinitionVarBinding = path.scope.getBinding(functionDefinitionVar.name);
                    if (functionDefinitionVarBinding) {
                        if (isFunction(functionDefinitionVarBinding.path.parent) &&
                            t.isCallExpression(functionDefinitionVarBinding.path.parentPath.parent)) {
                            var argPos = lodash_1.findIndex(functionDefinitionVarBinding.path.parent.params, function (p) {
                                return !!(t.isIdentifier(p) &&
                                    functionDefinitionVar &&
                                    p.name === functionDefinitionVar.name);
                            });
                            var arg = functionDefinitionVarBinding.path.parentPath.parent.arguments[argPos];
                            if (isFunction(arg)) {
                                functionDefinition = functionDefinitionVarBinding.path.parentPath.parentPath.get("arguments." + argPos);
                            }
                        }
                        else if (t.isVariableDeclarator(functionDefinitionVarBinding.path.node) &&
                            isFunction(functionDefinitionVarBinding.path.node.init)) {
                            functionDefinition = functionDefinitionVarBinding.path.get('init');
                        }
                        else if (isFunction(functionDefinitionVarBinding.path.node)) {
                            functionDefinition = functionDefinitionVarBinding.path;
                        }
                    }
                }
                path.stop();
            }
        },
    });
    return functionDefinition;
}
exports.getNejFunctionDefinitionPath = getNejFunctionDefinitionPath;
function getNejDependencyVarNameList(functionDefinition) {
    return lodash_1.map(functionDefinition.params, function (p) { return p.name; });
}
exports.getNejDependencyVarNameList = getNejDependencyVarNameList;
function getNamespacePropertyName(symbol) {
    return symbol.nejNamespace + "/" + symbol.propertyName + "/" + symbol.assignmentType;
}
exports.getNamespacePropertyName = getNamespacePropertyName;
function parseNamespacePropertyName(name) {
    var split = name.split(constants_1.CONSTANTS.NAMESPACE_PROPERTY_NAME_SEP);
    return {
        nejNamespace: split[0],
        propertyName: split[1],
        assignmentType: split[2],
    };
}
exports.parseNamespacePropertyName = parseNamespacePropertyName;
function replaceWithNejPathAliases(path, nejPathAliases, toNejAlias) {
    if (toNejAlias === void 0) { toNejAlias = false; }
    lodash_1.forOwn(nejPathAliases, function (val, key) {
        if (!toNejAlias) {
            var re = new RegExp("{" + key + "}|^" + key);
            path = path.replace(re, "" + val);
        }
        else {
            var re = new RegExp("(/|^)" + val);
            path = path.replace(re, "$1{" + key + "}");
        }
    });
    return path;
}
exports.replaceWithNejPathAliases = replaceWithNejPathAliases;
function addExt(path) {
    return path.indexOf(constants_1.CONSTANTS.FILE_EXT) >= 0 ? path : "" + path + constants_1.CONSTANTS.FILE_EXT;
}
exports.addExt = addExt;
function getAbsDependencyFileList(filePath, dependencyFileList, nejPathAliases, projectDir) {
    return lodash_1.map(dependencyFileList, function (e) {
        var val = replaceWithNejPathAliases(e, nejPathAliases);
        if (!/^\./.test(val)) {
            val = pathLib.resolve(projectDir, "./", val);
        }
        else {
            val = pathLib.resolve(pathLib.dirname(filePath), val);
        }
        return addExt(normalizeSlashes(val));
    });
}
exports.getAbsDependencyFileList = getAbsDependencyFileList;
function normalizeSlashes(str) {
    return str.replace(/[/\\]+/g, '/').replace(/^\/|\/$/, '');
}
exports.normalizeSlashes = normalizeSlashes;
function normalizeDepPathToInject(path, nejPathAliases, projectDir) {
    return normalizeSlashes(addExt(replaceWithNejPathAliases(normalizeSlashes(path), nejPathAliases, true)).replace(projectDir, ''));
}
exports.normalizeDepPathToInject = normalizeDepPathToInject;
function getRandomNumber() {
    return Date.now() + Math.floor(Math.random() * 10000000);
}
exports.getRandomNumber = getRandomNumber;
function getRandomPlaceholderName() {
    return "" + constants_1.CONSTANTS.PLACEHOLDER + getRandomNumber();
}
exports.getRandomPlaceholderName = getRandomPlaceholderName;
function getRandomExportVarName() {
    return "exports_" + getRandomNumber();
}
exports.getRandomExportVarName = getRandomExportVarName;
function getDepVarNameFromDepFilename(filename) {
    filename = normalizeSlashes(filename);
    var filenameSp = filename.split('/');
    return filenameSp[filenameSp.length - 1].replace(/\./g, '_') + "_" + getRandomNumber();
}
exports.getDepVarNameFromDepFilename = getDepVarNameFromDepFilename;
function isPathInScope(path, scope) {
    if (path.scope === scope) {
        return true;
    }
    else {
        var parScope = scope.parent;
        while (parScope && t.isBlockStatement(parScope.block)) {
            parScope = parScope.parent;
        }
        if (parScope && parScope === scope) {
            return true;
        }
    }
    return false;
}
exports.isPathInScope = isPathInScope;
function getReturnStatementPathsInScope(ast, scope) {
    var ret = [];
    babel_traverse_1.default(ast, {
        ReturnStatement: function (path) {
            if (isPathInScope(path, scope)) {
                ret.push(path);
            }
        },
    });
    return ret;
}
exports.getReturnStatementPathsInScope = getReturnStatementPathsInScope;
function getIdentifierFromMemberExpressionProperty(node) {
    var ret;
    if (t.isIdentifier(node)) {
        ret = node;
    }
    else if (t.isStringLiteral(node)) {
        ret = t.identifier(node.value);
    }
    return ret;
}
exports.getIdentifierFromMemberExpressionProperty = getIdentifierFromMemberExpressionProperty;
//# sourceMappingURL=index.js.map