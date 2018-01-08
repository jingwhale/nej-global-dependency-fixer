import { asyncForEach } from './../async';
import { expect } from 'chai';
import * as bluebird from 'bluebird';

describe('Utils async', () => {
    describe('asyncForEach', () => {
        it('should loop in order', () => {
            const arr = [1, 2, 3];
            const res: number[] = [];

            return asyncForEach(arr, val => {
                return new bluebird.Promise(resolve => {
                    setTimeout(() => {
                        res.push(val);
                        resolve();
                    }, 1000);
                });
            }).then(() => {
                expect(res).to.deep.eq([1, 2, 3]);
            });
        });
    });
});
