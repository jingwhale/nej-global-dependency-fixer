import * as bluebird from 'bluebird';

export function asyncForEach<T>(arr: T[], fn: (val: T, index?: number) => Promise<void>) {
    let p = bluebird.Promise.resolve();

    for (let i = 0, l = arr.length; i < l; i++) {
        p = p.then(
            (index => {
                return () => {
                    return fn(arr[index], index) as any;
                };
            })(i),
        );
    }

    return p.catch(err => err);
}
