import { wait } from '@common'
import Config from '@common/config'
import Tree from './Tree'
// import { JobState } from './constants'
import { print, sendClient } from './utils'

type TreeMap = { [key: string]: Tree }

export default class TreeManager {
  protected trees: Tree[] = []
  protected treeMap: TreeMap = {}
  protected _treesSpawned: boolean = false

  constructor() {}

  protected _fromTreeOrId(treeOrId: number|Tree) : Tree {
    return treeOrId instanceof Tree ? treeOrId : this.trees.find(t => t.id === treeOrId)
  }

  get treesSpawned() {
    return this._treesSpawned
  }

  async addTree(coords: number[]): Promise<Tree> {
    const tree = new Tree()
    await tree.init(coords)
    this.trees.push(tree)
    this.treeMap[tree.ulid] = tree
    return tree
  }

  async spawnTrees(locations: number[][]) {
    print(`TreeManager starting to spawn trees...`)
    await Promise.all(locations.map(location => this.addTree(location)))
    this._treesSpawned = true
    print(`TreeManager finished spawning trees!`)
  }

  async cutDown(treeOrId: number|Tree, replace: boolean = true, immediately: boolean = false) {
    const tree = this._fromTreeOrId(treeOrId)
    await tree.cutDown(immediately)
    // this.trees = this.trees.filter(t => t !== tree)
    // delete this.treeMap[tree.ulid]
    this.removeTree(tree)
    if (replace) {
      await wait(Config.TreeRespawnDelay)
      const newTree = await this.addTree(tree.coords)
      sendClient('loadTree', -1, {
        netId: NetworkGetNetworkIdFromEntity(newTree.id),
        coords: newTree.getLocation(),
        ulid: newTree.ulid,
      })
      // const jobState = LocalPlayer.state.lumberjackJobState
      // if (jobState === JobState.IN_PROGRESS) newTree.showBlip()
    }
  }

  // showBlips() {
  //   this.trees.forEach(t => t.showBlip())
  // }

  // hideBlips() {
  //   this.trees.forEach(t => t.hideBlip())
  // }

  serializeTrees() {
    return this.trees.map(tree => ({
      netId: NetworkGetNetworkIdFromEntity(tree.id),
      coords: tree.getLocation(),
      ulid: tree.ulid,
    }))
  }

  getTree(id: number) {
    return this._fromTreeOrId(id)
  }

  removeTree(treeOrId: number|Tree, immediately: boolean = false) {
    const tree = this._fromTreeOrId(treeOrId)
    this.trees = this.trees.filter(t => t !== tree)
    delete this.treeMap[tree.ulid]
    if (!tree) return
    tree.destroy(immediately)
  }

  clear() {
    this.trees.forEach(t => t.destroy(true))
    this.trees = []
    this.treeMap = {}
  }
}
