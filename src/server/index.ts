import { ulid } from 'ulidx'
import Config from '@common/config'
import { wait, print } from '@common'
import Tree from './Tree'
import TreeManager from './TreeManager'
import { sendClient, handleClient } from './utils'
import { spawnBoss, spawnLog, clearSpawns } from './spawn'

export * from './sandbox'

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
  
  clearSpawns()
}

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

  const [ped, ] = await Promise.all([
    spawnBoss(),
    TM.spawnTrees(Config.TreeLocations.Region1),
  ])

  lumberBoss = ped
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
