import Config from '@common/config'
import { wait, print } from '@common'
import { hashToModel as HASH_TO_MODEL } from './hashToModel'
import * as V from './vector'

const hashToModel = HASH_TO_MODEL as unknown as Map<any, string>

let outlinedEntity = 0
let selectedModel: string

interface AxesData { coords: number[][], drawing: boolean, }
const axesData: AxesData = { coords: [], drawing: true, }

const DEBUG_DRAW_TIME = 5000

// draws little cartesian axes and a surface normal at the given location
const drawXYZN = async () => {
  axesData.drawing = true
  while (axesData.coords.length && axesData.drawing) {
    const now = Date.now()
    axesData.coords = axesData.coords.filter(([,,, t,,,]) => (now - t < DEBUG_DRAW_TIME)) // remove expired locations
    axesData.coords.forEach(([x, y, z, _, nx, ny, nz]) => {
      DrawLine(x, y, z, x+1, y, z, 255, 0, 0, 255)
      DrawLine(x, y, z, x, y+1, z, 0, 255, 0, 255)
      DrawLine(x, y, z, x, y, z+1, 0, 0, 255, 255)
      DrawLine(x, y, z, x+nx, y+ny, z+nz, 255, 0, 255, 255)
    })
    await wait(0)
  }
}

const addAxes = (x: number, y: number, z: number, nx: number = 0, ny: number = 0, nz: number = 1) => {
  axesData.coords.push([x, y, z, Date.now(), nx, ny, nz])
  drawXYZN()
}

// raycast from middle of screen
export const raycastFromCamera = async (dist: number = 2000) => {
  const L = dist > 0 ? dist : 2000

  const [[x1, y1, z1], [nx, ny, nz]] = GetWorldCoordFromScreenCoord(0.5, 0.5)
  const [x2, y2, z2] = [x1 + nx*L, y1 + ny*L, z1 + nz*L]

  const handle = StartShapeTestLosProbe(x1, y1, z1, x2, y2, z2, -1, PlayerPedId(), 4)

  let result = GetShapeTestResult(handle)
  while (result[0] === 1) {
    await wait(0)
    result = GetShapeTestResult(handle)
  }

  return result
}

export const shapetest = async () => {
  const result = await raycastFromCamera()
  const [, hit, endCoords, surfaceNormal, entityHit] = result

  let hash: string|number

  if (Config.debug) {
    if (hit) {
      try { hash = GetEntityModel(entityHit) } catch (e) {}
      // @ts-ignore
      // print(entityHit, hash, hashToModel[hash])
      if (IsEntityAnObject(entityHit)) print('hit an object')
      // @ts-ignore
      selectedModel = hashToModel[hash] || selectedModel
      const [x, y, z] = endCoords
      const [nx, ny, nz] = V.normalize(surfaceNormal)
      addAxes(x, y, z, nx, ny, nz)
    } else {
      selectedModel = null
    }

    if (outlinedEntity) {
      SetEntityDrawOutline(outlinedEntity, false)
      outlinedEntity = 0
    }

    if (!IsEntityAPed(entityHit)) {
      outlinedEntity = entityHit
      SetEntityDrawOutline(entityHit, true)
      SetEntityDrawOutlineColor(0, 255, 0, 255)
      SetEntityDrawOutlineShader(1)
    }
  }

  // @ts-ignore
  return {result, model: hashToModel[hash], hash}
}
