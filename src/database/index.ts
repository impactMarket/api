import { AppAnonymousReportModel } from '@models/app/anonymousReport';
import { AppMediaContentModel } from '@models/app/appMediaContent';
import { AppMediaThumbnailModel } from '@models/app/appMediaThumbnail';
import { AppUserThroughTrustModel } from '@models/app/appUserThroughTrust';
import { AppUserTrustModel } from '@models/app/appUserTrust';
import { CronJobExecuted } from '@models/app/cronJobExecuted';
import { ExchangeRates } from '@models/app/exchangeRates';
import { ImMetadata } from '@models/app/imMetadata';
import { SubscribersModel } from '@models/app/subscribers';
import { UserModel } from '@models/app/user';
// import { AppUserDeviceModel } from '@models/app/userDevice';
import { GlobalDailyState } from '@models/global/globalDailyState';
import { GlobalDemographics } from '@models/global/globalDemographics';
import { GlobalGrowthModel } from '@models/global/globalGrowth';
import { NotifiedBacker } from '@models/notifiedBacker';
import { ReachedAddress } from '@models/reachedAddress';
import { StoryCommunityModel } from '@models/story/storyCommunity';
import { StoryContentModel } from '@models/story/storyContent';
import { StoryEngagementModel } from '@models/story/storyEngagement';
import { StoryUserEngagementModel } from '@models/story/storyUserEngagement';
import { StoryUserReportModel } from '@models/story/storyUserReport';
import { Beneficiary } from '@models/ubi/beneficiary';
import { BeneficiaryTransaction } from '@models/ubi/beneficiaryTransaction';
import { Claim } from '@models/ubi/claim';
import { ClaimLocation } from '@models/ubi/claimLocation';
import { Community } from '@models/ubi/community';
import { UbiCommunityContractModel } from '@models/ubi/communityContract';
import { UbiCommunityDailyMetricsModel } from '@models/ubi/communityDailyMetrics';
import { UbiCommunityDailyStateModel } from '@models/ubi/communityDailyState';
import { UbiCommunityDemographicsModel } from '@models/ubi/communityDemographics';
import { UbiCommunityStateModel } from '@models/ubi/communityState';
import { Inflow } from '@models/ubi/inflow';
import { Manager } from '@models/ubi/manager';
import { UbiRequestChangeParamsModel } from '@models/ubi/requestChangeParams';
import { UbiCommunityLabelModel } from '@models/ubi/ubiCommunityLabel';
import { UbiCommunitySuspectModel } from '@models/ubi/ubiCommunitySuspect';
import { UbiPromoterModel } from '@models/ubi/ubiPromoter';
import { UbiPromoterSocialMediaModel } from '@models/ubi/ubiPromoterSocialMedia';
import { Logger } from '@utils/logger';
import apicache from 'apicache';
import redis from 'redis';
import { Sequelize, Options, ModelCtor } from 'sequelize';

import config from '../config';
import { DbModels } from '../types/db';
import initModels from './models';

let logging:
    | boolean
    | ((sql: string, timing?: number | undefined) => void)
    | undefined;
