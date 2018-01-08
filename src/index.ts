import * as path from 'path';
import * as fs from 'fs';
import * as generator from 'babel-generator';
import * as mkdirp from 'mkdirp';
import { normalizeSlashes } from './helpers';
import { IOptions } from './types';
import { logger } from './utils/logger';
import { resolveGlobalDependencies } from './helpers/resolveGlobalDependencies';
import { getProjectInfo } from './helpers/getProjectInfo';

export function run(options: IOptions) {
    if (options.logLevels) {
        logger.levels = options.logLevels;
    }

    return resolveGlobalDependencies(getProjectInfo(options)).then(pi => {
        const projectInfo = pi;

        for (const file of projectInfo.files) {
            if (!options.noWrite || !options.noWrite.test(file.filePath)) {
                const code = generator.default(file.ast, {
                    comments: true,
                    minified: false,
                });

                const outDir = options.outDir || options.projectDir;
                const filePath = path.resolve(
                    outDir,
                    file.filePath.replace(normalizeSlashes(projectInfo.projectDir) + '/', ''),
                );

                mkdirp.sync(path.dirname(filePath));
                fs.writeFileSync(filePath, code.code, {
                    encoding: 'utf-8',
                });
            }
        }

        for (const error of projectInfo.errors) {
            logger.error(error.message);
        }

        for (const warning of projectInfo.warningLogs) {
            logger.warning(warning);
        }

        if (options.logFilename) {
            logger.logToFile(options.logFilename);
        }
    });
}
