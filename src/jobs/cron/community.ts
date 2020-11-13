import Logger from '../../loaders/logger';
import CommunityService from '../../services/community';
import BigNumber from 'bignumber.js';
import UserService from '../../services/user';
import { notifyBackersCommunityLowFunds } from '../../utils';
import NotifiedBackerService from '../../services/notifiedBacker';
import CommunityDailyStateService from '../../services/communityDailyState';
import { ICommunityInfo } from '../../types';
import BeneficiaryService from '../../services/beneficiary';
import { Beneficiary } from '../../db/models/beneficiary';
import CommunityDailyMetricsService from '../../services/communityDailyMetrics';
import { median, mean } from 'mathjs';
import CommunityContractService from '../../services/communityContract';
import config from '../../config';


export async function calcuateCommunitiesMetrics(): Promise<void> {
    Logger.info('Calculating community metrics...');
    const activeBeneficiariesLast7Days = await BeneficiaryService.getActiveBeneficiariesLast7Days();
    const totalClaimedLast7Days = await CommunityDailyStateService.getTotalClaimedLast7Days();
    const ssiLast5Days = await CommunityDailyMetricsService.getSSILast5Days();
    const communitiesContract = await CommunityContractService.getAll();
    const calculateMetrics = async (community: ICommunityInfo) => {
        // if no activity, do not calculate
        if (community.totalClaimed === '0' || community.totalRaised === '0') {
            return;
        }
        const rawBeneficiaries = await BeneficiaryService.getAllInCommunity(community.publicId);
        if (rawBeneficiaries.length < 1) {
            return;
        }
        let ssiDayAlone: number;
        let ssi: number;
        let ubiRate: number;
        let estimatedDuration: number;

        const beneficiariesTimeToWait: number[] = [];
        const beneficiariesTimeWaited: number[] = [];

        const beneficiaries = rawBeneficiaries.reduce((map, obj) => {
            map[obj.address] = obj;
            return map;
        }, {} as { [key: string]: Beneficiary; });

        for (const beneficiaryAdddress in beneficiaries) {
            const beneficiary = beneficiaries[beneficiaryAdddress];
            // at least two claims are necessary
            if (beneficiary.claims < 2) {
                continue;
            }
            // the first time you don't wait a single second, the second time, only base interval
            const timeToWait = parseInt(community.vars._baseInterval, 10) + (beneficiary.claims - 2) * parseInt(community.vars._incrementInterval, 10);
            const timeWaited = Math.floor((beneficiary.lastClaimAt.getTime() - beneficiary.penultimateClaimAt.getTime()) / 1000) - timeToWait;
            beneficiariesTimeToWait.push(timeToWait);
            beneficiariesTimeWaited.push(timeWaited);
        }
        // calculate ssi day alone
        const meanTimeToWait = mean(beneficiariesTimeToWait);
        const madTimeWaited = median(beneficiariesTimeWaited);
        ssiDayAlone = parseFloat(((madTimeWaited / meanTimeToWait) * 50 /* aka, 100 / 2 */).toFixed(2));

        // ssi
        const ssisAvailable = ssiLast5Days.get(community.publicId)!;
        const sumSSI = ssisAvailable.reduce((acc, cssi) => acc + cssi, 0) + ssiDayAlone;
        ssi = Math.round(parseFloat((sumSSI / (ssisAvailable.length + 1)).toFixed(2)) * 100) / 100;

        // calculate ubiRate
        ubiRate = parseFloat(
            new BigNumber(totalClaimedLast7Days.get(community.publicId)!)
                .dividedBy(10 ** config.cUSDDecimal) // set 18 decimals from onchain values
                .dividedBy(activeBeneficiariesLast7Days.get(community.publicId)!)
                .dividedBy(7)
                .toFixed(2, 1)
        );

        // calculate estimatedDuration
        estimatedDuration = parseFloat(
            new BigNumber(communitiesContract.get(community.publicId)!.maxClaim)
                .dividedBy(10 ** config.cUSDDecimal) // set 18 decimals from onchain values
                .dividedBy(ubiRate)
                .dividedBy(30)
                .toFixed(2, 1)
        );

        CommunityDailyMetricsService.add(
            community.publicId,
            ssiDayAlone,
            ssi,
            ubiRate,
            estimatedDuration,
            // since it's calculated post-midnight, save it with yesterday's date
            new Date(new Date().getTime() - 86400000),
        );
    }
    const communities = await CommunityService.getAll('valid');
    // for each community
    communities.forEach(calculateMetrics);
}

export async function verifyCommunityFunds(): Promise<void> {
    Logger.info('Verifying community funds...');
    const communities = await CommunityService.getAll('valid');

    communities.forEach(async (community) => {
        if (community.backers.length > 0 && community.totalClaimed !== '0') {
            const isLessThan10 = parseFloat(new BigNumber(community.totalClaimed)
                .div(community.totalRaised)
                .toString()) >= 0.9;

            if (isLessThan10) {
                const backersAddresses = await NotifiedBackerService.add(
                    community.backers,
                    community.publicId
                );
                const pushTokens = await UserService.getPushTokensFromAddresses(backersAddresses);
                notifyBackersCommunityLowFunds(community, pushTokens);
            }
        }
    });
}

export async function populateCommunityDailyState(): Promise<void> {
    Logger.info('Inserting community empty daily state...');
    const communities = await CommunityService.getAll('valid');

    communities.forEach((community) => {
        CommunityDailyStateService.populateNext5Days(community.publicId);
    });
}