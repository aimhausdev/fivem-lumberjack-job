import Config from '@common/config'
import { loadModel, loadAnimDict, wait } from '@common'
import { Point } from '@overextended/ox_lib/client'
import ox from '@overextended/ox_lib/client'
import { hashToModel as HASH_TO_MODEL } from './hashToModel'
import * as V from './vector'
import TreeBlip from './TreeBlip'
import TreeBlipManager, { TreeData } from './TreeBlipManager'
import PlayerStateManager from './PlayerStateManager'
import { print, sendServer, handleServer } from './utils'

export * from './sandbox'

const hashToModel = HASH_TO_MODEL as unknown as Map<any, string>
const { debug } = Config
const UP = [0, 0, 1]

let lumberBossPed: number = 0
type LumberBoss = { id: number, netId: number, ulid?: string }
let lumberBoss: LumberBoss = { id: 0, netId: 0, ulid: '' }

let outlinedEntity = 0
let selectedModel: string

interface SphereData { spheres: number[][], drawing: boolean, }
const sphereData: SphereData = { spheres: [], drawing: true, }

let createdObjects: number[] = []
let trees: TreeData[] = []
let savedCoords: number[][] = []

const TM = new TreeBlipManager()
const PSM = new PlayerStateManager(TM, 3)

const clearObjects = () => {
  createdObjects.forEach(o => DeleteEntity(o))
  createdObjects = []
}

const clearTrees = () => {
  // trees.forEach(t => t.destroy(true))
  trees = []
}

const clearAll = () => {
  clearObjects()
  clearTrees()
  TM.clear()
  PSM._reset()
  savedCoords = []
  if (DoesEntityExist(lumberBoss.id)) {
    DeleteEntity(lumberBoss.id)
    lumberBoss = { id: 0, netId: 0 }
  }
}

const spawnLumberBoss = async () => {
  const lumberBossModel = Config.LumberBossModel
  await loadModel(lumberBossModel)

  if (DoesEntityExist(lumberBoss.id)) { DeleteEntity(lumberBoss.id) }

  const { x, y, z, w } = Config.LumberBossCoords
  lumberBoss.id = CreatePed(1, lumberBossModel, x, y, z, w, true, false)

  while (!DoesEntityExist(lumberBoss.id)) { await wait(10) }

  lumberBoss.netId = PedToNet(lumberBoss.id)

  FreezeEntityPosition(lumberBoss.id, true)
  SetEntityInvincible(lumberBoss.id, true)
  SetBlockingOfNonTemporaryEvents(lumberBoss.id, true)

  Entity(lumberBoss.id)?.state?.set('lumberBoss', true, true) // let everyone know this guy's the boss

  return lumberBoss
}

const raycastFromCamera = async (dist: number = 2000) => {
  const L = dist > 0 ? dist : 2000

  const [[x1, y1, z1], [nx, ny, nz]] = GetWorldCoordFromScreenCoord(0.5, 0.5)
  const [x2, y2, z2] = [x1 + nx*L, y1 + ny*L, z1 + nz*L]

  const handle = StartShapeTestLosProbe(x1, y1, z1, x2, y2, z2, -1, PlayerPedId(), 4)

  let result = GetShapeTestResult(handle)
  while (result[0] === 1) {
    await wait(0)
    result = GetShapeTestResult(handle)
  }

  return result
}

const drawSpheres = async () => {
  sphereData.drawing = true
  while (sphereData.spheres.length && sphereData.drawing) {
    const now = Date.now()
    sphereData.spheres = sphereData.spheres.filter(([,,, t,,,]) => (now - t < 5000))
    const r = 0.025
    sphereData.spheres.forEach(([x, y, z, _, nx, ny, nz]) => {
      DrawLine(x, y, z, x+1, y, z, 255, 0, 0, 255)
      DrawLine(x, y, z, x, y+1, z, 0, 255, 0, 255)
      DrawLine(x, y, z, x, y, z+1, 0, 0, 255, 255)
      DrawLine(x, y, z, x+nx, y+ny, z+nz, 255, 0, 255, 255)
    })
    await wait(0)
  }
}

const addSphere = (x: number, y: number, z: number, nx: number = 0, ny: number = 0, nz: number = 1) => {
  sphereData.spheres.push([x, y, z, Date.now(), nx, ny, nz])
  drawSpheres()
}

