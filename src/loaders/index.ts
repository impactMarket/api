import express from 'express';

import { Logger } from './logger';
import databaseLoader from './database';
import expressLoader from './express';
import jobsLoader from './jobs';

export default async ({
    expressApp,
}: {
    expressApp: express.Application;
}): Promise<void> => {
    await databaseLoader();
    Logger.info('🗺️  DB loaded and connected');

    await jobsLoader();
    Logger.info('🛠️  Jobs loaded');

    await expressLoader({ app: expressApp });
    Logger.info('📡 Express loaded');
};
