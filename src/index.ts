interface Item<T> {
  val: Promise<T>;
  version: string;
}

interface FnWithBackpack<T extends (...args: any) => Promise<any>> {
  fnWithBackpack: T;
  emptyBackpack: () => void;
}

export interface CarryBackpackParams<
  T extends (...args: any[]) => Promise<any>
> {
  fn: T;
  getLatestItemVersion: () => string;
  initialVersion?: string;
  makeNoise?: boolean;
}
export function carryBackpack<T extends (...args: any[]) => Promise<any>>(
  params: CarryBackpackParams<T>
): FnWithBackpack<T> {
  if (!params.initialVersion) params.initialVersion = String(Date.now());
  const { fn, getLatestItemVersion, initialVersion, makeNoise } = params;
  const backpack = new Map<string, Item<Awaited<ReturnType<T>>>>();

  const fnWithBackpack = (async (...args) => {
    const serializedArgs = JSON.stringify(args);

    const currVersion = backpack.get(serializedArgs)?.version ?? initialVersion;
    const nextVersion = getLatestItemVersion();

    if (currVersion !== nextVersion) {
      if (makeNoise) console.log("Cache version is outdated.");

      const requestPromise = fn(...args);
      backpack.set(serializedArgs, {
        val: requestPromise,
        version: nextVersion,
      });
    }

    // Erase cache if the cached value is an error.
    const promisedValue = backpack.get(serializedArgs)?.val;
    try {
      return await promisedValue;
    } catch (error) {
      if (makeNoise) console.log("Underlying promise was rejected");
      backpack.delete(serializedArgs);
      return promisedValue;
    }
  }) as T;

  return { fnWithBackpack, emptyBackpack: () => () => backpack.clear() };
}
