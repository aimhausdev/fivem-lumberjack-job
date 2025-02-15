import { ulid } from 'ulidx'
import Config from '@common/config'
import { wait } from '@common'
import { addCommand, cache } from '@overextended/ox_lib/server';
import Tree from './Tree'
import TreeManager from './TreeManager';
import { sendClient, handleClient, print } from './utils';

// const print = (...args: any[]) => Config.debug && console.log(...args)

const TM = new TreeManager()

let spawnedLogs: number[] = []

const clearAll = () => {
  // clearObjects()
  // clearTrees()
  TM.clear()
  spawnedLogs.forEach(l => DeleteEntity(l))
  spawnedLogs = []
}

// if (Config.EnableNuiCommand) {
//   addCommand('openNui', async (playerId) => {
//     if (!playerId) return;

//     emitNet(`${cache.resource}:openNui`, playerId);
//   });
// }

type LumberBoss = { id: number, netId: number, ulid?: string }
let lumberBoss: LumberBoss = { id: 0, netId: 0 }
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
  // SetEntityInvincible(lumberBossPed, true)
  // SetBlockingOfNonTemporaryEvents(lumberBossPed, true)

  return lumberBoss
}

// handleClient(`init`, (...args: any[]) => {
//   console.log(`received event = '${cache.resource}:server:init', args=${args}`)
//   sendClient('loadTrees', source, ['tree 1', 'tree 2'])
//   // const { x, y, z, } = Config.LumberBossCoords
//   // const tree = new Tree().init([x, y, z])
// })

const spawnLog = async ([x, y, z]: number[]) => {
  // const src = source
  // print(`Server executing 'log' command and creating some logs for player ${src}...`)
  // const [x, y, z] = GetEntityCoords(GetPlayerPed(`${src}`))
  const logId = CreateObjectNoOffset(GetHashKey(Config.Logs[0]), x, y, z+4, true, true, false)
  while (!DoesEntityExist(logId)) await wait(10)
  print(`Server spawned log with id=${logId} at coords [${x}, ${y}, ${z+4}]`)
  spawnedLogs.push(logId)
  // FreezeEntityPosition(logId, true)
  SetEntityRotation(logId, 90, 0, 0, 0, false)
  SetEntityVelocity(logId, 3*Math.random(), 3*Math.random(), 4)
  Entity(logId)?.state?.set('lumber', true, true)
  // print(`Server finished spawning some logs for player ${src}`)
  return logId
}

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

let tree: Tree
AddEventHandler('playerJoining', () => {
  const src = source
  print(`Server received 'playerJoining' event with new player id=${src}`)

  // if (!lumberBoss.id) spawnBoss()
  // sendClient('initLumberBoss', src, lumberBoss)

  // if (DoesEntityExist(tree?.id)) DeleteEntity(tree.id)
  // tree = null
  // const { x, y, z, } = Config.LumberBossCoords
  // tree = new Tree()
  // tree.init([x, y, z])

  // print(`tree.id=${tree.id}`)
})

AddEventHandler('onServerResourceStart', async (resource: string) => {
  if (resource !== GetCurrentResourceName()) return
  print(`------------------------------------------------------------------------------------------------------------`)
  print('Starting server aim-lumberjack...')

  await Promise.all([
    spawnBoss(),
    TM.spawnTrees(Config.TreeLocations.Region1),
  ])

  // const { x, y, z, } = Config.LumberBossCoords
  // tree = new Tree()
  // tree.init([x, y, z])

  // console.log(`tree.id=${tree.id}`)

  // pre-load all the Tree models
  // await Promise.all([
  //   ...Config.Trees.map(([model, _]) => loadModel(model)),
  //   loadModel(GetHashKey(Config.Logs[0])),
  // ])

  // // TM.spawnTrees(Config.TreeLocations.Region1)
  // PSM._reset()
  // lumberBossPed = await spawnBoss()

})

