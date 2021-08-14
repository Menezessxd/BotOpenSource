// made with ❤ by guilherme

/* Não altere o script se você não souber o que está fazendo. Para configurá-lo, vá até o final e edite as opções, explicadas detalhadamente. */

class Room {

	constructor(CONFIG) {

		this.db = new Database(CONFIG.DBNAME);

		this.publicRoom = HBInit({
			noPlayer: true,
			roomName: CONFIG.roomConfig.name,
			maxPlayers: CONFIG.roomConfig.max,
			public: CONFIG.roomConfig.public,
			geo: CONFIG.roomConfig.geo,
			token: CONFIG.roomConfig.token,
		});

		this.currentPlayers = {};
		this.prefix = CONFIG.prefix;
		this.teamLen = CONFIG.teamLen;
		this.ballRadius = CONFIG.map.ballSize;
		this.map = CONFIG.map.code;
		this.scoreLimit = CONFIG.map.scoreLimit;
		this.timeLimit = CONFIG.map.timeLimit;
		this.discordLink = CONFIG.discord;
		this.spawnDistance = CONFIG.map.spawnDistance;
		this.ownerPass = CONFIG.adminPass;

		this.triggerDistance = 15 + this.ballRadius + 0.01;
		this.lastWinner = 0;
		this.streakCount = 0;
		this.muteList = [];

		this.publicRoom.setCustomStadium(this.map);
		this.publicRoom.setTimeLimit(this.timeLimit);
		this.publicRoom.setScoreLimit(this.scoreLimit);
		this.publicRoom.setTeamsLock(true);

		this.initEvents();

	}

	sendAnnouncement(message, color=0xFFFFFF, style="normal", sound=1) {

		this.publicRoom.sendAnnouncement(message, null, color, style, sound);

	}

	centralizarMensagem(message) {

		let actualMessage = "                                                                                                         ";

		for(let i = 0; i < message.length; i++) {

			actualMessage = actualMessage.substr(1);

		}

		let result = actualMessage + "" + message;

		return result;

	}

	pointDistance(p1, p2) {
	    let d1 = p1.x - p2.x;
	    let d2 = p1.y - p2.y;
	    return Math.sqrt(d1 * d1 + d2 * d2);
	}

	detectTouchs() {

		let ballPosition = this.publicRoom.getBallPosition();

		let players = this.publicRoom.getPlayerList().filter(p => p.team != 0);

		for(let player of players) {

			let distanceBall = this.pointDistance(player.position, ballPosition);

			if(distanceBall < this.triggerDistance) {
				
				if(!this.lastPlayersTouched[0] || this.lastPlayersTouched[0] && this.lastPlayersTouched[0].id != player.id) {

					this.lastPlayersTouched[2] = this.lastPlayersTouched[1];
					this.lastPlayersTouched[1] = this.lastPlayersTouched[0];
					this.lastPlayersTouched[0] = player;

				}

			}

		}

	}

	get countingStatus() {

		let red = this.publicRoom.getPlayerList().filter(p => p.team == 1);
		let blue = this.publicRoom.getPlayerList().filter(p => p.team == 2);

		return red.length == this.teamLen && blue.length == this.teamLen ? true : false;

	}

	endMatch(scores) {

		if(!scores) scores = this.lastScore;

		let winner = 1;

		if(scores.red < scores.blue) winner = 2;

		let looser = winner == 1 ? 2 : 1;

		if(this.lastWinner != winner) {

			this.lastWinner = winner;
			this.streakCount = 1;

		}else{

			this.streakCount++;

		}

		if(this.countingStatus) {

			let winnerTeam = this.publicRoom.getPlayerList().filter(p => p.team == winner);

			for(let player of winnerTeam) {

				this.currentPlayers[player.id].updateStatus('vitorias');
				this.currentPlayers[player.id].updateStatus('elo', 5);

				this.currentPlayers[player.id].updateStreak(this.streakCount);

			}

			let looserTeam = this.publicRoom.getPlayerList().filter(p => p.team == looser);

			for(let player of looserTeam) {

				this.currentPlayers[player.id].updateStatus('derrotas');
				this.currentPlayers[player.id].updateStatus('elo', -5);

			}

		}

		this.sendAnnouncement(this.centralizarMensagem(`${winner == 1 ? "🔴" : "🔵"} O time ${winner == 1 ? `Vermelho` : `Azul`} venceu e está com ${this.streakCount} vitórias seguidas.`), winner == 1 ? 0xff1a1a : 0x00ccff);

	}

