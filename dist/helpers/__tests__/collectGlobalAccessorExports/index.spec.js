"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var collectGlobalAccessorExports_1 = require("./../../collectGlobalAccessorExports");
var chai_1 = require("chai");
var path = require("path");
var getProjectInfo_1 = require("./../../getProjectInfo");
var index_1 = require("../../../__tests__/utils/index");
var index_2 = require("../../index");
describe('nej-global-dependency-fixer helpers - collectGlobalAccessorExports', function () {
    var projectInfo;
    function expectFile(filename, exportCount, exportedMembers) {
        var filePath = index_2.normalizeSlashes(path.resolve(index_1.getFixtureDir(), filename));
        it("should have the correct number of exports for " + filePath, function () {
            var file = projectInfo.filePathMap[filePath];
            chai_1.expect(file).to.have.property('export').that.is.not.undefined;
            chai_1.expect(file.export)
                .to.have.property('exportedMembers')
                .that.has.length(exportCount);
            chai_1.expect(file.export.exportedMembers.map(function (e) { return e.identifier.name + "|" + e.namespace; })).to.deep.eq(exportedMembers);
        });
    }
    it('should collect the correct exported members and have no errors', function () {
        projectInfo = getProjectInfo_1.getProjectInfo({
            exclude: ['**/lib/**'],
            projectDir: index_1.getFixtureDir(),
            nejPathAliases: {
                pro: 'src/',
            },
            removeNejP: true,
        });
        collectGlobalAccessorExports_1.collectGlobalAccessorExports(projectInfo);
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
//# sourceMappingURL=index.spec.js.map