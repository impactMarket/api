import { GlobalDailyStateCreationAttributes } from '@models/global/globalDailyState';
import GlobalDailyStateService from '@services/global/globalDailyState';
import GlobalGrowthService from '@services/global/globalGrowth';
import ReachedAddressService from '@services/reachedAddress';
import { calculateGrowth } from '@utils/util';
import { BigNumber } from 'bignumber.js';
import { mean, median } from 'mathjs';
import { col, fn, Op, Sequelize } from 'sequelize';

import config from '../../../config';
import { models } from '../../../database';

BigNumber.config({ EXPONENTIAL_AT: [-7, 30] });

async function calculateMetricsGrowth(
    globalDailyStateService: GlobalDailyStateService
) {
    const globalGrowthService = new GlobalGrowthService();

    const todayMidnightTime = new Date();
    todayMidnightTime.setUTCHours(0, 0, 0, 0);
    const yesterdayDateOnly = new Date();
    yesterdayDateOnly.setUTCHours(0, 0, 0, 0);
    yesterdayDateOnly.setDate(todayMidnightTime.getDate() - 1);
    const aMonthAgo = new Date();
    aMonthAgo.setUTCHours(0, 0, 0, 0);
    aMonthAgo.setDate(yesterdayDateOnly.getDate() - 30);

    const present = await globalDailyStateService.sumLast30Days(
        yesterdayDateOnly
    );
    const past = await globalDailyStateService.sumLast30Days(aMonthAgo);

    const growthToAdd = {
        date: yesterdayDateOnly,
        claimed: calculateGrowth(past.tClaimed, present.tClaimed),
        claims: calculateGrowth(past.tClaims, present.tClaims),
        beneficiaries: calculateGrowth(
            past.tBeneficiaries,
            present.tBeneficiaries
        ),
        raised: calculateGrowth(past.tRaised, present.tRaised),
        backers: calculateGrowth(past.tBackers, present.tBackers),
        fundingRate: calculateGrowth(past.fundingRate, present.fundingRate),
        volume: calculateGrowth(past.tVolume, present.tVolume),
        transactions: calculateGrowth(
            past.tTransactions,
            present.tTransactions
        ),
        reach: calculateGrowth(past.tReach, present.tReach),
        reachOut: calculateGrowth(past.tReachOut, present.tReachOut),
    };
    await globalGrowthService.add(growthToAdd);
}

async function calculateInflowOutflow(
    yesterdayDateOnly: Date,
    lastGlobalMetrics: GlobalDailyStateCreationAttributes
) {
    let totalRaised = '0';
    let totalDistributed = '0';
    let totalBeneficiaries = 0;

    const communitiesYesterday: {
        totalClaimed: string;
        totalClaims: string;
        totalBeneficiaries: string;
        totalRaised: string;
    } = (
        await models.ubiCommunityDailyState.findAll({
            attributes: [
                [fn('sum', col('claimed')), 'totalClaimed'],
                [fn('sum', col('claims')), 'totalClaims'],
                [fn('sum', col('beneficiaries')), 'totalBeneficiaries'],
                [fn('sum', col('raised')), 'totalRaised'],
            ],
            where: {
                date: yesterdayDateOnly.toISOString().split('T')[0],
                communityId: {
                    [Op.in]: (
                        await models.community.findAll({
                            attributes: ['id'],
                            where: {
                                visibility: 'public',
                                status: 'valid',
                            },
                            raw: true,
                        })
                    ).map((c) => c.id),
                },
            },
            raw: true,
        })
    )[0] as any;

    totalRaised = new BigNumber(lastGlobalMetrics.totalRaised)
        .plus(communitiesYesterday.totalRaised)
        .toString();
    totalDistributed = new BigNumber(lastGlobalMetrics.totalDistributed)
        .plus(communitiesYesterday.totalClaimed)
        .toString();
    totalBeneficiaries =
        lastGlobalMetrics.totalBeneficiaries +
        parseInt(communitiesYesterday.totalBeneficiaries, 10);
    const totalBackers = await models.inflow.count({
        distinct: true,
        col: 'from',
    });

    return {
        totalRaised,
        totalDistributed,
        totalBeneficiaries,
        totalBackers,
        communitiesYesterday,
    };
}