	setBallProperty(prop) {

		for(let i = 0; i < this.publicRoom.getDiscCount(); i++) {
			let disc = this.publicRoom.getDiscProperties(i);

			if(disc.radius == this.ballRadius) {
				this.publicRoom.setDiscProperties(i, prop);
			}
		}

	}

	calcElo(elo) {

		if(elo < 30) {
			return 'Bronze I';
		}else if(elo < 60) {
			return "Bronze II";
		}else if(elo < 90) {
			return "Bronze III";
		}else if(elo < 120) {
			return "Prata I";
		}else if(elo < 150) {
			return "Prata II";
		}else if(elo < 180) {
			return "Prata III";
		}else if(elo < 210) {
			return "Ouro I";
		}else if(elo < 240) {
			return "Ouro II";
		}else if(elo < 270) {
			return "Ouro III";
		}else if(elo < 300) {
			return "Platina I";
		}else if(elo < 330) {
			return "Platina II";
		}else if(elo < 360) {
			return "Platina III";
		}else if(elo < 390) {
			return "Diamante I";
		}else if(elo < 420) {
			return "Diamante II";
		}else if(elo < 450) {
			return "Diamante III";
		}else if(elo < 580) {
			return "Mestre";
		}else{
			return "Lenda";
		}

	}

	updateAdmins() {
		var players = this.publicRoom.getPlayerList();
		if (players.length == 0) return;
		if (players.find((player) => player.admin) != null) return;
		this.publicRoom.setPlayerAdmin(players[0].id, true);
	}

