import { ulid } from 'ulid'
import { wait } from '@common'
import Config from '@common/config'

const TREES = (Config.Trees as [string, number][]).map(([model, offset]) => [GetHashKey(model), offset])
const getTree = () => TREES[Math.floor(Math.random()*TREES.length)]

export default class Tree {
  id: number = 0                // id assigned to local server entity
  netId: number = 0             // netId set after entity is created on server
  model: number = 0             // hash of model name
  offset: number = 0            // z-offset for specific tree model (so it doesn't float)
  coords: number[] = [0, 0, 0]  // location for tree
  alive: boolean = true         // tree state (set to false when someone successfully cuts it down)
  ulid: string = ''             // custom identifier

  constructor(coords?: number[]) {
    const [model, offset] = getTree() // random tree from config file
    this.model = model
    this.offset = offset
    this.coords = coords
    this.alive = true
    this.ulid = ulid()
  }

  async init(coords?: number[]) {
    this.coords = coords ?? this.coords
    const [x, y, z] = this.coords

    // create tree and make sure it exists
    this.id = CreateObjectNoOffset(this.model, x, y, z + /*this.offset*/0, true, true, false)
    while (!DoesEntityExist(this.id)) { await wait(10) }

    // store netId for new entity
    this.netId = NetworkGetNetworkIdFromEntity(this.id)

    // set tree rotation and freeze in place
    SetEntityRotation(this.id, 0, 0, Math.random()*360, 0, false)
    FreezeEntityPosition(this.id, true)

    // initialize tree state
    Entity(this.id)?.state?.set('tree', true, true)
    Entity(this.id)?.state?.set('alive', true, true)
  }

  getLocation() {
    return [...this.coords]
  }

  setLocation(coords: number[]) {
    if (!this.id) return
    this.coords = coords
    const [x, y, z] = coords
    SetEntityCoords(this.id, x, y, z + this.offset, false, false, false, false)
  }

  async cutDown(immediately: boolean = false) {
    if (!this.alive) return
    this.alive = false

    Entity(this.id)?.state?.set('alive', false, true)

    FreezeEntityPosition(this.id, false)
    ApplyForceToEntity(this.id, 2, 1, 1, 0, 0, 0, 5, 0, true, true, true, false, true)

    await this.destroy(immediately)
  }

  async destroy(immediately: boolean = false) {
    this.alive = false
    if (!immediately) await wait(10000) // wait 10s before deleting entity (TODO: move to config.json)
    if (DoesEntityExist(this.id)) DeleteEntity(this.id)
  }

  serialize() {
    return {
      model: this.model,
      offset: this.offset,
      coords: this.coords,
      alive: this.alive,
      netId: this.netId,
      ulid: this.ulid,
    }
  }
}