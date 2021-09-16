import { Database } from './database';
import { Stats } from './entities/stats.entity';

export class StatsEvaluator {
    private _now: Date;

    private _gameModes = {
        has: {
            key: 'HaS',
            value: 'Hide and Seek'
        },
        mobi: {
            key: 'Mobi',
            value: 'Mobification'
        },
        hah: {
            key: 'HaH',
            value: 'Hunt a Hag'
        },
        imp: {
            key: 'Imp',
            value: 'Imposturous (WIP)'
        },
        fap: {
            key: 'FaP',
            value: 'Fill a Pot (WIP)'
        }
    };

    constructor(private _database: Database) { }

    public evaluateStats() {
        this._now = new Date();
        this._evaluatePlayerDistribution();
        this._evaluatePlayerCount();
    }

    // 
    // PLAYER DISTRIBUTION STATS
    // 

    private async _evaluatePlayerDistribution() {
        const aDayAgo = new Date(this._now);
        aDayAgo.setDate(aDayAgo.getDate() - 1);

        this._savePlayerDistribution((await this._fetchPlayerOnServerValues(aDayAgo)), 'd');

        const aWeekAgo = new Date(this._now);
        aWeekAgo.setDate(aWeekAgo.getDate() - 7);

        this._savePlayerDistribution((await this._fetchPlayerOnServerValues(aWeekAgo)), 'w');
    }

    private async _savePlayerDistribution(playerOnServerValues: any[], timeRange: 'd' | 'w') {
        const stats: Stats[] = [];

        stats.push(this._getPlayerDistributionFor(playerOnServerValues, `${timeRange}_distribution_region`, 'region', 'eu', 'eu'));
        stats.push(this._getPlayerDistributionFor(playerOnServerValues, `${timeRange}_distribution_region`, 'region', 'hk', 'hk'));
        stats.push(this._getPlayerDistributionFor(playerOnServerValues, `${timeRange}_distribution_region`, 'region', 'us', 'us'));

        stats.push(this._getPlayerDistributionFor(playerOnServerValues, `${timeRange}_distribution_mode`, 'gamemode', this._gameModes.has.key, this._gameModes.has.value));
        stats.push(this._getPlayerDistributionFor(playerOnServerValues, `${timeRange}_distribution_mode`, 'gamemode', this._gameModes.mobi.key, this._gameModes.mobi.value));
        stats.push(this._getPlayerDistributionFor(playerOnServerValues, `${timeRange}_distribution_mode`, 'gamemode', this._gameModes.hah.key, this._gameModes.hah.value));
        stats.push(this._getPlayerDistributionFor(playerOnServerValues, `${timeRange}_distribution_mode`, 'gamemode', this._gameModes.imp.key, this._gameModes.imp.value));
        stats.push(this._getPlayerDistributionFor(playerOnServerValues, `${timeRange}_distribution_mode`, 'gamemode', this._gameModes.fap.key, this._gameModes.fap.value));

        this._database.statsRepo.save(stats);
    }

    private _getPlayerDistributionFor(playerOnServerValues: any[], group: string, groupBy: 'region' | 'gamemode', key: string, filterBy: string) {
        const datasetLength = playerOnServerValues.length;
        const stat = this._roundToFractions(playerOnServerValues.filter(playerOnServer => playerOnServer[groupBy] === filterBy).length / datasetLength, 3);
        return { group, key, value: stat.toString() };
    }

    private _roundToFractions(value: number, fractionCount: number) {
        return Math.round(value * Math.pow(10, fractionCount)) / Math.pow(10, fractionCount);
    }

    // 
    // PLAYER COUNT STATS
    // 

