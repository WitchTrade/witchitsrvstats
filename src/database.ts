import { ConnectionOptions, createConnection, Connection, Repository } from 'typeorm';
import 'dotenv/config';

import { Player } from './entities/player.entity';
import { PlayerOnServer } from './entities/playerOnServer.entity';
import { Server } from './entities/server.entity';
import { Stats } from './entities/stats.entity';

export class Database {

    private _connection: Connection;

    constructor() { }

    public async initConnection() {
        // database options
        const options: ConnectionOptions = {
            type: 'mysql',
            host: process.env.DATABASEHOST,
            port: parseInt(process.env.DATABASEPORT),
            username: process.env.DATABASEUSER,
            password: process.env.DATABASEPW,
            database: 'wistats',
            entities: [Player, Server, PlayerOnServer, Stats],
            synchronize: true,
            charset: 'utf8mb4_general_ci'
        };

        // init connection to database
        this._connection = await createConnection(options);
    }

    // getter for the database connection
    public getConnection() {
        return this._connection;
    }

}