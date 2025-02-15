import Config from '@common/config'
import { loadModel, loadAnimDict, wait } from '@common'
import { cache, Point } from '@overextended/ox_lib/client'
import ox from '@overextended/ox_lib/client'
import { hashToModel as HASH_TO_MODEL } from './hashToModel'
import * as V from './vector'
import Tree from './Tree'
import TreeManager, { TreeData } from './TreeManager'
import PlayerStateManager from './PlayerStateManager'
import { print, sendServer, handleServer } from './utils'

export * from './spawn'

const VALID_WEATHER_TYPES = [
  'CLEAR',
  'EXTRASUNNY',
  'CLOUDS',
  'OVERCAST',
  'RAIN',
  'CLEARING',
  'THUNDER',
  'SMOG',
  'FOGGY',
  'XMAS',
  'SNOW',
  'SNOWLIGHT',
  'BLIZZARD',
  'HALLOWEEN',
  'NEUTRAL',
]

const hashToModel = HASH_TO_MODEL as unknown as Map<any, string>
const { debug } = Config
const UP = [0, 0, 1]

// const print = (...args: any[]) => debug && console.log(...args)

let lumberBossPed: number = 0
type LumberBoss = { id: number, netId: number, ulid?: string }
let lumberBoss: LumberBoss = { id: 0, netId: 0, ulid: '' }

let outlinedEntity = 0
let selectedModel: string

interface SphereData { spheres: number[][], drawing: boolean, }
const sphereData: SphereData = { spheres: [], drawing: true, }

let createdObjects: number[] = []
// let trees: Tree[] = []
let trees: TreeData[] = []
let savedCoords: number[][] = []

const TM = new TreeManager()
const PSM = new PlayerStateManager(TM, 3)

const TREES = (Config.Trees as [string, number][]).map(([model, offset]) => [GetHashKey(model), offset])
const getTree = () => TREES[Math.floor(Math.random()*TREES.length)]

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

if (Config.EnableNuiCommand) {
  onNet(`${cache.resource}:openNui`, () => {
    SetNuiFocus(true, true)

    SendNUIMessage({
      action: 'setVisible',
      data: {
        visible: true,
      },
    })
  })

  RegisterNuiCallback('exit', (data: null, cb: (data: unknown) => void) => {
    SetNuiFocus(false, false)
    cb({})
  })
}

const GetCamDirection = () => {
  const heading = Math.PI * (GetGameplayCamRelativeHeading() + GetEntityHeading(PlayerPedId())) / 180
  const pitch = Math.PI * GetGameplayCamRelativePitch() / 180
  const x = -Math.sin(heading)
  const y = Math.cos(heading)
  const z = Math.sin(pitch)
  const len = Math.sqrt(x*x + y*y + z*z)
  return [x/len, y/len, z/len]
}

const spawnBoss = async () => {
  const lumberBossModel = Config.LumberBossModel
  await loadModel(lumberBossModel)

  if (DoesEntityExist(lumberBossPed)) DeleteEntity(lumberBossPed)

  const { x, y, z, w } = Config.LumberBossCoords
  lumberBossPed = CreatePed(1, lumberBossModel, x, y, z, w, true, false)

  FreezeEntityPosition(lumberBossPed, true)
  SetEntityInvincible(lumberBossPed, true)
  SetBlockingOfNonTemporaryEvents(lumberBossPed, true)

  return lumberBossPed
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
  // const [x1, y1, z1] = GetGameplayCamCoord()
  // const [rx, ry, rz] = GetCamDirection()
  const L = dist > 0 ? dist : 2000
  // const [x2, y2, z2] = [x1 + L*rx, y1 + L*ry, z1 + L*rz]

  const [[x1, y1, z1], [nx, ny, nz]] = GetWorldCoordFromScreenCoord(0.5, 0.5)
  const [x2, y2, z2] = [x1 + nx*L, y1 + ny*L, z1 + nz*L]

  const handle = StartShapeTestLosProbe(x1, y1, z1, x2, y2, z2, -1, PlayerPedId(), 4)
  // let [retval, hit, endCoords, surfaceNormal, entityHit] = GetShapeTestResult(handle)
  let result = GetShapeTestResult(handle)
  while (result[0] === 1) {
    await wait(0)
    result = GetShapeTestResult(handle)
  }

  return result
}

