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
    }

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

    private async _fetchPlayerOnServerValues(from: Date, groupBy?: 'region' | 'gamemode', to?: Date) {
        const request = this._database.playerOnServerRepo.createQueryBuilder('playerOnServer')
            .select('time')
            .innerJoin('playerOnServer.server', 'server')
            .addSelect('server.region', 'region')
            .addSelect('server.gamemode', 'gamemode')
            .where('time > :from', { from: from.toUTCString() });

        if (to) {
            request.andWhere('time < :to', { to: to.toUTCString() });
        }

        if (groupBy) {
            request.groupBy(groupBy);
            request.addGroupBy('time');
        }

        return await request.getRawMany();
    }
}