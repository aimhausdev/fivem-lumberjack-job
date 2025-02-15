import { cache } from '@overextended/ox_lib/client'
import Config from '@common/config'

export const print = (...args: any[]) => Config.debug && console.log(...args)

export const sendServer = (event: string, ...args: any[]) => emitNet(`${cache.resource}:server:${event}`, ...args)
export const handleServer = (event: string, cb: (...args: any[]) => void) => onNet(`${cache.resource}:client:${event}`, cb)
