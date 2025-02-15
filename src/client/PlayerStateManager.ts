import TreeManager from './TreeBlipManager'
import { JobState } from './constants'
import { print } from './utils'

export default class PlayerStateManager {
  state: JobState = JobState.NONE
  progress: number = 0
  max: number = 5
  TM: TreeManager

  constructor(TM: TreeManager, max: number = 5) {
    this.TM = TM
    this.max = max
  }

  _reset() {
    // print('_reset() called from PlayerStateManager')
    this.state = JobState.NONE
    LocalPlayer.state.lumberjackJobState = this.state
    this.progress = 0
    this.TM.hideBlips()
  }

  _complete() {
    this.state = JobState.COMPLETE
    LocalPlayer.state.lumberjackJobState = this.state
    this.TM.hideBlips()
  }

  startJob() {
    // print('startJob() called from PlayerStateManager')
    if (this.state !== JobState.IN_PROGRESS) {
      this.progress = 0
      this.state = JobState.IN_PROGRESS
      LocalPlayer.state.lumberjackJobState = this.state
      this.TM.showBlips()
    }
  }

  makeProgress() {
    // print('makeProgress() called from PlayerStateManager')
    if (this.isWorking()) this.progress++
    if (this.progress >= this.max) this._complete()
    print(`You've cut down ${this.progress} out of ${this.max} trees`)
  }

  getJobStatus() {
    // print('getJobStatus() called from PlayerStateManager')
    return this.state
  }

  isWorking() {
    // print('isWorking() called from PlayerStateManager')
    return this.state === JobState.IN_PROGRESS && this.progress < this.max
  }

  isComplete() {
    // print('isComplete() called from PlayerStateManager')
    if (this.state === JobState.IN_PROGRESS && this.progress >= this.max) {
      this._complete()
    }
    return this.state === JobState.COMPLETE
  }

  isUnemployed() {
    // print('isUnemployed() called from PlayerStateManager')
    return this.state === JobState.NONE
  }

  quit() {
    // print('quit() called from PlayerStateManager')
    if (this.isWorking()) {
      this._reset()
    }
  }

  finishJob() {
    // print('finishJob() called from PlayerStateManager')
    if (this.isComplete()) {
      print(`JOB DONE! Here's your reward...`)
      this._reset()
    }
  }
}
