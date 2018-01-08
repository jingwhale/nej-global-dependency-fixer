import { Binding, NodePath } from 'babel-traverse';
import * as t from 'babel-types';
import { LogLevel } from './utils/logger';
import { SYMBOL_ASSIGNMENT_TYPE } from './constants';

export interface INamespaceBindingMap {
    [ns: string]: INamespaceBindingInfo;
}

export interface INamespaceBindingInfo {
    bindings: Binding[];
    globalAccessorCallPaths: Array<NodePath<t.CallExpression>>;
}

export type ConflictResolutionStrategy = (
    file: IFile,
    conflictFiles: IFile[],
    symbol: ISymbol,
    projectInfo: IProjectInfo,
) => IFile | false | undefined;

export interface IOptions {
    exclude: string[];
    noWrite?: RegExp;
    /**
     * An absolute dir of the entry project
     */
    projectDir: string;
    /**
     * An absolute dir of the output project
     */
    outDir?: string;
    nejPathAliases?: INejPathAliasesMap;
    /**
     * An absolute path of the complete log
     */
    logFilename?: string;
    logLevels?: LogLevel[];
    conflictResolutionStrategy?: ConflictResolutionStrategy;
    promptConflict?: boolean;
    removeNejP?: boolean;
}

export interface ISymbol {
    propertyName: string;
    nejNamespace: string;
    assignmentType: SYMBOL_ASSIGNMENT_TYPE;
    path?: NodePath<t.Identifier | t.StringLiteral>;
    resolvedDependencyFilename?: string;
}

export interface IFile {
    symbols: ISymbol[];
    /**
     * An absolute path
     */
    filePath: string;
    dependencyFileListPath?: NodePath<t.ArrayExpression>;
    functionDefinitionPath: NodePath<FunctionDefinition>;
    namespaceBindingMap: INamespaceBindingMap;
    export?: IDirectExport;
    ast: t.File;
}

export interface IExportedMember {
    identifier: t.Identifier;
    namespace?: string;
}

export interface IDirectExport {
    exportedMembers: IExportedMember[];
    exportedNamespaces?: string[];
}

export interface ISymbolNamespacePropertyNameMap {
    [namespacePropertyName: string]: IFile[];
}

export interface IFilePathMap {
    [filePath: string]: IFile;
}

export interface IProjectInfo {
    files: IFile[];
    filePathMap: IFilePathMap;
    symbolMap: ISymbolNamespacePropertyNameMap;
    /**
     * An absolute dir of the entry project
     */
    projectDir: string;
    errors: Error[];
    warningLogs: string[];
    nejPathAliases?: INejPathAliasesMap;
    conflictResolutionStrategy?: ConflictResolutionStrategy;
    promptConflict?: boolean;
}

export type FunctionDefinition = t.FunctionExpression | t.ArrowFunctionExpression | t.FunctionDeclaration;

export interface INejPathAliasesMap {
    [key: string]: string;
}
