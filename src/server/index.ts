import { ulid } from 'ulidx'
import Config from '@common/config'
import { wait } from '@common'
import { addCommand } from '@overextended/ox_lib/server';
import Tree from './Tree'
import TreeManager from './TreeManager';
import { sendClient, handleClient, print } from './utils';

/**
 * script globals
 */

const TM = new TreeManager()
let spawnedLogs: number[] = []

type LumberBoss = { id: number, netId: number, ulid?: string }
let lumberBoss: LumberBoss = { id: 0, netId: 0 }

let tree: Tree

/**
 * utility functions
 */

// clean up everything created by resource
const clearAll = () => {
  TM.clear()
  spawnedLogs.forEach(l => DeleteEntity(l))
  spawnedLogs = []

  if (DoesEntityExist(tree?.id)) DeleteEntity(tree.id)
  tree = null

  if (lumberBoss.id) DeleteEntity(lumberBoss.id)
}

// create quest-giver entity
const spawnBoss = async () => {
  const lumberBossModel = Config.LumberBossModel

  if (DoesEntityExist(lumberBoss.id)) DeleteEntity(lumberBoss.id)

  lumberBoss = { id: 0, netId: 0, ulid: ulid() }

  const { x, y, z, w } = Config.LumberBossCoords
  lumberBoss.id = CreatePed(1, lumberBossModel, x, y, z+1, w, true, true)

  while (!DoesEntityExist(lumberBoss.id)) { await wait(10); print('waiting for ped...') }

  print(`Server spawnBoss() created lumberBoss ped with id=${lumberBoss.id}`)
  lumberBoss.netId = NetworkGetNetworkIdFromEntity(lumberBoss.id)

  print(`Server spawnBoss() NetworkGetEntityFromNetworkId(netId=${lumberBoss.netId}) = ${NetworkGetEntityFromNetworkId(lumberBoss.netId)}`)
  print('Server spawnBoss() has lumberBoss =', JSON.stringify(lumberBoss))

  Entity(lumberBoss.id)?.state?.set('lumberBoss', true, true)
  FreezeEntityPosition(lumberBoss.id, true)

  return lumberBoss
}

// create log pickup after a tree is cut down
const spawnLog = async ([x, y, z]: number[]) => {
  const logId = CreateObjectNoOffset(GetHashKey(Config.Logs[0]), x, y, z+4, true, true, false)

  while (!DoesEntityExist(logId)) await wait(10)

  print(`Server spawned log with id=${logId} at coords [${x}, ${y}, ${z+4}]`)
  spawnedLogs.push(logId)

  SetEntityRotation(logId, 90, 0, 0, 0, false)
  SetEntityVelocity(logId, 3*Math.random(), 3*Math.random(), 4)
  Entity(logId)?.state?.set('lumber', true, true)

  return logId
}

/**
 * commands (TODO: remove all of these)
 */

addCommand('spawnBoss', async (source) => {
  const src = source
  await spawnBoss()
  print(`In server 'spawnBoss' command, source=${src}`)
  print(`Server sending client lumberBoss=${JSON.stringify(lumberBoss)}`)
  sendClient('initLumberBoss', src, lumberBoss)
}, {restricted: false})

addCommand('far', async (source) => {
  const [x, y, z] = [ -665.6239624023438, 3607.78076171875, 296.2198791503906 ]
  SetEntityCoords(GetPlayerPed(`${source}`), x, y, z, false, false, false, false)
}, {restricted: false})

addCommand('trees', async (source) => {
  const [x, y, z] = [ -550.0237426757812, 3080.386962890625, 45.91119384765625 ]
  SetEntityCoords(GetPlayerPed(`${source}`), x, y, z, false, false, false, false)
}, {restricted: false})

addCommand('log', async (source) => {
  const src = source
  print(`Server executing 'log' command and creating a log for player ${src}...`)

  await spawnLog(GetEntityCoords(GetPlayerPed(`${src}`)))
  print(`Server finished spawning a log for player ${src}`)
}, {restricted: false})

/**
 * built-in server event handlers
 */

AddEventHandler('playerJoining', () => {
  const src = source
  print(`Server received 'playerJoining' event with new player id=${src}`)
})

AddEventHandler('onServerResourceStart', async (resource: string) => {
  if (resource !== GetCurrentResourceName()) return
  print(`------------------------------------------------------------------------------------------------------------`)
  print('Starting server aim-lumberjack...')

  await Promise.all([
    spawnBoss(),
    TM.spawnTrees(Config.TreeLocations.Region1),
  ])
})

AddEventHandler('onResourceStop', async (resource: string) => {
  if (resource !== GetCurrentResourceName()) return

  clearAll()
})

/**
 * custom client event handlers
 */

handleClient('init', async () => {
  const src = source
  sendClient('initLumberBoss', src, lumberBoss)
  while (!TM.treesSpawned) await wait(10)
  const trees = TM.serializeTrees()
  sendClient('loadTrees', src, trees)
})

handleClient('initLumberBoss', (bossData: LumberBoss) => {
  const src = source
  print(`Server received 'initLumberBoss' event with bossData=${JSON.stringify(bossData)}`)

  const id = NetworkGetEntityFromNetworkId(bossData.netId)
  print(`Server found bossData.netId=${bossData.netId} -> local entity id=${id}`)

  lumberBoss = { id, netId: bossData.netId, ulid: ulid() }
  Entity(id)?.state?.set('lumberBoss', true, true)
  print(`Final server lumberBoss = ${JSON.stringify(lumberBoss)} and lumberBoss state = {lumberBoss: ${Entity(lumberBoss.id)?.state?.lumberBoss}}`)

  sendClient('lumberBossUlid', src, lumberBoss.ulid) // client can't create ulids because no crypto built-in??? wtf...
})

// TODO: Remove this
handleClient('makeTreePlease', async () => {
  if (tree && DoesEntityExist(tree?.id)) DeleteEntity(tree.id)

  const { x, y, z, } = Config.LumberBossCoords

  tree = new Tree()
  tree.init([x, y, z])

  print(`tree.id=${tree.id}`)
})

handleClient('cutDownTree', async (treeNetId: number) => {
  const src = source
  print(`Server received 'cutDownTree' event from src=${src} with treeNetId=${treeNetId}`)
  const treeId = NetworkGetEntityFromNetworkId(treeNetId)

  TM.cutDown(treeId, true, true)
  const logId = await spawnLog(GetEntityCoords(treeId))
  await wait(5000)
  FreezeEntityPosition(logId, true)
})

handleClient('pickUpLog', async (logNetId: number) => {
  const src = source
  const id = NetworkGetEntityFromNetworkId(logNetId)
  print(`Server picking up logId=${id} (netId=${logNetId}) for client ${src}`)
  DeleteEntity(id)
  spawnedLogs = spawnedLogs.filter(l => l !== id)
})
