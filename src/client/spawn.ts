import { wait, loadModel } from '@common'
import Config from '@common/config'

const print = (...args: any[]) => Config.debug && console.log(...args)

RegisterCommand("sv", async (source:number, args: string[], rawCommand:string) => {
	const [model] = args
	const modelHash = GetHashKey(model)

  print(`spawning vehicle: ${model}`)

	if (!IsModelAVehicle(modelHash)) {
		console.error(`${model} is not a valid vehicle! dumbass`)
		return
	}
	
  await loadModel(modelHash)

  print(`loaded model: ${model}`)
	const [ x, y, z ] = GetEntityCoords(PlayerPedId(), true)
	const h = GetEntityHeading(PlayerPedId())
	const veh = CreateVehicle(modelHash, x, y, z, h, true, true)

	while (!DoesEntityExist(veh)) await wait(100)
  print(`Entity exists: ${veh}. Putting ped in vehicle.`)

	SetPedIntoVehicle(PlayerPedId(), veh, -1)
}, false)

RegisterCommand('sw', async (source: number, args: string[], raw: string) => {
	const [ modelArg = '', ammoArg = '0' ] = args
	const hash = modelArg.toUpperCase().startsWith('WEAPON') ? modelArg.toUpperCase() : `WEAPON_${modelArg.toUpperCase()}`
	const ammo = parseInt(ammoArg) || 9999

  StatSetInt(GetHashKey('MP0_SHOOTING_ABILITY'), 100, true)
  StatSetFloat(GetHashKey('MP0_WEAPON_ACCURACY'), 100.0, true)

	if (!IsWeaponValid(hash)) {
		console.error(`${hash} is not a weapon`)
		return
	}

	RequestWeaponAsset(hash, 31, 0) // magic numbers
	while (!HasWeaponAssetLoaded(hash)) await wait(10)

	GiveWeaponToPed(PlayerPedId(), hash, ammo, false, true)
}, false)

RegisterCommand('unwanted', () => {
	ClearPlayerWantedLevel(PlayerId())
}, false)