let creatingLumberBoss = false
handleClient('init', async () => {
  const src = source
  sendClient('initLumberBoss', src, lumberBoss)
  while (!TM.treesSpawned) await wait(10)
  const trees = TM.serializeTrees()
  sendClient('loadTrees', src, trees)
  return
  // print(`Server received 'init' event from source=${src}`)
  // if (lumberBoss.id) {
  //   print(`Server 'init' event found lumberBoss.id=${lumberBoss.id} already exists with state = {lumberBoss: ${Entity(lumberBoss.id)?.state?.lumberBoss}}. Sending 'initLumberBoss' to source=${src}`)
  //   sendClient('initLumberBoss', src, lumberBoss)
  // } else if (!lumberBoss.id && creatingLumberBoss) {
  //   print(`Server 'init' event found no existing lumberBoss.id, but another client is creating it...`)
  //   while (!DoesEntityExist(lumberBoss.id) && !lumberBoss.netId && !lumberBoss.ulid) {
  //     print(`Server 'init' waiting for lumberBoss to be created... lumberBoss currently has id=${lumberBoss.id}, netId=${lumberBoss.netId}, ulid=${lumberBoss.ulid}`)
  //     await wait(10)
  //   }
  //   print(`Server 'init' done waiting. lumberBoss now has id=${lumberBoss.id}, netId=${lumberBoss.netId}, ulid=${lumberBoss.ulid}`)
  //   print(`Server sending 'initLumberBoss' to source=${src}. Currently lumberBoss state = {lumberBoss: ${Entity(lumberBoss.id)?.state?.lumberBoss}}`)
  //   sendClient('initLumberBoss', src, lumberBoss)
  // } else {
  //   creatingLumberBoss = true
  //   print(`Server 'init' event found no existing lumberBoss.id, and no other client is creating it. Sending 'createLumberBoss' to source=${src}`)
  //   sendClient('createLumberBoss', src)
  // }
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

handleClient('makeTreePlease', async () => {
  const { x, y, z, } = Config.LumberBossCoords
  tree = new Tree()
  tree.init([x, y, z])

  print(`tree.id=${tree.id}`)
})

handleClient('cutDownTree', async (treeNetId: number) => {
  const src = source
  print(`Server received 'cutDownTree' event from src=${src} with treeNetId=${treeNetId}`)
  const treeId = NetworkGetEntityFromNetworkId(treeNetId)
  // const [x, y, z] = GetEntityCoords(treeId)
  // const logId = CreateObjectNoOffset(GetHashKey(Config.Logs[0]), x, y, z+2, true, true, false)
  // while (!DoesEntityExist(logId)) await wait(10)
  // spawnedLogs.push(logId)
  // SetEntityVelocity(logId, 3*Math.random(), 3*Math.random(), 4)

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

addCommand('log', async (source) => {
  const src = source
  print(`Server executing 'log' command and creating a log for player ${src}...`)
  await spawnLog(GetEntityCoords(GetPlayerPed(`${src}`)))
  // const [x, y, z] = GetEntityCoords(GetPlayerPed(`${src}`))
  // const logId = CreateObjectNoOffset(GetHashKey('prop_log_02'), x+1, y, z+4, true, true, false)
  // while (!DoesEntityExist(logId)) await wait(10)
  // print(`Server spawned log with id=${logId} at coords [${x}, ${y}, ${z+4}]`)
  // spawnedLogs.push(logId)
  // // FreezeEntityPosition(logId, true)
  // SetEntityRotation(logId, 90, 0, 0, 0, false)
  // SetEntityVelocity(logId, 3*Math.random(), 3*Math.random(), 3)
  print(`Server finished spawning a log for player ${src}`)
}, {restricted: false})

AddEventHandler('onResourceStop', async (resource: string) => {
  if (resource !== GetCurrentResourceName()) return

  clearAll()
  if (DoesEntityExist(tree?.id)) DeleteEntity(tree.id)
  tree = null

  if (lumberBoss.id) DeleteEntity(lumberBoss.id)
})
