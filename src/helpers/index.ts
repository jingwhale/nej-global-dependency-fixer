import * as t from 'babel-types';
import * as pathLib from 'path';
import { CONSTANTS, SYMBOL_ASSIGNMENT_TYPE } from './../constants';
import { uniq, forOwn, map, findIndex, uniqBy } from 'lodash';
import traverse, { NodePath, Binding, Scope } from 'babel-traverse';
import {
    INamespaceBindingMap,
    ISymbol,
    FunctionDefinition,
    INejPathAliasesMap,
    INamespaceBindingInfo,
} from './../types';

const globalAccessor = CONSTANTS.NEJ_GLOBAL_ACCESSOR.split('.');

export function isNejGlobalAccessorMemberExp(memberExp: t.Node): memberExp is t.MemberExpression {
    return (
        t.isMemberExpression(memberExp) &&
        t.isIdentifier(memberExp.object) &&
        t.isIdentifier(memberExp.property) &&
        memberExp.object.name === globalAccessor[0] &&
        memberExp.property.name === globalAccessor[1]
    );
}

export function isNejCopyMemberExp(memberExp: t.Node): memberExp is t.MemberExpression {
    return (
        t.isMemberExpression(memberExp) &&
        t.isIdentifier(memberExp.object) &&
        t.isIdentifier(memberExp.property) &&
        memberExp.object.name === globalAccessor[0] &&
        memberExp.property.name === 'copy'
    );
}

export function getGlobalAccessorMemberExpPaths(ast: t.File): Array<NodePath<t.MemberExpression>> {
    const ret: Array<NodePath<t.MemberExpression>> = [];

    traverse(ast, {
        MemberExpression(path: NodePath<t.MemberExpression>) {
            if (isNejGlobalAccessorMemberExp(path.node)) {
                ret.push(path);
            }
        },
    });

    return ret;
}

export function isAssignmentExpOrVariableDeclarator(
    node: t.Node,
): node is t.AssignmentExpression | t.VariableDeclarator {
    return t.isAssignmentExpression(node) || t.isVariableDeclarator(node);
}

export function isPathInCallExpressionAsCallee(path: NodePath<t.Node>): boolean {
    return t.isCallExpression(path.parent) && path.parent.callee === path.node;
}

export function isCallExpressionPath(path: NodePath<t.Node>): path is NodePath<t.CallExpression> {
    return t.isCallExpression(path.node);
}

export function isMemberExpressionPath(path: NodePath<t.Node>): path is NodePath<t.MemberExpression> {
    return t.isMemberExpression(path.node);
}

export function getIdentifierFromAssignmentExpressionOrVariableDeclarator(
    node: t.AssignmentExpression | t.VariableDeclarator,
): t.Identifier {
    return ((node as t.VariableDeclarator).id || (node as t.AssignmentExpression).left) as t.Identifier;
}

export function getAllRefToGlobalAccessorBindings(
    scopes: Scope[],
    globalAccessorNonCallPaths: Array<NodePath<t.Node>>,
): Binding[] {
    let ret: Binding[] = [];

    for (const scope of scopes) {
        for (const path of globalAccessorNonCallPaths) {
            const node = path.node;
            if (isAssignmentExpOrVariableDeclarator(node)) {
                const id = getIdentifierFromAssignmentExpressionOrVariableDeclarator(node);
                const b = scope.getBinding(id.name);

                if (b) {
                    ret.push(b);
                }
            }
        }

        for (const refBinding of ret) {
            ret = uniq(ret.concat(getAllRefToGlobalAccessorBindings(scopes, refBinding.referencePaths)));
        }
    }

    return ret;
}

export function getAllNonBlockScopes(ast: t.File): Scope[] {
    const ret: Scope[] = [];

    traverse(ast, {
        Scope(path: NodePath<t.Scopable>) {
            if (!t.isBlockStatement(path.node)) {
                ret.push(path.scope);
            }
        },
    });

    return ret;
}

export function getGlobalAccessorCallPaths(
    scopes: Scope[],
    globalAccessorMemberExpPaths: Array<NodePath<t.MemberExpression>>,
): Array<NodePath<t.CallExpression>> {
    const ret: Array<NodePath<t.CallExpression>> = [];
    const nonCallPaths: Array<NodePath<t.Node>> = [];

    for (const path of globalAccessorMemberExpPaths) {
        if (isPathInCallExpressionAsCallee(path) && isCallExpressionPath(path.parentPath)) {
            ret.push(path.parentPath);
        } else {
            nonCallPaths.push(path.parentPath);
        }
    }

    const refBindings = getAllRefToGlobalAccessorBindings(scopes, nonCallPaths);

    for (const refBinding of refBindings) {
        for (const refPath of refBinding.referencePaths) {
            if (isPathInCallExpressionAsCallee(refPath)) {
                ret.push(refPath.parentPath as NodePath<t.CallExpression>);
            }
        }
    }

    return uniq(ret);
}