async function calculateUbiPulse(
    todayMidnightTime: Date,
    yesterdayDateOnly: Date
) {
    const uniqueBackersAndFundingLast30Days = async (
        startDate: Date
    ): Promise<{
        backers: number;
        funding: string;
    }> => {
        // 30 days ago, from todayMidnightTime
        const aMonthAgo = new Date(startDate);
        aMonthAgo.setDate(startDate.getDate() - 30);
        const result: { backers: string; funding: string } = (
            await models.inflow.findAll({
                attributes: [
                    [fn('count', fn('distinct', col('from'))), 'backers'],
                    [fn('sum', col('amount')), 'funding'],
                ],
                where: {
                    txAt: {
                        [Op.lt]: startDate,
                        [Op.gte]: aMonthAgo,
                    },
                },
                raw: true,
            })
        )[0] as any;
        return {
            backers: parseInt(result.backers, 10),
            funding: result.funding,
        };
    };

    const getCommunitiesAvg = async (
        date: Date
    ): Promise<{
        medianSSI: number;
        avgUbiRate: number;
        avgEstimatedDuration: number;
    }> => {
        const fiveDaysAgo = new Date(date);
        fiveDaysAgo.setDate(date.getDate() - 5);
        const communitiesId = (
            await models.community.findAll({
                attributes: ['id'],
                where: {
                    visibility: 'public',
                    status: 'valid',
                    started: {
                        [Op.lte]: fiveDaysAgo,
                    },
                },
                raw: true,
            })
        ).map((c) => c.id);

        if (communitiesId.length === 0) {
            return {
                avgEstimatedDuration: 0,
                avgUbiRate: 0,
                medianSSI: 0,
            };
        }

        // TODO: should be at least 5 days, 2 beneficiaries and 2 claims
        const pastSSI = (
            await models.ubiCommunityDailyMetrics.findAll({
                attributes: ['ssi'],
                where: {
                    date,
                    communityId: {
                        [Op.in]: communitiesId,
                    },
                },
                raw: true,
            })
        ).map((m) => m.ssi);
        const medianSSI = pastSSI.length > 2 ? median(pastSSI) : 0;

        const raw = (
            await models.ubiCommunityDailyMetrics.findAll({
                attributes: [
                    [fn('avg', col('ubiRate')), 'avgUbiRate'],
                    [
                        fn('avg', col('estimatedDuration')),
                        'avgEstimatedDuration',
                    ],
                ],
                where: {
                    date,
                    communityId: { [Op.in]: communitiesId },
                },
                raw: true,
            })
        )[0] as any;
        return {
            medianSSI,
            avgUbiRate: parseFloat(raw.avgUbiRate),
            avgEstimatedDuration: parseFloat(raw.avgEstimatedDuration),
        };
    };

    const getAvgComulativeUbi = async (): Promise<string> => {
        const result = (
            await models.ubiCommunityContract.findAll({
                attributes: [[fn('avg', col('maxClaim')), 'avgComulativeUbi']],
                where: {
                    communityId: {
                        [Op.in]: (
                            await models.community.findAll({
                                attributes: ['id'],
                                where: {
                                    visibility: 'public',
                                    status: 'valid',
                                },
                                raw: true,
                            })
                        ).map((c) => c.id),
                    },
                },
                raw: true,
            })
        )[0] as any;
        return result.avgComulativeUbi;
    };

    const backersAndFunding = await uniqueBackersAndFundingLast30Days(
        todayMidnightTime
    );
    const communitiesAvgYesterday = await getCommunitiesAvg(yesterdayDateOnly);

    const givingRate = parseFloat(
        new BigNumber(backersAndFunding.funding)
            .dividedBy(10 ** config.cUSDDecimal) // set 18 decimals from onchain values
            .dividedBy(backersAndFunding.backers)
            .dividedBy(30)
            .decimalPlaces(2, 1)
            .toString()
    );
    const ubiRate = communitiesAvgYesterday.avgUbiRate;
    const avgComulativeUbi = await getAvgComulativeUbi();
    const avgUbiDuration = communitiesAvgYesterday.avgEstimatedDuration;

    return {
        givingRate,
        ubiRate,
        avgComulativeUbi,
        avgUbiDuration,
        backersAndFunding,
        communitiesAvgYesterday,
    };
}

