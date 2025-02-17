import { ulid } from 'ulidx'
import Config from '@common/config'
import { print, wait } from '@common'

type LumberBoss = { id: number, netId: number, ulid?: string }
let lumberBoss: LumberBoss = { id: 0, netId: 0 }
let spawnedLogs: number[] = []

const _deleteIfExists = (id: number) => {if (DoesEntityExist(id)) DeleteEntity(id)}

// create quest-giver entity
export const spawnBoss = async () => {
  const lumberBossModel = Config.LumberBossModel

  // if (DoesEntityExist(lumberBoss.id)) DeleteEntity(lumberBoss.id)
  _deleteIfExists(lumberBoss.id)

  lumberBoss = { id: 0, netId: 0, ulid: ulid() }

  const { x, y, z, w } = Config.LumberBossCoords
  lumberBoss.id = CreatePed(1, lumberBossModel, x, y, z+1, w, true, true)

  while (!DoesEntityExist(lumberBoss.id)) await wait(10)

  print(`Server spawnBoss() created lumberBoss ped with id=${lumberBoss.id}`)
  lumberBoss.netId = NetworkGetNetworkIdFromEntity(lumberBoss.id)

  print(`Server spawnBoss() NetworkGetEntityFromNetworkId(netId=${lumberBoss.netId}) = ${NetworkGetEntityFromNetworkId(lumberBoss.netId)}`)
  print('Server spawnBoss() has lumberBoss =', JSON.stringify(lumberBoss))

  Entity(lumberBoss.id)?.state?.set('lumberBoss', true, true)
  FreezeEntityPosition(lumberBoss.id, true)

  return lumberBoss
}

// create log pickup after a tree is cut down
export const spawnLog = async ([x, y, z]: number[]) => {
  const logId = CreateObjectNoOffset(GetHashKey(Config.Logs[0]), x, y, z+4, true, true, false)

  while (!DoesEntityExist(logId)) await wait(10)

  print(`Server spawned log with id=${logId} at coords [${x}, ${y}, ${z}]`)
  spawnedLogs.push(logId)

  SetEntityRotation(logId, 90, 0, 0, 0, false)
  SetEntityVelocity(logId, 3*Math.random(), 3*Math.random(), 4)
  Entity(logId)?.state?.set('lumber', true, true)

  return logId
}

export const clearSpawns = () => {
  spawnedLogs.forEach(_deleteIfExists)
  _deleteIfExists(lumberBoss.id)
}