export function recursivelyResolveBindings(scope: Scope, info: INamespaceBindingInfo, binding?: Binding): void {
    if (binding) {
        const refPaths = binding.referencePaths;

        for (const rp of refPaths) {
            if (isAssignmentExpOrVariableDeclarator(rp.parent)) {
                const id = getIdentifierFromAssignmentExpressionOrVariableDeclarator(rp.parent);
                const idBinding = scope.getBinding(id.name);

                if (idBinding) {
                    info.bindings.push(idBinding);
                    recursivelyResolveBindings(scope, info, idBinding);
                }
            }
        }
    } else {
        const bindings = info.bindings;

        for (binding of bindings) {
            recursivelyResolveBindings(scope, info, binding);
        }
    }
}

export function getNamespaceBindingMap(
    scopes: Scope[],
    globalAccessorCallPaths: Array<NodePath<t.CallExpression>>,
): INamespaceBindingMap {
    const ret: INamespaceBindingMap = {};

    for (const scope of scopes) {
        for (const callPath of globalAccessorCallPaths) {
            let ns = '';
            if (callPath.node.arguments.length) {
                const nsNode = callPath.node.arguments[0];
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
                const idBindings: Binding[] = [];

                if (isAssignmentExpOrVariableDeclarator(callPath.parent)) {
                    const id = getIdentifierFromAssignmentExpressionOrVariableDeclarator(callPath.parent);
                    const idBinding = scope.getBinding(id.name);

                    if (idBinding) {
                        idBindings.push(idBinding);
                    }
                } else if (
                    isNejGlobalAccessorMemberExp(callPath.node.callee) &&
                    t.isCallExpression(callPath.parent) &&
                    isNejCopyMemberExp(callPath.parent.callee) &&
                    callPath.listKey === 'arguments'
                ) {
                    const argPos = parseInt(callPath.key, 10) || 0;
                    for (let i = argPos + 1, l = callPath.parent.arguments.length; i < l; i++) {
                        const id = callPath.parent.arguments[i];
                        if (t.isIdentifier(id)) {
                            const idBinding = scope.getBinding(id.name);

                            if (idBinding) {
                                idBindings.push(idBinding);
                            }
                        }
                    }
                }

                if (idBindings.length) {
                    ret[ns].bindings = ret[ns].bindings.concat(idBindings);
                }
                ret[ns].bindings = uniq(ret[ns].bindings);
                ret[ns].globalAccessorCallPaths = uniq(ret[ns].globalAccessorCallPaths);
            }
        }

        forOwn(ret, info => {
            recursivelyResolveBindings(scope, info);
        });
    }

    return ret;
}

export function getSymbolAssignmentType(path: NodePath<t.Node>): SYMBOL_ASSIGNMENT_TYPE {
    let topMemExp: t.MemberExpression = path.parent as t.MemberExpression;
    const par = path.findParent(p => {
        if (t.isMemberExpression(p.node) && p.node.object === topMemExp) {
            topMemExp = p.node;
        }

        return !t.isMemberExpression(p.node);
    });

    if (par) {
        if (t.isAssignmentExpression(par.node) && par.node.left === path.parent) {
            return SYMBOL_ASSIGNMENT_TYPE.ASSIGNMENT_TO_ITSELF;
        } else if (t.isAssignmentExpression(par.node) && par.node.left === topMemExp && path.parent !== topMemExp) {
            return SYMBOL_ASSIGNMENT_TYPE.ASSIGNMENT_NOT_TO_ITSELF;
        }
    }

    return SYMBOL_ASSIGNMENT_TYPE.NOT_ASSIGNMENT;
}

export function isReturnSymbol(path: NodePath<t.Node>): boolean {
    return t.isReturnStatement(path.findParent(p => !t.isMemberExpression(p.node)));
}