// let spheres: number[][] = []
// let drawingSpheres = true
const drawSpheres = async () => {
  // drawingSpheres = true
  sphereData.drawing = true
  while (sphereData.spheres.length && sphereData.drawing) {
    const now = Date.now()
    sphereData.spheres = sphereData.spheres.filter(([,,, t,,,]) => (now - t < 5000))
    const r = 0.025
    sphereData.spheres.forEach(([x, y, z, _, nx, ny, nz]) => {
      // DrawMarker(28, x, y, z, nz, ny, nx, 0, 0, 0, r, r, r, 255, 0, 0, 255, false, false, 2, false, null, null, false)
      DrawLine(x, y, z, x+1, y, z, 255, 0, 0, 255)
      DrawLine(x, y, z, x, y+1, z, 0, 255, 0, 255)
      DrawLine(x, y, z, x, y, z+1, 0, 0, 255, 255)
      DrawLine(x, y, z, x+nx, y+ny, z+nz, 255, 0, 255, 255)
    })
    await wait(0)
  }
}
const stopDrawingSheres = () => {
  // drawingSpheres = false
  sphereData.drawing = false
  // spheres = []
  sphereData.spheres = []
}
const addSphere = (x: number, y: number, z: number, nx: number = 0, ny: number = 0, nz: number = 1) => {
  // spheres = [...spheres, [x, y, z, Date.now()]]
  sphereData.spheres.push([x, y, z, Date.now(), nx, ny, nz])
  // print(sphereData.spheres)
  drawSpheres()
}
const drawSphere = async (coords: number[]) => {
  const start = Date.now()
  const [x, y, z] = coords
  while (Date.now() - start < 5000) {
    DrawSphere(x, y, z, 1, 255, 0, 0, 1)
    await wait(0)
  }
}

const teleport = (x: number, y: number, z: number) => SetEntityCoords(PlayerPedId(), x, y, z, false, false, false, false)