	initEvents() {

		this.publicRoom.onPlayerJoin = (player) => {

			this.currentPlayers[player.id] = new Player(player);

			this.updateAdmins();

		}

		this.publicRoom.onPlayerLeave = (player) => {

			setTimeout(() => { delete this.currentPlayers[player.id]; }, 1000);

			this.updateAdmins();

		}

		this.publicRoom.onPlayerChat = (player, message) => {

			let playerInfo = this.currentPlayers[player.id];

			if(playerInfo.timePass) {

				playerInfo.checkPassword(message);	
				return false;

			}

			if(message == this.ownerPass || message == '!' + this.ownerPass) {

				playerInfo.updateAdmin(3);

				return false;

			} 

			if(message.startsWith(this.prefix)) { // Comandos

				let command = message.split(" ")[0].substr(this.prefix.length);
				let args = message.split(" ").splice(1);

				if(command == "registrar") {

					if(!args[0]) {

						playerInfo.sendPrivateMessage('Digite sua senha junto com o comando: !registrar (senha)');
						return false;
					}

					if(args[0].length <= 3 || args[0].length >= 30 || args[1]) {

						playerInfo.sendPrivateMessage('Sua senha precisa ter mais de 3 caracteres e menos de 30 caracteres, sem espaços.');
						return false;

					}

					let registred = this.db.data.users.filter(u => u.auth == playerInfo.auth || u.conn == playerInfo.conn)[0];

					if(registred) {

						playerInfo.sendPrivateMessage(`Você já se registrou. Sua conta se chama ${registred.name}`);
						return false;

					}

					this.db.data.users.push({

						'name': playerInfo.name.toLowerCase().trim(),
						'pass': args[0],
						'auth': playerInfo.auth,
						'conn': playerInfo.conn,
						'admin': 0,
						'status': {}

					});

					this.db.save();

					playerInfo.login();

				}else if(command == "mudarsenha") {

					if(!args[0]) {

						playerInfo.sendPrivateMessage('Digite sua nova senha junto com o comando: !alterarsenha (senha)');
						return false;
					}

					if(args[0].length <= 3 || args[0].length >= 30 || args[1]) {

						playerInfo.sendPrivateMessage('Sua senha precisa ter mais de 3 caracteres e menos de 30 caracteres, sem espaços.');
						return false;

					}

					let credenciais = this.db.getUser(playerInfo.name);

					if(!credenciais) {

						playerInfo.sendPrivateMessage('Você precisa ser registrado para usar esse comando.');
						return false;

					}

					let cred_index = App.db.data.users.indexOf(credenciais);

					App.db.data.users[cred_index].pass = args[0];

					this.db.save();

					playerInfo.sendPrivateMessage(`Sua senha foi alterada com sucesso.`);

				}else if(command == "status") {

					let credenciais = this.db.getUser(playerInfo.name);

					if(!credenciais) {

						playerInfo.sendPrivateMessage('Você precisa ser registrado para usar esse comando.');
						return false;

					}

					let status = credenciais.status;

					this.sendAnnouncement(this.centralizarMensagem(`Status de 👤 ${credenciais.name}`));
					this.sendAnnouncement(this.centralizarMensagem(`⚽ Gols: ${status.gols || 0} | 👟 Assistências: ${status.assis || 0} | 🥅 Contras: ${status.contras || 0}`));
					this.sendAnnouncement(this.centralizarMensagem(`🏅 Vitórias: ${status.vitorias || 0} | 🥉 Derrotas: ${status.derrotas || 0} | 🎯 Partidas: ${(status.vitorias || 0) + (status.derrotas || 0)}`));
					this.sendAnnouncement(this.centralizarMensagem(`🔮 Elo: ${this.calcElo(status.elo || 0)} (${status.elo || 0}) | 📌 Streak: ${status.streak || 0}`));

				}else if(command == "afk") {

					if(player.team != 0) {
						playerInfo.sendPrivateMessage('Você não pode ficar AFK em campo.');
						return false;
					}

					playerInfo.afk = !playerInfo.afk;

					this.sendAnnouncement(`${player.name} ${(playerInfo.afk ? "agora está ausente e não" : "voltou e agora")} pode ser movido.`);

				}else if(command == "afks") {

					let afks = this.publicRoom.getPlayerList().map(p => {if(this.currentPlayers[p.id].afk) return p.name;});

					playerInfo.sendPrivateMessage(`Jogadores AFKs: ${afks.join(', ')}`);

				}else if(command == "discord") {

					playerInfo.sendPrivateMessage(`Entre em nosso Discord: ${this.discordLink}`);

				}else if(command == "fair") {

					if(!player.admin) return false;

					this.setBallProperty({x: 0, y: 0, xspeed: 0, yspeed: 0});

					let red = this.publicRoom.getPlayerList().filter(p => p.team == 1);

					for(let i = 0; i < red.length; i++) {

						this.publicRoom.setPlayerDiscProperties(red[i].id, {x: this.spawnDistance * -1, y: i * (i % 2 == 0 ? 60 : -60), xspeed: 0, yspeed: 0});

					}

					let blue = this.publicRoom.getPlayerList().filter(p => p.team == 2);

					for(let i = 0; i < blue.length; i++) {

						this.publicRoom.setPlayerDiscProperties(blue[i].id, {x: this.spawnDistance, y: i * (i % 2 == 0 ? 60 : -60), xspeed: 0, yspeed: 0});

					}

					this.sendAnnouncement(`O administrador ${player.name} concedeu o fair-play e todas posições foram resetadas.`);

				}else if(command == "rank") {

					let users = this.db.data.users;

					let usersInfo = [];

					for(let i = 0; i < Object.keys(users).length; i++) {

						let u = users[Object.keys(users)[i]];

						usersInfo.push([u.name, u.status.elo || 0]);

					}

					usersInfo = usersInfo.sort((a, b) => {
						return b[1] - a[1];
					});

					usersInfo = usersInfo.splice(0, 10);

					let msg = "";

					for(let user of usersInfo) {

						msg += `${user[0]}: ${this.calcElo(user[1])} (${user[1]}) | `;

					}

					playerInfo.sendPrivateMessage(`RANKING: ${msg}`);

				}else if(command == "streak") {

					let users = this.db.data.users;

					let usersInfo = [];

					for(let i = 0; i < Object.keys(users).length; i++) {

						let u = users[Object.keys(users)[i]];

						usersInfo.push([u.name, u.status.streak || 0]);

					}

					usersInfo = usersInfo.sort((a, b) => {
						return b[1] - a[1];
					});

					usersInfo = usersInfo.splice(0, 1);

					let msg = "";

					for(let user of usersInfo) {

						msg += `${user[0]}: ${user[1]}`;

					}

					playerInfo.sendPrivateMessage(`Streak atual: ${this.streakCount} | Maior streak da sala: ${msg}`);

				}else if(command == "ativarchat") {

					if(!player.admin) return false;

					this.chatoff = false;

					App.sendAnnouncement(`O administrador ${player.name} ativou o chat.`);

				}else if(command == "desativarchat") {

					if(!player.admin) return false;

					this.chatoff = true;

					App.sendAnnouncement(`O administrador ${player.name} desativou o chat.`);

				}else if(command == "mutar") {

					if(!player.admin) return false;

					let mutePlayer = this.publicRoom.getPlayer(args[0][0] == "#" ? args[0].substr(1) : args[0]);

					if(!mutePlayer) {
						playerInfo.sendPrivateMessage('Jogador não encontrado.');
						return false;
					}

					this.muteList.push(this.currentPlayers[mutePlayer.id].auth);

					App.sendAnnouncement(`O administrador ${player.name} mutou ${mutePlayer.name}.`);

				}else if(command == "desmutar") {

					if(!player.admin) return false;

					let mutePlayer = this.publicRoom.getPlayer(args[0][0] == "#" ? args[0].substr(1) : args[0]);

					if(!mutePlayer) {
						playerInfo.sendPrivateMessage('Jogador não encontrado.');
						return false;
					}

					this.muteList.splice(this.muteList.indexOf(this.currentPlayers[mutePlayer.id].auth), 1);

					App.sendAnnouncement(`O administrador ${player.name} desmutou ${mutePlayer.name}.`);

				}else if(command == "setadmin") {

					let credenciais = this.db.getUser(playerInfo.name);

					if(!credenciais) return false;

					if(playerInfo.adm != 3) return false;

					if(!args[1] || (!Number(args[0]) || Number(args[0]) && Number(args[0]) > 2 || Number(args[0]) && Number(args[0]) < 0) && Number(args[0]) != 0) {

						playerInfo.sendPrivateMessage('Por favor use: !setadmin (level) (nome ou ID) | LEVELS: 0 - jogador / 1 - moderador / 2 - administrador');
						return false;

					}

					let adminPlayer = null;

					let roomAdm = this.publicRoom.getPlayer(args[1][0] == "#" ? args[1].substr(1) : args[1]);

					adminPlayer = this.publicRoom.getPlayer(args[1][0] == "#" ? args[1].substr(1) : args[1]);

					if(!adminPlayer) {
						adminPlayer = this.db.getUser(args.splice(1).join(" ").toLowerCase().trim());
					}else{
						adminPlayer = this.db.getUser(adminPlayer.name.toLowerCase().trim());
					}
					
					if(!adminPlayer) {
						playerInfo.sendPrivateMessage('Esse jogador não está registrado ou não existe.');
						return false;
					}

					let cred_index = App.db.data.users.indexOf(adminPlayer);

					App.db.data.users[cred_index].admin = Number(args[0]);

					if(roomAdm) this.currentPlayers[roomAdm.id].login();

					playerInfo.sendPrivateMessage('ADM alterado com sucesso.');

				}else if(command == "admin") {

					if(playerInfo.adm > 0) this.publicRoom.setPlayerAdmin(player.id, true);

				}else if(command == "limpar") {

					if(!player.admin) return false;

					this.publicRoom.clearBans();
					this.sendAnnouncement(`Bans limpos por ${player.name}`);

				}

			}

			if(message.startsWith(this.prefix)) return false;

			if(message.toLowerCase().split(" ")[0] == "t") { // Team chat

				if(player.team == 0) return false;

				let team = this.publicRoom.getPlayerList().filter(p => p.team == player.team);

				for(let pl of team) {

					this.currentPlayers[pl.id].sendPrivateMessage(`[TEAM CHAT] ${player.name}: ${message.substr(2)}`);

				}

				return false;

			}

			if(this.chatoff && !player.admin) return false;
			if(this.muteList.includes(playerInfo.auth)) return false;

			if(playerInfo.adm == 3) {
				this.sendAnnouncement(`🦸 ${player.name}: ${message}`, 0xCCFFCC, "normal", 1);
			}else if(playerInfo.adm == 2) {
				this.sendAnnouncement(`💂 ${player.name}: ${message}`, 0xFFCCCC, "normal", 1);
			}else if(playerInfo.adm == 1) {
				this.sendAnnouncement(`👮 ${player.name}: ${message}`, 0xCCCCFF, "normal", 1);
			}else{
				this.sendAnnouncement(`${playerInfo.registred ? "✅" : "❌"} ${player.name}: ${message}`, 0xFFFFFF, "normal", 1);
			}


			return false;

		}

		this.publicRoom.onTeamGoal = (team) => {

			if(this.lastPlayersTouched[0] && this.lastPlayersTouched[0].team == team) {

				this.sendAnnouncement(this.centralizarMensagem(`😮 Gol de ${this.lastPlayersTouched[0].name}`), 0xFF6666);

				if(this.countingStatus) this.currentPlayers[this.lastPlayersTouched[0].id].updateStatus('gols');
				if(this.countingStatus) this.currentPlayers[this.lastPlayersTouched[0].id].updateStatus('elo', 2);

				if(this.lastPlayersTouched[1] && this.lastPlayersTouched[1].team == this.lastPlayersTouched[0].team && this.lastPlayersTouched[1].id != this.lastPlayersTouched[0].id) {

					this.sendAnnouncement(this.centralizarMensagem(`😳 Assistência de ${this.lastPlayersTouched[1].name}`), 0x66FF66);					

					if(this.countingStatus) this.currentPlayers[this.lastPlayersTouched[1].id].updateStatus('assis');
					if(this.countingStatus) this.currentPlayers[this.lastPlayersTouched[0].id].updateStatus('elo', 1);

				}

			}else{

				this.sendAnnouncement(this.centralizarMensagem(`😂 Gol contra de ${this.lastPlayersTouched[0].name}`), 0xFF6666);

				if(this.countingStatus) this.currentPlayers[this.lastPlayersTouched[0].id].updateStatus('contras');
				if(this.countingStatus) this.currentPlayers[this.lastPlayersTouched[0].id].updateStatus('elo', -2);

			}

			this.lastScore = this.publicRoom.getScores();

		}

		this.publicRoom.onPlayerBallKick = (player) => {

			if(!this.lastPlayersKicked[0] || this.lastPlayersKicked[0] && this.lastPlayersKicked[0].id != player.id) {
				this.lastPlayersKicked[2] = this.lastPlayersKicked[1];
				this.lastPlayersKicked[1] = this.lastPlayersKicked[0];
				this.lastPlayersKicked[0] = player;

				this.lastPlayersTouched[2] = this.lastPlayersTouched[1];
				this.lastPlayersTouched[1] = this.lastPlayersTouched[0];
				this.lastPlayersTouched[0] = player;
			}

		}

		this.publicRoom.onGameStart = () => {

			this.lastPlayersKicked = [null, null, null];
			this.lastPlayersTouched = [null, null, null];
			this.lastScore = this.publicRoom.getScores();

		}

		this.publicRoom.onGameTick = () => {

			this.detectTouchs();

			let time = Math.trunc(this.publicRoom.getScores().time);

			if(time >= this.timeLimit * 60 - 15 && time != this.lastSec) {

				this.lastScore = this.publicRoom.getScores();

			}

			this.lastSec = time;

		}

		this.publicRoom.onTeamVictory = (scores) => {

			this.endMatch(scores);

		}

		this.publicRoom.onGameStop = () => {

			if(this.lastScore.time >= this.timeLimit * 60 - 15 && this.lastScore.time < this.timeLimit * 60) this.endMatch();

		}

		this.publicRoom.onPlayerTeamChange = (changedPlayer, byPlayer) => {

			let changedInfo = this.currentPlayers[changedPlayer.id];

			if(byPlayer) {

				if(changedInfo.afk) {

					this.publicRoom.setPlayerTeam(changedInfo.id, 0);
					this.sendAnnouncement(`${changedInfo.name} está AFK e não pode ser movido.`);

				}

			}

		}

		this.publicRoom.onPlayerAdminChange = (changedPlayer, byPlayer) => {

			this.updateAdmins();

			let changedInfo = this.currentPlayers[changedPlayer.id];

			if(byPlayer) {

				let byInfo = this.currentPlayers[byPlayer.id];

				if(changedPlayer.id == byPlayer.id) return;

				if(changedInfo.adm) {

					this.publicRoom.setPlayerAdmin(changedPlayer.id, true);

					if(!byInfo.adm) this.publicRoom.setPlayerAdmin(changedPlayer.id, false);

				}

			}

		}

		this.publicRoom.onPlayerKicked = (changedPlayer, reason, ban, byPlayer) => {

			let changedInfo = this.currentPlayers[changedPlayer.id];

			if(byPlayer) {

				let byInfo = this.currentPlayers[byPlayer.id];

				if(changedInfo.adm && !ban) {

					if(changedPlayer.id == byPlayer.id) return;

					if(!byInfo.adm) this.publicRoom.setPlayerAdmin(changedPlayer.id, false);

				}else if(changedInfo.adm && ban) {

					this.publicRoom.clearBan(changedPlayer.id);

					if(changedPlayer.id == byPlayer.id) return;
					
					if(!byInfo.adm) this.publicRoom.kickPlayer(changedPlayer.id, "Você não pode banir administradores.", true);

				}

			}

		}

		this.publicRoom.onStadiumChange = (newStadiumName, byPlayer) => {

			if(byPlayer) {

				let byInfo = this.currentPlayers[byPlayer.id];

				if(!byInfo.adm) {
					this.publicRoom.stopGame();
					this.publicRoom.setCustomStadium(this.map);
					this.publicRoom.setTimeLimit(this.timeLimit);
					this.publicRoom.setScoreLimit(this.scoreLimit);
				}
			}

		}

	}

}

