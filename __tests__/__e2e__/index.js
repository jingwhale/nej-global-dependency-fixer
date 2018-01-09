var {
    run
} = require('./../../dist');
var path = require('path');

run({
    exclude: [
        '**/{deploy,lib,mail_template,mock,node_modules,pub,res,tool}/**',
    ],
    noWrite: /javascript[\\/]+lib/,
    projectDir: path.resolve(__dirname, '../../../front-study-cp'),
    nejPathAliases: {
        pro: '/src/cp/javascript/',
        eutil: '/lib/edu-front-util/src/',
        pool: '/lib/',
        eui: '/node_modules/@study/edu-front-ui/src/js/',
        rui: '/node_modules/@study/edu-front-regularUI/src/js/',
        edu: '/src/edu/javascript/',
        config: '/lib/cache-config/src/cp/'
    },
    logFilename: path.resolve(__dirname, `../../logs/${Date.now()}.log`),
    logLevels: [
        'error',
        'info',
        'warning',
        'debug'
    ],
    promptConflict: true,
    conflictResolutionStrategy: function (file, conflicts, symbol) {
        var filePathSp = file.filePath.split('/');
        var noResolve = true;

        for (var i = 0, l = conflicts.length, fp; i < l; i++) {
            fp = conflicts[i].filePath;

            if (symbol.propertyName === '_$addEvent' ||
                symbol.propertyName === '_$clearEvent' ||
                symbol.propertyName === '_$dispatchEvent' ||
                symbol.propertyName === '_$delEvent') {
                if (/nej\/src\/base\/event\.js/.test(fp)) {
                    return conflicts[i];
                }
            } else if (symbol.propertyName === '_$getHtmlTemplate') {
                if (/nej\/src\/util\/template\/jst\.js/.test(fp)) {
                    return conflicts[i];
                }
            } else if (symbol.propertyName === '_$getCurServerTime' ||
                symbol.propertyName === '_$formatCommonTime' ||
                symbol.propertyName === '_$formatVideoTime') {
                if (/timeUtil\.js/.test(fp)) {
                    return conflicts[i];
                }
            } else {
                var conSp = fp.split('/');

                if (conSp[conSp.length - 1] !== filePathSp[filePathSp.length - 1]) {
                    noResolve = false;
                    break;
                }
            }
        }

        if (noResolve) {
            return false;
        }
    }
});