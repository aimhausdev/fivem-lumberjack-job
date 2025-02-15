import { cache } from '@overextended/ox_lib/client'
import Config from '@common/config'

export const print = (...args: any[]) => Config.debug && console.log(...args)

export const sendServer = (event: string, ...args: any[]) => emitNet(`${cache.resource}:server:${event}`, ...args)

export const handleServer = (event: string, cb: (...args: any[]) => void) => onNet(`${cache.resource}:client:${event}`, cb)

export const GetCamDirection = () => {
  const heading = Math.PI * (GetGameplayCamRelativeHeading() + GetEntityHeading(PlayerPedId())) / 180
  const pitch = Math.PI * GetGameplayCamRelativePitch() / 180
  const x = -Math.sin(heading)
  const y = Math.cos(heading)
  const z = Math.sin(pitch)
  const len = Math.sqrt(x*x + y*y + z*z)
  return [x/len, y/len, z/len]
}
