"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var _1 = require("./../");
var chai_1 = require("chai");
var path = require("path");
describe('nej-global-dependency-fixer helpers', function () {
    describe('replaceWithNejPathAliases', function () {
        it('should replace normal paths to nej aliased paths', function () {
            chai_1.expect(_1.replaceWithNejPathAliases('src/some/path/a.js', {
                pro: 'src/',
            }, true)).to.eq('{pro}some/path/a.js');
            chai_1.expect(_1.replaceWithNejPathAliases('src/some/web/a.js', {
                pro: 'src/',
                mode: 'web',
            }, true)).to.eq('{pro}some/{mode}/a.js');
        });
    });
    describe('getAbsDependencyFileList', function () {
        it('should return the correct paths', function () {
            var list = _1.getAbsDependencyFileList(path.resolve(process.cwd(), 'fixtures/src/a.js'), ['pro/dep1', '{pro}/dep3.js', './dep2.js'], {
                pro: 'src/',
            }, path.resolve(process.cwd(), 'fixtures'));
            chai_1.expect(list).to.be.deep.eq([
                path.resolve(process.cwd(), 'fixtures/src/dep1.js'),
                path.resolve(process.cwd(), 'fixtures/src/dep3.js'),
                path.resolve(process.cwd(), 'fixtures/src/dep2.js'),
            ].map(_1.normalizeSlashes));
        });
    });
});
//# sourceMappingURL=index.spec.js.map