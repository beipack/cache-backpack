import { carryBackpack } from '../index'

describe(carryBackpack, function () {
    let counter = 0
    let version = '0'
    async function sampleFn(arg1: number) {
        counter += 1
        return counter + arg1
    }
    let fnWithBackpack: (arg1: void) => Promise<number>
    let emptyBackpack: () => void

    beforeEach(() => {
        counter = 0
        version = '0'
        const cacheObj = carryBackpack({fn: async () => await sampleFn(10), version: { get: () => version } })
        fnWithBackpack = cacheObj.fnWithBackpack
        emptyBackpack = cacheObj.emptyBackpack
    })

    afterEach(() => {
        emptyBackpack()
    })

    it('should call the underlying provider function on first call', async () => {
        expect(await fnWithBackpack()).toEqual(11)
    })

    it('should use cached value while cache is not bust', async () => {
        expect(await fnWithBackpack()).toEqual(11)
        expect(await fnWithBackpack()).toEqual(11)
        expect(await fnWithBackpack()).toEqual(11)
        expect(await fnWithBackpack()).toEqual(11)
    })

    it('Busting cache should result in provider being called again even when env var not initially set', async () => {
        expect(await fnWithBackpack()).toEqual(11)
        version = '1'
        expect(await fnWithBackpack()).toEqual(12)
    })

    it('emptying cache should result in provider being called again', async () => {
        expect(await fnWithBackpack()).toEqual(11)
        emptyBackpack()
        expect(await fnWithBackpack()).toEqual(12)
    })

    it('should call the underlying provider after cache is busted', async () => {
        expect(await fnWithBackpack()).toEqual(11)
        version = '1'
        expect(await fnWithBackpack()).toEqual(12)
    })

    it('should call underlying provider for different args', async () => {
        let variableCounter = 0
        async function variableExpensiveCall(arg1: string, arg2: string) {
            variableCounter += 1
            return Promise.resolve(
                `processed ${arg1} and ${arg2} with ${variableCounter}`
            )
        }

        const { fnWithBackpack } = carryBackpack({fn: variableExpensiveCall, version: { get: () => version } })

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

    it('should call underlying provider once even for 2 parallel calls', async () => {
        let variableCounter = 0
        async function expensiveCounterCall() {
            await new Promise((f) => {
                setTimeout(f, 10)
            })
            variableCounter += 1
            return variableCounter
        }

        const { fnWithBackpack } = carryBackpack({fn: expensiveCounterCall, version: { get: () => version } })
        const parallelCalls = await Promise.all([
            fnWithBackpack(),
            fnWithBackpack(),
        ])

        expect(parallelCalls[0]).toEqual(1)
        expect(parallelCalls[1]).toEqual(1)
    })

    it('should not cache errors of underlying function', async () => {
        let variableCounter = 0
        const failThenSucceed = () =>
            new Promise((resolve, reject) => {
                setTimeout(() => {
                    variableCounter += 1
                    if (variableCounter === 1) {
                        reject(new Error('1st call fails'))
                    } else {
                        resolve(variableCounter)
                    }
                }, 10)
            })

        const { fnWithBackpack } = carryBackpack({fn: failThenSucceed, version: { get: () => version } })
        const parallelCalls = Promise.all([fnWithBackpack(), fnWithBackpack()])
        await expect(parallelCalls).rejects.toEqual(new Error('1st call fails'))

        // Serial call should avoid the cached error and make a second call.
        expect(await fnWithBackpack()).toEqual(2)
        expect(await fnWithBackpack()).toEqual(2)
    })
})
