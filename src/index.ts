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
  /* each Item is tagged with a version. if get() does not match item version, requestPromise again */
  version?: {
    get: () => string; // cb() to get the latest version of the item
    initial?: string; // initial version number. if left empty, String(Date.now()) should be the default
  }
  makeNoise?: boolean;
}

export function carryBackpack<T extends (...args: any[]) => Promise<any>>(
  params: CarryBackpackParams<T>
): FnWithBackpack<T> {
  const { fn, version, makeNoise } = params;
  const initialVersion = version?.initial ?? String(Date.now());
  const backpack = new Map<string, Item<Awaited<ReturnType<T>>>>();

  const fnWithBackpack = (async (...args) => {
    const serializedArgs = JSON.stringify(args);

    const item = backpack.get(serializedArgs);

    /* backpack item-versioning */
    const itemCachedVersion = item?.version ?? initialVersion;
    const itemActualVersion = version ? version.get() : initialVersion;
    /* default to false if user did not opt-in to versioning */
    const itemOutdated = version ? itemCachedVersion !== itemActualVersion : false;

    // if backpack does not have this entry or item outdated
    if (!backpack.has(serializedArgs) || itemOutdated) {
      if (makeNoise) console.log("Cache version is outdated.");

      const requestPromise = fn(...args);
      backpack.set(serializedArgs, {
        val: requestPromise,
        version: itemActualVersion,
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

  function emptyBackpack() {
    backpack.clear();
  }

  return { fnWithBackpack, emptyBackpack };
}