async function calculateEconomicActivity(
    yesterdayDateOnly: Date,
    lastGlobalMetrics: GlobalDailyStateCreationAttributes
) {
    const reachedAddressService = new ReachedAddressService();
    let totalVolume = '0';
    let totalTransactions = '0';

    const getAllByDay = async (
        date: Date
    ): Promise<{
        reach: string[];
        reachOut: string[];
        volume: string;
        transactions: number;
    }> => {
        const uniqueAddressesReached =
            await models.beneficiaryTransaction.findAll({
                attributes: [[fn('distinct', col('withAddress')), 'addresses']],
                where: { date },
                raw: true,
            }); // this is an array, wich can be empty (return no rows)
        const uniqueAddressesReachedOut =
            await models.beneficiaryTransaction.findAll({
                attributes: [[fn('distinct', col('withAddress')), 'addresses']],
                where: {
                    date,
                    withAddress: {
                        [Op.notIn]: Sequelize.literal(
                            '(select distinct address from beneficiary)'
                        ),
                    },
                },
                raw: true,
            }); // this is an array, wich can be empty (return no rows)
        const volumeAndTransactions = (
            await models.beneficiaryTransaction.findAll({
                attributes: [
                    [fn('coalesce', fn('sum', col('amount')), 0), 'volume'],
                    [fn('count', col('tx')), 'transactions'],
                ],
                where: { date },
                raw: true,
            })
        )[0] as any; // this is a single result, that, if there's nothing, the result is zero
        // result is { volume: null, transactions: '0' } if nothing has happened
        console.log(volumeAndTransactions);
        return {
            reach:
                uniqueAddressesReached.length === 0
                    ? []
                    : uniqueAddressesReached.map((a: any) => a.addresses),
            reachOut:
                uniqueAddressesReachedOut.length === 0
                    ? []
                    : uniqueAddressesReachedOut.map((a: any) => a.addresses),
            volume:
                volumeAndTransactions.volume === null
                    ? '0'
                    : volumeAndTransactions.volume,
            transactions: parseInt(volumeAndTransactions.transactions, 10),
        };
    };

    const volumeTransactionsAndAddresses = await getAllByDay(yesterdayDateOnly);

    const { volume, transactions } = volumeTransactionsAndAddresses;
    const reach = volumeTransactionsAndAddresses.reach.length;
    const reachOut = volumeTransactionsAndAddresses.reachOut.length;
    await reachedAddressService.updateReachedList(
        volumeTransactionsAndAddresses.reach // no need to concat reachOut. reach as all new addresses
    );
    // TODO: spending rate
    const spendingRate = 0;

    totalVolume = new BigNumber(lastGlobalMetrics.totalVolume)
        .plus(volumeTransactionsAndAddresses.volume)
        .toString();
    totalTransactions = new BigNumber(
        lastGlobalMetrics.totalTransactions.toString()
    )
        .plus(volumeTransactionsAndAddresses.transactions)
        .toString();

    return {
        totalVolume,
        totalTransactions,
        spendingRate,
        volume,
        transactions,
        reach,
        reachOut,
    };
}

