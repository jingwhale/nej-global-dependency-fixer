"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var getProjectInfo_1 = require("./../../getProjectInfo");
var chai_1 = require("chai");
var index_1 = require("../../../__tests__/utils/index");
describe('getProjectInfo', function () {
    it('should have no errors', function () {
        var projectInfo = getProjectInfo_1.getProjectInfo({
            exclude: ['**/lib/**'],
            projectDir: index_1.getFixtureDir(),
            nejPathAliases: {
                pro: 'src/',
            },
        });
        chai_1.expect(projectInfo.files).to.have.length(7);
        chai_1.expect(projectInfo.symbolMap).to.have.keys([
            'edu.u/some/1',
            'edu.e/some/1',
            'edu.u/CONST/1',
            'edu.u/some1/1',
            'edu.u/v/1',
            'edu.u/same/1',
            'edu.u/fn/1',
            'edu.u/fn2/1',
            'edu.u/fn2/2',
            'edu.u/fn1/1',
            'edu.u/fn/0',
            'edu.u/fn1/0',
            'edu.u/fn2/0',
            'edu.u/v/0',
            'edu.c/a/1',
            'edu.c/b/1',
            'edu.c1/a/1',
            'edu.c1/b/1',
            'edu.c2/a/1',
            'edu.c2/b/1',
            'edu.c2/c/2',
            'edu.c2/c/0',
        ]);
        chai_1.expect(projectInfo.symbolMap['edu.u/same/1']).to.have.length(2);
    });
});
//# sourceMappingURL=index.spec.js.map