import { loadModel, wait } from '@common'
import Config from '@common/config'

const TREES = (Config.Trees as [string, number][]).map(([model, offset]) => [GetHashKey(model), offset])
const getTree = () => TREES[Math.floor(Math.random()*TREES.length)]
const BLIP_LABEL = 'LUMBERJACK_JOB_TREE_BLIP'

export default class Tree {
  id: number = 0
  netId: number = 0
  ulid: string = ''
  model: number = 0
  offset: number = 0
  coords: number[] = [0, 0, 0]
  alive: boolean = true
  blip: number = 0

  constructor(coords?: number[]) {
    const [model, offset] = getTree()
    this.model = model
    this.offset = offset
    this.coords = coords ?? this.coords
    this.alive = true
  }

  _configureBlip() {
    const [x, y, z] = this.coords
    this.blip = AddBlipForCoord(x, y, z)
    SetBlipSprite(this.blip, 836) // a little palm tree (it's the best I could find)
    SetBlipColour(this.blip, 0x416C41FF) // dark green
    SetBlipAsShortRange(this.blip, true)
    AddTextEntry(BLIP_LABEL, 'A tree!')
    BeginTextCommandSetBlipName(BLIP_LABEL)
    EndTextCommandSetBlipName(this.blip)
  }

  // async init(coords?: number[], netId = 0, ulid = '') {
  async init({coords, netId, ulid}: {coords: number[], netId: number, ulid: string}) {
    // await loadModel(this.model)
    this.coords = coords ?? this.coords
    this.netId = netId ?? this.netId
    this.ulid = ulid ?? this.ulid
    // const [x, y, z] = this.coords
    // this.id = CreateObject(this.model, x, y, z + this.offset, false, true, false)
    // SetEntityRotation(this.id, 0, 0, Math.random()*360, 0, false)
    // FreezeEntityPosition(this.id, true)
    this._configureBlip()
  }

  getLocation() {
    return [...this.coords]
  }

  setLocation(coords: number[]) {
    // if (!this.id) return
    this.coords = [...coords]
    const [x, y, z] = coords
    // SetEntityCoords(this.id, x, y, z + this.offset, false, false, false, false)
    SetBlipCoords(this.blip, x, y, z)
  }

  async cutDown() {
    // if (!this.alive) return
    // this.alive = false
    // FreezeEntityPosition(this.id, false)
    // SetEntityAngularVelocity(this.id, Math.random()*1, Math.random()*1, Math.random()*3)
    await this.destroy()
  }

  async destroy(immediately: boolean = false) {
    this.hideBlip()
    // if (!immediately) await wait(10000)
    // DeleteEntity(this.id)
  }

  showBlip() {
    if (this.blip) return
    this._configureBlip()
  }

  hideBlip() {
    if (!this.blip) return
    RemoveBlip(this.blip)
    this.blip = 0
  }
}