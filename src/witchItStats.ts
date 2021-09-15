import { Database } from './database';

export class WitchItStats {
    private _database: Database;

    public async init() {
        // init database connection
        this._database = new Database();
        await this._database.initConnection();
    }
}