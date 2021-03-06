// import { Logger } from '@utils/logger';
import { RequestWithUser, UserInRequest } from '@ipcttypes/core';
import { Response, NextFunction, Request } from 'express';
import jwt from 'jsonwebtoken';

import config from '../../config';

export function authenticateToken(
    req: RequestWithUser,
    res: Response,
    next: NextFunction
): void {
    // Gather the jwt access token from the request header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) {
        // Logger.debug('User auth token is not valid!');
        if ((req as any).authTokenIsOptional) {
            next();
            return;
        }
        res.sendStatus(401); // if there isn't any token
        return;
    }

    jwt.verify(token, config.jwtSecret, (err, _user) => {
        if (err) {
            // Logger.debug(err.message);
            res.sendStatus(403);
            return;
        }
        if (_user === undefined) {
            res.sendStatus(403);
            return;
        }
        const user = _user as UserInRequest;
        req.user = user;
        //
        if (req.body !== undefined && req.body.address !== undefined) {
            if (req.body.address !== user.address) {
                // Logger.debug('User token not valid for user address!');
                res.sendStatus(403);
                return;
            }
        }
        next(); // pass the execution off to whatever request the client intended
    });
}

export function generateAccessToken(userAddress: string): string {
    return jwt.sign(
        { address: userAddress, masterKey: config.masterKey } as UserInRequest,
        config.jwtSecret
    );
}

export function adminAuthentication(
    req: Request,
    res: Response,
    next: NextFunction
): void {
    // Gather the jwt access token from the request header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) {
        // Logger.debug('Admin auth is not valid!');
        res.sendStatus(401); // if there isn't any token
        return;
    }

    jwt.verify(token, config.jwtSecret, (err, _admin) => {
        if (err) {
            // Logger.debug(err.message);
            res.sendStatus(403);
            return;
        }
        const admin = _admin as { key: string };
        //
        if (config.adminKey !== admin.key) {
            // Logger.debug('NOT ALLOWED!');
            res.sendStatus(403);
            return;
        }
        next(); // pass the execution off to whatever request the client intended
    });
}
