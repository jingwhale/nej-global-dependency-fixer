import { IProjectInfo, IFile, IExportedMember } from '../types';
import * as t from 'babel-types';
import { isMemberExpressionPath, getAbsDependencyFileList } from './index';
import { forOwn, find, map } from 'lodash';
import { SYMBOL_ASSIGNMENT_TYPE } from '../constants';
import { NodePath } from 'babel-traverse';
import { Logger } from '../utils/logger';

const rgaLogger = new Logger(['debug'], 'removeGlobalAccessors');

export function removeGlobalAccessors(projectInfo: IProjectInfo): void {
    for (const file of projectInfo.files) {
        rgaLogger.debug(`Processing file ${file.filePath}`);
        const depFileVarMap: { [dep: string]: t.Identifier } = {};

        if (file.dependencyFileListPath) {
            const depVarList = file.functionDefinitionPath.node.params;
            const depFileList = getAbsDependencyFileList(
                file.filePath,
                map(
                    file.dependencyFileListPath.node.elements,
                    (e: t.StringLiteral) => {
                        return e.value;
                    },
                ),
                projectInfo.nejPathAliases,
                projectInfo.projectDir,
            );

            for (let i = 0, l = depFileList.length; i < l; i++) {
                const depFile = depFileList[i];

                if (t.isStringLiteral(depFile) && depVarList[i]) {
                    depFileVarMap[depFile.value] = depVarList[i] as t.Identifier;
                }
            }

            for (const symbol of file.symbols) {
                if (symbol.assignmentType === SYMBOL_ASSIGNMENT_TYPE.NOT_ASSIGNMENT) {
                    rgaLogger.debug(`Processing symbol ${symbol.propertyName}`);
                    if (!symbol.path) {
                        projectInfo.errors.push(
                            new Error(
                                `The symbol ${symbol.propertyName} in file ${file.filePath} ` +
                                    `does not have a node path`,
                            ),
                        );
                        continue;
                    }
                    if (!symbol.resolvedDependencyFilename) {
                        projectInfo.errors.push(
                            new Error(
                                `The symbol ${symbol.propertyName} in file ${file.filePath} ` +
                                    `does not have a resolved dependency filename`,
                            ),
                        );
                        continue;
                    }
                    const fileObj: IFile | undefined = projectInfo.filePathMap[symbol.resolvedDependencyFilename];

                    if (!fileObj) {
                        projectInfo.errors.push(
                            new Error(
                                `The filename ${symbol.resolvedDependencyFilename} does not ` + `match any known file`,
                            ),
                        );
                        continue;
                    }

                    if (!fileObj.export) {
                        projectInfo.errors.push(
                            new Error(
                                `The file ${fileObj.filePath} does not have ` + `any global accessor exports resolved`,
                            ),
                        );
                        continue;
                    }

                    if (
                        !find(
                            fileObj.export.exportedMembers,
                            m => m.identifier.name === symbol.propertyName,
                        )
                    ) {
                        projectInfo.errors.push(
                            new Error(
                                `The symbol ${symbol.propertyName} in file ${file.filePath} ` +
                                    `is not in exported members of the file ${fileObj.filePath}`,
                            ),
                        );
                        continue;
                    }

                    const memExpPath = symbol.path.parentPath;
                    if (!isMemberExpressionPath(memExpPath)) {
                        projectInfo.errors.push(
                            new Error(
                                `The symbol ${symbol.propertyName} in file ${file.filePath} ` +
                                    `is not in a valid member expression`,
                            ),
                        );
                        continue;
                    }

                    if (!depFileVarMap[fileObj.filePath]) {
                        projectInfo.errors.push(
                            new Error(`The file ${fileObj.filePath} is not included ` + `in the dependency file list`),
                        );
                        continue;
                    }

                    const objectPath = memExpPath.get('object') as NodePath<t.Identifier>;

                    objectPath.replaceWith(t.identifier(depFileVarMap[fileObj.filePath].name));
                    rgaLogger.debug(`Replaced the symbol with the dep var and got ${memExpPath.node}`);
                }
            }

            forOwn(file.namespaceBindingMap, bindingInfo => {
                for (const binding of bindingInfo.bindings) {
                    if (!binding.referencePaths.length) {
                        rgaLogger.debug(`Removing ${binding.path.node}`);
                        binding.path.remove();
                    }
                }
            });
        }
    }
}
