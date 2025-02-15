import Tree from './Tree'
import { JobState } from './constants'
import { print } from './utils'

export type TreeData = {
  netId: number,
  coords: number[],
  ulid: string,
}

export default class TreeManager {
  trees: Tree[] = []

  constructor() {}

  _fromTreeOrId(treeOrNetId: number|Tree) : Tree {
    return treeOrNetId instanceof Tree ? treeOrNetId : this.trees.find(t => t.netId === treeOrNetId)
  }

  // async addTree(coords: number[]): Promise<Tree> {
  async addTree(treeData: TreeData): Promise<Tree> {
    const tree = new Tree()
    await tree.init(treeData)
    this.trees.push(tree)
    const jobState = LocalPlayer.state.lumberjackJobState
    if (jobState !== JobState.IN_PROGRESS) {
      print(`Client TreeManager.addTree() has jobState=${jobState}. Hiding blip for tree with netId=${tree.netId}`)
      tree.hideBlip()
    }
    return tree
  }

  // async spawnTrees(locations: number[][]) {
  //   await Promise.all(locations.map(location => this.addTree(location)))
  // }

  async spawnTrees(trees: TreeData[]) {
    await Promise.all(trees.map(tree => this.addTree(tree)))
  }

  async cutDown(treeOrNetId: number|Tree, replace: boolean = true) {
    this.removeTree(treeOrNetId)
    return
    const tree = this._fromTreeOrId(treeOrNetId)
    // await tree.cutDown()
    this.trees = this.trees.filter(t => t !== tree)
    // if (replace) {
    //   const newTree = await this.addTree({coords: tree.coords, netId: tree.netId, ulid: tree.ulid})
    //   const jobState = LocalPlayer.state.lumberjackJobState
    //   if (jobState === JobState.IN_PROGRESS) newTree.showBlip()
    // }
  }

  showBlips() {
    this.trees.forEach(t => t.showBlip())
  }

  hideBlips() {
    this.trees.forEach(t => t.hideBlip())
  }

  getTree(netId: number) {
    return this._fromTreeOrId(netId)
  }

  removeTree(treeOrNetId: number|Tree, immediately: boolean = false) {
    const tree = this._fromTreeOrId(treeOrNetId)
    print(`Client called TreeManager.removeTree(netId=${treeOrNetId})`)
    if (!tree) return
    tree.destroy(immediately)
    this.trees = this.trees.filter(t => t !== tree)
  }

  clear() {
    this.trees.forEach(t => t.destroy(true))
    this.trees = []
  }
}