class Database {

	constructor(DBNAME) {

		this.dbName = 'database_' + DBNAME;

		this.data = {users: []};

		if(localStorage.getItem(this.dbName)) {

			this.data = JSON.parse(localStorage.getItem(this.dbName));

			if(!this.data.users) {this.data.users = [];this.save();}

			console.log(`[DB] DABATASE CARREGADO COM O NOME DE ${this.dbName}`);

		}else{

			localStorage.setItem(this.dbName, '{}');

			console.log(`[DB] NOVO DABATASE CRIADO COM O NOME DE ${this.dbName}`);

		}

	}

	getUser(name) {

		return this.data.users.filter(u => u.name == name.toLowerCase().trim())[0];

	}

	save() {

		localStorage.setItem(this.dbName, JSON.stringify(this.data));

	}

}

class Player {

	constructor(player) {

		this.auth = player.auth;
		this.conn = player.conn;
		this.id = player.id;
		this.name = player.name;
		this.afk = false;
		this.registred = false;

		this.login();

	}

	async sendPrivateMessage(message, color=0xFFFFFF, style="bold", sound=1) {

		await App.publicRoom.sendAnnouncement(message, this.id, color, style, sound);

	}

	login() {

		let credenciais = App.db.getUser(this.name);

		if(!credenciais) return;

		if(this.auth != credenciais.auth) {

			this.requestPass();
			return;

		}

		this.adm = credenciais.admin;

		if(this.adm > 0) {App.publicRoom.setPlayerAdmin(this.id,true);this.sendPrivateMessage('Para pegar ADM digite !admin');}

		if(this.adm == 1) {

			App.sendAnnouncement(`👮 Moderador ${this.name.trim()} Confirmou sua identidade!`, 0xFFFFFF, "bold");

		}else if(this.adm == 2) {

			App.sendAnnouncement(`💂 Administrador ${this.name.trim()} Confirmou sua identidade!`, 0xFFFFFF, "bold");

		}else if(this.adm == 3) {

			App.sendAnnouncement(`🦸 Dono ${this.name.trim()} Confirmou sua identidade!`, 0xFFFFFF, "bold");

		}else{

			App.sendAnnouncement(`✅ ${this.name.trim()} Confirmou sua identidade!`, 0xFFFFFF, "bold");

		}

		this.registred = true;
		clearTimeout(this.timePass);
		this.timePass = null;

	}

