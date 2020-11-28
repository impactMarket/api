import { stub, assert, match } from 'sinon';

import BeneficiaryService from '../../../../src/services/beneficiary';
import CommunityDailyStateService from '../../../../src/services/communityDailyState';
import CommunityDailyMetricsService from '../../../../src/services/communityDailyMetrics';
import CommunityContractService from '../../../../src/services/communityContract';
import CommunityService from '../../../../src/services/community';
import SSIService from '../../../../src/services/ssi';
import { calcuateCommunitiesMetrics } from '../../../../src/jobs/cron/community';
import { activeBeneficiariesLast30Days, allBeneficiariesInCommunity } from '../../../fake/beneficiary';
import { validNonEmptyMonthLongCommunities, communitiesContract, ssiLast4Days, totalClaimedLast30Days } from '../../../fake/community';



describe('[jobs - cron] community', () => {

    // const userFindOneStub = stub(User, 'findOne');

    describe('#calcuateCommunitiesMetrics()', () => {
        let dailyMetricsAdd;
        before(() => {
            // result doesn't matter
            dailyMetricsAdd = stub(CommunityDailyMetricsService, 'add');
            dailyMetricsAdd.returns(Promise.resolve({} as any));
            // TODO: remove
            stub(SSIService, 'add').returns(Promise.resolve({} as any));

            //
            stub(BeneficiaryService, 'getActiveBeneficiariesLast30Days').returns(Promise.resolve(activeBeneficiariesLast30Days));
            stub(CommunityDailyStateService, 'getTotalClaimedLast30Days').returns(Promise.resolve(totalClaimedLast30Days));
            stub(CommunityDailyMetricsService, 'getSSILast4Days').returns(Promise.resolve(ssiLast4Days));
            stub(CommunityContractService, 'getAll').returns(Promise.resolve(communitiesContract));
            stub(BeneficiaryService, 'getAllInCommunity').returns(Promise.resolve(allBeneficiariesInCommunity));
        });

        it('all valid, non-empty communities, 30+ days', async () => {
            stub(CommunityService, 'getAll').returns(Promise.resolve(validNonEmptyMonthLongCommunities));

            // run!
            await calcuateCommunitiesMetrics();

            // assert
            assert.callCount(dailyMetricsAdd, validNonEmptyMonthLongCommunities.length);
            assert.calledWith(dailyMetricsAdd.getCall(0), 'c77a15a7-2cef-4d1e-96db-afd0b91ab71d', -50.11, -9.12, 1.18, 42.37, match.any);
            assert.calledWith(dailyMetricsAdd.getCall(1), 'b090d41f-91c0-4f18-a809-633217590bbb', -50.06, -8.39, 0.3, 66.66, match.any);
            assert.calledWith(dailyMetricsAdd.getCall(2), 'a3b4ad6e-dc8e-4861-b5b2-c1973907c515', -50.17, -9.19, 0.44, 22.72, match.any);
        });
    });
});