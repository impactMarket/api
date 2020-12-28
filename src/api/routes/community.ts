import { Router } from 'express';
import communityController from '@controllers/community';
import communityValidators from '@validators/community';
import { authenticateToken } from '../middlewares';

const route = Router();

export default (app: Router): void => {
    app.use('/community', route);

    route.get(
        '/address/:contractAddress',
        communityController.findByContractAddress
    );
    route.get(
        '/id/:publicId',
        communityController.findByPublicId
    );
    route.get(
        '/publicid/:publicId',
        communityController.get
    );
    route.get(
        '/hssi/:publicId',
        communityController.getHistoricalSSI
    );
    route.get(
        '/all/:status',
        communityController.getAll
    );
    route.get(
        '/managers',
        authenticateToken,
        communityController.managers
    );
    route.get(
        '/managers/details',
        authenticateToken,
        communityController.managersDetails
    );
    route.get('/list', communityController.list);
    route.get('/list/full/:order?', communityController.listFull);
    route.post(
        '/create',
        authenticateToken,
        communityValidators.create,
        communityController.create
    );
    route.post(
        '/edit',
        authenticateToken,
        communityValidators.edit,
        communityController.edit
    );
    // TODO: add verification (not urgent, as it highly depends on the contract transaction)
    route.post(
        '/accept',
        communityValidators.accept,
        communityController.accept
    );
};