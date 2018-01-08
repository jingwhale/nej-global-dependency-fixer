import * as path from 'path';

export function getFixtureDir() {
    return path.resolve(process.cwd(), 'fixtures');
}
