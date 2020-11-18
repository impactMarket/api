import {
    Router,
} from 'express';
import CommunityDailyStateService from '../services/communityDailyState';
import GlobalDailyStateService from '../services/globalDailyState';
import GlobalStatusService from '../services/globalStatus';
import InflowService from '../services/inflow';

const route = Router();


export default (app: Router): void => {
    app.use('/global-status', route);

    route.get('/',
        async (req, res) => {
            res.send({
                global: await GlobalStatusService.get(),
                outflow: await GlobalStatusService.outflow(),
                inflow: await GlobalStatusService.inflow(),
                //
                monthly: await GlobalDailyStateService.getLast30Days(),
                lastQuarterAvgSSI: await GlobalDailyStateService.last90DaysAvgSSI(),
                today: await CommunityDailyStateService.notYetCountedToday(),
                totalBackers: await InflowService.countEvergreenBackers(),
            });
        });
};