interface FunctionWithBackpack<T extends (...args: any) => Promise<any>> {
    functionWithBackpack: (...args: Parameters<T>) => Promise<Awaited<T>>;
    emptyBackpack: () => void;
}
export declare function carryBackpack<T extends (...args: any[]) => Promise<any>>(fn: T, getLatestItemVersion: () => string, initialVersion?: string, makeNoise?: boolean): FunctionWithBackpack<T>;
export {};
