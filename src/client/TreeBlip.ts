import Config from '@common/config'

const TREES = (Config.Trees as [string, number][]).map(([model, offset]) => [GetHashKey(model), offset])
const getTree = () => TREES[Math.floor(Math.random()*TREES.length)]
const BLIP_LABEL = 'LUMBERJACK_JOB_TREE_BLIP'

export default class TreeBlip {
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

    // set blip appearance
    SetBlipSprite(this.blip, 836) // a little palm tree (it's the best I could find)
    SetBlipColour(this.blip, 0x416C41FF) // dark green
    SetBlipAsShortRange(this.blip, true)

    // set blip label
    AddTextEntry(BLIP_LABEL, 'A tree!')
    BeginTextCommandSetBlipName(BLIP_LABEL)
    EndTextCommandSetBlipName(this.blip)
  }

  init({coords, netId, ulid}: {coords: number[], netId: number, ulid: string}) {
    this.coords = coords ?? this.coords
    this.netId = netId ?? this.netId
    this.ulid = ulid ?? this.ulid
    this._configureBlip()
  }

  getLocation() {
    return [...this.coords]
  }

  setLocation(coords: number[]) {
    this.coords = [...coords]
    const [x, y, z] = coords
    SetBlipCoords(this.blip, x, y, z)
  }

  cutDown() {
    this.destroy()
  }

  destroy(immediately: boolean = false) {
    this.hideBlip()
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