const shapetest = async () => {
  const result = await raycastFromCamera()
  const [, hit, endCoords, surfaceNormal, entityHit] = result

  let hash: string|number

  if (hit) {
    try { hash = GetEntityModel(entityHit) } catch (e) {}
    // @ts-ignore
    // print(entityHit, hash, hashToModel[hash])
    if (IsEntityAnObject(entityHit)) print('hit an object')
    // @ts-ignore
    selectedModel = hashToModel[hash] || selectedModel
    if (debug) {
      const [x, y, z] = endCoords
      const [nx, ny, nz] = V.normalize(surfaceNormal)
      addSphere(x, y, z, nx, ny, nz)
    }
  } else {
    selectedModel = null
  }

  if (debug && outlinedEntity) {
    SetEntityDrawOutline(outlinedEntity, false)
    outlinedEntity = 0
  }

  if (debug && !IsEntityAPed(entityHit)) {
    outlinedEntity = entityHit
    SetEntityDrawOutline(entityHit, true)
    SetEntityDrawOutlineColor(0, 255, 0, 255)
    SetEntityDrawOutlineShader(1)
  }

  // @ts-ignore
  return {result, model: hashToModel[hash], hash}
}

let hatchetId: number = -1
let chopping = false
const playChoppingAnimation = async () => {
  chopping = true
  const animTime = 8000
  const ped = PlayerPedId()
  await Promise.all([loadAnimDict(Config.ChopAnimDict), loadModel(Config.Hatchet)])
  const [x, y, z] = GetEntityCoords(ped, false)
  const hatchet = CreateObject(Config.Hatchet, x, y, z, true, true, false)
  hatchetId = hatchet
  const handIndex = GetPedBoneIndex(ped, 0xDEAD)
  AttachEntityToEntity(hatchet, ped, handIndex, 0.1, 0.05, 0, -90, 0, 0, false, false, false, false, 0, true)
  TaskPlayAnim(ped, Config.ChopAnimDict, Config.ChopAnim, 5.0, 5.0, animTime, 1|8|1048576, 1.0, false, false, false)
  FreezeEntityPosition(ped, true)
  await wait(animTime)
  if (DoesEntityExist(hatchet)) DeleteEntity(hatchet)
  if (chopping) {
    FreezeEntityPosition(ped, false)
    chopping = false
  }
}

const rand = (min: number, max: number) => min + (max - min)*Math.random()

const animateTreeFalling = (tree: number) => {
  const model = GetEntityModel(tree)
  const [min, max] = GetModelDimensions(model)
  const [,,h] = V.sub(max, min)
  print(`size:${V.sub(max, min)}`)
  FreezeEntityPosition(tree, false)
  const minF = -1
  const maxF = 1
  const [fx, fy] = [rand(minF, maxF), rand(minF, maxF)]
  // ApplyForceToEntity(tree, 1, .5, 0, 0, 0, 0, h, 0, false, true, true, false, true)
  SetEntityAngularVelocity(tree, Math.random()*1, Math.random()*1, Math.random()*3)
  setTimeout(() => DeleteEntity(tree), 10000)
}

const chopDownTree = async (target: number) => {
  print(`attempting to chop down tree=${target}`)
  altMenuOpen = false
  SetNuiFocus(false, false)
  TaskTurnPedToFaceEntity(PlayerPedId(), target, 1500)
  await wait(1500)
  playChoppingAnimation()
  let success = false
  try {
    success = await ox.skillCheck([
      {areaSize: 30, speedMultiplier: 0.5},
      {areaSize: 30, speedMultiplier: 0.5},
      {areaSize: 30, speedMultiplier: 0.5},
      {areaSize: 30, speedMultiplier: 0.5},
    ])
    print(`woodcutting complete, you ${success ? 'did it!' : 'fucking suck dude'}`)
  } catch (e) {
    console.error(e)
  }
  chopping = false
  StopAnimTask(PlayerPedId(), Config.ChopAnimDict, Config.ChopAnim, 0.5)
  if (success) {
    const netId = NetworkGetNetworkIdFromEntity(target)
    print(`Client successfully cut down tree with netId=${netId}. Notifying server...`)
    sendServer('cutDownTree', netId)
    if (Entity(target)?.state?.alive) {
      TM.cutDown(netId)
      PSM.makeProgress()
    }
  }
  await wait(1000)
  FreezeEntityPosition(PlayerPedId(), false)
  DeleteEntity(hatchetId)
}

const pickUpLog = async (logId: number) => {
  print(`Client picking up logId=${logId} (netId=${ObjToNet(logId)})`)
  sendServer('pickUpLog', ObjToNet(logId))
}

RegisterCommand('st', async (source: number, args: string[]) => {
  if (IsPauseMenuActive()) return

  DisablePlayerFiring(PlayerId(), true)

  const {result: [, hit, endCoords, surfaceNormal, entityHit], model} = await shapetest()
  print(hit, entityHit, selectedModel, !model, V.dot(UP, surfaceNormal))

  if (hit && entityHit && !model && V.dot(UP, surfaceNormal) > 0.8) {
    savedCoords.push(endCoords)
  }
}, false)

