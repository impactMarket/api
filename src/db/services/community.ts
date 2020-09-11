import { Community } from '../models/community';
import { ethers } from 'ethers';
import config from '../../config';
import ImpactMarketContractABI from '../../contracts/ImpactMarketABI.json'
import TransactionsService from './transactions';
import { ICommunityInfo, ICommunityVars } from '../../types';
import { Op } from 'sequelize';
import SSIService from './ssi';
import { sendPushNotification } from '../../utils';


export default class CommunityService {
    public static async request(
        requestByAddress: string,
        name: string,
        description: string,
        city: string,
        country: string,
        gps: {
            latitude: number,
            longitude: number,
        },
        email: string,
        visibility: string,
        coverImage: string,
        txCreationObj: ICommunityVars,
    ): Promise<Community> {
        return Community.create({
            requestByAddress,
            name,
            description,
            city,
            country,
            gps,
            email,
            visibility,
            coverImage,
            status: 'pending',
            txCreationObj,
        });
    }

    public static async edit(
        publicId: string,
        name: string,
        description: string,
        city: string,
        country: string,
        gps: {
            latitude: number,
            longitude: number,
        },
        email: string,
        visibility: string,
        coverImage: string,
    ): Promise<[number, Community[]]> {
        return Community.update({
            name,
            description,
            city,
            country,
            gps,
            email,
            visibility,
            coverImage,
        }, { returning: true, where: { publicId } });
    }

    public static async accept(acceptanceTransaction: string, publicId: string): Promise<boolean> {
        const provider = new ethers.providers.JsonRpcProvider(config.jsonRpcUrl);
        const receipt = await provider.waitForTransaction(acceptanceTransaction);
        const ifaceImpactMarket = new ethers.utils.Interface(ImpactMarketContractABI);
        if (receipt.logs === undefined) {
            return true;
        }
        const eventsImpactMarket: ethers.utils.LogDescription[] = [];
        for (let index = 0; index < receipt.logs.length; index++) {
            try {
                const parsedLog = ifaceImpactMarket.parseLog(receipt.logs[index]);
                eventsImpactMarket.push(parsedLog);
            } catch (e) { }
        }
        const index = eventsImpactMarket.findIndex((event) => event !== null && event.name === 'CommunityAdded');
        if (index !== -1) {
            const communityContractAddress = eventsImpactMarket[index].args._communityAddress;
            const dbUpdate: [number, Community[]] = await Community.update(
                { contractAddress: communityContractAddress, status: 'valid', txCreationObj: null },
                { returning: true, where: { publicId } },
            );
            if (dbUpdate[0] === 1) {
                sendPushNotification(dbUpdate[1][0].requestByAddress, 'Community Accepted', 'Your community was accepted!', { action: "community-accepted" });
                return true;
            }
            return false;
        }
        return true;
    }

    public static async getAll(status?: string): Promise<ICommunityInfo[]> {
        if (status === undefined) {
            const communities = await Community.findAll({ raw: true });
            return communities.map((community) => ({
                ...community,
                createdAt: community.createdAt.toString(),
                updatedAt: community.updatedAt.toString(),
                backers: [],
                beneficiaries: {
                    added: [],
                    removed: [],
                },
                managers: [],
                ssi: {
                    dates: [],
                    values: [],
                },
                totalClaimed: '0',
                totalRaised: '0',
                vars: {
                    _claimAmount: '0',
                    _baseInterval: '0',
                    _maxClaim: '0',
                    _incrementInterval: '0',
                },
            }))
        }
        const result: ICommunityInfo[] = [];
        const communities = await Community.findAll({ where: { status }, raw: true });
        for (let index = 0; index < communities.length; index++) {
            result.push(await this.getCachedInfoToCommunity(communities[index]));
        }
        return result;
    }

    public static async findByFirstManager(requestByAddress: string): Promise<Community | null> {
        return Community.findOne({ where: { requestByAddress } });
    }

    public static async findByPublicId(publicId: string): Promise<ICommunityInfo | null> {
        const community = await Community.findOne({ where: { publicId }, raw: true });
        if (community === null) {
            return null;
        }
        return await this.getCachedInfoToCommunity(community);
    }

    public static async findByContractAddress(contractAddress: string): Promise<ICommunityInfo | null> {
        const community = await Community.findOne({ where: { contractAddress }, raw: true });
        if (community === null) {
            return null;
        }
        return await this.getCachedInfoToCommunity(community);
    }

    public static async getNamesAndFromAddresses(addresses: string[]): Promise<Community[]> {
        return Community.findAll({
            attributes: ['contractAddress', 'name'],
            where: {
                contractAddress: {
                    [Op.in]: addresses
                }
            }
        });
    }

    private static async getCachedInfoToCommunity(community: Community): Promise<ICommunityInfo> {
        const beneficiaries = await TransactionsService.getBeneficiariesInCommunity(community.contractAddress);
        const managers = await TransactionsService.getCommunityManagersInCommunity(community.contractAddress);
        const backers = await TransactionsService.getBackersInCommunity(community.contractAddress);
        const vars = await TransactionsService.getCommunityVars(community.contractAddress);

        const totalClaimed = await TransactionsService.getCommunityClaimedAmount(community.contractAddress);
        const totalRaised = await TransactionsService.getCommunityRaisedAmount(community.contractAddress);
        const ssi = await SSIService.get(community.publicId);

        return {
            ...community,
            createdAt: community.createdAt.toString(),
            updatedAt: community.updatedAt.toString(),
            backers,
            beneficiaries,
            managers,
            ssi,
            totalClaimed: totalClaimed.toString(),
            totalRaised: totalRaised.toString(),
            vars,
        };
    }

    public static async mappedNames(): Promise<Map<string, string>> {
        const mapped = new Map<string, string>();
        const query = await Community.findAll({
            attributes: ['contractAddress', 'name'],
        });
        for (let index = 0; index < query.length; index++) {
            const element = query[index];
            mapped.set(element.contractAddress, element.name);
        }
        return mapped;
    }
}