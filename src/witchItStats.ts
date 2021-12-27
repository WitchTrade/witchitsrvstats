import * as ns from 'node-schedule';
import 'dotenv/config';
import { queryMaster, REGIONS } from 'steam-server-query';
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
            const serverHosts = await queryMaster(process.env.STEAMMASTERSERVER, REGIONS.ALL, 1000, { appid: parseInt(process.env.WITCHITAPPID), empty: true });

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

    private async _saveConnections(servers: ServerInfo[], date: Date) {
        const playerOnServers: PlayerOnServer[] = [];

        for (const server of servers) {
            const dbServer = this._servers.find(srv => srv.name === server.name);

            if (!dbServer) {
                console.error(`Failed to find server in database. Server: ${server.name}`);
                return;
            }

            // This should not happen but if the connection is slow or interrupted, it still can
            // mostly happens to HK servers
            if (!server.players) {
                console.error(`Failed to get players for ${server.name}`);
                return;
            }

            // loop through players and save them in the db if they don't exist
            for (const player of server.players) {
                let dbPlayer = await this._database.playerRepo.findOne({ where: { name: player.name } });

                // new player! Create a new one in the database
                if (!dbPlayer) {
                    const newPlayer = new Player();
                    newPlayer.name = player.name;
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
