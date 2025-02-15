# fivem-lumberjack-job
A simple FiveM resource for a lumberjack job.

### Installation
Navigate to your `resources` directory and clone the repo, then `install` and `build` it:
```
git clone https://github.com/aimhausdev/fivem-lumberjack-job.git lumberjack-job

cd lumberjack-job

npm i
npm run build
```
Make sure you have `ox_lib` and `lumberjack-job` added to your `server.cfg`:
```
ensure ox_lib
ensure lumberjack-job
```
### Usage
Most of the job's parameters can be modified by editing `static/config.json`. In particular, you can set the quest-giver's spawn location with the `"LumberBossCoords"` field.

The script spawns one tree for each location listed in the selected region (currently only one region has been implemented, `Region1`, though support for multiple regions will be added in the future). 

