import { ExchangeRatesAttributes } from '@models/app/exchangeRates';
import { promisify } from 'util';

import { models, redisClient } from '../../database';

// TODO: this workaround will only exist until exchange rates are not returned on /welcome and /auth endpoints anymore
// and then, apicache will be used
let getRedis;
if (process.env.NODE_ENV !== 'test') {
    getRedis = promisify(redisClient.get).bind(redisClient);
}
// const setRedis = promisify(redisClient.set);

export default class ExchangeRatesService {
    public static exchangeRates = models.exchangeRates;
    private static redisKey = 'exchangeRates';

    public static async get(): Promise<ExchangeRatesAttributes[]> {
        if (process.env.NODE_ENV !== 'test') {
            const rates = await getRedis(this.redisKey);
            if (rates === null) {
                const currentRates = await this.exchangeRates.findAll({
                    attributes: ['currency', 'rate'],
                    raw: true,
                });
                redisClient.set(
                    this.redisKey,
                    JSON.stringify(currentRates),
                    'EX',
                    21600 // 6 hours in seconds
                );

                return currentRates;
            }
            return JSON.parse(rates);
        }
        return this.exchangeRates.findAll({
            attributes: ['currency', 'rate'],
            raw: true,
        });
    }
}
