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

    /* backpack-item versioning */
    let itemOutdated = false
    let currVersion, nextVersion = initialVersion;

    if (version) {
      /* if user has opt-in to versioning, compare curr and next versions. */
      currVersion = backpack.get(serializedArgs)?.version ?? initialVersion;
      nextVersion = version.get();
      itemOutdated = currVersion !== nextVersion;
    }

    if (itemOutdated) {
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

  function emptyBackpack() {
    backpack.clear();
  }

  return { fnWithBackpack, emptyBackpack };
}
