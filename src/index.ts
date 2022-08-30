interface Item<T> {
  val: Promise<T>;
  lastRetrieved: number;
}

interface FnWithBackpack<T extends (...args: any) => Promise<any>> {
  fnWithBackpack: T;
  emptyBackpack: () => void;
  throwItem: (...args: Parameters<T>) => void;
}

export interface CarryBackpackParams<
  T extends (...args: any[]) => Promise<any>
> {
  fn: T;
  expiry?: { ttlInSec: number }
  makeNoise?: boolean;
}

export function carryBackpack<T extends (...args: any[]) => Promise<any>>(
  params: CarryBackpackParams<T>
): FnWithBackpack<T> {
  const { fn, expiry, makeNoise } = params;
  const backpack = new Map<string, Item<Awaited<ReturnType<T>>>>();

  const fnWithBackpack = (async (...args) => {
    const serializedArgs = JSON.stringify(args);
    const item = backpack.get(serializedArgs);

    const currentTs = Date.now(); // in miliseconds
    const lastRetrieved = item?.lastRetrieved ?? 0;
    const itemExpired = !expiry ? false : lastRetrieved + expiry.ttlInSec * 1000 <= currentTs;

    // if backpack does not have this entry or item expired
    if (!backpack.has(serializedArgs) || itemExpired) {
      if (makeNoise) {
        if (itemExpired) console.log("item has expired... calling function");
        else console.log("Cache miss... calling function");
      }

      const requestPromise = fn(...args);
      backpack.set(serializedArgs, {
        val: requestPromise,
        lastRetrieved: currentTs,
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

  function throwItem(...args: Parameters<T>) {
    const serializedArgs = JSON.stringify(args);
    backpack.delete(serializedArgs);
  }

  return { fnWithBackpack, emptyBackpack, throwItem };
}
