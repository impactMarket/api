import CommunityDailyStateService from '@services/communityDailyState';
import GlobalDailyStateService from '@services/globalDailyState';
import InflowService from '@services/inflow';
import ReachedAddressService from '@services/reachedAddress';
import { Router } from 'express';

export default (app: Router): void => {
    app.get('/clock', (req, res) => res.json(new Date().getTime()));

    app.get('/global-status', async (req, res) => {
        res.send({
            monthly: await GlobalDailyStateService.getLast30Days(),
            lastQuarterAvgSSI: await GlobalDailyStateService.last90DaysAvgSSI(),
            today: await CommunityDailyStateService.notYetCountedToday(),
            totalBackers: await InflowService.countEvergreenBackers(),
            reachedLastMonth: await ReachedAddressService.getAllReachedLast30Days(),
        });
    });
};
