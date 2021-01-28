import 'module-alias/register';
import { Logger } from '@logger/logger';
import * as Sentry from '@sentry/node';
import { Integrations } from '@sentry/tracing';
import express from 'express';

import config from '../config';
import loaders from './loaders';

async function startServer() {
    const app = express();

    Sentry.init({
        dsn: config.sentryKey,
        integrations: [
            // enable HTTP calls tracing
            new Sentry.Integrations.Http({ tracing: true }),
            // enable Express.js middleware tracing
            new Integrations.Express({ app }),
            new Integrations.BrowserTracing({
                beforeNavigate: (context) => {
                    return {
                        ...context,
                        // You could use your UI's routing library to find the matching
                        // route template here. We don't have one right now, so do some basic
                        // parameter replacements.
                        name: location.pathname
                            .replace(
                                /[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[4][0-9A-Fa-f]{3}-[89AB][0-9A-Fa-f]{3}-[0-9A-Fa-f]{12}/g,
                                '<uuid>'
                            )
                            .replace(/0x[a-fA-F0-9]{40}/g, '<address>'),
                    };
                },
            }),
        ],
        tracesSampleRate: config.sentryKey === undefined ? 1 : 0.02,
    });
    await loaders({ expressApp: app });

    app.listen(config.port, () => {
        Logger.info(`
        ################################################
        🛡️  Server listening on port: ${config.port} 🛡️ 
        ################################################
        `);
    });
}

startServer();
