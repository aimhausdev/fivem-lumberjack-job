import { cache } from '@overextended/ox_lib/server';
import Config from '@common/config'

// debug print
export const print = (...args: any[]) => Config.debug && console.log(...args)

// wrapper for sending events to client
export const sendClient = (event: string, destination: number, ...args: any[]) => emitNet(`${cache.resource}:client:${event}`, destination, ...args)

// wrapper for handling events sent from client
export const handleClient = (event: string, cb: (...args: any[]) => void) => onNet(`${cache.resource}:server:${event}`, cb)
