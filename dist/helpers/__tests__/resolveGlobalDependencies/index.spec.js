"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var getProjectInfo_1 = require("./../../getProjectInfo");
var chai_1 = require("chai");
var path = require("path");
var helpers_1 = require("../../../helpers");
var resolveGlobalDependencies_1 = require("../../resolveGlobalDependencies");
var index_1 = require("../../../__tests__/utils/index");
describe('resolveGlobalDependencies', function () {
    it('should be ok', function () {
        return resolveGlobalDependencies_1.resolveGlobalDependencies(getProjectInfo_1.getProjectInfo({
            exclude: ['**/lib/**'],
            projectDir: index_1.getFixtureDir(),
            nejPathAliases: {
                pro: 'src/',
            },
        })).then(function (projectInfo) {
            var depListPath = projectInfo.filePathMap[helpers_1.normalizeSlashes(path.resolve(process.cwd(), 'fixtures/src/a.js'))]
                .dependencyFileListPath;
            chai_1.expect(depListPath).to.not.be.undefined;
            if (typeof depListPath !== 'undefined') {
                chai_1.expect(depListPath.node.elements).to.have.length(3);
                chai_1.expect(depListPath.node.elements.map(function (e) { return e.value; })).to.deep.eq([
                    '{pro}dep1.js',
                    '{pro}dep2.js',
                    '{pro}dep3.js',
                ]);
            }
        });
    });
});
//# sourceMappingURL=index.spec.js.map