async function calculateChartsData(
    todayMidnightTime: Date,
    communitiesAvgYesterday: {
        medianSSI: number;
        avgUbiRate: number;
        avgEstimatedDuration: number;
    }
) {
    const getLast4AvgMedianSSI = async (): Promise<number[]> => {
        // it was null just once at the system's begin.
        const last = await models.globalDailyState.findAll({
            attributes: ['avgMedianSSI'],
            order: [['date', 'DESC']],
            limit: 4,
            raw: true,
        });
        return last.map((g) => g.avgMedianSSI);
    };

    const getMonthlyClaimed = async (from: Date): Promise<string> => {
        // 30 days ago, from todayMidnightTime
        const aMonthAgo = new Date(from);
        aMonthAgo.setDate(from.getDate() - 30);
        //
        const claimed: { claimed: string } = (
            await models.claim.findAll({
                attributes: [[fn('sum', col('amount')), 'claimed']],
                where: {
                    txAt: {
                        [Op.lt]: from,
                        [Op.gte]: aMonthAgo,
                    },
                },
                raw: true,
            })
        )[0] as any;
        // there will always be claimed.lenght > 0 (were only zero at the begining)
        return claimed.claimed;
    };

    const getMonthlyRaised = async (from: Date): Promise<string> => {
        // 30 days ago, from todayMidnightTime
        const aMonthAgo = new Date(from);
        aMonthAgo.setDate(from.getDate() - 30);
        const raised: { raised: string } = (
            await models.inflow.findAll({
                attributes: [[fn('sum', col('amount')), 'raised']],
                where: {
                    txAt: {
                        [Op.lt]: from,
                        [Op.gte]: aMonthAgo,
                    },
                },
                raw: true,
            })
        )[0] as any;
        // there will always be raised.lenght > 0 (were only zero at the begining)
        return raised.raised;
    };

    const reachedAddressService = new ReachedAddressService();
    // const globalDailyStateService = new GlobalDailyStateService();
    const last4DaysAvgSSI = await getLast4AvgMedianSSI();

    const monthlyClaimed = await getMonthlyClaimed(todayMidnightTime);
    const monthlyRaised = await getMonthlyRaised(todayMidnightTime);

    // chart data by day, all communities sum
    // remaining data are in communitiesYesterday
    const fundingRate = parseFloat(
        new BigNumber(monthlyRaised)
            .minus(monthlyClaimed)
            .dividedBy(monthlyRaised)
            .multipliedBy(100)
            .toFixed(2, 1)
    );

    const allReachEver = await reachedAddressService.getAllReachedEver();

    const avgMedianSSI = mean(
        last4DaysAvgSSI.concat([communitiesAvgYesterday.medianSSI])
    );

    return {
        fundingRate,
        allReachEver,
        avgMedianSSI,
    };
}

/**
 * As this is all calculated past midnight, everything is from yesterdayDateOnly
 */
