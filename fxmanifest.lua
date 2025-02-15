name 'fivem-typescript-boilerplate'
author 'Overextended'
version '0.0.0'
repository 'https://github.com/overextended/fivem-typescript-boilerplate.git'
fx_version 'cerulean'
game 'gta5'
ui_page 'dist/web/index.html'

files {
	'lib/init.lua',
	'lib/client/**.lua',
	'locales/*.json',
	'common/data/*.json',
	'dist/web/assets/index.css',
	'dist/web/assets/index.js',
	'dist/web/index.html',
	'static/config.json',
	'locales/en.json',
}

dependencies {
	'/server:12651',
	'/onesync',
}

client_scripts {
	'dist/client.js',
}

server_scripts {
	'dist/server.js',
}
