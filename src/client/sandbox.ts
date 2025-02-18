import { wait, print, INFO } from '@common'
import Config from '@common/config'
import { shapetest } from './raycast'
import * as V from './vector'
import { loadModel } from './utils'

Config.debug && (() => {

	INFO`*** Loading dev sandbox client functions ***`

	const UP = [0, 0, 1]

	let savedCoords: number[][] = []
	
	const VALID_WEATHER_TYPES = [
		'CLEAR',
		'EXTRASUNNY',
		'CLOUDS',
		'OVERCAST',
		'RAIN',
		'CLEARING',
		'THUNDER',
		'SMOG',
		'FOGGY',
		'XMAS',
		'SNOW',
		'SNOWLIGHT',
		'BLIZZARD',
		'HALLOWEEN',
		'NEUTRAL',
	]
	
	const teleport = (x: number, y: number, z: number) => SetEntityCoords(PlayerPedId(), x, y, z, false, false, false, false)
	
	RegisterCommand('test', async (source: number, args: string[]) => {
		const {x, y, z} = Config.DebugPlayerSpawnCoords
		teleport(x, y, z)
	}, false)
	
	RegisterCommand('god', async () => {
		SetPlayerInvincible(PlayerId(), true)
	}, false)
	
	RegisterCommand('time', async (source: number, args: string[]) => {
		const hours = parseInt(args[0]) || 22
		const minutes = parseInt(args[1]) || 0
		const seconds = parseInt(args[2]) || 0
		NetworkOverrideClockTime(hours, minutes, seconds)
	}, false)
	
	RegisterCommand('weather', async (source: number, args: string[]) => {
		const weather = (args[0] || '').toUpperCase()
		if (!VALID_WEATHER_TYPES.includes(weather)) {
			print(`${weather} is not a valid weather type!`)
			return
		}
		SetOverrideWeather(weather)
	}, false)
	
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
	
	RegisterCommand('st', async (source: number, args: string[]) => {
		if (IsPauseMenuActive()) return
	
		DisablePlayerFiring(PlayerId(), true)
	
		const {result: [, hit, endCoords, surfaceNormal, entityHit], model} = await shapetest()
		print(hit, entityHit, !model, V.dot(UP, surfaceNormal))
	
		if (hit && entityHit && !model && V.dot(UP, surfaceNormal) > 0.8) {
			savedCoords.push(endCoords)
		}
	}, false)
	
	RegisterCommand('printCoords', () => {
		print(savedCoords)
	}, false)
	
	RegisterKeyMapping('st', 'outline target', 'keyboard', 'END')
	
	RegisterCommand('clear', () => {
		savedCoords = []
	}, false)
	
})()