RegisterCommand('printCoords', () => {
  print(savedCoords)
}, false)

RegisterCommand('resetTrees', () => {
  clearAll()
  TM.spawnTrees(trees)
}, false)

RegisterCommand('anim', async () => {
  playChoppingAnimation()
}, false)

RegisterKeyMapping('st', 'outline target', 'keyboard', 'END')

RegisterCommand('clear', () => {
  clearAll()
}, false)

let currentTarget: TreeBlip
let altKeyPressed = false
let altMenuOpen = false
RegisterCommand('+peek', async () => {
  if (IsPauseMenuActive()) return
  print('ALT KEY HAS BEEN PRESSED')
  altKeyPressed = true
  altMenuOpen = true

  SetCursorLocation(0.48, 0.5) // prevents some weird bug where the UI gets stuck when you click too fast on the same item again
  SetNuiFocus(true, false)
  SendNUIMessage({ action: 'setOptions', data: [] })
  SendNUIMessage({
    action: 'setVisible',
    data: { visible: true, },
  })

  while (altMenuOpen) {
    DisablePlayerFiring(PlayerId(), true)

    SendNUIMessage({ action: 'setTarget', data: { target: 0 } })

    const {result: [, hit, endCoords, , entityHit]} = await shapetest()
    const pos = GetEntityCoords(PlayerPedId(), false)

    print(`player location: ${pos}, MaxDist=${Config.MaxDist}, dist=${entityHit > 0 ? V.dist(pos, endCoords) : 0}`)

    const somethingHit = hit && entityHit > 0 && V.dist(pos, endCoords) < Config.MaxDist
    const tree = TM.getTree(entityHit)
    const isTree = somethingHit && Entity(entityHit)?.state?.tree
    const isLumberBoss = somethingHit && Entity(entityHit)?.state?.lumberBoss

    if (isTree && PSM.isWorking()) {

      currentTarget = tree
      print(`ALT held down, current target = ${currentTarget?.id}`)
      SendNUIMessage({
        action: 'setOptions',
        data: [{action: 'chopTree', label: `Tree ${entityHit}`, value: entityHit}],
      })

    } else if (isLumberBoss) {

      SendNUIMessage({
        action: 'setOptions',
        data: PSM.isUnemployed() 
          ? [{action: 'startJob', label: `Start choppin'`, value: 'startJob'}]
          : PSM.isComplete()
          ? [{action: 'turnInJob', label: 'Get Paid', value: 'turnInJob'}]
          : PSM.isWorking()
          ? [{action: 'quitJob', label: 'Bitch out', value: 'quitJob'}]
          : []
      })

    } else if (somethingHit && Entity(entityHit)?.state?.lumber) {

      SendNUIMessage({
        action: 'setOptions',
        data: [{ action: 'pickUpLog', label: `Pick Up (log ${entityHit})`, value: entityHit }],
      })

    } else {

      SendNUIMessage({ action: 'setOptions', data: [] })

    }

    await wait(250)
  }
}, false)

RegisterCommand('-peek', async () => {
  print('ALT key released')
  altKeyPressed = false
}, false)

RegisterNuiCallback('setNuiFocus', (_: null, cb: (data: unknown) => void) => {
  print('setNuiFocus called from client script')
  altMenuOpen = true
  SetCursorLocation(0.48, 0.5)
  SetNuiFocus(true, true)
  cb({})
})

RegisterNuiCallback('closeMenu', (data: null, cb: (data: unknown) => void) => {
  print('closeMenu called from client script')
  altMenuOpen = false
  SetNuiFocus(false, false)
  cb({})
})

type UIActionType = {action?: string, value?: any}

RegisterNuiCallback('uiAction', ({action, value}: UIActionType, cb: (data: unknown) => void) => {
  print('uiAction', action, value)
  SendNUIMessage({ action: 'setOptions', data: [] })
  cb({})

  switch (action) {
    case 'startJob':
      print('switch case = startJob')
      PSM.startJob()
      break
    case 'turnInJob':
      print('switch case = turnInJob')
      PSM.finishJob()
      break
    case 'quitJob':
      print('switch case = quitJob')
      PSM.quit()
      break
    case 'chopTree':
      print('switch case = chopTree')
      chopDownTree(value)
      break
    case 'pickUpLog':
      print('switch case = pickUpLog')
      pickUpLog(value)
    default: return
  }
})

type AnimationData = {target: number;}

RegisterNuiCallback('playAnimation', async ({target}: AnimationData, cb: (data: unknown) => void) => {
  chopDownTree(target)
  cb({})
})

RegisterKeyMapping('+peek', 'on pressed/released test', 'keyboard', 'LMENU')

