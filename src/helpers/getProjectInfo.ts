import * as glob from 'glob';
import * as path from 'path';
import * as fs from 'fs';
import * as babylon from 'babylon';
import { CONSTANTS } from './../constants';
import {
    getNamespaceBindingMap,
    getGlobalAccessorCallPaths,
    getGlobalAccessorMemberExpPaths,
    getSymbolsFromNamespaceBindingMap,
    getNejDependencyFileListPath,
    getNejFunctionDefinitionPath,
    getNamespacePropertyName,
    normalizeSlashes,
    getAllNonBlockScopes,
} from './../helpers';
import { IOptions, IFile, IFilePathMap, ISymbolNamespacePropertyNameMap, IProjectInfo } from './../types';
import { map } from 'lodash';
import { Logger } from './../utils/logger';

const logger = new Logger(['error', 'debug', 'info', 'warning']);

export function getProjectInfo(options: IOptions): IProjectInfo {
    const symbolMap: ISymbolNamespacePropertyNameMap = {};
    const filePathMap: IFilePathMap = {};
    const files: IFile[] = [];
    const errors: Error[] = [];
    const warningLogs: string[] = [];
    const searchPattern = path.resolve(options.projectDir, `**/**/*${CONSTANTS.FILE_EXT}`);

    logger.debug(`Searching for files in ${searchPattern} ...`);
    const filePathList = map(
        glob.sync(searchPattern, {
            ignore: options.exclude,
            absolute: true,
        }),
        f => {
            return '/' + normalizeSlashes(f);
        },
    );
    logger.debug(`Found ${filePathList.length} files.`);

    for (const filePath of filePathList) {
        let fileContent: string | undefined;

        try {
            fileContent = fs
                .readFileSync(filePath, {
                    encoding: 'utf-8',
                })
                .toString();
        } catch (error) {
            errors.push(new Error(error.message + ` ${filePath}`));
            logger.debug(error.message);
            logger.debug(`Error happened when reading file ${filePath}.`);
        }

        if (!fileContent || !new RegExp(CONSTANTS.NEJ_GLOBAL_ACCESSOR).test(fileContent)) {
            continue;
        }
        logger.debug(`Parsing file ${filePath} ...`);
        const ast = babylon.parse(fileContent);
        const functionDefinitionPath = getNejFunctionDefinitionPath(ast);
        const scopes = getAllNonBlockScopes(ast);
        if (functionDefinitionPath && scopes.length) {
            const namespaceBindingMap = getNamespaceBindingMap(
                scopes,
                getGlobalAccessorCallPaths(scopes, getGlobalAccessorMemberExpPaths(ast)),
            );

            const fileObj: IFile = {
                symbols: getSymbolsFromNamespaceBindingMap(namespaceBindingMap, options.removeNejP),
                filePath,
                dependencyFileListPath: getNejDependencyFileListPath(ast),
                functionDefinitionPath,
                namespaceBindingMap,
                ast,
            };
            logger.debug(
                `Parsed ${filePath} and found symbols: `,
                JSON.stringify(fileObj.symbols.map(s => getNamespacePropertyName(s)), null, '  '),
            );

            files.push(fileObj);
            filePathMap[filePath] = fileObj;

            for (const symbol of fileObj.symbols) {
                const name = getNamespacePropertyName(symbol);

                let sfarr = symbolMap[name];

                if (!sfarr) {
                    sfarr = symbolMap[name] = [];
                }

                sfarr.push(fileObj);
            }
        } else {
            errors.push(new Error(`Invalid code in ${filePath}: Please use a valid NEJ module.`));
        }
    }

    return {
        filePathMap,
        files,
        symbolMap,
        projectDir: normalizeSlashes(options.projectDir),
        errors: [],
        nejPathAliases: options.nejPathAliases,
        warningLogs,
        conflictResolutionStrategy: options.conflictResolutionStrategy,
        promptConflict: options.promptConflict,
    };
}