if (process.env.NODE_ENV === 'development') {
    logging = (msg) => console.log(msg);
} else {
    logging = (msg) => Logger.verbose(msg);
}
const dbConfig: Options = {
    dialect: 'postgres',
    dialectOptions: {
        connectTimeout: 60000,
    },
    pool: {
        max: 30,
        min: 0,
        acquire: 60000,
        idle: 5000,
    },
    protocol: 'postgres',
    native: true,
    logging,
    // query: { raw: true }, // I wish, eager loading gets fixed
};
const sequelize = new Sequelize(config.dbUrl, dbConfig);
initModels(sequelize);
const models: DbModels = {
    user: sequelize.models.UserModel as ModelCtor<UserModel>,
    appUserTrust: sequelize.models
        .AppUserTrustModel as ModelCtor<AppUserTrustModel>,
    appUserThroughTrust: sequelize.models
        .AppUserThroughTrustModel as ModelCtor<AppUserThroughTrustModel>,
    community: sequelize.models.Community as ModelCtor<Community>,
    ubiCommunitySuspect: sequelize.models
        .UbiCommunitySuspectModel as ModelCtor<UbiCommunitySuspectModel>,
    ubiCommunityContract: sequelize.models
        .UbiCommunityContractModel as ModelCtor<UbiCommunityContractModel>,
    ubiCommunityState: sequelize.models
        .UbiCommunityStateModel as ModelCtor<UbiCommunityStateModel>,
    ubiCommunityDailyState: sequelize.models
        .UbiCommunityDailyStateModel as ModelCtor<UbiCommunityDailyStateModel>,
    ubiCommunityDailyMetrics: sequelize.models
        .UbiCommunityDailyMetricsModel as ModelCtor<UbiCommunityDailyMetricsModel>,
    ubiCommunityDemographics: sequelize.models
        .UbiCommunityDemographicsModel as ModelCtor<UbiCommunityDemographicsModel>,
    ubiPromoter: sequelize.models
        .UbiPromoterModel as ModelCtor<UbiPromoterModel>,
    ubiPromoterSocialMedia: sequelize.models
        .UbiPromoterSocialMediaModel as ModelCtor<UbiPromoterSocialMediaModel>,
    ubiCommunityLabels: sequelize.models
        .UbiCommunityLabelModel as ModelCtor<UbiCommunityLabelModel>,
    ubiRequestChangeParams: sequelize.models
        .UbiRequestChangeParamsModel as ModelCtor<UbiRequestChangeParamsModel>,
    claim: sequelize.models.Claim as ModelCtor<Claim>,
    claimLocation: sequelize.models.ClaimLocation as ModelCtor<ClaimLocation>,
    beneficiary: sequelize.models.Beneficiary as ModelCtor<Beneficiary>,
    anonymousReport: sequelize.models
        .AppAnonymousReportModel as ModelCtor<AppAnonymousReportModel>,
    beneficiaryTransaction: sequelize.models
        .BeneficiaryTransaction as ModelCtor<BeneficiaryTransaction>,
    cronJobExecuted: sequelize.models
        .CronJobExecuted as ModelCtor<CronJobExecuted>,
    exchangeRates: sequelize.models.ExchangeRates as ModelCtor<ExchangeRates>,
    globalDailyState: sequelize.models
        .GlobalDailyState as ModelCtor<GlobalDailyState>,
    globalDemographics: sequelize.models
        .GlobalDemographics as ModelCtor<GlobalDemographics>,
    globalGrowth: sequelize.models
        .GlobalGrowthModel as ModelCtor<GlobalGrowthModel>,
    // userDevice: sequelize.models
    //     .AppUserDeviceModel as ModelCtor<AppUserDeviceModel>,
    imMetadata: sequelize.models.ImMetadata as ModelCtor<ImMetadata>,
    inflow: sequelize.models.Inflow as ModelCtor<Inflow>,
    manager: sequelize.models.Manager as ModelCtor<Manager>,
    subscribers: sequelize.models
        .SubscribersModel as ModelCtor<SubscribersModel>,
    notifiedBacker: sequelize.models
        .NotifiedBacker as ModelCtor<NotifiedBacker>,
    reachedAddress: sequelize.models
        .ReachedAddress as ModelCtor<ReachedAddress>,

    appMediaContent: sequelize.models
        .AppMediaContentModel as ModelCtor<AppMediaContentModel>,
    appMediaThumbnail: sequelize.models
        .AppMediaThumbnailModel as ModelCtor<AppMediaThumbnailModel>,
    // stories
    storyContent: sequelize.models
        .StoryContentModel as ModelCtor<StoryContentModel>,
    storyCommunity: sequelize.models
        .StoryCommunityModel as ModelCtor<StoryCommunityModel>,
    storyEngagement: sequelize.models
        .StoryEngagementModel as ModelCtor<StoryEngagementModel>,
    storyUserEngagement: sequelize.models
        .StoryUserEngagementModel as ModelCtor<StoryUserEngagementModel>,
    storyUserReport: sequelize.models
        .StoryUserReportModel as ModelCtor<StoryUserReportModel>,
};

let redisClient: redis.RedisClient;
if (process.env.NODE_ENV === 'test') {
    redisClient = undefined as any;
} else {
    redisClient = redis.createClient(config.redis, {
        tls: {
            rejectUnauthorized: false,
        },
    });
}
const cacheWithRedis = apicache.options(
    process.env.NODE_ENV === 'test'
        ? {}
        : {
              redisClient,
          }
).middleware;

export { sequelize, Sequelize, models, redisClient, cacheWithRedis };