export function getSymbolsFromNamespaceBindingMap(
    namespaceBindingMap: INamespaceBindingMap,
    addPath: boolean = false,
): ISymbol[] {
    const symbols: ISymbol[] = [];

    forOwn(namespaceBindingMap, (val, nejNamespace) => {
        for (const binding of val.bindings) {
            const refPaths = binding.referencePaths;
            for (const refPath of refPaths) {
                if (t.isMemberExpression(refPath.parent)) {
                    const property = refPath.parent.property;
                    let propertyName: string | undefined;

                    // Only supports identifier and string literal property
                    if (t.isIdentifier(property)) {
                        propertyName = property.name;
                    } else if (t.isStringLiteral(property)) {
                        propertyName = property.value;
                    }

                    if (propertyName && !isReturnSymbol(refPath)) {
                        symbols.push({
                            assignmentType: getSymbolAssignmentType(refPath),
                            nejNamespace,
                            propertyName,
                            path: addPath ? (refPath.parentPath.get('property') as ISymbol['path']) : undefined,
                        });
                    }
                }
            }
        }

        for (const callPath of val.globalAccessorCallPaths) {
            if (t.isMemberExpression(callPath.parent) && t.isIdentifier(callPath.parent.property)) {
                const propertyName = callPath.parent.property.name;

                if (propertyName && !isReturnSymbol(callPath)) {
                    symbols.push({
                        assignmentType: getSymbolAssignmentType(callPath),
                        nejNamespace,
                        propertyName,
                        path: addPath ? (callPath.parentPath.get('property') as ISymbol['path']) : undefined,
                    });
                }
            }
        }
    });

    return uniqBy(symbols, s => getNamespacePropertyName(s));
}

export function isNejDefine(path: NodePath<t.CallExpression>): boolean {
    return (
        (t.isMemberExpression(path.node.callee) &&
            t.isIdentifier(path.node.callee.object) &&
            path.node.callee.object.name === 'NEJ' &&
            t.isIdentifier(path.node.callee.property) &&
            path.node.callee.property.name === 'define') ||
        (t.isIdentifier(path.node.callee) && path.node.callee.name === 'define')
    );
}
export function getNejDependencyFileListPath(ast: t.File) {
    let ret: NodePath<t.ArrayExpression> | undefined;

    traverse(ast, {
        CallExpression(path: NodePath<t.CallExpression>) {
            if (isNejDefine(path)) {
                for (let i = 0, l = path.node.arguments.length, arg; i < l; i++) {
                    arg = path.node.arguments[i];

                    if (t.isArrayExpression(arg)) {
                        // Assume all dependency file names are string literals
                        ret = path.get(`arguments.${i}`) as NodePath<t.ArrayExpression>;
                    }
                }

                path.stop();
            }
        },
    });

    return ret;
}

export function isFunction(node: t.Node): node is FunctionDefinition {
    return t.isFunctionExpression(node) || t.isArrowFunctionExpression(node);
}

export function getNejFunctionDefinitionPath(ast: t.File): NodePath<FunctionDefinition> | undefined {
    let functionDefinition: NodePath<FunctionDefinition> | undefined;
    let functionDefinitionVar: t.Identifier | undefined;

    traverse(ast, {
        CallExpression(path: NodePath<t.CallExpression>) {
            if (isNejDefine(path)) {
                for (let i = 0, l = path.node.arguments.length; i < l; i++) {
                    const arg = path.node.arguments[i];

                    if (isFunction(arg)) {
                        functionDefinition = path.get(`arguments.${i}`) as NodePath<FunctionDefinition>;
                    } else if (t.isIdentifier(arg)) {
                        functionDefinitionVar = arg;
                    }
                }

                if (!functionDefinition && functionDefinitionVar) {
                    const functionDefinitionVarBinding = path.scope.getBinding(functionDefinitionVar.name);
                    if (functionDefinitionVarBinding) {
                        // NEJ.define wrapped in IIFE
                        if (
                            isFunction(functionDefinitionVarBinding.path.parent) &&
                            t.isCallExpression(functionDefinitionVarBinding.path.parentPath.parent)
                        ) {
                            const argPos = findIndex(
                                functionDefinitionVarBinding.path.parent.params,
                                p =>
                                    !!(
                                        t.isIdentifier(p) &&
                                        functionDefinitionVar &&
                                        p.name === functionDefinitionVar.name
                                    ),
                            );

                            const arg = functionDefinitionVarBinding.path.parentPath.parent.arguments[argPos];

                            if (isFunction(arg)) {
                                functionDefinition = functionDefinitionVarBinding.path.parentPath.parentPath.get(
                                    `arguments.${argPos}`,
                                ) as NodePath<FunctionDefinition>;
                            }
                        } else if (
                            t.isVariableDeclarator(functionDefinitionVarBinding.path.node) &&
                            isFunction(functionDefinitionVarBinding.path.node.init)
                        ) {
                            // Function definition as a var
                            functionDefinition = functionDefinitionVarBinding.path.get('init') as NodePath<
                                FunctionDefinition
                            >;
                        } else if (isFunction(functionDefinitionVarBinding.path.node)) {
                            // Function declaration
                            functionDefinition = functionDefinitionVarBinding.path as NodePath<FunctionDefinition>;
                        }
                    }
                }

                path.stop();
            }
        },
    });

    return functionDefinition;
}