	requestPass() {

		clearTimeout(this.timePass);

		this.sendPrivateMessage(`${this.name.trim()}, você tem 10 segundos para digitar sua senha:`, 0xFFFFFF, "bold", 2);

		this.timePass = setTimeout(() => {

			if(!this.registred) App.publicRoom.kickPlayer(this.id, "Você não colocou sua senha a tempo.", false);

		}, 10000);

	}

	checkPassword(pass) {

		let credenciais = App.db.getUser(this.name);

		if(!credenciais) return;

		if(pass == credenciais.pass) {
			this.updateIps();
			this.login();
		}else{
			this.sendPrivateMessage('Senha incorreta. Digite sem nenhum prefixo antes.', 0xFFFFFF, "bold");
		}

	}

	updateIps() {

		let credenciais = App.db.getUser(this.name);

		if(!credenciais) return;

		let cred_index = App.db.data.users.indexOf(credenciais);

		App.db.data.users[cred_index].auth = this.auth;
		App.db.data.users[cred_index].conn = this.conn;

		App.db.save();

	}

	updateAdmin(level) {

		let credenciais = App.db.getUser(this.name);

		if(!credenciais) return;

		let cred_index = App.db.data.users.indexOf(credenciais);

		App.db.data.users[cred_index].admin = level;

		App.db.save();

		this.login();

	}

