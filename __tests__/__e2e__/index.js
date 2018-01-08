var {
    run
} = require('./../../dist');
var path = require('path');

run({
    exclude: [
        '**/{deploy,mock,pub,lock,coverage,tools,test,res,node_modules,resources,s,template,h,regularui}/**',
    ],
    noWrite: /javascript[\\/]+lib/,
    projectDir: path.resolve(__dirname, '../../../front-study'),
    nejPathAliases: {
        pro: 'src/main/webapp/src/javascript/web/',
        eutil: 'src/main/webapp//lib/edu-front-util/src/',
        pool: 'src/main/webapp//lib/',
        core: 'src/main/webapp//src/javascript/core/',
        config: 'src/main/webapp//src/javascript/config/'
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