export function getNejDependencyVarNameList(functionDefinition: FunctionDefinition): string[] {
    return map(functionDefinition.params, p => (p as t.Identifier).name);
}

export function getNamespacePropertyName(symbol: ISymbol): string {
    return `${symbol.nejNamespace}/${symbol.propertyName}/${symbol.assignmentType}`;
}

export function parseNamespacePropertyName(name: string): ISymbol {
    const split = name.split(CONSTANTS.NAMESPACE_PROPERTY_NAME_SEP);

    return {
        nejNamespace: split[0],
        propertyName: split[1],
        assignmentType: split[2] as any,
    };
}

export function replaceWithNejPathAliases(
    path: string,
    nejPathAliases: INejPathAliasesMap,
    toNejAlias: boolean = false,
) {
    forOwn(nejPathAliases, (val, key) => {
        if (!toNejAlias) {
            const re = new RegExp(`\{${key}\}|^${key}`);

            path = path.replace(re, `${val}`);
        } else {
            const re = new RegExp(`(\/|^)${val}`);

            path = path.replace(re, `$1{${key}}`);
        }
    });

    return path;
}

export function addExt(path: string): string {
    return path.indexOf(CONSTANTS.FILE_EXT) >= 0 ? path : `${path}${CONSTANTS.FILE_EXT}`;
}

export function getAbsDependencyFileList(
    filePath: string,
    dependencyFileList: string[],
    nejPathAliases: INejPathAliasesMap,
    projectDir: string,
): string[] {
    return map<string, string>(dependencyFileList, e => {
        let val = replaceWithNejPathAliases(e, nejPathAliases);

        if (!/^\./.test(val)) {
            val = pathLib.resolve(projectDir, `./`, val);
        } else {
            val = pathLib.resolve(pathLib.dirname(filePath), val);
        }

        return addExt(normalizeSlashes(val));
    });
}

export function normalizeSlashes(str: string): string {
    return str.replace(/[/\\]+/g, '/').replace(/^\/|\/$/, '');
}

export function normalizeDepPathToInject(path: string, nejPathAliases: INejPathAliasesMap, projectDir: string): string {
    return normalizeSlashes(
        addExt(replaceWithNejPathAliases(normalizeSlashes(path), nejPathAliases, true)).replace(projectDir, ''),
    );
}

export function getRandomNumber() {
    return Date.now() + Math.floor(Math.random() * 10000000);
}

export function getRandomPlaceholderName() {
    return `${CONSTANTS.PLACEHOLDER}${getRandomNumber()}`;
}

export function getRandomExportVarName() {
    return `exports_${getRandomNumber()}`;
}

export function getDepVarNameFromDepFilename(filename: string): string {
    filename = normalizeSlashes(filename);

    const filenameSp = filename.split('/');

    return `${filenameSp[filenameSp.length - 1].replace(/\./g, '_')}_${getRandomNumber()}`;
}

/**
 * Only check function scopes
 */
export function isPathInScope(path: NodePath<t.Node>, scope: Scope): boolean {
    if (path.scope === scope) {
        return true;
    } else {
        let parScope = scope.parent;

        while (parScope && t.isBlockStatement(parScope.block)) {
            parScope = parScope.parent;
        }

        if (parScope && parScope === scope) {
            return true;
        }
    }

    return false;
}

/**
 * Only check function scopes
 */
export function getReturnStatementPathsInScope(ast: t.File, scope: Scope): Array<NodePath<t.ReturnStatement>> {
    const ret: Array<NodePath<t.ReturnStatement>> = [];

    traverse(ast, {
        ReturnStatement(path: NodePath<t.ReturnStatement>) {
            if (isPathInScope(path, scope)) {
                ret.push(path);
            }
        },
    });

    return ret;
}

export function getIdentifierFromMemberExpressionProperty(node: t.Expression): t.Identifier | undefined {
    let ret: t.Identifier | undefined;

    if (t.isIdentifier(node)) {
        ret = node;
    } else if (t.isStringLiteral(node)) {
        ret = t.identifier(node.value);
    }

    return ret;
}
