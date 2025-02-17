import { addCommand } from '@overextended/ox_lib/server'
import Config from '@common/config'
import { print } from '@common'
import { sendClient } from './utils'
import { spawnBoss, spawnLog } from './spawn'

Config.debug && (() => {
  /**
   * commands (TODO: remove all of these)
   */
  
  addCommand('spawnBoss', async (source) => {
    const src = source
    const lumberBoss = await spawnBoss()
    print(`In server 'spawnBoss' command, source=${src}`)
    print(`Server sending client lumberBoss=${JSON.stringify(lumberBoss)}`)
    sendClient('initLumberBoss', src, lumberBoss)
  }, {restricted: false})
  
  addCommand('far', async (source) => {
    const [x, y, z] = [ -665.6239624023438, 3607.78076171875, 296.2198791503906 ]
    SetEntityCoords(GetPlayerPed(`${source}`), x, y, z, false, false, false, false)
  }, {restricted: false})
  
  addCommand('trees', async (source) => {
    const [x, y, z] = [ -550.0237426757812, 3080.386962890625, 45.91119384765625 ]
    SetEntityCoords(GetPlayerPed(`${source}`), x, y, z, false, false, false, false)
  }, {restricted: false})
  
  addCommand('log', async (source) => {
    const src = source
    print(`Server executing 'log' command and creating a log for player ${src}...`)
  
    await spawnLog(GetEntityCoords(GetPlayerPed(`${src}`)))
    print(`Server finished spawning a log for player ${src}`)
  }, {restricted: false})
})()
