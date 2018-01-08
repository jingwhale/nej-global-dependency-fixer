import { getAbsDependencyFileList, replaceWithNejPathAliases, normalizeSlashes } from './../';
import { expect } from 'chai';
import * as path from 'path';

describe('nej-global-dependency-fixer helpers', () => {
    describe('replaceWithNejPathAliases', () => {
        it('should replace normal paths to nej aliased paths', () => {
            expect(
                replaceWithNejPathAliases(
                    'src/some/path/a.js',
                    {
                        pro: 'src/',
                    },
                    true,
                ),
            ).to.eq('{pro}some/path/a.js');

            expect(
                replaceWithNejPathAliases(
                    'src/some/web/a.js',
                    {
                        pro: 'src/',
                        mode: 'web',
                    },
                    true,
                ),
            ).to.eq('{pro}some/{mode}/a.js');
        });
    });
    describe('getAbsDependencyFileList', () => {
        it('should return the correct paths', () => {
            const list = getAbsDependencyFileList(
                path.resolve(process.cwd(), 'fixtures/src/a.js'),
                ['pro/dep1', '{pro}/dep3.js', './dep2.js'],
                {
                    pro: 'src/',
                },
                path.resolve(process.cwd(), 'fixtures'),
            );
            expect(list).to.be.deep.eq(
                [
                    path.resolve(process.cwd(), 'fixtures/src/dep1.js'),
                    path.resolve(process.cwd(), 'fixtures/src/dep3.js'),
                    path.resolve(process.cwd(), 'fixtures/src/dep2.js'),
                ].map(normalizeSlashes),
            );
        });
    });
});
