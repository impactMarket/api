import { CommunityDailyMetrics } from '../db/models/communityDailyMetrics';


export default class CommunityDailyMetricsService {

    public static async add(
        communityId: string,
        ssi: number | null,
        fundingRate: number | null,
        date: Date,
    ): Promise<CommunityDailyMetrics> {
        return await CommunityDailyMetrics.create({
            communityId,
            ssi,
            fundingRate,
            date,
        });
    }
}