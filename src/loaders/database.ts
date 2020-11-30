import { Sequelize, Options } from 'sequelize';

import config from '../config';
import initModels from '../db/models';
import { CommunityContract } from '../db/models/communityContract';
import { Logger } from '../loaders/logger';

export default (): Sequelize => {
    let logging:
        | boolean
        | ((sql: string, timing?: number | undefined) => void)
        | undefined;
    if (process.env.NODE_ENV === 'development') {
        logging = (msg) => false;
    } else {
        logging = (msg) => Logger.verbose(msg);
    }
    const dbConfig: Options = {
        dialect: 'postgres',
        protocol: 'postgres',
        native: true,
        logging,
        // query: { raw: true },
    };
    const sequelize = new Sequelize(config.dbUrl, dbConfig);
    initModels(sequelize);
    // sequelize.models.Manager.findAll({
    //     include: [{ model: sequelize.models.User }]
    // }).then(console.log);
    // sequelize.models.User.findAll({
    //     include: [{ model: sequelize.models.Manager }],
    //     raw: true
    // }).then(console.log);
    return sequelize;
};
