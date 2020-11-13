import { col, fn, Op } from 'sequelize';
import { ReachedAddress } from '../db/models/reachedAddress';
import Logger from '../loaders/logger';


export default class ReachedAddressService {

    public static async addNewReachedYesterday(
        addresses: string[],
    ): Promise<number> {
        // verify which ones were not registered on the last 30 days and return the count
        const yesterday = new Date(new Date().getTime() - 86400000);
        yesterday.setHours(0, 0, 0, 0);
        // 30 days ago, from yesterday
        const aMonthAgo = new Date(yesterday.getTime() - 2592000000); // 30 * 24 * 60 * 60 * 1000
        const existingAddresses = (await ReachedAddress.findAll({
            attributes: [[fn('count', col('address')), 'total']],
            where: {
                address: {
                    [Op.in]: addresses
                },
                lastInteraction: {
                    [Op.lte]: yesterday,
                    [Op.gte]: aMonthAgo,
                }
            },
        }))[0];
        const totalNewAddresses = addresses.length - (existingAddresses as any).total;
        try {
            const yesterday = new Date(new Date().getTime() - 86400000);
            yesterday.setHours(0, 0, 0, 0);
            // update all new and existing entries
            for (let index = 0; index < addresses.length; index++) {
                await ReachedAddress.upsert({
                    address: addresses[index],
                    lastInteraction: yesterday,
                });
            }
        } catch (e) {
            Logger.info(e);
        }
        return totalNewAddresses;
    }
}