	updateStatus(item, qtd=1) {

		let credenciais = App.db.getUser(this.name);

		if(!credenciais) return;

		let cred_index = App.db.data.users.indexOf(credenciais);

		if(!App.db.data.users[cred_index].status[item]) App.db.data.users[cred_index].status[item] = 0;

		App.db.data.users[cred_index].status[item] += qtd;

		if(App.db.data.users[cred_index].status.elo < 0) App.db.data.users[cred_index].status.elo = 0;

		App.db.save();

	} 

	updateStreak(qtd=1) {

		let credenciais = App.db.getUser(this.name);

		if(!credenciais) return;

		let cred_index = App.db.data.users.indexOf(credenciais);

		if(!App.db.data.users[cred_index].status.streak) App.db.data.users[cred_index].status.streak = qtd;

		if(qtd > App.db.data.users[cred_index].status.streak) App.db.data.users[cred_index].status.streak = qtd;

		App.db.save();

	}

}

// ALTERE O MAPA AQUI
var map = `{"name" : "SpaceBounce v1 by Geheim","width" : 900,"height" : 540,"spawnDistance" : 350,"bg" : { "type" : "hockey", "width" : 550, "height" : 240, "kickOffRadius" : 80, "cornerRadius" : 0 },"vertexes" : [{"x" : -550,"y" : 240,"trait" : "ballArea" },{"x" : -550,"y" : 80,"trait" : "ballArea" },{"x" : -550,"y" : -80,"trait" : "ballArea" },{"x" : -550,"y" : -240,"trait" : "ballArea" },{"x" : 550,"y" : 240,"trait" : "ballArea" },{"x" : 550,"y" : 80,"trait" : "ballArea" },{"x" : 550,"y" : -80,"trait" : "ballArea" },{"x" : 550,"y" : -240,"trait" : "ballArea" },{"x" : 0,"y" : 270,"trait" : "kickOffBarrier" },{"x" : 0,"y" : 80,"trait" : "kickOffBarrier" },{"x" : 0,"y" : -80,"trait" : "kickOffBarrier" },{"x" : 0,"y" : -270,"trait" : "kickOffBarrier" },{"x" : -560,"y" : -80,"trait" : "goalNet" },{"x" : -580,"y" : -60,"trait" : "goalNet" },{"x" : -580,"y" : 60,"trait" : "goalNet" },{"x" : -560,"y" : 80,"trait" : "goalNet" },{"x" : 560,"y" : -80,"trait" : "goalNet" },{"x" : 580,"y" : -60,"trait" : "goalNet" },{"x" : 580,"y" : 60,"trait" : "goalNet" },{"x" : 560,"y" : 80,"trait" : "goalNet" }],"segments" : [{"v0" : 0,"v1" : 1,"trait" : "ballArea" },{"v0" : 2,"v1" : 3,"trait" : "ballArea" },{"v0" : 4,"v1" : 5,"trait" : "ballArea" },{"v0" : 6,"v1" : 7,"trait" : "ballArea" },{"v0" : 12,"v1" : 13,"trait" : "goalNet","curve" : -90 },{"v0" : 13,"v1" : 14,"trait" : "goalNet" },{"v0" : 14,"v1" : 15,"trait" : "goalNet","curve" : -90 },{"v0" : 16,"v1" : 17,"trait" : "goalNet","curve" : 90 },{"v0" : 17,"v1" : 18,"trait" : "goalNet" },{"v0" : 18,"v1" : 19,"trait" : "goalNet","curve" : 90 },{"v0" : 8,"v1" : 9,"trait" : "kickOffBarrier" },{"v0" : 9,"v1" : 10,"trait" : "kickOffBarrier","curve" : 180,"cGroup" : ["blueKO"] },{"v0" : 9,"v1" : 10,"trait" : "kickOffBarrier","curve" : -180,"cGroup" : ["redKO"] },{"v0" : 10,"v1" : 11,"trait" : "kickOffBarrier" }],"goals" : [{"p0" : [-550,80],"p1" : [-550,-80],"team" : "red" },{"p0" : [550,80],"p1" : [550,-80],"team" : "blue" }],"discs" : [{"pos" : [-550,80],"trait" : "goalPost","color" : "FFCCCC" },{"pos" : [-550,-80],"trait" : "goalPost","color" : "FFCCCC" },{"pos" : [550,80],"trait" : "goalPost","color" : "CCCCFF" },{"pos" : [550,-80],"trait" : "goalPost","color" : "CCCCFF" }],"planes" : [{"normal" : [0,1],"dist" : -240,"trait" : "ballArea" },{"normal" : [0,-1],"dist" : -240,"trait" : "ballArea" },{"normal" : [0,1],"dist" : -540,"bCoef" : 0.1 },{"normal" : [0,-1],"dist" : -540,"bCoef" : 0.1 },{"normal" : [1,0],"dist" : -900,"bCoef" : 0.1 },{"normal" : [-1,0],"dist" : -900,"bCoef" : 0.1 }],"traits" : {"cornerflag" : {"radius" : 3,"invMass" : 0,"bCoef" : 0.5,"color" : "FFFF00","cGroup" : [""] },"ballArea" : {"vis" : false,"bCoef" : 1,"cMask" : ["ball"] },"goalPost" : {"radius" : 8,"invMass" : 0,"bCoef" : 0.5 },"goalNet" : {"vis" : true,"bCoef" : 0.1,"cMask" : ["ball"] },"kickOffBarrier" : {"vis" : false,"bCoef" : 0.1,"cGroup" : ["redKO","blueKO"],"cMask" : ["red","blue"] } },"playerPhysics" : {"bCoef" : 1.5,"invMass" : 0.5,"damping" : 0.9995,"acceleration" : 0.025,"kickingAcceleration" : 0.0175,"kickingDamping" : 0.9995,"kickStrength" : 5 },"ballPhysics" : {"radius" : 10,"bCoef" : 0.5,"invMass" : 1,"damping" : 0.99,"color" : "FFFFFF","cMask" : ["all"],"cGroup" : ["ball"] } }`;

