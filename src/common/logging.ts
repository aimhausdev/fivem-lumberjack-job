import Config from './config'

export const _print = (...args: any[]) => Config.debug && console.log(...args)

// utility function to interweave two arrays: _weave([1, 2, 3, 4], [a, b]) -> [1, a, 2, b, 3, 4]
const _weave = (a: TemplateStringsArray, b: any[]) => {
  const out: any[] = []
  let i = 0
  let j = 0
  while (i < a.length || j < b.length) {
    if (i < a.length) out.push(a[i])
    if (j < b.length) out.push(b[j])
    i++
    j++
  }
  return out
}

/**
 * More useful debug logging with template tags. Example:
 * 
 * INFO`Here's some useful info...`
 * ERROR`You done fucked it up: ${error}`
 */

export const INFO = (strings: TemplateStringsArray, ...args: any[]) => Config.debug && console.log(` [INFO] [${(new Date()).toISOString()}] ${_weave(strings, args).join('')}`)

export const WARN = (strings: TemplateStringsArray, ...args: any[]) => Config.debug && console.warn(` [WARN] [${(new Date()).toISOString()}] ${_weave(strings, args).join('')}`)

export const ERROR = (strings: TemplateStringsArray, ...args: any[]) => Config.debug && console.error(`[ERROR] [${(new Date()).toISOString()}] ${_weave(strings, args).join('')}`)

export const print = (...args: any[]) => INFO([] as unknown as TemplateStringsArray, [args.join(' ')])
