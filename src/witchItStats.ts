import * as ns from 'node-schedule';
import 'dotenv/config';
import { queryMasterServer, REGIONS } from 'steam-server-query';
import { Database } from './database';
import { Player } from './entities/player.entity';
import { PlayerOnServer } from './entities/playerOnServer.entity';
import { Server } from './entities/server.entity';
import { ServerInfo } from './models/serverinfo.model';
import { ServerTracker } from './serverTracker';
import { StatsEvaluator } from './statsEvaluator';

export class WitchItStats {
    private _database: Database;

    private _serverTracker: ServerTracker;

    private _statsEvaluator: StatsEvaluator;

    private _servers: Server[];

    public async init() {
        // init database connection
        this._database = new Database();
        await this._database.initConnection();

        this._servers = await this._database.serverRepo.find();

        this._serverTracker = new ServerTracker();

        this._statsEvaluator = new StatsEvaluator(this._database);

        console.log('Witch It stats script started!');

        ns.scheduleJob('*/5 * * * *', async () => {
            // used for timestamps. Always set to full minute
            const date = new Date();
            date.setSeconds(0, 0);

            // get all servers with players on it
            let serverHosts: string[];
            try {
                serverHosts = await queryMasterServer(process.env.STEAMMASTERSERVER, REGIONS.ALL, { appid: parseInt(process.env.WITCHITAPPID), empty: 1 }, 1000);
            } catch (err) {
                console.log(err);
                return;
            }

            // fetch servers and save the connections into the database
            const servers = await this._serverTracker._fetchServerInfos(serverHosts);
            await this._saveConnections(servers, date);

            if (date.getMinutes() === 0) {
                await this._removeOldStats(date);
                // evalute and create stats
                this._statsEvaluator.evaluateStats();
            }
        });
    }

    private async _refreshServerArray() {
        this._servers = await this._database.serverRepo.find();
    }

    private async _saveConnections(servers: ServerInfo[], date: Date) {
        const playerOnServers: PlayerOnServer[] = [];

        for (const server of servers) {
            let dbServer = this._servers.find(srv => srv.name === server.name && srv.gamemode === server.gameMode);

            if (!dbServer) {
                const newServer = new Server()
                newServer.name = server.name
                newServer.region = server.name.substring(0, 2).toLowerCase()
                newServer.gamemode = server.gameMode
                newServer.address = server.address.split(':')[0]
                newServer.port = parseInt(server.address.split(':')[1])
                await this._database.serverRepo.insert(newServer)
                await this._refreshServerArray()
                dbServer = this._servers.find(srv => srv.name === server.name && srv.gamemode === server.gameMode);
                console.error(`Inserted new gameserver into database. Server: ${server.address}, ${server.name}, ${server.gameMode}`);
            }

            // This should not happen but if the connection is slow or interrupted, it still can
            // mostly happens to HK servers
            if (!server.players) {
                console.error(`Failed to get players for ${server.address}, ${server.name}`);
                return;
            }

            // loop through players and save them in the db if they don't exist
            for (const player of server.players) {
                let dbPlayer = await this._database.playerRepo.findOne({ where: { name: player } });

                // new player! Create a new one in the database
                if (!dbPlayer) {
                    const newPlayer = new Player();
                    newPlayer.name = player;
                    dbPlayer = await this._database.playerRepo.save(newPlayer);
                }

                const playerOnServer = new PlayerOnServer();
                playerOnServer.player = dbPlayer;
                playerOnServer.server = dbServer;
                playerOnServer.time = date;
                playerOnServers.push(playerOnServer);
            }
        }

        await this._database.playerOnServerRepo.insert(playerOnServers);
        this._database.playerOnServerHistoryRepo.insert(playerOnServers);
    }

    private async _removeOldStats(date: Date) {
        const aWeekAgo = new Date(date);
        aWeekAgo.setDate(aWeekAgo.getDate() - 7);
        await this._database.playerOnServerRepo.createQueryBuilder('playerOnServer')
            .delete()
            .where('time < :aWeekAgo', { aWeekAgo })
            .execute();
    }
}
