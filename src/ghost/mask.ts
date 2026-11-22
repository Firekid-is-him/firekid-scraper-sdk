/*
 * Runs inside the page. Makes patched functions report themselves as native
 * code through Function.prototype.toString. Serialised with toString() and
 * called in the page, so it must stay free of imports and outer references.
 */
export function createMask(): (target: any, name: string, length?: number) => any {
  const registry = new WeakMap<object, string>()
  const nativeToString = Function.prototype.toString

  const patched = new Proxy(nativeToString, {
    apply(target, thisArg, args) {
      const known = typeof thisArg === 'function' ? registry.get(thisArg) : undefined
      return known !== undefined ? known : Reflect.apply(target, thisArg, args)
    }
  })

  Object.defineProperty(Function.prototype, 'toString', {
    value: patched,
    writable: true,
    configurable: true,
    enumerable: false
  })
  registry.set(patched, 'function toString() { [native code] }')

  return (target: any, name: string, length?: number) => {
    try {
      Object.defineProperty(target, 'name', { value: name, configurable: true })
      if (length !== undefined) Object.defineProperty(target, 'length', { value: length, configurable: true })
    } catch {
      // name and length are only cosmetic
    }
    registry.set(target, `function ${name}() { [native code] }`)
    return target
  }
}

export type Mask = (target: any, name: string, length?: number) => any

export function injectWithMask<T>(fn: (arg: T, mask: Mask) => void, arg: T): string {
  return `(${fn.toString()})(${JSON.stringify(arg)}, (${createMask.toString()})())`
}
