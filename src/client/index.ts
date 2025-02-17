import Config from '@common/config'
import { loadModel, loadAnimDict, wait, print, WARN } from '@common'
import { Point } from '@overextended/ox_lib/client'
import ox from '@overextended/ox_lib/client'
import * as V from './vector'
import TreeBlipManager, { TreeData } from './TreeBlipManager'
import PlayerStateManager from './PlayerStateManager'
import { sendServer, handleServer, enableFiring, disableFiring } from './utils'
import { shapetest } from './raycast'

export * from './sandbox'

let lumberBossPed: number = 0
type LumberBoss = { id: number, netId: number, ulid?: string }
let lumberBoss: LumberBoss = { id: 0, netId: 0, ulid: '' }

let createdObjects: number[] = []

const TM = new TreeBlipManager()
const PSM = new PlayerStateManager(TM, 3)

const clearObjects = () => {
  createdObjects.forEach(o => DeleteEntity(o))
  createdObjects = []
}

// const clearTrees = () => {
//   trees = []
// }

const clearAll = () => {
  clearObjects()
  // clearTrees()
  TM.clear()
  PSM.reset()
  // savedCoords = []
  if (DoesEntityExist(lumberBoss.id)) {
    DeleteEntity(lumberBoss.id)
    lumberBoss = { id: 0, netId: 0 }
  }
}

let hatchetId: number = -1
let chopping = false
const playChoppingAnimation = async () => {
  chopping = true
  const animTime = 8000
  const ped = PlayerPedId()

  // await Promise.all([loadAnimDict(Config.ChopAnimDict), loadModel(Config.Hatchet)])
  const [x, y, z] = GetEntityCoords(ped, false)
  const hatchet = CreateObject(Config.Hatchet, x, y, z, true, true, false)
  const handIndex = GetPedBoneIndex(ped, 0xDEAD)
  hatchetId = hatchet

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

const chopDownTree = async (target: number) => {
  print(`Attempting to chop down tree=${target}`)
  altMenuOpen = false
  SetNuiFocus(false, false)
  TaskTurnPedToFaceEntity(PlayerPedId(), target, 1500)
  await wait(1500)
  playChoppingAnimation()
  let success = false
  try {
    success = await ox.skillCheck(Config.SkillCheck)
    print(`Woodcutting complete, you ${success ? 'did it!' : 'fucking suck dude'}`)
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

let altMenuOpen = false
RegisterCommand('+peek', async () => {
  if (IsPauseMenuActive()) return
  print('ALT KEY HAS BEEN PRESSED')
  disableFiring()
  altMenuOpen = true

  SetCursorLocation(0.48, 0.5) // prevents some weird bug where the UI gets stuck when you click too fast on the same item again
  SetNuiFocus(true, false)
  SendNUIMessage({ action: 'setOptions', data: [] })
  SendNUIMessage({ action: 'setVisible', data: { visible: true, } })

  while (altMenuOpen) {
    // DisablePlayerFiring(PlayerId(), true)

    const {result: [, hit, endCoords, , entityHit]} = await shapetest()
    const pos = GetEntityCoords(PlayerPedId(), false)

    // print(`player location: ${pos}, MaxDist=${Config.MaxRaycastHitDistance}, dist=${entityHit > 0 ? V.dist(pos, endCoords) : 0}`)

    const somethingHit = hit && entityHit > 0 && V.dist(pos, endCoords) < Config.MaxRaycastHitDistance
    const isTree = somethingHit && Entity(entityHit)?.state?.tree
    const isLumberBoss = somethingHit && Entity(entityHit)?.state?.lumberBoss
    const isLumber = somethingHit && Entity(entityHit)?.state?.lumber

    SendNUIMessage({
      action: 'setOptions',
      data: isTree && PSM.isWorking()
        ? [{action: 'chopTree', label: `Cut Down`, value: entityHit}]
        : isLumber
        ? [{ action: 'pickUpLog', label: `Pick Up`, value: entityHit }]
        : isLumberBoss && PSM.isUnemployed() 
        ? [{action: 'startJob', label: `Start choppin'`, value: 'startJob'}]
        : isLumberBoss && PSM.isComplete()
        ? [{action: 'turnInJob', label: 'Get Paid', value: 'turnInJob'}]
        : isLumberBoss && PSM.isWorking()
        ? [{action: 'quitJob', label: 'Quit', value: 'quitJob'}]
        : []
    })

    await wait(0)
  }
}, false)

RegisterCommand('-peek', async () => {
  print('ALT key released')
  // altKeyPressed = false
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
  enableFiring()
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

// type AnimationData = {target: number;}

// RegisterNuiCallback('playAnimation', async ({target}: AnimationData, cb: (data: unknown) => void) => {
//   chopDownTree(target)
//   cb({})
// })

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
    loadModel(Config.Hatchet),
    loadAnimDict(Config.ChopAnimDict),
  ])

  PSM.reset()
})

handleServer(`loadTrees`, (treeData: TreeData[]) => {
  print('Client loading trees:', JSON.stringify(treeData))
  TM.spawnTrees(treeData)
  // trees = treeData
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

  if (!id) WARN`Client 'initLumberBoss' timed out trying to find local entity with netId=${lumberBoss.netId}`

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

handleServer('lumberBossUlid', bossUlid => {
  print(`Client received 'lumberBossUlid' event with bossUlid=${bossUlid}`)
  lumberBoss.ulid = bossUlid
  print(`Client finally has lumberBoss=${JSON.stringify(lumberBoss)} and lumberBoss state = {lumberBoss: ${Entity(lumberBoss.id)?.state?.lumberBoss}}`)
})

// RegisterCommand('makeTreePlease', () => sendServer('makeTreePlease'), false)

AddEventHandler('onResourceStop', async (resource: string) => {
  if (resource !== GetCurrentResourceName()) return

  clearAll()

  if (lumberBossPed) DeleteEntity(lumberBossPed)
})