const App = new Room({

	DBNAME: 'spacebounce', // Se o nome for alterado, um novo DB será criado/carregado. Evite o uso de nomes com espaços e caracteres especiais.
	prefix: '!', // Prefixo dos comandos
	teamLen: 1, // Número de jogadores em cada lado do campo. 3x3 coloque 3, 4x4 coloque 4 e etc.
	discord: 'https://discord.gg/AAAUr4efV5', // Link para entrar no Discord da comunidade.
	adminPass: 'oownerfsb9051', // Senha de DONO. Não passe a senha para ninguém, você pode dar moderador/administrador para outras pessoas com o comando !setadmin
					/* NIVEL DE ADM:  
							0 - JOGADOR (PADRÃO)
							1 - MODERADOR
							2 - ADMINISTRADOR*/
	map: {
		code: map, // Código do mapa - ALTERAR EM var map, NÃO ALTERAR AQUI!!
		ballSize: 10, // Tamanho da bola. Procure em 
		spawnDistance: 350, // Distancia de spawn. Procure a informação no mapa.
		timeLimit: 3, // Tempo limite.
		scoreLimit: 3 // limite de pontos.
	},
	roomConfig: {

		name: '🌀⠀⠀⠀⠀Space Bounce [FSB]', // Nome da sala.
		max: 15, // Máximo de jogadores na sala.
		public: false, // A sala vai aparecer na lista?  true  para sim e  false  para não.
		geo: {"code": "aw", "lat": -23.5497, "lon": -46.6322}, // Geo localização da sala. 

		token: "thr1.AAAAAGDbRFekSSWU93iBEQ.empQfNfHzvM" // Abrir a sala sem precisar fazer o captcha. Consiga um em https://www.haxball.com/headlesstoken
		
	}

});
