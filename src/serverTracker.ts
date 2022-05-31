import { InfoResponse, PlayerResponse, queryGameServerInfo, queryGameServerPlayer } from 'steam-server-query';
import { FetchStatus } from './models/fetchstatus.model';
import { ServerInfo } from './models/serverinfo.model';

export class ServerTracker {

    public async _fetchServerInfos(serverHosts: string[]) {
        let serverInfos: ServerInfo[] = [];
        let finisher: (value: unknown) => void;
        const finished = new Promise((resolve, reject) => {
            finisher = resolve;
        });
        const fetchStatus: FetchStatus = {
            totalServers: serverHosts.length,
            fetchedServers: 0,
            serversWithPlayers: 0,
            resolvedPlayers: 0,
            finisher
        };
        for (const server of serverHosts) {
            this._fetchServer(server, fetchStatus, serverInfos);
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

    private async _fetchServer(server: string, fetchStatus: FetchStatus, serverInfos: ServerInfo[]) {
        let serverRes: InfoResponse;
        try {
            serverRes = await queryGameServerInfo(server, 2, 2000);
        } catch (err) {
            console.error(`Error for ${server}`);
            fetchStatus.fetchedServers++;
            this._checkIfFinished(fetchStatus);
            return;
        }
        const infos: any = {};
        (serverRes.keywords as string).split(',').forEach(e => {
            const keyVal = e.split(':');
            infos[keyVal[0]] = keyVal[1];
        });
        if ((infos.PlayerCount_i === undefined && serverRes.players > 0) ||
        parseInt(infos.PlayerCount_i) > 0) {
            fetchStatus.serversWithPlayers++;
            serverInfos.push({ name: serverRes.name, address: server, playerCount: infos.PlayerCount_i === undefined
                ? serverRes.players
                : parseInt(infos.PlayerCount_i), maxPlayers: serverRes.maxPlayers, gameMode: infos.GameMode_s, players: null });
            this._fetchPlayers(server, serverRes.name, fetchStatus, serverInfos);
        }
        fetchStatus.fetchedServers++;
        this._checkIfFinished(fetchStatus);
    }

    private async _fetchPlayers(server: string, serverName: string, fetchStatus: FetchStatus, serverInfos: ServerInfo[]) {
        let playerRes: PlayerResponse;
        try {
            playerRes = await queryGameServerPlayer(server, 3, [2000, 2000, 4000]);
        } catch (err) {
            console.error(`Error getting players for ${server}, ${serverName}`);
            fetchStatus.resolvedPlayers++;
            this._checkIfFinished(fetchStatus);
            return;
        }
        const players = playerRes.players.map(p => p.name).filter(p => p);
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
