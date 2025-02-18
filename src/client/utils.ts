import { cache } from '@overextended/ox_lib/client'
import { wait } from '@common'

// emit a network event tagged for the server
export const sendServer = (event: string, ...args: any[]) => emitNet(`${cache.resource}:server:${event}`, ...args)

// handle a network event tagged for the client
export const handleServer = (event: string, cb: (...args: any[]) => void) => onNet(`${cache.resource}:client:${event}`, cb)

// alternate method for computing a camera direction vector
export const GetCamDirection = () => {
  const heading = Math.PI * (GetGameplayCamRelativeHeading() + GetEntityHeading(PlayerPedId())) / 180
  const pitch = Math.PI * GetGameplayCamRelativePitch() / 180
  const x = -Math.sin(heading)
  const y = Math.cos(heading)
  const z = Math.sin(pitch)
  const len = Math.sqrt(x*x + y*y + z*z)
  return [x/len, y/len, z/len]
}

// preload models
export const loadModel = async (model: string|number) => {
  RequestModel(model)
  while (!HasModelLoaded(model)) await wait(10)
  return
}

// preload animations
export const loadAnimDict = async (animDict: string) => {
  RequestAnimDict(animDict)
  while (!HasAnimDictLoaded(animDict)) await wait(10)
  return
}

let disablingFiring = false

// stop the player from attacking (e.g. when the peek menu is open)
export const disableFiring = async () => {
  disablingFiring = true
  while(disablingFiring) {
    DisablePlayerFiring(PlayerId(), true)
    await wait(0)
  }
}

// re-enable player attacks
export const enableFiring = () => {disablingFiring = false}
