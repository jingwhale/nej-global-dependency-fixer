"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var collectGlobalAccessorExports_1 = require("./../../collectGlobalAccessorExports");
var resolveGlobalDependencies_1 = require("./../../resolveGlobalDependencies");
var removeGlobalAccessors_1 = require("./../../removeGlobalAccessors");
var getProjectInfo_1 = require("./../../getProjectInfo");
var index_1 = require("../../../__tests__/utils/index");
describe('nej-global-dependency-fixer helpers - collectGlobalAccessorExports', function () {
    var projectInfo;
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
    it('should resolve all global accessors and have no errors', function () {
        return resolveGlobalDependencies_1.resolveGlobalDependencies(projectInfo);
    });
    it('should remove all global accessors and have no errors', function () {
        removeGlobalAccessors_1.removeGlobalAccessors(projectInfo);
        projectInfo.errors.forEach(function (e) { return console.log(e); });
    });
});
//# sourceMappingURL=index.spec.js.map