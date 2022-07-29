interface Item<T> {
  val: Promise<T>;
  version: string;
}

interface FunctionWithBackpack<T extends (...args: any) => Promise<any>> {
  functionWithBackpack: (...args: Parameters<T>) => Promise<Awaited<T>>;
  emptyBackpack: () => void;
}

export function carryBackpack<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  getLatestItemVersion: () => string,
  initialVersion = String(Date.now()),
  makeNoise = false
): FunctionWithBackpack<T> {
  const backpack = new Map<string, Item<Awaited<T>>>();

  const functionWithBackpack = async (
    ...args: Parameters<T>
  ): Promise<Awaited<T>> => {
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
    const promisedValue = backpack.get(serializedArgs)?.val as ReturnType<T>;
    try {
      return await promisedValue;
    } catch (error) {
      if (makeNoise) console.log("Underlying promise was rejected");
      backpack.delete(serializedArgs);
      return promisedValue;
    }
  };

  function emptyBackpack() {
    backpack.clear();
  }

  return { functionWithBackpack, emptyBackpack };
}
