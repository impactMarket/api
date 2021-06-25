import ImMetadataService from '@services/app/imMetadata';
// import TransactionsService from '@services/transactions';
import BeneficiaryService from '@services/ubi/beneficiary';
import BeneficiaryTransactionService from '@services/ubi/beneficiaryTransaction';
import ClaimsService from '@services/ubi/claim';
import CommunityService from '@services/ubi/community';
import CommunityContractService from '@services/ubi/communityContract';
import InflowService from '@services/ubi/inflow';
import ManagerService from '@services/ubi/managers';
import { Logger } from '@utils/logger';
import { getBlockTime, notifyBeneficiaryAdded } from '@utils/util';
import { ethers } from 'ethers';

import config from '../../config';
import CommunityContractABI from '../../contracts/CommunityABI.json';
import ERC20ABI from '../../contracts/ERC20ABI.json';

/* istanbul ignore next */
function asyncTxsFailure(error: any) {
    Logger.error('asyncTxsFailure ' + error);
    // should this restart the subscribers?
    process.emitWarning(error, 'TxRegistryFailureWarning');
}

class ChainSubscribers {
    provider: ethers.providers.JsonRpcProvider;
    ifaceERC20: ethers.utils.Interface;
    ifaceCommunity: ethers.utils.Interface;
    allCommunitiesAddresses: string[];
    communities: Map<string, string>;
    beneficiariesInPublicCommunities: string[];
    isCommunityPublic: Map<string, boolean>;
    filterTopics: string[][];

    constructor(
        provider: ethers.providers.JsonRpcProvider,
        beneficiariesInPublicCommunities: string[],
        communities: Map<string, string>, // <address, publicId>
        isCommunityPublic: Map<string, boolean> // true if public community
    ) {
        this.provider = provider;
        this.ifaceCommunity = new ethers.utils.Interface(CommunityContractABI);
        this.ifaceERC20 = new ethers.utils.Interface(ERC20ABI);

        this.beneficiariesInPublicCommunities = beneficiariesInPublicCommunities;
        this.communities = communities;
        this.allCommunitiesAddresses = Array.from(communities.keys());
        this.isCommunityPublic = isCommunityPublic;
        this.filterTopics = [
            [
                // ethers.utils.id('CommunityAdded(address,address,uint256,uint256,uint256,uint256)'),
                // ethers.utils.id('CommunityRemoved(address)'),
                ethers.utils.id('ManagerAdded(address)'),
                ethers.utils.id('ManagerRemoved(address)'),
                ethers.utils.id('BeneficiaryAdded(address)'),
                // ethers.utils.id('BeneficiaryLocked(address)'),
                ethers.utils.id('BeneficiaryRemoved(address)'),
                ethers.utils.id('BeneficiaryClaim(address,uint256)'),
                ethers.utils.id(
                    'CommunityEdited(uint256,uint256,uint256,uint256)'
                ),
                ethers.utils.id('Transfer(address,address,uint256)'),
            ],
        ];
        this.recover();
    }

    stop() {
        this.provider.removeAllListeners();
        ImMetadataService.setRecoverBlockUsingLastBlock();
    }

    recover() {
        this._setupListener(this.provider);
        // we start the listener alongside with the recover system
        // so we know we don't lose events.
        ImMetadataService.getRecoverBlock().then((block) =>
            this._runRecoveryTxs(block, this.provider).then(() =>
                ImMetadataService.removeRecoverBlock()
            )
        );
    }

    async _runRecoveryTxs(
        startFromBlock: number,
        provider: ethers.providers.JsonRpcProvider
    ) {
        Logger.info('Recovering past events...');
        const rawLogs = await provider.getLogs({
            fromBlock: startFromBlock,
            toBlock: 'latest',
            topics: this.filterTopics,
        });

        const logs = rawLogs.sort((a, b) => {
            if (a.blockNumber > b.blockNumber) {
                return 1;
            }
            if (a.blockNumber < b.blockNumber) {
                return -1;
            }
            // a must be equal to b
            return 0;
        });

        // iterate
        for (let x = 0; x < logs.length; x += 1) {
            // verify if cusd or community and do things
            await this._filterAndProcessEvent(provider, logs[x]);
        }
        Logger.info('Past events recovered successfully!');
    }

    _setupListener(provider: ethers.providers.JsonRpcProvider) {
        Logger.info('Starting subscribers...');
        const filter = {
            topics: this.filterTopics,
        };

        provider.on(filter, async (log: ethers.providers.Log) => {
            await this._filterAndProcessEvent(provider, log);
            ImMetadataService.setLastBlock(log.blockNumber);
        });
    }

