export class ServerInfo {
    name: string;
    gameMode: string;
    playerCount: number;
    maxPlayers: number;
    players: { name: string, playingFor: number; }[];
}