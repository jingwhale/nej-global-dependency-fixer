/* tslint:disable */
import { getProjectInfo } from './../../getProjectInfo';
import { expect } from 'chai';
import * as path from 'path';
import * as t from 'babel-types';
import { normalizeSlashes } from '../../../helpers';
import { resolveGlobalDependencies } from '../../resolveGlobalDependencies';
import { getFixtureDir } from '../../../__tests__/utils/index';

describe('resolveGlobalDependencies', () => {
    it('should be ok', () => {
        return resolveGlobalDependencies(
            getProjectInfo({
                exclude: ['**/lib/**'],
                projectDir: getFixtureDir(),
                nejPathAliases: {
                    pro: 'src/',
                },
            }),
        ).then(projectInfo => {
            const depListPath =
                projectInfo.filePathMap[normalizeSlashes(path.resolve(process.cwd(), 'fixtures/src/a.js'))]
                    .dependencyFileListPath;
            expect(depListPath).to.not.be.undefined;
            if (typeof depListPath !== 'undefined') {
                expect(depListPath.node.elements).to.have.length(3);
                expect((depListPath.node.elements as t.StringLiteral[]).map(e => e.value)).to.deep.eq([
                    '{pro}dep1.js',
                    '{pro}dep2.js',
                    '{pro}dep3.js',
                ]);
            }
        });
    });
});