    async _filterAndProcessEvent(
        provider: ethers.providers.JsonRpcProvider,
        log: ethers.providers.Log
    ) {
        let parsedLog: ethers.utils.LogDescription | undefined;
        if (log.address === config.cUSDContractAddress) {
            parsedLog = await this._processCUSDEvents(log);
        } else if (this.allCommunitiesAddresses.includes(log.address)) {
            parsedLog = await this._processCommunityEvents(log);
        } else {
            await this._processOtherEvents(log);
        }
        // if (parsedLog !== undefined) {
        //     TransactionsService.add(provider, log, parsedLog);
        // }
        return parsedLog;
    }

    async _processCUSDEvents(
        log: ethers.providers.Log
    ): Promise<ethers.utils.LogDescription | undefined> {
        const parsedLog = this.ifaceERC20.parseLog(log);
        let result: ethers.utils.LogDescription | undefined = undefined;
        // only transactions to community contracts (donations)
        if (this.allCommunitiesAddresses.includes(parsedLog.args[1])) {
            const from = parsedLog.args[0];
            const toCommunityAddress = parsedLog.args[1];
            const communityId = this.communities.get(toCommunityAddress)!;
            const amount = parsedLog.args[2].toString();
            getBlockTime(log.blockHash).then((txAt) =>
                InflowService.add(
                    from,
                    communityId,
                    amount,
                    log.transactionHash,
                    txAt
                ).catch(asyncTxsFailure)
            );
            result = parsedLog;
        } else if (
            // do not count from communities [eg. claims]
            !this.allCommunitiesAddresses.includes(parsedLog.args[0]) &&
            // beneficiary in public community (both from or to)
            (this.beneficiariesInPublicCommunities.includes(
                parsedLog.args[0]
            ) ||
                this.beneficiariesInPublicCommunities.includes(
                    parsedLog.args[1]
                )) &&
            // ignore AttestationProxy
            parsedLog.args[1] !== config.attestationProxyAddress &&
            // yeah, people without knowing make transactions to themselves! 🕊️
            parsedLog.args[0] !== parsedLog.args[1] &&
            // any values >0.0009cUSD (999999999999999) [eg. cUSD fees]
            parsedLog.args[2].toString().length > 15
        ) {
            const isFromBeneficiary = this.beneficiariesInPublicCommunities.includes(
                parsedLog.args[0]
            );
            const beneficiaryAddress = isFromBeneficiary
                ? parsedLog.args[0]
                : parsedLog.args[1];
            const withAddress = isFromBeneficiary
                ? parsedLog.args[1]
                : parsedLog.args[0];
            // save to table to calculate txs and volume
            await BeneficiaryTransactionService.add({
                beneficiary: beneficiaryAddress,
                withAddress,
                amount: parsedLog.args[2].toString(),
                isFromBeneficiary,
                tx: log.transactionHash,
                date: new Date(), // date only
            }).catch(asyncTxsFailure);
            result = parsedLog;
        }
        return result;
    }

    async _processCommunityEvents(
        log: ethers.providers.Log
    ): Promise<ethers.utils.LogDescription | undefined> {
        const parsedLog = this.ifaceCommunity.parseLog(log);
        let result: ethers.utils.LogDescription | undefined = undefined;
        if (parsedLog.name === 'BeneficiaryAdded') {
            const beneficiaryAddress = parsedLog.args[0];
            const communityAddress = log.address;
            let communityId = this.communities.get(communityAddress);
            if (communityId === undefined) {
                // if for some reson (it shouldn't, might mean serious problems 😬), this is undefined
                const community = await CommunityService.getOnlyCommunityByContractAddress(
                    communityAddress
                );
                if (community === null) {
                    Logger.error(
                        `Community with address ${communityAddress} wasn't found at BeneficiaryAdded`
                    );
                } else {
                    this.isCommunityPublic.set(
                        communityAddress,
                        community.visibility === 'public'
                    );
                    this.communities.set(communityAddress, community.publicId);
                    this.allCommunitiesAddresses.push(communityAddress);
                    communityId = community.publicId;
                }
            }
            const isThisCommunityPublic = this.isCommunityPublic.get(
                communityAddress
            );
            if (isThisCommunityPublic) {
                this.beneficiariesInPublicCommunities.push(beneficiaryAddress);
            }
            // allBeneficiaryAddressses.push(beneficiaryAddress);
            notifyBeneficiaryAdded(beneficiaryAddress, communityAddress);
            try {
                const txAt = await getBlockTime(log.blockHash);
                await BeneficiaryService.add(
                    beneficiaryAddress,
                    communityId!,
                    log.transactionHash,
                    txAt
                );
            } catch (e) {}
            result = parsedLog;
        } else if (parsedLog.name === 'BeneficiaryRemoved') {
            const beneficiaryAddress = parsedLog.args[0];
            const communityAddress = log.address;
            await BeneficiaryService.remove(
                beneficiaryAddress,
                this.communities.get(communityAddress)!
            );
            result = parsedLog;
        } else if (parsedLog.name === 'BeneficiaryClaim') {
            const beneficiaryAddress = parsedLog.args[0];
            const amount = parsedLog.args[1];
            const communityId = this.communities.get(log.address)!;
            const txAt = await getBlockTime(log.blockHash);
            await ClaimsService.add(
                beneficiaryAddress,
                communityId,
                amount,
                log.transactionHash,
                txAt
            );
            result = parsedLog;
        } else if (parsedLog.name === 'ManagerAdded') {
            // new managers in existing community
            const managerAddress = parsedLog.args[0];
            const communityAddress = log.address;
            await ManagerService.add(
                managerAddress,
                this.communities.get(communityAddress)!
            );
            result = parsedLog;
        } else if (parsedLog.name === 'ManagerRemoved') {
            const managerAddress = parsedLog.args[0];
            const communityAddress = log.address;
            await ManagerService.remove(
                managerAddress,
                this.communities.get(communityAddress)!
            );
            result = parsedLog;
        } else if (parsedLog.name === 'CommunityEdited') {
            const communityAddress = log.address;
            await CommunityContractService.update(
                (await CommunityService.getCommunityOnlyByPublicId(
                    this.communities.get(communityAddress)!
                ))!.id,
                {
                    claimAmount: parsedLog.args[0].toString(),
                    maxClaim: parsedLog.args[1].toString(),
                    baseInterval: parsedLog.args[2].toNumber(),
                    incrementInterval: parsedLog.args[3].toNumber(),
                }
            );
            result = parsedLog;
        }
        return result;
    }

