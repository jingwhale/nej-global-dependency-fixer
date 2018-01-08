/* tslint:disable */
import { collectGlobalAccessorExports } from './../../collectGlobalAccessorExports';
import { resolveGlobalDependencies } from './../../resolveGlobalDependencies';
import { removeGlobalAccessors } from './../../removeGlobalAccessors';
import { expect } from 'chai';
import * as path from 'path';
import { getProjectInfo } from './../../getProjectInfo';
import { getFixtureDir } from '../../../__tests__/utils/index';
import { normalizeSlashes } from '../../index';
import { IProjectInfo, IDirectExport } from '../../../types';

describe('nej-global-dependency-fixer helpers - collectGlobalAccessorExports', () => {
    let projectInfo: IProjectInfo;

    it('should collect the correct exported members and have no errors', () => {
        projectInfo = getProjectInfo({
            exclude: ['**/lib/**'],
            projectDir: getFixtureDir(),
            nejPathAliases: {
                pro: 'src/',
            },
            removeNejP: true,
        });

        collectGlobalAccessorExports(projectInfo);
    });

    it('should resolve all global accessors and have no errors', () => {
        return resolveGlobalDependencies(projectInfo);
    });

    it('should remove all global accessors and have no errors', () => {
        removeGlobalAccessors(projectInfo);

        projectInfo.errors.forEach(e => console.log(e));
    });
});
