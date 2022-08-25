import { carryBackpack } from '../index'


describe(carryBackpack, function () {
    /* declaring the many diff types of functions / scenarios */
    let fnCounter = 0
    async function fn(arg1: number) {
        fnCounter += 1
        return fnCounter + arg1
    }

    let multiArgFnCounter = 0
    async function multiArgFn(arg1: string, arg2: string) {
        multiArgFnCounter += 1
        return Promise.resolve(
            `processed ${arg1} and ${arg2} with ${multiArgFnCounter}`
        )
    }

    let slowFnCounter = 0
    async function slowFn() {
        await new Promise((f) => {
            setTimeout(f, 10)
        })
        slowFnCounter += 1
        return slowFnCounter
    }

    let failingFnCounter = 0
    async function failingFn() {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                failingFnCounter += 1
                if (failingFnCounter === 1) reject(new Error('1st call fails'))
                else resolve(failingFnCounter)
            }, 10)
        })
    }

    afterEach(() => {
        /* reset environment */
        fnCounter = 0
        multiArgFnCounter = 0
        slowFnCounter = 0
        failingFnCounter = 0
        jest.useRealTimers()
    })

    describe('plain ol backpack.', () => {        
        it('simple fn, should use cached values', async () => {
            const { fnWithBackpack, emptyBackpack, throwItem } = carryBackpack({ fn })
            expect(await fnWithBackpack(10)).toEqual(11)
            expect(await fnWithBackpack(10)).toEqual(11)
            emptyBackpack()
            expect(await fnWithBackpack(10)).toEqual(12)
            expect(await fnWithBackpack(10)).toEqual(12)
            throwItem(10)
            expect(await fnWithBackpack(10)).toEqual(13)
            expect(await fnWithBackpack(10)).toEqual(13)
        })
    })

    describe('backpack with expiry.', () => {
        it('backpack set with ttl of 10 seconds, should use cached value and update when item expired', async () => {
            jest.useFakeTimers().setSystemTime(new Date('2000-01-01T00:00:00'));
            const { fnWithBackpack, emptyBackpack, throwItem } = carryBackpack({fn, expiry: { ttl: 10 }})
            expect(await fnWithBackpack(10)).toEqual(11)
            expect(await fnWithBackpack(10)).toEqual(11)
            jest.useFakeTimers().setSystemTime(new Date('2000-01-01T00:00:11'));
            expect(await fnWithBackpack(10)).toEqual(12)
            expect(await fnWithBackpack(10)).toEqual(12)
            emptyBackpack()
            expect(await fnWithBackpack(10)).toEqual(13)
            expect(await fnWithBackpack(10)).toEqual(13)
            throwItem(10)
            expect(await fnWithBackpack(10)).toEqual(14)
            expect(await fnWithBackpack(10)).toEqual(14)
        })
    })

    describe('various scenarios', () => {
        const runs = [
            {name: 'plain ol backpack', options: {}},
            {name: 'backpack with expiry', options: { expiry: { ttl: 10 } }},
        ];

        runs.forEach(run => {
            it(`${run.name}| fn that takes in single arg, throwItem() should only affect a single item`, async () => {    
                const { fnWithBackpack, throwItem } = carryBackpack({fn, ...run.options })
        
                expect(await fnWithBackpack(10)).toEqual(11)
                expect(await fnWithBackpack(10)).toEqual(11)
                expect(await fnWithBackpack(20)).toEqual(22)
                expect(await fnWithBackpack(20)).toEqual(22)

                throwItem(10)
                expect(await fnWithBackpack(20)).toEqual(22) // count does not increment
                expect(await fnWithBackpack(10)).toEqual(13) // count increments
                expect(await fnWithBackpack(20)).toEqual(22) // still does not increment

                throwItem(20)
                expect(await fnWithBackpack(10)).toEqual(13) // count does not increment
                expect(await fnWithBackpack(20)).toEqual(24) // now count increments
                expect(await fnWithBackpack(10)).toEqual(13) // still does not increment
            })
        })

        runs.forEach(run => {
            it(`${run.name}| fn that takes in multiple values, should cache for each unique set of args`, async () => {    
                const { fnWithBackpack } = carryBackpack({fn: multiArgFn, ...run.options })
        
                expect(await fnWithBackpack('sheep', 'goat')).toEqual(
                    'processed sheep and goat with 1'
                )
                expect(await fnWithBackpack('cow', 'cow')).toEqual(
                    'processed cow and cow with 2'
                )
                expect(await fnWithBackpack('sheep', 'cow')).toEqual(
                    'processed sheep and cow with 3'
                )
                expect(await fnWithBackpack('sheep', 'goat')).toEqual(
                    'processed sheep and goat with 1'
                )
            })
        })

        runs.forEach(run => {
            it(`${run.name}| slow fn, should invoke once for 2 parallel calls`, async () => {    
                const { fnWithBackpack } = carryBackpack({fn: slowFn, ...run.options })
        
                const parallelCalls = await Promise.all([
                    fnWithBackpack(),
                    fnWithBackpack(),
                ])
        
                expect(parallelCalls[0]).toEqual(1)
                expect(parallelCalls[1]).toEqual(1)
            })
        })

        runs.forEach(run => {
            it(`${run.name}| fn that errors out on 1st call, should ignore failed call`, async () => {
                const { fnWithBackpack } = carryBackpack({fn: failingFn, ...run.options })
                const parallelCalls = Promise.all([fnWithBackpack(), fnWithBackpack()])
                await expect(parallelCalls).rejects.toEqual(new Error('1st call fails'))
        
                // Serial call should avoid the cached error and make a second call.
                expect(await fnWithBackpack()).toEqual(2)
                expect(await fnWithBackpack()).toEqual(2)
            })
        })
    
    })
})