    async _processOtherEvents(log: ethers.providers.Log): Promise<void> {
        try {
            const parsedLog = this.ifaceCommunity.parseLog(log);
            if (parsedLog.name === 'ManagerAdded') {
                const managerAddress = parsedLog.args[0];
                const communityAddress = log.address;
                if (this.allCommunitiesAddresses.includes(communityAddress)) {
                    ManagerService.add(
                        managerAddress,
                        this.communities.get(communityAddress)!
                    );
                } else {
                    const communityAddressesAndIds = await CommunityService.getAllAddressesAndIds();
                    if (
                        Array.from(communityAddressesAndIds.keys()).includes(
                            communityAddress
                        )
                    ) {
                        // in case new manager means new community
                        const communityId = communityAddressesAndIds.get(
                            communityAddress
                        )!;
                        ManagerService.add(managerAddress, communityId);
                        const community = await CommunityService.getOnlyCommunityByContractAddress(
                            communityAddress
                        );
                        if (community === null) {
                            Logger.error(
                                `Community with address ${communityAddress} wasn't found at "ManagerAdded"`
                            );
                        } else {
                            this.isCommunityPublic.set(
                                communityAddress,
                                community.visibility === 'public'
                            );
                            this.communities.set(communityAddress, communityId);
                            this.allCommunitiesAddresses.push(communityAddress);
                        }
                    } else {
                        // if for some reason (mainly timing), the community wasn't in the database, try again in 4 secs
                        // try only 5 times
                        let triesToRecover = 5;
                        const cancelTimeout = setInterval(
                            async (
                                _managerAddress: string,
                                _communityAddress: string
                            ) => {
                                Logger.warn(
                                    `Community ${_communityAddress} was not in the database when "ManagerAdded".`
                                );
                                const communityAddressesAndIds = await CommunityService.getAllAddressesAndIds();
                                if (
                                    Array.from(
                                        communityAddressesAndIds.keys()
                                    ).includes(_communityAddress) &&
                                    !this.allCommunitiesAddresses.includes(
                                        _communityAddress
                                    )
                                ) {
                                    // new community
                                    const communityId = communityAddressesAndIds.get(
                                        communityAddress
                                    )!;
                                    ManagerService.add(
                                        _managerAddress,
                                        communityId
                                    );
                                    const community = await CommunityService.getOnlyCommunityByContractAddress(
                                        communityAddress
                                    );
                                    if (community === null) {
                                        Logger.error(
                                            `Community with address ${communityAddress} wasn't found at "ManagerAdded"`
                                        );
                                    } else {
                                        this.isCommunityPublic.set(
                                            communityAddress,
                                            community.visibility === 'public'
                                        );
                                        this.communities.set(
                                            _communityAddress,
                                            communityId
                                        );
                                        this.allCommunitiesAddresses.push(
                                            _communityAddress
                                        );
                                    }
                                    clearInterval(cancelTimeout);
                                }
                                triesToRecover--;
                                if (triesToRecover === 0) {
                                    clearInterval(cancelTimeout);
                                }
                            },
                            4000,
                            managerAddress,
                            communityAddress
                        );
                    }
                }
            }
        } catch (e) {
            // as this else catch events from anywhere, it might catch unwanted events
            if (e.reason !== 'no matching event') {
                Logger.error('no matching event', e);
            }
        }
    }
}

export { ChainSubscribers };
