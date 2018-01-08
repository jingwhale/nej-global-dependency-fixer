export const CONSTANTS = {
    FILE_EXT: '.js',
    NEJ_GLOBAL_ACCESSOR: 'NEJ.P',
    NAMESPACE_PROPERTY_NAME_SEP: '/',
    PLACEHOLDER: '__DUMMY__',
    NO_RESOLVE_PROMPT: 'Do not add dependency',
};

export enum SYMBOL_ASSIGNMENT_TYPE {
    NOT_ASSIGNMENT,
    ASSIGNMENT_TO_ITSELF,
    ASSIGNMENT_NOT_TO_ITSELF,
}
