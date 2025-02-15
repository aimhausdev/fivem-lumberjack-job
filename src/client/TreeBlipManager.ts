import TreeBlip from './TreeBlip'
import { JobState } from './constants'

export type TreeData = {
  netId: number,
  coords: number[],
  ulid: string,
}

export default class TreeBlipManager {
  trees: TreeBlip[] = []

  constructor() {}

  _fromTreeOrId(treeOrNetId: number|TreeBlip) : TreeBlip {
    return treeOrNetId instanceof TreeBlip ? treeOrNetId : this.trees.find(t => t.netId === treeOrNetId)
  }

  async addTree(treeData: TreeData): Promise<TreeBlip> {
    const tree = new TreeBlip()
    await tree.init(treeData)
    this.trees.push(tree)
    const jobState = LocalPlayer.state.lumberjackJobState
    if (jobState !== JobState.IN_PROGRESS) {
      tree.hideBlip()
    }
    return tree
  }

  async spawnTrees(trees: TreeData[]) {
    await Promise.all(trees.map(tree => this.addTree(tree)))
  }

  async cutDown(treeOrNetId: number|TreeBlip) {
    this.removeTree(treeOrNetId)
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

  removeTree(treeOrNetId: number|TreeBlip, immediately: boolean = false) {
    const tree = this._fromTreeOrId(treeOrNetId)
    if (!tree) return
    tree.destroy(immediately)
    this.trees = this.trees.filter(t => t !== tree)
  }

  clear() {
    this.trees.forEach(t => t.destroy(true))
    this.trees = []
  }
}
