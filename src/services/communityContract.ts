import { col, fn, Op } from 'sequelize';
import { Community } from '../db/models/community';
import { CommunityContract } from '../db/models/communityContract';
import { ICommunityContractParams } from '../types';


export default class CommunityContractService {

    public static async add(
        communityId: string,
        contractParams: ICommunityContractParams,
    ): Promise<CommunityContract> {
        const {
            claimAmount,
            maxClaim,
            baseInterval,
            incrementInterval
        } = contractParams;
        return await CommunityContract.create({
            communityId,
            claimAmount,
            maxClaim,
            baseInterval,
            incrementInterval
        });
    }

    public static async get(communityId: string): Promise<ICommunityContractParams> {
        return (await CommunityContract.findOne({
            attributes: [
                'claimAmount',
                'maxClaim',
                'baseInterval',
                'incrementInterval'
            ],
            where: { communityId }
        }))!;
    }

    public static async getAll(): Promise<Map<string, CommunityContract>> {
        return new Map((await CommunityContract.findAll()).map((c) => [c.communityId, c]));
    }

    public static async avgComulativeUbi(): Promise<string> {
        const publicCommunities: string[] = (await Community.findAll({
            attributes: ['publicId'],
            where: { visibility: 'public', status: 'valid' }
        })).map((c) => c.publicId);

        const result = (await CommunityContract.findAll({
            attributes: [
                [fn('avg', col('maxClaim')), 'avgComulativeUbi']
            ],
            where: {
                communityId: { [Op.in]: publicCommunities },
            }
        }))[0];
        return (result as any).avgComulativeUbi;
    }
}