/* tslint:disable */
import { collectGlobalAccessorExports } from './../../collectGlobalAccessorExports';
import { expect } from 'chai';
import * as path from 'path';
import { getProjectInfo } from './../../getProjectInfo';
import { getFixtureDir } from '../../../__tests__/utils/index';
import { normalizeSlashes } from '../../index';
import { IProjectInfo, IDirectExport } from '../../../types';

describe('nej-global-dependency-fixer helpers - collectGlobalAccessorExports', () => {
    let projectInfo: IProjectInfo;

    function expectFile(filename: string, exportCount: number, exportedMembers: string[]) {
        const filePath = normalizeSlashes(path.resolve(getFixtureDir(), filename));
        it(`should have the correct number of exports for ${filePath}`, () => {
            const file = projectInfo.filePathMap[filePath];
            expect(file).to.have.property('export').that.is.not.undefined;
            expect(file.export)
                .to.have.property('exportedMembers')
                .that.has.length(exportCount);
            expect(
                (file.export as IDirectExport).exportedMembers.map(e => `${e.identifier.name}|${e.namespace}`),
            ).to.deep.eq(exportedMembers);
        });
    }

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

    expectFile('src/a.js', 3, ['some|edu.u', 'same|edu.u', 'some1|edu.u']);

    expectFile('src/b.js', 9, [
        'some|edu.e',
        'same|edu.u',
        'a|edu.c',
        'b|edu.c',
        'a|edu.c1',
        'b|edu.c1',
        'a|edu.c2',
        'b|edu.c2',
        'c|edu.c2',
    ]);

    expectFile('src/c.js', 0, []);
});
