import * as chalk from 'chalk';
import * as mkdirp from 'mkdirp';
import * as path from 'path';
import * as fs from 'fs';
import * as Chance from 'chance';

const chance = new Chance();

export type LogLevel = 'error' | 'info' | 'warning' | 'debug';

export class Logger {
    private levelMap: { [key: string]: boolean };
    private mark: string;
    private markColor: string;
    private logs: string;

    constructor(levels: LogLevel[], mark: string = '') {
        this.setLevels(levels);
        this.logs = '';
        this.mark = mark;
        this.markColor = chance.color({
            format: 'hex',
        });
    }

    public set levels(val: LogLevel[]) {
        this.setLevels(val);
    }

    public info(...messages: any[]): void {
        this.log('info', 'blue', ...messages);
    }

    public error(...messages: any[]): void {
        this.log('error', 'red', ...messages);
    }

    public warning(...messages: any[]): void {
        this.log('warning', 'yellow', ...messages);
    }

    public debug(...messages: any[]): void {
        this.log('debug', 'magenta', ...messages);
    }

    public logToFile(p: string): void {
        mkdirp.sync(path.dirname(p));
        fs.writeFileSync(p, this.logs, {
            encoding: 'utf-8',
        });
    }

    private log(level: LogLevel, color: string, ...messages: any[]): void {
        if (this.levelMap[level]) {
            messages.push('\n', '\n');

            console.log.call(
                console,
                chalk.default.keyword(color)(`${level}: `),
                chalk.default.hex(this.markColor)(this.mark),
                ...messages,
            );
            this.logs += `${level}: ` + messages.join(' ');
        }
    }

    private setLevels(levels: any[]) {
        this.levelMap = {};

        for (const level of levels) {
            this.levelMap[level] = true;
        }
    }
}

export const logger = new Logger(['error', 'debug', 'info', 'warning']);
