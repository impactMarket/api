import { Sequelize } from 'sequelize';

import { initializeAgenda } from './agenda';
import { initializeSubscribers } from './app/subscribers';
import { initializeBeneficiary } from './beneficiary';
import { initializeBeneficiaryTransaction } from './beneficiaryTransaction';
import { initializeClaim } from './claim';
import { initializeClaimLocation } from './claimLocation';
import { initializeCommunity } from './community';
import { initializeCommunityContract } from './communityContract';
import { initializeCommunityDailyMetrics } from './communityDailyMetrics';
import { initializeCommunityDailyState } from './communityDailyState';
import { initializeCommunityState } from './communityState';
import { initializeUbiRequestChangeParams } from './UBI/requestChangeParams';
import { initializeCronJobExecuted } from './cronJobExecuted';
import { initializeExchangeRates } from './exchangeRates';
import { initializeGlobalGrowth } from './globalGrowth';
import { initializeGlobalDailyState } from './globalDailyState';
import { initializeGlobalDemographics } from './globalDemographics';
import { initializeAppUserDevice } from './app/userDevice';
import { initializeImMetadata } from './imMetadata';
import { initializeInflow } from './inflow';
import { initializeManager } from './manager';
import { initializeMobileError } from './mobileError';
import { initializeNotifiedBacker } from './notifiedBacker';
import { initializeReachedAddress } from './reachedAddress';
import { initializeSSI } from './ssi';
import { initializeTransactions } from './transactions';
import initializeUser from './user';
import { initializeStoryContent } from './story/storyContent';
import { initializeStoryCommunity } from './story/storyCommunity';
import { initializeStoryEngagement } from './story/storyEngagement';
import { initializeStoryUserEngagement } from './story/storyUserEngagement';
import { initializeAppAnonymousReport } from './app/anonymousReport';
import { initializeStoryUserReport } from './story/storyUserReport';
import { userAssociation } from './associations/user';
import { initializeAppUserThroughTrust } from './app/appUserThroughTrust';
import { initializeAppUserTrust } from './app/appUserTrust';

export default function initModels(sequelize: Sequelize): void {
    initializeSubscribers(sequelize);
    initializeUbiRequestChangeParams(sequelize);
    initializeCommunity(sequelize);
    initializeSSI(sequelize);
    initializeTransactions(sequelize);
    initializeUser(sequelize);
    initializeAppUserTrust(sequelize);
    initializeAppUserThroughTrust(sequelize);
    initializeAppUserDevice(sequelize);
    initializeAgenda(sequelize);
    initializeClaimLocation(sequelize);
    initializeExchangeRates(sequelize);
    initializeNotifiedBacker(sequelize);
    initializeImMetadata(sequelize);
    initializeBeneficiary(sequelize);
    initializeAppAnonymousReport(sequelize);
    initializeManager(sequelize);
    initializeClaim(sequelize);
    initializeInflow(sequelize);
    initializeCommunityState(sequelize);
    initializeCommunityDailyState(sequelize);
    initializeCommunityDailyMetrics(sequelize);
    initializeMobileError(sequelize);
    initializeCommunityContract(sequelize);
    initializeGlobalDailyState(sequelize);
    initializeReachedAddress(sequelize);
    initializeCronJobExecuted(sequelize);
    initializeBeneficiaryTransaction(sequelize);
    initializeGlobalDemographics(sequelize);
    initializeGlobalGrowth(sequelize);

    // story
    initializeStoryContent(sequelize);
    initializeStoryCommunity(sequelize);
    initializeStoryEngagement(sequelize);
    initializeStoryUserEngagement(sequelize);
    initializeStoryUserReport(sequelize);

    // used to query from the community with incude
    sequelize.models.Community.hasMany(sequelize.models.StoryCommunityModel, {
        foreignKey: 'communityId',
        as: 'storyCommunity',
    });
    // used to query from the sotry community with incude
    sequelize.models.StoryCommunityModel.belongsTo(sequelize.models.Community, {
        foreignKey: 'communityId',
        as: 'community',
    });

    // used to query from the community with incude
    sequelize.models.StoryCommunityModel.belongsTo(
        sequelize.models.StoryContentModel,
        {
            foreignKey: 'contentId',
            as: 'storyContent',
        }
    );
    // used to post from the content with incude
    sequelize.models.StoryContentModel.hasOne(
        sequelize.models.StoryCommunityModel,
        {
            foreignKey: 'contentId',
            as: 'storyCommunity',
        }
    );

    // used to query from the community with incude
    sequelize.models.StoryEngagementModel.belongsTo(
        sequelize.models.StoryContentModel,
        {
            foreignKey: 'contentId',
            as: 'storyContent',
        }
    );
    // used to post from the content with incude
    sequelize.models.StoryContentModel.hasOne(
        sequelize.models.StoryEngagementModel,
        {
            foreignKey: 'contentId',
            as: 'storyEngagement',
        }
    );

    // used to query from the community with incude
    sequelize.models.StoryUserEngagementModel.belongsTo(
        sequelize.models.StoryContentModel,
        {
            foreignKey: 'contentId',
            as: 'storyContent',
        }
    );
    // used to post from the content with incude
    sequelize.models.StoryContentModel.hasMany(
        sequelize.models.StoryUserEngagementModel,
        {
            foreignKey: 'contentId',
            as: 'storyUserEngagement',
        }
    );

    // used to query from the community with incude
    sequelize.models.StoryUserReportModel.belongsTo(
        sequelize.models.StoryContentModel,
        {
            foreignKey: 'contentId',
            as: 'storyContent',
        }
    );
    // used to post from the content with incude
    sequelize.models.StoryContentModel.hasMany(
        sequelize.models.StoryUserReportModel,
        {
            foreignKey: 'contentId',
            as: 'storyUserReport',
        }
    );

    userAssociation(sequelize);

    // sequelize.models.AppUserTrustModel.create({
    //     phone:
    //         'b96000f4543a5c7c3d75e72626324e785270e078c5a25013a15895097bd1d818',
    // }).then(async (newTrust) => {
    //     const user = await sequelize.models.UserModel.findOne({
    //         where: {
    //             address: '0x7110b4Df915cb92F53Bc01cC9Ab15F51e5DBb52F',
    //         },
    //     });
    //     await (user as any).addAppUserTrustModel(newTrust);
    // });

    sequelize.models.UserModel.findOne({
        include: [
            {
                model: sequelize.models.Beneficiary,
                as: 'beneficiary',
            },
            {
                model: sequelize.models.AppUserTrustModel,
                as: 'throughTrust',
                include: [
                    {
                        model: sequelize.models.AppUserTrustModel,
                        as: 'selfTrust',
                    },
                ],
            },
        ],
        where: {
            address: '0x7110b4Df915cb92F53Bc01cC9Ab15F51e5DBb52F',
        },
    }).then((x: any) => console.log(x?.toJSON()?.throughTrust));

    // this actually works, but eager loading not so much!
    // sequelize.models.Manager.belongsTo(sequelize.models.User, {
    //     foreignKey: 'user',
    //     targetKey: 'address',
    // });

    // sequelize.models.User.hasOne(sequelize.models.Manager, {
    //     foreignKey: 'user',
    // });
}
