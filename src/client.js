const Discord = require('discord.js');
const query = require('source-server-query');
const config = require('../config/settings.json');

console.clear();
config.servers.forEach((srv, id) => {
	let oldStatus = null;
	let server = config.servers[id];
	server.bot = new Discord.Client();
	server.bot.login(server.token);

	// The bot is connected
	server.bot.on('ready', () => {
		console.log(
			`* Logged in as ${server.bot.user.tag}, assigned server: ${server.ip}:${server.port}`
		);
		server.bot.user.setPresence({
			activity: { name: server.connecting, type: server.statusType },
			status: server.statusConnecting,
		});
		serverQuery();
	});

	// Catch Discord API errors
	server.bot.on('error', (err) => {
		console.error('* An error occurred (Discord API):', err);
	});

	// Source query
	function serverQuery() {
		query
			.info(server.ip, server.port, server.timeout)
			.then((res) => {
				currentStatus = `${res.playersnum},${res.maxplayers},${res.map}`;
				setBotStatus(currentStatus);
			})
			// Catch source query errors
			.catch((err) => {
				server.bot.user.setPresence({
					activity: {
						name: server.connecting,
						type: server.statusType,
					},
					status: server.statusConnecting,
				});
				console.error('* An error occurred (Server Query):', err);
			})
			.finally(query.close);
	}

	// Prevent flooding the Discord API with unnecessary requests (Credits to github.com/Killa4)
	function setBotStatus(currentStatus) {
		if (currentStatus === oldStatus) {
			return;
		}

		oldStatus = currentStatus;
		currentStatus = currentStatus.split(',');

		// Handle any kind of undefined errors
		if (
			currentStatus[0] == 'undefined' ||
			currentStatus[1] == 'undefined' ||
			currentStatus[2] == 'undefined'
		) {
			server.bot.user.setPresence({
				activity: { name: server.connecting, type: server.statusType },
				status: server.statusConnecting,
			});
			return;
		}

		if (currentStatus[0] <= server.lowPlayers) {
			server.bot.user.setPresence({
				activity: {
					name: server.lowPlayersMessage,
					type: server.statusType,
				},
				status: server.statusLowPlayers,
			});
			return;
		}

		format = server.format;
		format = format.replace(/{players}/g, currentStatus[0]);
		format = format.replace(/{maxPlayers}/g, currentStatus[1]);
		format = format.replace(/{map}/g, currentStatus[2]);

		// If the server is full
		if (currentStatus[0] == currentStatus[1]) {
			server.bot.user.setPresence({
				activity: {
					name: format,
					type: server.statusType,
				},
				status: server.statusMaxPlayers,
			});
			format = server.format;
			return;
		}

		// Is not full
		server.bot.user.setPresence({
			activity: {
				name: format,
				type: server.statusType,
			},
			status: server.statusSlotsAvailable,
		});
		format = server.format;
		return;
	}

	setInterval(serverQuery, server.update);
});
