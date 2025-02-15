import { cache } from '@overextended/ox_lib/server';
import Config from '@common/config'

export const print = (...args: any[]) => Config.debug && console.log(...args)

export const sendClient = (event: string, destination: number, ...args: any[]) => emitNet(`${cache.resource}:client:${event}`, destination, ...args)
export const handleClient = (event: string, cb: (...args: any[]) => void) => onNet(`${cache.resource}:server:${event}`, cb)
