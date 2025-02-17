import TreeManager from './TreeBlipManager'
import { JobState } from './constants'
import { print } from '@common'

export default class PlayerStateManager {
  protected state: JobState = JobState.NONE
  protected progress: number = 0
  protected max: number = 5
  protected TM: TreeManager

  constructor(TM: TreeManager, max: number = 5) {
    this.TM = TM
    this.max = max
  }

  protected _reset() {
    this.state = JobState.NONE
    LocalPlayer.state.lumberjackJobState = this.state
    this.progress = 0
    this.TM.hideBlips()
  }

  protected _complete() {
    this.state = JobState.COMPLETE
    LocalPlayer.state.lumberjackJobState = this.state
    this.TM.hideBlips()
  }

  startJob() {
    if (this.state !== JobState.IN_PROGRESS) {
      this.progress = 0
      this.state = JobState.IN_PROGRESS
      LocalPlayer.state.lumberjackJobState = this.state
      this.TM.showBlips()
    }
  }

  makeProgress() {
    if (this.isWorking()) this.progress++
    if (this.progress >= this.max) this._complete()
    print(`You've cut down ${this.progress} out of ${this.max} trees`)
  }

  getJobStatus() {
    return this.state
  }

  isWorking() {
    return this.state === JobState.IN_PROGRESS && this.progress < this.max
  }

  isComplete() {
    if (this.state === JobState.IN_PROGRESS && this.progress >= this.max) {
      this._complete()
    }
    return this.state === JobState.COMPLETE
  }

  isUnemployed() {
    return this.state === JobState.NONE
  }

  quit() {
    if (this.isWorking()) {
      this._reset()
    }
  }

  finishJob() {
    if (this.isComplete()) {
      print(`JOB DONE! Here's your reward...`)
      this._reset()
    }
  }

  reset() {
    this._reset()
  }
}
