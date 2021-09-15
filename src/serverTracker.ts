import { Server } from './entities/server.entity';
import { FetchStatus } from './models/fetchstatus.model';
import { ServerInfo } from './models/serverinfo.model';
import { SourceServerQuery } from './modules/sourceServerQuery';

export class ServerTracker {
    private _sourceServerQuery: SourceServerQuery;

    constructor(private _servers: Server[]) {
        this._sourceServerQuery = new SourceServerQuery();
    }

    public async _fetchServerInfos() {
        let serverInfos: ServerInfo[] = [];
        let finisher: (value: unknown) => void;
        const finished = new Promise((resolve, reject) => {
            finisher = resolve;
        });
        const fetchStatus: FetchStatus = {
            totalServers: this._servers.length,
            fetchedServers: 0,
            serversWithPlayers: 0,
            resolvedPlayers: 0,
            finisher
        };
        for (const server of this._servers) {
            this._fetchServer(server.address, server.port, fetchStatus, serverInfos, server.name);
        }
        await finished;
        serverInfos = serverInfos.sort((a, b) => {
            if (a.playerCount > b.playerCount) {
                return -1;
            }
            if (a.playerCount < b.playerCount) {
                return 1;
            }
            return 0;
        });
        serverInfos = serverInfos.sort((a, b) => {
            if (a.name.substring(0, 2) > b.name.substring(0, 2)) {
                return 1;
            }
            if (a.name.substring(0, 2) < b.name.substring(0, 2)) {
                return -1;
            }
            return 0;
        });
        return serverInfos;
    }

    private async _fetchServer(ip: string, port: number, fetchStatus: FetchStatus, serverInfos: ServerInfo[], serverName: string) {
        const serverRes = await this._sourceServerQuery.info(ip, port, 2000);
        if (!serverRes) {
            console.error(`Error for ${ip}:${port} (${serverName})`);
            fetchStatus.fetchedServers++;
            this._checkIfFinished(fetchStatus);
            return;
        }
        const infos: any = {};
        (serverRes.keywords as string).split(',').forEach(e => {
            const keyVal = e.split(':');
            infos[keyVal[0]] = keyVal[1];
        });
        if (parseInt(infos.PlayerCount_i) > 0) {
            fetchStatus.serversWithPlayers++;
            serverInfos.push({ name: serverRes.name as string, playerCount: parseInt(infos.PlayerCount_i), maxPlayers: serverRes.maxplayers as number, gameMode: infos.GameMode_s, players: null });
            this._fetchPlayers(ip, port, serverRes.name as string, fetchStatus, serverInfos);
        }
        fetchStatus.fetchedServers++;
        this._checkIfFinished(fetchStatus);
    }

    private async _fetchPlayers(ip: string, port: number, serverName: string, fetchStatus: FetchStatus, serverInfos: ServerInfo[]) {
        let playerRes = await this._sourceServerQuery.players(ip, port, 1000);
        if (!playerRes) {
            playerRes = await this._sourceServerQuery.players(ip, port, 2000);
        }
        if (!playerRes) {
            playerRes = await this._sourceServerQuery.players(ip, port, 2000);
            if (!playerRes) {
                fetchStatus.resolvedPlayers++;
                this._checkIfFinished(fetchStatus);
                return;
            }
        }
        const players = playerRes.filter(p => p.name).map(p => {
            return { name: Buffer.from(p.name, 'binary').toString(), playingFor: p.duration };
        }).sort((a, b) => b.playingFor - a.playingFor);
        const index = serverInfos.findIndex(s => s.name === serverName);
        serverInfos[index].players = players;
        fetchStatus.resolvedPlayers++;
        this._checkIfFinished(fetchStatus);
    }

    private _checkIfFinished(fetchStatus: FetchStatus) {
        if (fetchStatus.totalServers === fetchStatus.fetchedServers && fetchStatus.serversWithPlayers === fetchStatus.resolvedPlayers) {
            fetchStatus.finisher(null);
        }
    }
}