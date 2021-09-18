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

    private _dayToWeekday = [
        'Sun',
        'Mon',
        'Tue',
        'Wed',
        'Thu',
        'Fri',
        'Sat',
    ];

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

        stats.push(this._getPlayerDistributionFor(playerOnServerValues, `${timeRange}_distribution_region`, 'region', 'eu', 'eu', 'EU'));
        stats.push(this._getPlayerDistributionFor(playerOnServerValues, `${timeRange}_distribution_region`, 'region', 'hk', 'hk', 'HK'));
        stats.push(this._getPlayerDistributionFor(playerOnServerValues, `${timeRange}_distribution_region`, 'region', 'us', 'us', 'US'));

        stats.push(this._getPlayerDistributionFor(playerOnServerValues, `${timeRange}_distribution_mode`, 'gamemode', this._gameModes.has.value, this._gameModes.has.key, this._gameModes.has.value));
        stats.push(this._getPlayerDistributionFor(playerOnServerValues, `${timeRange}_distribution_mode`, 'gamemode', this._gameModes.mobi.value, this._gameModes.mobi.key, this._gameModes.mobi.value));
        stats.push(this._getPlayerDistributionFor(playerOnServerValues, `${timeRange}_distribution_mode`, 'gamemode', this._gameModes.hah.value, this._gameModes.hah.key, this._gameModes.hah.value));
        stats.push(this._getPlayerDistributionFor(playerOnServerValues, `${timeRange}_distribution_mode`, 'gamemode', this._gameModes.imp.value, this._gameModes.imp.key, this._gameModes.imp.value));
        stats.push(this._getPlayerDistributionFor(playerOnServerValues, `${timeRange}_distribution_mode`, 'gamemode', this._gameModes.fap.value, this._gameModes.fap.key, this._gameModes.fap.value));

        this._database.statsRepo.save(stats);
    }

    private _getPlayerDistributionFor(playerOnServerValues: any[], group: string, groupBy: 'region' | 'gamemode', filterBy: string, dataset: string, label: string) {
        const datasetLength = playerOnServerValues.length;
        const stat = this._roundToFractions(playerOnServerValues.filter(playerOnServer => playerOnServer[groupBy] === filterBy).length / datasetLength, 3) * 100;
        return { statGroup: group, dataset, label, value: stat.toString() };
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
        from.setUTCHours(from.getUTCHours() - 1);

        let to = new Date(this._now);
        to.setMinutes(0, 0, 0);

        const stats: Stats[] = [];

        for (let i = 24; i >= 1; i--) {

            const playerOnServerValuesByRegion = await this._fetchPlayerOnServerValues(from, to, 'region');

            stats.push(this._calculateAveragePlayerCountFor(playerOnServerValuesByRegion, `d_playercount_region`, 'region', 'eu', 12, 'EU', `${to.getUTCHours()}:00`));
            stats.push(this._calculateAveragePlayerCountFor(playerOnServerValuesByRegion, `d_playercount_region`, 'region', 'hk', 12, 'HK', `${to.getUTCHours()}:00`));
            stats.push(this._calculateAveragePlayerCountFor(playerOnServerValuesByRegion, `d_playercount_region`, 'region', 'us', 12, 'US', `${to.getUTCHours()}:00`));

            const playerOnServerValuesByGameMode = await this._fetchPlayerOnServerValues(from, to, 'gamemode');

            stats.push(this._calculateAveragePlayerCountFor(playerOnServerValuesByGameMode, `d_playercount_mode`, 'gamemode', this._gameModes.has.value, 12, this._gameModes.has.value, `${to.getUTCHours()}:00`));
            stats.push(this._calculateAveragePlayerCountFor(playerOnServerValuesByGameMode, `d_playercount_mode`, 'gamemode', this._gameModes.mobi.value, 12, this._gameModes.mobi.value, `${to.getUTCHours()}:00`));
            stats.push(this._calculateAveragePlayerCountFor(playerOnServerValuesByGameMode, `d_playercount_mode`, 'gamemode', this._gameModes.hah.value, 12, this._gameModes.hah.value, `${to.getUTCHours()}:00`));
            stats.push(this._calculateAveragePlayerCountFor(playerOnServerValuesByGameMode, `d_playercount_mode`, 'gamemode', this._gameModes.imp.value, 12, this._gameModes.imp.value, `${to.getUTCHours()}:00`));
            stats.push(this._calculateAveragePlayerCountFor(playerOnServerValuesByGameMode, `d_playercount_mode`, 'gamemode', this._gameModes.fap.value, 12, this._gameModes.fap.value, `${to.getUTCHours()}:00`));

            to.setUTCHours(to.getUTCHours() - 1);
            from.setUTCHours(from.getUTCHours() - 1);
        }

        from = new Date(this._now);
        from.setUTCHours(from.getUTCHours() - (from.getUTCHours() % 2), 0, 0, 0);
        from.setUTCHours(from.getUTCHours() - 2);

        to = new Date(this._now);
        to.setUTCHours(to.getUTCHours() - (to.getUTCHours() % 2), 0, 0, 0);

        for (let i = 84; i >= 1; i--) {
            const playerOnServerValues = await this._fetchPlayerOnServerValues(from, to, 'time');

            stats.push(this._calculateTotalAveragePlayerCount(playerOnServerValues, `w_playercount`, 84, 'Players', `${this._dayToWeekday[to.getDay()]} ${to.getUTCHours()}:00`));

            to.setUTCHours(to.getUTCHours() - 2);
            from.setUTCHours(from.getUTCHours() - 2);
        }

        this._database.statsRepo.save(stats);
    }

    private _calculateAveragePlayerCountFor(playerOnServerValues: any[], group: string, groupBy: 'region' | 'gamemode', filterBy: string, maxValueCount: number, dataset: string, label: string) {
        const filtered = playerOnServerValues.filter(playerOnServerValue => playerOnServerValue[groupBy] === filterBy);
        const total = filtered.reduce((a, b) => a + parseInt(b.count, 10), 0);
        const average = Math.round(total / maxValueCount) || 0;

        return { statGroup: group, dataset, label, value: average.toString() };
    }

    private _calculateTotalAveragePlayerCount(playerOnServerValues: any[], group: string, maxValueCount: number, dataset: string, label: string) {
        const total = playerOnServerValues.reduce((a, b) => a + parseInt(b.count, 10), 0);
        const average = Math.round(total / maxValueCount) || 0;

        return { statGroup: group, dataset, label, value: average.toString() };
    }

    // 
    // COMMON USED FUNCTION
    // 

    private async _fetchPlayerOnServerValues(from: Date, to?: Date, groupBy?: 'region' | 'gamemode' | 'time') {
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
        }

        if (groupBy && groupBy !== 'time') {
            request.addGroupBy('time');
        }

        return await request.getRawMany();
    }
}