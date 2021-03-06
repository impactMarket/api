import { Logger } from '@utils/logger';
import { col, fn, Op } from 'sequelize';

import { models } from '../../database';

export default class ClaimService {
    public static claim = models.claim;

    public static async add(
        address: string,
        communityId: string,
        amount: string,
        tx: string,
        txAt: Date
    ): Promise<void> {
        const claimData = {
            address,
            communityId,
            amount,
            tx,
            txAt,
        };
        try {
            await this.claim.create(claimData);
        } catch (e) {
            if (e.name !== 'SequelizeUniqueConstraintError') {
                Logger.error(
                    'Error inserting new Claim. Data = ' +
                        JSON.stringify(claimData)
                );
                Logger.error(e);
            }
        }
    }

    public static async uniqueBeneficiariesAndClaimedLast7Days(): Promise<{
        beneficiaries: number;
        claimed: string;
    }> {
        const todayMidnightTime = new Date();
        todayMidnightTime.setHours(0, 0, 0, 0);
        // seven days ago, from todayMidnightTime
        const sevenDaysAgo = new Date(todayMidnightTime.getTime() - 604800000); // 7 * 24 * 60 * 60 * 1000
        const result = (
            await this.claim.findAll({
                attributes: [
                    [
                        fn('count', fn('distinct', col('address'))),
                        'beneficiaries',
                    ],
                    [fn('sum', col('amount')), 'claimed'],
                ],
                where: {
                    txAt: {
                        [Op.lt]: todayMidnightTime,
                        [Op.gte]: sevenDaysAgo,
                    },
                },
                raw: true,
            })
        )[0];
        return {
            beneficiaries: (result as any).beneficiaries,
            claimed: (result as any).claimed,
        };
    }
}