const shapetest = async () => {
  const result = await raycastFromCamera()
  const [retval, hit, endCoords, surfaceNormal, entityHit] = result
  const lumberBossHit = lumberBoss.id && entityHit === lumberBoss.id

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

const createTree = (coords: number[]) => {
  // const [x, y, z] = coords
  // // const o = CreateObject(GetHashKey(selectedModel), x, y, z+1, true, true, false)
  // // const o = CreateObject(GetHashKey('prop_tree_lficus_05'), x, y, z-1.35, true, true, false)
  // // const o = CreateObject(GetHashKey('prop_bskball_01'), x, y, z+1, true, true, false)
  // const [model, offset] = getTree()
  // const tree = CreateObject(model, x, y, z + offset, true, true, false)
  // SetEntityRotation(tree, 0, 0, Math.random()*360, 0, false)
  // FreezeEntityPosition(tree, true)
  // // SetEntityHasGravity(o, true)
  // // SetEntityCollision(o, true, true)
  // // SetEntityVelocity(o, 1, 1, 5)
  // // SetEntityAngularVelocity(o, 1, 0, 0)
  // print(`creating ${model} (entityId=${tree}) with offset ${offset}`)
  // createdObjects.push(tree)
  // const tree = new Tree(coords)
  // tree.init()
  // trees.push(tree)
}

let hatchetId: number = -1
let chopping = false
const playChoppingAnimation = async () => {
  chopping = true
  const animTime = 8000
  const ped = PlayerPedId()
  await Promise.all([
    loadAnimDict('mini@golf'),
    loadAnimDict('mini@golfai'),
    loadAnimDict(Config.ChopAnimDict),
    loadModel('prop_w_me_hatchet')
  ])
  const [x, y, z] = GetEntityCoords(ped, false)
  const hatchet = CreateObject('prop_w_me_hatchet', x, y, z, true, true, false)
  hatchetId = hatchet
  const handIndex = GetPedBoneIndex(ped, 0xDEAD)
  AttachEntityToEntity(hatchet, ped, handIndex, 0.1, 0.05, 0, -90, 0, 0, false, false, false, false, 0, true)
  // TaskPlayAnim(ped, 'mini@golf', 'iron_swing_intro_high', 5.0, 5.0, animTime, 1|8|1048576, 5.0, false, false, false)
  // TaskPlayAnim(ped, 'mini@golfai', 'iron_swing_action', 5.0, 5.0, animTime, 1|8|1048576, 5.0, false, false, false)
  TaskPlayAnim(ped, Config.ChopAnimDict, Config.ChopAnim, 5.0, 5.0, animTime, 1|8|1048576, 1.0, false, false, false)
  // PlaySoundFromEntity(-1, 'Shoot_box', hatchet, 'Paleto_Score_Setup_Sounds', false, 0)
  // PlaySoundFromCoord(-1, 'Shoot_box', x, y, z, 'Paleto_Score_Setup_Sounds', false, 10, false)
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
// const animateTreeFalling = (tree: Tree) => {}

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
      // {areaSize: 30, speedMultiplier: 0.5},
      // {areaSize: 30, speedMultiplier: 0.5},
      // {areaSize: 30, speedMultiplier: 0.5},
    ])
    print(`woodcutting complete, you ${success ? 'did it!' : 'fucking suck dude'}`)
  } catch (e) {
    console.error(e)
  }
  chopping = false
  StopAnimTask(PlayerPedId(), Config.ChopAnimDict, Config.ChopAnim, 0.5)
  if (success) {
    // trees.find(t => t.id === target)?.cutDown()
    const netId = NetworkGetNetworkIdFromEntity(target)
    print(`Client successfully cut down tree with netId=${netId}. Notifying server...`)
    sendServer('cutDownTree', netId)
    if (Entity(target)?.state?.alive) {
      TM.cutDown(netId)
      PSM.makeProgress()
      // animateTreeFalling(target)
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

RegisterCommand('test', async (source: number, args: string[]) => {
  const {x, y, z} = Config.DebugPlayerSpawnCoords
  teleport(x, y, z)
}, false)

RegisterCommand('god', async () => {
  // SetEntityInvincible(PlayerPedId(), true)
  SetPlayerInvincible(PlayerId(), true)
}, false)

RegisterCommand('st', async (source: number, args: string[]) => {
  if (IsPauseMenuActive()) return
  DisablePlayerFiring(PlayerId(), true)
  const {result: [retval, hit, endCoords, surfaceNormal, entityHit], model, hash} = await shapetest()
  print(hit, entityHit, selectedModel, !model, V.dot(UP, surfaceNormal))
  // if (hit && entityHit && selectedModel && !model && V.dot(UP, surfaceNormal) > 0.8) {
  //   // createTree(endCoords)
  //   TM.addTree(endCoords)
  // }
  if (hit && entityHit && !model && V.dot(UP, surfaceNormal) > 0.8) {
    savedCoords.push(endCoords)
  }
}, false)

RegisterCommand('printCoords', () => {
  print(savedCoords)
}, false)

RegisterCommand('resetTrees', () => {
  clearAll()
  // TM.spawnTrees(Config.TreeLocations.Region1)
  TM.spawnTrees(trees)
}, false)

RegisterCommand('anim', async () => {
  playChoppingAnimation()
}, false)

RegisterKeyMapping('st', 'outline target', 'keyboard', 'END')

RegisterCommand('clear', () => {
  // createdObjects.forEach(o => DeleteEntity(o))
  // createdObjects = []
  // clearObjects()
  // clearTrees()
  // TM.clear()
  clearAll()
}, false)

let currentTarget: Tree
let altKeyPressed = false
let altMenuOpen = false
RegisterCommand('+logging', async () => {
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
    // const tree = trees.find(t => t.id === entityHit)
    // if (hit && entityHit > 0 && V.dist(pos, endCoords) < Config.MaxDist && createdObjects.includes(entityHit)) {
    const somethingHit = hit && entityHit > 0 && V.dist(pos, endCoords) < Config.MaxDist
    const tree = TM.getTree(entityHit)
    const isTree = somethingHit && Entity(entityHit)?.state?.tree
    if (somethingHit && isTree && PSM.isWorking()) {
      // currentTarget = entityHit
      currentTarget = tree
      print(`ALT held down, current target = ${currentTarget?.id}`)
      // SendNUIMessage({
      //   action: 'setTarget',
      //   data: { target: tree.id }
      // })
      SendNUIMessage({
        action: 'setOptions',
        // data: [{action: 'chopTree', label: `Tree ${tree.id}`, value: tree.id}],
        data: [{action: 'chopTree', label: `Tree ${entityHit}`, value: entityHit}],
      })
    // } else if (somethingHit && entityHit === lumberBoss.id) {
    } else if (somethingHit && Entity(entityHit)?.state?.lumberBoss) {
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
      // SendNUIMessage({
      //   action: 'setTarget',
      //   data: { target: 0 }
      // })
      SendNUIMessage({ action: 'setOptions', data: [] })
    }
    await wait(250)
  }
}, false)
RegisterCommand('-logging', async () => {
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
  // print(`attempting to chop down tree=${target}`)
  // altMenuOpen = false
  // SetNuiFocus(false, false)
  // TaskTurnPedToFaceEntity(PlayerPedId(), target, 1500)
  // await wait(1500)
  // playChoppingAnimation()
  // let success = false
  // try {
  //   success = await ox.skillCheck([
  //     {areaSize: 30, speedMultiplier: 0.5},
  //     {areaSize: 30, speedMultiplier: 0.5},
  //     {areaSize: 30, speedMultiplier: 0.5},
  //     {areaSize: 30, speedMultiplier: 0.5},
  //   ])
  //   print(`woodcutting complete, you ${success ? 'did it!' : 'fucking suck dude'}`)
  // } catch (e) {
  //   console.error(e)
  // }
  // chopping = false
  // StopAnimTask(PlayerPedId(), 'mini@golfai', 'iron_swing_action', 0.5)
  // if (success) {
  //   // trees.find(t => t.id === target)?.cutDown()
  //   TM.cutDown(target)
  //   // animateTreeFalling(target)
  // }
  // await wait(1000)
  // FreezeEntityPosition(PlayerPedId(), false)
  // DeleteEntity(hatchetId)
  chopDownTree(target)
  cb({})
})
// RegisterCommand('-logging', () => {
//   print('KEY HAS BEEN RELEASED')
//   SetNuiFocus(false, false)
//   SendNUIMessage({
//     action: 'setVisible',
//     data: {
//       visible: false,
//     },
//   })
// }, false)
RegisterKeyMapping('+logging', 'on pressed/released test', 'keyboard', 'LMENU')

RegisterCommand('time', async (source: number, args: string[]) => {
  const hours = parseInt(args[0]) || 22
  const minutes = parseInt(args[1]) || 0
  const seconds = parseInt(args[2]) || 0
  NetworkOverrideClockTime(hours, minutes, seconds)
}, false)

RegisterCommand('weather', async (source: number, args: string[]) => {
  const weather = (args[0] || '').toUpperCase()
  if (!VALID_WEATHER_TYPES.includes(weather)) {
    print(`${weather} is not a valid weather type!`)
    return
  }
  SetOverrideWeather(weather)
}, false)

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
    // loadModel(GetHashKey('cs2_04_log_stack003')),
    // loadModel(GetHashKey('prop_log_02')),
  ])

  // TM.spawnTrees(Config.TreeLocations.Region1)
  PSM._reset()
  // lumberBossPed = await spawnBoss()
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
  if (!id) {
    print(`Client 'initLumberBoss' timed out trying to find local entity with netId=${lumberBoss.netId}`)
  }
  // lumberBoss.id = NetworkGetEntityFromNetworkId(lumberBoss.netId)
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

  lumberBossPoint = new Point({
    coords: [x, y, z],
    distance: 50,
    nearby: () => {
      print(`Client nearby lumberBossPoint. Configuring ped...`)
      configureLumberBoss(bossData)
    }
  })
  // lumberBoss = bossData

  // print(`Client NetToPed(id=${lumberBoss.netId}) -> local entity with id=${NetToPed(lumberBoss.netId)}`)
  // const start = Date.now()
  // let id = NetToPed(lumberBoss.netId)
  // while (!id && Date.now() - start < 5000) { // wait up to 5s for the remote network object to be created locally
  //   print(`Client 'initLumberBoss' waiting for local entity with netId=${lumberBoss.netId}... (${Date.now() - start}ms elapsed)`)
  //   await wait(750)
  //   id = NetToPed(lumberBoss.netId)
  // }
  // if (!id) {
  //   print(`Client 'initLumberBoss' timed out trying to find local entity with netId=${lumberBoss.netId}`)
  // }
  // // lumberBoss.id = NetworkGetEntityFromNetworkId(lumberBoss.netId)
  // lumberBoss.id = NetToPed(lumberBoss.netId)
  // print(`Client set lumberBoss.id=${lumberBoss.id}`)

  // FreezeEntityPosition(lumberBoss.id, true)
  // SetEntityInvincible(lumberBoss.id, true)
  // SetBlockingOfNonTemporaryEvents(lumberBoss.id, true)

  // Entity(lumberBoss.id)?.state?.set('lumberBoss', true, true)
  // print(`Client ended 'initLumberBoss' event with lumberBoss=${JSON.stringify(lumberBoss)} and lumberBoss state = {lumberBoss: ${Entity(lumberBoss.id)?.state?.lumberBoss}}`)
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