AddEventHandler('onClientResourceStart', async (resource: string) => {
  if (resource !== GetCurrentResourceName()) return
  print(`------------------------------------------------------------------------------------------------------------`)
  print('Starting client aim-lumberjack...')
  print(`Sending 'init' event to server`)
  sendServer('init')

  // pre-load all the Tree models
  await Promise.all([
    ...Config.Trees.map(([model, _]) => loadModel(GetHashKey(`${model}`))),
    loadModel(GetHashKey(Config.Logs[0])),
  ])

  PSM._reset()
})

handleServer(`loadTrees`, (treeData: TreeData[]) => {
  print('Client loading trees:', JSON.stringify(treeData))
  TM.spawnTrees(treeData)
  trees = treeData
})

handleServer('loadTree', (treeData: TreeData) => {
  print(`Client loading new tree:`, JSON.stringify(treeData))
  TM.addTree(treeData)
})

let lumberBossPoint: Point

const configureLumberBoss = async (bossData: LumberBoss) => {
  lumberBoss = bossData

  print(`Client NetToPed(id=${lumberBoss.netId}) -> local entity with id=${NetToPed(lumberBoss.netId)}`)
  const start = Date.now()
  let id = NetToPed(lumberBoss.netId)
  while (!id && Date.now() - start < 5000) { // wait up to 5s for the remote network object to be created locally
    print(`Client 'initLumberBoss' waiting for local entity with netId=${lumberBoss.netId}... (${Date.now() - start}ms elapsed)`)
    await wait(750)
    id = NetToPed(lumberBoss.netId)
  }

  if (!id) print(`Client 'initLumberBoss' timed out trying to find local entity with netId=${lumberBoss.netId}`)

  lumberBoss.id = NetToPed(lumberBoss.netId)
  print(`Client set lumberBoss.id=${lumberBoss.id}`)

  FreezeEntityPosition(lumberBoss.id, true)
  SetEntityInvincible(lumberBoss.id, true)
  SetBlockingOfNonTemporaryEvents(lumberBoss.id, true)

  Entity(lumberBoss.id)?.state?.set('lumberBoss', true, true)
  print(`Client ended 'initLumberBoss' event with lumberBoss=${JSON.stringify(lumberBoss)} and lumberBoss state = {lumberBoss: ${Entity(lumberBoss.id)?.state?.lumberBoss}}`)

  lumberBossPoint?.remove()
}

handleServer(`initLumberBoss`, async (bossData: LumberBoss) => {
  print(`Client received 'initLumberBoss' event with bossData=${JSON.stringify(bossData)}`)

  const { x, y, z } = Config.LumberBossCoords

  // I hate this, but I don't know of a better way to figure out when the boss ped gets into the player's scope
  lumberBossPoint = new Point({
    coords: [x, y, z],
    distance: 50,
    nearby: () => {
      print(`Client nearby lumberBossPoint. Configuring ped...`)
      configureLumberBoss(bossData)
    }
  })
})

RegisterCommand('netId', (source: number, args: string[]) => {
  const netId = parseInt(args[0]) || 0
  print(`'netId' command checking netId=${netId} (raw="${args[0]}")`)
  const id = NetworkGetEntityFromNetworkId(netId)
  print(`netId=${netId} corresponds to local entity with id=${NetworkGetEntityFromNetworkId(netId)} (NetToPed=${NetToPed(netId)})`)
  print(`entity state for id=${id} is {lumberBoss: ${Entity(id)?.state?.lumberBoss}}`)
}, false)

handleServer('createLumberBoss', async () => {
  print(`Client received 'createLumberBoss' event. Creating the big guy...`)

  const boss = await spawnLumberBoss()
  print(`Client created boss=${JSON.stringify(boss)}`)
  print(`Client now has lumberBoss=${JSON.stringify(lumberBoss)}`)

  Entity(boss.id)?.state?.set('lumberBoss', true, true) // tell everyone this guy is the lumber boss
  print(`Client 'createLumberBoss' set entity state to {lumberBoss: ${Entity(boss.id)?.state?.lumberBoss}}`)

  sendServer('initLumberBoss', lumberBoss)
})

handleServer('lumberBossUlid', bossUlid => {
  print(`Client received 'lumberBossUlid' event with bossUlid=${bossUlid}`)
  lumberBoss.ulid = bossUlid
  print(`Client finally has lumberBoss=${JSON.stringify(lumberBoss)} and lumberBoss state = {lumberBoss: ${Entity(lumberBoss.id)?.state?.lumberBoss}}`)
})

RegisterCommand('makeTreePlease', () => sendServer('makeTreePlease'), false)

AddEventHandler('onResourceStop', async (resource: string) => {
  if (resource !== GetCurrentResourceName()) return

  clearAll()

  if (lumberBossPed) DeleteEntity(lumberBossPed)
})
