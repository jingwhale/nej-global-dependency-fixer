import * as t from 'babel-types';
import { CONSTANTS, SYMBOL_ASSIGNMENT_TYPE } from './../constants';
import {
    getNamespacePropertyName,
    getAbsDependencyFileList,
    normalizeDepPathToInject,
    getRandomPlaceholderName,
} from './../helpers';
import { IProjectInfo } from './../types';
import { map, cloneDeep, extend, uniq, filter, uniqBy } from 'lodash';
import { logger } from './../utils/logger';
import * as bluebird from 'bluebird';
import { asyncForEach } from './../utils/async';
import * as inquirer from 'inquirer';

export function resolveGlobalDependencies(projectInfo: IProjectInfo): Promise<IProjectInfo> {
    return bluebird.Promise.resolve()
        .then(() => {
            const files = projectInfo.files;
            const nejPathAliases = projectInfo.nejPathAliases || {};

            return asyncForEach(files, file => {
                let depsToInject: string[] = [];
                const absDependencyFileList: string[] = getAbsDependencyFileList(
                    file.filePath,
                    file.dependencyFileListPath
                        ? map<t.StringLiteral, string>(
                              file.dependencyFileListPath.node.elements as t.StringLiteral[],
                              e => e.value,
                          )
                        : [],
                    nejPathAliases,
                    projectInfo.projectDir,
                );

                return bluebird.Promise.resolve()
                    .then(() => {
                        const depFileListCheckMap: { [key: string]: boolean } = {};
                        for (const fp of absDependencyFileList) {
                            depFileListCheckMap[fp] = true;
                        }

                        return asyncForEach(file.symbols, symbol => {
                            let resolvedDepToInject: string | undefined;

                            return bluebird.Promise.resolve()
                                .then(() => {
                                    const assignmentToItselfSymbolFileList =
                                        projectInfo.symbolMap[
                                            getNamespacePropertyName(
                                                extend(cloneDeep(symbol), {
                                                    assignmentType: SYMBOL_ASSIGNMENT_TYPE.ASSIGNMENT_TO_ITSELF,
                                                }),
                                            )
                                        ] || [];
                                    const assignmentNotToItselfSymbolFileList =
                                        projectInfo.symbolMap[
                                            getNamespacePropertyName(
                                                extend(cloneDeep(symbol), {
                                                    assignmentType: SYMBOL_ASSIGNMENT_TYPE.ASSIGNMENT_NOT_TO_ITSELF,
                                                }),
                                            )
                                        ] || [];
                                    let hasAssignmentToItself = false;

                                    for (const atisf of assignmentToItselfSymbolFileList) {
                                        if (atisf.filePath === file.filePath) {
                                            hasAssignmentToItself = true;
                                            break;
                                        }
                                    }
                                    if (
                                        symbol.assignmentType === SYMBOL_ASSIGNMENT_TYPE.NOT_ASSIGNMENT &&
                                        !hasAssignmentToItself
                                    ) {
                                        const symbolFileList = uniqBy(
                                            filter(
                                                assignmentToItselfSymbolFileList.concat(
                                                    assignmentNotToItselfSymbolFileList,
                                                ),
                                                f => f.filePath !== file.filePath,
                                            ),
                                            f => f.filePath,
                                        );
                                        let hasDepForSymbol = false;

                                        for (const sf of symbolFileList) {
                                            if (depFileListCheckMap[sf.filePath]) {
                                                hasDepForSymbol = true;
                                                symbol.resolvedDependencyFilename = sf.filePath;
                                                break;
                                            }
                                        }
                                        if (!hasDepForSymbol && symbolFileList.length > 1) {
                                            if (projectInfo.conflictResolutionStrategy) {
                                                const resolvedFile = projectInfo.conflictResolutionStrategy(
                                                    file,
                                                    symbolFileList,
                                                    symbol,
                                                    projectInfo,
                                                );

                                                if (resolvedFile) {
                                                    resolvedDepToInject = normalizeDepPathToInject(
                                                        resolvedFile.filePath,
                                                        nejPathAliases,
                                                        projectInfo.projectDir,
                                                    );
                                                    logger.info(
                                                        `Resolved 1 file conflict with custom conflict ` +
                                                            `resolution strategy in ${file.filePath}. ` +
                                                            `Resolved to ${resolvedDepToInject}`,
                                                    );
                                                } else if (resolvedFile === false) {
                                                    resolvedDepToInject = CONSTANTS.NO_RESOLVE_PROMPT;
                                                }
                                            }

                                            if (!resolvedDepToInject) {
                                                if (projectInfo.promptConflict) {
                                                    logger.info('Prompting resolution conflict:');
                                                    return inquirer
                                                        .prompt([
                                                            {
                                                                name: 'selectedFilePath',
                                                                message:
                                                                    `Please select a dependency for ` +
                                                                    `${symbol.propertyName} ` +
                                                                    `in ${file.filePath}`,
                                                                type: 'list',
                                                                choices: map(symbolFileList, f => f.filePath).concat(
                                                                    CONSTANTS.NO_RESOLVE_PROMPT,
                                                                ),
                                                            },
                                                        ])
                                                        .then(answers => {
                                                            logger.info('Prompting resolution conflict over');
                                                            logger.debug(
                                                                `Selected file path: ${answers.selectedFilePath}`,
                                                            );
                                                            if (
                                                                answers.selectedFilePath !== CONSTANTS.NO_RESOLVE_PROMPT
                                                            ) {
                                                                resolvedDepToInject = normalizeDepPathToInject(
                                                                    answers.selectedFilePath,
                                                                    nejPathAliases,
                                                                    projectInfo.projectDir,
                                                                );
                                                            } else {
                                                                resolvedDepToInject = CONSTANTS.NO_RESOLVE_PROMPT;
                                                            }
                                                        });
                                                } else {
                                                    projectInfo.errors.push(
                                                        new Error(
                                                            `Resolution Failed in ${file.filePath}: ` +
                                                                `Multiple files with the same symbol ${
                                                                    symbol.propertyName
                                                                } are found. ` +
                                                                `Please resolve the dependency manaully. \n` +
                                                                `Files: \n` +
                                                                map(symbolFileList, f => f.filePath).join('\n'),
                                                        ),
                                                    );
                                                }
                                            }
                                        } else if (!hasDepForSymbol && symbolFileList.length > 0) {
                                            resolvedDepToInject = normalizeDepPathToInject(
                                                symbolFileList[0].filePath,
                                                nejPathAliases,
                                                projectInfo.projectDir,
                                            );
                                        }
                                    }

                                    return;
                                })
                                .then(() => {
                                    if (resolvedDepToInject && resolvedDepToInject !== CONSTANTS.NO_RESOLVE_PROMPT) {
                                        symbol.resolvedDependencyFilename = resolvedDepToInject;
                                        depsToInject.push(resolvedDepToInject);
                                    }
                                });
                        });
                    })
                    .then(() => {
                        depsToInject = uniq(depsToInject);
                        const dependencyVarList = file.functionDefinitionPath.node.params;

                        if (file.dependencyFileListPath) {
                            file.dependencyFileListPath.replaceWith(
                                t.arrayExpression(
                                    file.dependencyFileListPath.node.elements.concat(
                                        map(depsToInject, d => t.stringLiteral(d)),
                                    ),
                                ),
                            );

                            if (dependencyVarList.length > absDependencyFileList.length) {
                                file.functionDefinitionPath.node.params.splice(
                                    absDependencyFileList.length,
                                    0,
                                    ...map(depsToInject, () => t.identifier(getRandomPlaceholderName())),
                                );
                            }

                            if (depsToInject.length) {
                                logger.info(`Resolved ${depsToInject.length} dependencies in ${file.filePath}`);
                                logger.info(
                                    `Resolved dependencies: \n` + `${map(depsToInject, f => `    ${f}`).join('\n')}`,
                                );
                            }
                        } else {
                            projectInfo.warningLogs.push(
                                `Can not find the dependency list in ${
                                    file.filePath
                                }: May be caused by not using array ` + `expression or not having dependency list`,
                            );
                        }
                    });
            });
        })
        .then(() => {
            return projectInfo;
        });
}
