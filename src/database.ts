import { ConnectionOptions, createConnection, Connection, Repository } from 'typeorm';
import 'dotenv/config';

import { Player } from './entities/player.entity';
import { PlayerOnServer } from './entities/playerOnServer.entity';
import { PlayerOnServerHistory } from './entities/playerOnServerHistory.entity';
import { Server } from './entities/server.entity';
import { Stats } from './entities/stats.entity';

export class Database {

    private _connection: Connection;

    public serverRepo: Repository<Server>;
    public playerRepo: Repository<Player>;
    public playerOnServerRepo: Repository<PlayerOnServer>;
    public playerOnServerHistoryRepo: Repository<PlayerOnServerHistory>;
    public statsRepo: Repository<Stats>;

    constructor() { }

    public async initConnection() {
        // database options
        const options: ConnectionOptions = {
            type: 'postgres',
            host: process.env.DATABASEHOST,
            port: parseInt(process.env.DATABASEPORT),
            username: process.env.DATABASEUSER,
            password: process.env.DATABASEPW,
            database: 'wistats',
            entities: [Player, Server, PlayerOnServer, PlayerOnServerHistory, Stats],
            synchronize: true,
        };

        // init connection to database
        this._connection = await createConnection(options);

        this.serverRepo = this._connection.getRepository(Server);
        this.playerRepo = this._connection.getRepository(Player);
        this.playerOnServerRepo = this._connection.getRepository(PlayerOnServer);
        this.playerOnServerHistoryRepo = this._connection.getRepository(PlayerOnServerHistory);
        this.statsRepo = this._connection.getRepository(Stats);
    }

    // getter for the database connection
    public getConnection() {
        return this._connection;
    }

}