export async function calcuateGlobalMetrics(): Promise<void> {
    // const reachedAddressService = new ReachedAddressService();
    const globalDailyStateService = new GlobalDailyStateService();
    const todayMidnightTime = new Date();
    todayMidnightTime.setUTCHours(0, 0, 0, 0);
    const yesterdayDateOnly = new Date(); // yesterdayDateOnly
    yesterdayDateOnly.setUTCHours(0, 0, 0, 0);
    yesterdayDateOnly.setDate(yesterdayDateOnly.getDate() - 1);

    // get last global metrics
    let lastGlobalMetrics: GlobalDailyStateCreationAttributes;
    const last = await models.globalDailyState.findAll({
        order: [['date', 'DESC']],
        limit: 1,
        raw: true,
    });
    if (last.length === 0) {
        const communitiesPublicId = (
            await models.community.findAll({
                attributes: ['publicId'],
                where: { status: 'valid', visibility: 'public' },
            })
        ).map((c) => c.publicId);

        const totalBeneficiaries = await models.beneficiary.count({
            where: {
                txAt: { [Op.lt]: yesterdayDateOnly },
                communityId: { [Op.in]: communitiesPublicId },
                active: true,
            },
        });

        const totalDistributed: string = (
            (
                await models.claim.findAll({
                    attributes: [[fn('sum', col('amount')), 'claimed']],
                    where: {
                        txAt: { [Op.lt]: yesterdayDateOnly },
                        communityId: { [Op.in]: communitiesPublicId },
                    },
                    raw: true,
                })
            )[0] as any
        ).claimed;

        const volumeAndTransactions = (
            await models.beneficiaryTransaction.findAll({
                attributes: [
                    [fn('coalesce', fn('sum', col('amount')), 0), 'volume'],
                    [fn('count', col('tx')), 'transactions'],
                ],
                where: {
                    date: { [Op.lt]: yesterdayDateOnly },
                },
                raw: true,
            })
        )[0] as any; // this is a single result, that, if there's nothing, the result is zero

        const totalActivity = {
            volume:
                volumeAndTransactions.volume === null
                    ? '0'
                    : volumeAndTransactions.volume,
            transactions: parseInt(volumeAndTransactions.transactions, 10),
        };

        lastGlobalMetrics = {
            avgComulativeUbi: '0',
            avgMedianSSI: 0,
            avgUbiDuration: 0,
            backers: 0,
            beneficiaries: 0,
            claimed: '0',
            claims: 0,
            fundingRate: 0,
            givingRate: 0,
            raised: '0',
            reach: 0,
            reachOut: 0,
            spendingRate: 0,
            totalBackers: 0,
            totalBeneficiaries,
            totalDistributed,
            totalRaised: '0',
            totalReach: BigInt(0),
            totalReachOut: BigInt(0),
            totalTransactions: BigInt(totalActivity.transactions),
            totalVolume: totalActivity.volume,
            transactions: 0,
            ubiRate: 0,
            volume: '0',
            date: new Date(),
        };
    } else {
        lastGlobalMetrics = last[0];
    }

    // inflow / outflow
    const {
        totalRaised,
        totalDistributed,
        totalBackers,
        totalBeneficiaries,
        communitiesYesterday,
    } = await calculateInflowOutflow(yesterdayDateOnly, lastGlobalMetrics);

    // ubi pulse
    const {
        givingRate,
        ubiRate,
        avgComulativeUbi,
        avgUbiDuration,
        backersAndFunding,
        communitiesAvgYesterday,
    } = await calculateUbiPulse(todayMidnightTime, yesterdayDateOnly);

    // economic activity
    const {
        totalVolume,
        totalTransactions,
        spendingRate,
        volume,
        transactions,
        reach,
        reachOut,
    } = await calculateEconomicActivity(yesterdayDateOnly, lastGlobalMetrics);

    // calculate charts data
    const { fundingRate, allReachEver, avgMedianSSI } =
        await calculateChartsData(todayMidnightTime, communitiesAvgYesterday);

    // register new global daily state
    await globalDailyStateService.add({
        date: yesterdayDateOnly,
        avgMedianSSI: Math.round(avgMedianSSI * 100) / 100,
        claimed: communitiesYesterday.totalClaimed,
        claims: parseInt(communitiesYesterday.totalClaims, 10),
        beneficiaries: parseInt(communitiesYesterday.totalBeneficiaries, 10),
        raised: communitiesYesterday.totalRaised,
        backers: backersAndFunding.backers,
        volume,
        transactions,
        reach,
        reachOut,
        totalRaised,
        totalDistributed,
        totalBackers,
        totalBeneficiaries,
        givingRate,
        ubiRate: Math.round(ubiRate * 100) / 100,
        fundingRate,
        spendingRate,
        avgComulativeUbi,
        avgUbiDuration: Math.round(avgUbiDuration * 100) / 100,
        totalVolume,
        totalTransactions: BigInt(totalTransactions),
        totalReach: BigInt(allReachEver.reach),
        totalReachOut: BigInt(allReachEver.reachOut),
    });

    if ((await globalDailyStateService.count()) > 60) {
        // calculate global growth
        await calculateMetricsGrowth(globalDailyStateService);
    }
}
