import { IProjectInfo, ISymbol, IExportedMember } from '../types';
import * as t from 'babel-types';
import {
    getDepVarNameFromDepFilename,
    getRandomPlaceholderName,
    getReturnStatementPathsInScope,
    getRandomExportVarName,
    isMemberExpressionPath,
    isNejGlobalAccessorMemberExp,
    getIdentifierFromMemberExpressionProperty,
    replaceWithNejPathAliases,
} from './index';
import { filter, forOwn, uniqBy, map, uniq } from 'lodash';
import { SYMBOL_ASSIGNMENT_TYPE } from '../constants';
import { NodePath } from 'babel-traverse';
import { Logger } from '../utils/logger';

const cgaLogger = new Logger(['debug'], 'collectGlobalAccessorExports');

export function collectGlobalAccessorExports(projectInfo: IProjectInfo): void {
    for (const file of projectInfo.files) {
        if (file.dependencyFileListPath) {
            cgaLogger.debug(`Processing file ${file.filePath}`);
            const depList = file.dependencyFileListPath.node.elements;
            cgaLogger.debug(`The dependency list of the file is`, map(depList, (dep: any) => dep.value));
            const depVarList = file.functionDefinitionPath.node.params as t.Identifier[];
            cgaLogger.debug(`The dependency var list of the file is`, map(depVarList, depVar => depVar.name));
            const depVarListLength = depVarList.length;
            const depListLength = depList.length;
            let hasDirectExportAlready = false;
            let hasExportVar = false;

            if (depListLength > depVarListLength) {
                const insertedParams: t.Identifier[] = [];

                for (let i = depVarListLength, l = depListLength; i < l; i++) {
                    const depFile = depList[i];
                    if (t.isStringLiteral(depFile)) {
                        insertedParams.push(
                            t.identifier(
                                getDepVarNameFromDepFilename(
                                    replaceWithNejPathAliases(depFile.value, projectInfo.nejPathAliases || {}, false),
                                ),
                            ),
                        );
                    } else {
                        insertedParams.push(t.identifier(getRandomPlaceholderName()));
                    }
                }

                depVarList.splice(depVarListLength, 0, ...insertedParams);
            } else if (depListLength < depVarListLength) {
                hasDirectExportAlready = true;
                hasExportVar = true;
            }
            cgaLogger.debug(`After adding missing dependency vars, now is`, map(depVarList, depVar => depVar.name));

            const retStatements = getReturnStatementPathsInScope(file.ast, file.functionDefinitionPath.scope);
            cgaLogger.debug(`The return statements of the file is`, retStatements);
            const exportedNamespaces: string[] = [];

            if (retStatements.length) {
                hasDirectExportAlready = true;

                if (retStatements.length > 1) {
                    projectInfo.errors.push(
                        new Error(
                            `The file ${file.filePath} has more than` +
                                `1 top-level return statement: Failed to collect export info of the file.`,
                        ),
                    );
                    continue;
                } else {
                    let isReturnArgGlobalAccessorBindings = false;
                    const returnArg = retStatements[0].node.argument;

                    if (t.isIdentifier(returnArg)) {
                        forOwn(file.namespaceBindingMap, (info, ns) => {
                            for (const binding of info.bindings) {
                                if (t.isIdentifier(binding.path.node) && binding.path.node.name === returnArg.name) {
                                    isReturnArgGlobalAccessorBindings = true;
                                    exportedNamespaces.push(ns);
                                    break;
                                }
                            }
                        });
                    } else if (t.isCallExpression(returnArg) && isNejGlobalAccessorMemberExp(returnArg.callee)) {
                        isReturnArgGlobalAccessorBindings = true;
                        const firstArg = returnArg.arguments[0];
                        if (t.isStringLiteral(firstArg) && firstArg.value) {
                            exportedNamespaces.push(firstArg.value);
                        }
                    }

                    if (!isReturnArgGlobalAccessorBindings) {
                        projectInfo.errors.push(
                            new Error(
                                `The file ${file.filePath} does not return the same object` +
                                    `as used in the global acessor exports: Failed to collect export info of the file.`,
                            ),
                        );
                        continue;
                    }
                }
            }

            let shouldHaveExport = true;
            const assignmentSymbols: ISymbol[] = filter(
                file.symbols,
                (symbol: ISymbol) => symbol.assignmentType !== SYMBOL_ASSIGNMENT_TYPE.NOT_ASSIGNMENT,
            );
            if (!hasDirectExportAlready && !assignmentSymbols.length) {
                shouldHaveExport = false;
            }
            cgaLogger.debug(`The return statements of the file is`, retStatements);
            cgaLogger.debug(`The file ${hasDirectExportAlready ? 'has' : 'does not have'} direct exports`);
            cgaLogger.debug(`The file should ${shouldHaveExport ? '' : 'not '}have exports`);

            let exportedMembers: IExportedMember[] = [];
            let exportVarIdentifier = t.identifier(getRandomExportVarName());
            if (!hasDirectExportAlready && shouldHaveExport) {
                depVarList.push(exportVarIdentifier);
            } else if (hasExportVar) {
                exportVarIdentifier = depVarList[depListLength];
            }
            cgaLogger.debug(`The export var of the file is ${exportVarIdentifier.name}`);

            for (const symbol of assignmentSymbols) {
                cgaLogger.debug(`Processing the assignment symbol ${symbol.propertyName} of file ${file.filePath}`);
                const symbolPath = symbol.path;

                if (symbolPath) {
                    cgaLogger.debug(`Got the symbol path`);
                    const memExpPath = symbolPath.parentPath;

                    if (isMemberExpressionPath(memExpPath)) {
                        cgaLogger.debug(`Got the parent path of the symbol path`);
                        const objectPath = memExpPath.get('object') as NodePath<t.Identifier>;
                        objectPath.replaceWith(t.identifier(exportVarIdentifier.name));
                        cgaLogger.debug(`Replace the symbol with export var and got`, memExpPath.node);
                        const propIdentifier = getIdentifierFromMemberExpressionProperty(memExpPath.node.property);

                        if (propIdentifier) {
                            exportedMembers.push({
                                identifier: propIdentifier,
                                namespace: symbol.nejNamespace,
                            });
                            exportedNamespaces.push(symbol.nejNamespace);
                        } else {
                            projectInfo.errors.push(
                                new Error(
                                    `The symbol ${symbol.propertyName} in file ${file.filePath} ` +
                                        `can not be recognized statically and collected as exported members`,
                                ),
                            );
                        }
                    } else {
                        projectInfo.errors.push(
                            new Error(
                                `The symbol ${symbol.propertyName} in file ${file.filePath} ` +
                                    `is invalid: it is not in a member expression`,
                            ),
                        );
                    }
                } else {
                    projectInfo.errors.push(new Error(`The symbol ${symbol.propertyName} should have a path.`));
                }
            }

            const exportVarBinding = file.functionDefinitionPath.scope.getBinding(exportVarIdentifier.name);

            if (exportVarBinding) {
                for (const refPath of exportVarBinding.referencePaths) {
                    if (t.isMemberExpression(refPath.parent)) {
                        const propIdentifier = getIdentifierFromMemberExpressionProperty(refPath.parent.property);

                        if (propIdentifier) {
                            exportedMembers.push({
                                identifier: propIdentifier,
                            });
                        } else {
                            projectInfo.errors.push(
                                new Error(
                                    `The property ${refPath.parent.property} in file ${file.filePath} ` +
                                        `can not be recognized statically and collected as exported members`,
                                ),
                            );
                        }
                    }
                }
            }

            exportedMembers = uniqBy(exportedMembers, e => e.identifier.name + (e.namespace || ''));

            file.export = {
                exportedMembers,
                exportedNamespaces: uniq(exportedNamespaces),
            };
        }
    }
}