    private async _evaluatePlayerCount() {
        let from = new Date(this._now);
        from.setMinutes(0, 0, 0);
        from.setHours(from.getHours() - 1);

        let to = new Date(this._now);
        to.setMinutes(0, 0, 0);

        const stats: Stats[] = [];

        for (let i = 24; i >= 1; i--) {

            const playerOnServerValuesByRegion = await this._fetchPlayerOnServerValues(from, to, 'region');

            stats.push(this._calculateAveragePlayerCount(playerOnServerValuesByRegion, `d_playercount_region`, 'region', `eu_${to.getHours()}`, 'eu', 12));
            stats.push(this._calculateAveragePlayerCount(playerOnServerValuesByRegion, `d_playercount_region`, 'region', `hk_${to.getHours()}`, 'hk', 12));
            stats.push(this._calculateAveragePlayerCount(playerOnServerValuesByRegion, `d_playercount_region`, 'region', `us_${to.getHours()}`, 'us', 12));

            const playerOnServerValuesByGameMode = await this._fetchPlayerOnServerValues(from, to, 'gamemode');

            stats.push(this._calculateAveragePlayerCount(playerOnServerValuesByGameMode, `d_playercount_mode`, 'gamemode', `${this._gameModes.has.key}_${to.getHours()}`, this._gameModes.has.value, 12));
            stats.push(this._calculateAveragePlayerCount(playerOnServerValuesByGameMode, `d_playercount_mode`, 'gamemode', `${this._gameModes.mobi.key}_${to.getHours()}`, this._gameModes.mobi.value, 12));
            stats.push(this._calculateAveragePlayerCount(playerOnServerValuesByGameMode, `d_playercount_mode`, 'gamemode', `${this._gameModes.hah.key}_${to.getHours()}`, this._gameModes.hah.value, 12));
            stats.push(this._calculateAveragePlayerCount(playerOnServerValuesByGameMode, `d_playercount_mode`, 'gamemode', `${this._gameModes.imp.key}_${to.getHours()}`, this._gameModes.imp.value, 12));
            stats.push(this._calculateAveragePlayerCount(playerOnServerValuesByGameMode, `d_playercount_mode`, 'gamemode', `${this._gameModes.fap.key}_${to.getHours()}`, this._gameModes.fap.value, 12));

            to.setHours(to.getHours() - 1);
            from.setHours(from.getHours() - 1);
        }

        from = new Date(this._now);
        from.setHours(from.getHours() - (from.getHours() % 6), 0, 0, 0);
        from.setHours(from.getHours() - 6);

        to = new Date(this._now);
        to.setHours(to.getHours() - (to.getHours() % 6), 0, 0, 0);

        for (let i = 28; i >= 1; i--) {
            const playerOnServerValuesByRegion = await this._fetchPlayerOnServerValues(from, to, 'region');

            stats.push(this._calculateAveragePlayerCount(playerOnServerValuesByRegion, `w_playercount_region`, 'region', `eu_${to.getDay()}_${to.getHours()}`, 'eu', 72));
            stats.push(this._calculateAveragePlayerCount(playerOnServerValuesByRegion, `w_playercount_region`, 'region', `hk_${to.getDay()}_${to.getHours()}`, 'hk', 72));
            stats.push(this._calculateAveragePlayerCount(playerOnServerValuesByRegion, `w_playercount_region`, 'region', `us_${to.getDay()}_${to.getHours()}`, 'us', 72));

            const playerOnServerValuesByGameMode = await this._fetchPlayerOnServerValues(from, to, 'gamemode');

            stats.push(this._calculateAveragePlayerCount(playerOnServerValuesByGameMode, `w_playercount_mode`, 'gamemode', `${this._gameModes.has.key}_${to.getDay()}_${to.getHours()}`, this._gameModes.has.value, 72));
            stats.push(this._calculateAveragePlayerCount(playerOnServerValuesByGameMode, `w_playercount_mode`, 'gamemode', `${this._gameModes.mobi.key}_${to.getDay()}_${to.getHours()}`, this._gameModes.mobi.value, 72));
            stats.push(this._calculateAveragePlayerCount(playerOnServerValuesByGameMode, `w_playercount_mode`, 'gamemode', `${this._gameModes.hah.key}_${to.getDay()}_${to.getHours()}`, this._gameModes.hah.value, 72));
            stats.push(this._calculateAveragePlayerCount(playerOnServerValuesByGameMode, `w_playercount_mode`, 'gamemode', `${this._gameModes.imp.key}_${to.getDay()}_${to.getHours()}`, this._gameModes.imp.value, 72));
            stats.push(this._calculateAveragePlayerCount(playerOnServerValuesByGameMode, `w_playercount_mode`, 'gamemode', `${this._gameModes.fap.key}_${to.getDay()}_${to.getHours()}`, this._gameModes.fap.value, 72));

            to.setHours(to.getHours() - 6);
            from.setHours(from.getHours() - 6);
        }

        this._database.statsRepo.save(stats);
    }

    private _calculateAveragePlayerCount(playerOnServerValues: any[], group: string, groupBy: 'region' | 'gamemode', key: string, filterBy: string, maxValueCount: number) {
        const filtered = playerOnServerValues.filter(playerOnServerValue => playerOnServerValue[groupBy] === filterBy);
        const total = filtered.reduce((a, b) => a + parseInt(b.count, 10), 0);
        const average = Math.round(total / maxValueCount) || 0;

        return { group, key, value: average.toString() };
    }

    // 
    // COMMON USED FUNCTION
    // 

    private async _fetchPlayerOnServerValues(from: Date, to?: Date, groupBy?: 'region' | 'gamemode') {
        const request = this._database.playerOnServerRepo.createQueryBuilder('playerOnServer')
            .select('time')
            .innerJoin('playerOnServer.server', 'server')
            .addSelect('server.region', 'region')
            .addSelect('server.gamemode', 'gamemode')
            .where('time >= :from', { from: from.toISOString() });

        if (to) {
            request.andWhere('time < :to', { to: to.toISOString() });
        }

        if (groupBy) {
            request.addSelect('count(playerOnServer.id)', 'count');
            request.groupBy(groupBy);
            request.addGroupBy('time');
        }

        return await request.getRawMany();
    }
}