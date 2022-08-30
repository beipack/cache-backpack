```                                                
   (                 )                       )  
 ( )\     )       ( /(            )       ( /(  
 )((_) ( /(   (   )\()) `  )   ( /(   (   )\()) 
((_)_  )(_))  )\ ((_)\  /(/(   )(_))  )\ ((_)\  
 | _ )((_)_  ((_)| |(_)((_)_\ ((_)_  ((_)| |(_) 
 | _ \/ _` |/ _| | / / | '_ \)/ _` |/ _| | / /  
 |___/\__,_|\__| |_\_\ | .__/ \__,_|\__| |_\_\  
                       |_|                   
```
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/beipack/cache-backpack/blob/master/LICENSE.md)

`cache-backpack` is a higher order function designed to empower your functions with helpful closures.

```typescript
async function fnThatFetchesSomething(secretName: string) {
  // let's say your function costs money to call or takes really long to complete
  // let's say your function always returns the same value
  // you DO NOT want to accidentally call this function many times right?
  return await aws.getSecretValue(secretName)
}

/* let's give that function our "backpack"! once the "backpack" is on, you no longer need to worry about calling it many times!  */
const { fnWithBackpack } = carryBackpack({fn: fnThatFetchesSomething})
await fnWithBackpack('dirty secret') // 1st call
await fnWithBackpack('dirty secret') // 2nd call
await fnWithBackpack('dirty secret') // 3rd call

/* although fnWithBackpack is called 3 times, only the 1st call actually executes fnThatFetchesSomething('dirty secret')!!
the 1st call "caches" the returned value. subsequent 2nd, 3rd, 4th...nth time will return the "cached" value as long as the
same argument of 'dirty secret' is given!
*/

await fnWithBackpack('victoria secret') //  hey the arg is different! now fnThatFetchesSomething() is called once more
```