import * as Sentry from '@sentry/node';
import { Logger } from '@utils/logger';
// import bodyParser from 'body-parser';
import cors from 'cors';
import express, { Request, Response } from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

import config from '../config';
import routes from './routes';

export default (app: express.Application): void => {
    /**
     * Health Check endpoints
     * @TODO Explain why they are here
     */
    app.get('/status', (req, res) => {
        res.status(200).end();
    });
    app.head('/status', (req, res) => {
        res.status(200).end();
    });

    // RequestHandler creates a separate execution context using domains, so that every
    // transaction/span/breadcrumb is attached to its own Hub instance
    app.use(Sentry.Handlers.requestHandler());
    // TracingHandler creates a trace for every incoming request
    app.use(Sentry.Handlers.tracingHandler());
    app.use((req, res, next) => {
        const transaction = (res as any).__sentry_transaction;
        transaction.name = transaction.name
            .replace(
                /[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[4][0-9A-Fa-f]{3}-[89AB][0-9A-Fa-f]{3}-[0-9A-Fa-f]{12}/g,
                '<uuid>'
            )
            .replace(/0x[a-fA-F0-9]{40}/g, '<address>')
            .replace(/true|false/g, '<boolean>')
            .replace(/\d/g, '<digit>');
        (res as any).__sentry_transaction = transaction;
        next();
    });

    let swaggerServers: {
        url: string;
    }[] = [];
    let urlSchema = 'http';
    if (process.env.NODE_ENV === 'development') {
        swaggerServers = [
            {
                url: 'http://localhost:5000/api',
            },
        ];
    } else {
        swaggerServers = [
            {
                url: process.env.HEROKU_APP_NAME + '.herokuapp.com/api',
            },
        ];
        urlSchema = 'https';
    }
    if (swaggerServers.length > 0 && process.env.NODE_ENV !== 'test') {
        const options = {
            swaggerDefinition: {
                openapi: '3.0.1',
                info: {
                    description: 'Swagger UI to impactMarket API',
                    version: '0.0.1',
                    title: 'impactMarket',
                    license: {
                        name: 'Apache 2.0',
                        url: 'http://www.apache.org/licenses/LICENSE-2.0.html',
                    },
                },
                tags: [
                    {
                        name: 'user',
                        description: 'Everything about your users',
                    },
                    {
                        name: 'story',
                        description: 'Manage stories',
                    },
                    {
                        name: 'community',
                        description: 'UBI communities',
                    },
                ],
                servers: swaggerServers,
                schemes: [urlSchema],
                components: {
                    securitySchemes: {
                        api_auth: {
                            type: urlSchema,
                            scheme: 'bearer',
                            bearerFormat: 'JWT',
                            scopes: {
                                write: 'modify',
                                read: 'read',
                            },
                        },
                    },
                },
            },
            apis: ['./src/api/routes/*.ts', './src/interfaces/ubi/*.ts'],
        };
        const swaggerSpec = swaggerJsdoc(options);

        console.log(swaggerSpec);

        app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
        app.use(morgan('combined'));
    }

    // Useful if you're behind a reverse proxy (Heroku, Bluemix, AWS ELB, Nginx, etc)
    // It shows the real origin IP in the heroku or Cloudwatch logs
    app.enable('trust proxy');

    app.use(helmet());
    // The magic package that prevents frontend developers going nuts
    // Alternate description:
    // Enable Cross Origin Resource Sharing to all origins by default
    app.use(cors());
    app.use((req, res, next) => {
        res.header('Access-Control-Allow-Origin', '*');
        res.header(
            'Access-Control-Allow-Headers',
            'Origin, X-Requested-With, Content-Type, Accept'
        );
        next();
    });

    // Middleware that transforms the raw string of req.body into json
    app.use(express.json());
    // app.use(express.urlencoded({ extended: true }));
    // Load API routes
    app.use(config.api.prefix, routes());

    // The error handler must be before any other error middleware and after all controllers
    app.use(Sentry.Handlers.errorHandler());

    app.use((error, req, res, next) => {
        Logger.error(
            req.originalUrl + ' -> ' + error &&
                error.details &&
                error.details.get('body') &&
                error.details.get('body').details &&
                error.details.get('body').details.length > 0 &&
                error.details.get('body').details[0].message
        );
        if (error && error.toString().indexOf('celebrate') !== -1) {
            return res.status(200).json({
                success: false,
                error:
                    'celebrate error ' + error.details &&
                    error.details.get('body') &&
                    error.details.get('body').details &&
                    error.details.get('body').details.length > 0 &&
                    error.details.get('body').details[0].message,
            });
        }
        next();
    });

    /// catch 404
    app.use((req, res, next) => {
        res.status(404).send({ success: false, error: 'what???' });
    });

    /// error handlers
    app.use((err: any, req: Request, res: Response) => {
        if (err.name === 'UnauthorizedError') {
            res.status(err.status)
                .send({ success: false, message: err.message })
                .end();
        }
        res.status(err.status || 500).json({
            success: false,
            errors: {
                message: err.message,
            },
        });
    });
};
