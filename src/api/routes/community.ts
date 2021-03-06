import communityController from '@controllers/community';
import communityValidators from '@validators/community';
import { Router } from 'express';
import multer from 'multer';

import { cacheWithRedis } from '../../database';
import { adminAuthentication, authenticateToken } from '../middlewares';

/**
 * @swagger
 *  components:
 *    schemas:
 *      IListBeneficiary:
 *        type: object
 *        required:
 *          - address
 *          - username
 *          - timestamp
 *          - claimed
 *          - blocked
 *          - suspect
 *        properties:
 *          address:
 *            type: string
 *            description: Beneficiary address
 *          username:
 *            type: string
 *            nullable: true
 *            description: Username if user has filled it, otherwise null
 *          timestamp:
 *            type: integer
 *            description: Timestamp of when the beneficiary was added
 *          claimed:
 *            type: string
 *            description: How much has the beneficiary claimed since added as beneficiary
 *          blocked:
 *            type: boolean
 *            description: Is the beneficiary blocked?
 *          suspect:
 *            type: boolean
 *            description: Is the beneficiary suspect?
 *      UbiCommunity:
 *        type: object
 *        required:
 *          - id
 *          - requestByAddress
 *          - contractAddress
 *          - name
 *          - description
 *          - language
 *          - currency
 *          - city
 *          - country
 *          - gps
 *          - visibility
 *          - status
 *          - createdAt
 *          - updatedAt
 *          - cover
 *        properties:
 *          id:
 *            type: integer
 *            description: Community id
 *          requestByAddress:
 *            type: string
 *            description: Address of the user who requested to create the community
 *          contractAddress:
 *            type: string
 *            nullable: true
 *            description: Community contract address
 *          name:
 *            type: string
 *            description: Community name
 *          description:
 *            type: string
 *            description: Community description
 *          language:
 *            type: string
 *            description: Community language (used to verify if description needs translation to user language)
 *          currency:
 *            type: string
 *            description: Community FIAT currency (country currency)
 *          city:
 *            type: string
 *            description: Community city location
 *          country:
 *            type: string
 *            description: Community country location
 *          gps:
 *            type: string
 *            description: Community gps location
 *          visibility:
 *            type: string
 *            enum: [public, private]
 *            description: Community visibility
 *          status:
 *            type: string
 *            enum: [pending, valid, removed]
 *            description: Community status
 *          createdAt:
 *            type: date
 *            description: Community date of submission
 *          updatedAt:
 *            type: date
 *            description: Community date of last update
 *          cover:
 *            $ref: '#/components/schemas/AppMediaContent'
 *      UbiManager:
 *        type: object
 *        required:
 *          - address
 *          - communityId
 *          - active
 *          - createdAt
 *          - updatedAt
 *          - user
 *        properties:
 *          address:
 *            type: string
 *            description: Manager address
 *          communityId:
 *            type: string
 *            description: Manager's community publicId
 *          active:
 *            type: boolean
 *            description: If true, it's a current active manager
 *          createdAt:
 *            type: date
 *            description: Manager date of submission
 *          updatedAt:
 *            type: date
 *            description: Manager date of last update
 *          user:
 *            $ref: '#/components/schemas/AppUser'
 */
export default (app: Router): void => {
    const controller = new communityController.CommunityController();

    const route = Router();
    const storage = multer.memoryStorage();
    const upload = multer({ storage });

    app.use('/community', route);

    // admin endpoints

    route.delete('/:id', adminAuthentication, controller.delete);
    // TODO: add verification (not urgent, as it highly depends on the contract transaction)
    route.post(
        '/accept',
        communityValidators.accept,
        communityController.accept
    );
    route.get('/pending', communityController.pending);
    route.post(
        '/remove',
        adminAuthentication,
        communityValidators.remove,
        communityController.remove
    );

    // end admin endpoints
    /**
     * @deprecated use /list
     */
    route.get(
        '/list/light/:order?',
        cacheWithRedis('10 minutes'),
        communityController.listLight
    );
    /**
     * @deprecated use /list
     */
    route.get('/list/full/:order?', communityController.listFull);
    /**
     * @deprecated Deprecated in mobile-app@1.1.0
     */
    route.get(
        '/managers/search/:managerQuery',
        authenticateToken,
        communityController.searchManager
    );
    /**
     * @deprecated Deprecated in mobile-app@1.1.0
     */
    route.get(
        '/managers/list/:offset/:limit',
        authenticateToken,
        communityController.listManagers
    );

    route.get(
        '/:id/historical-ssi',
        cacheWithRedis('1 day'),
        communityController.getHistoricalSSI
    );

    route.post(
        '/picture/:isPromoter?',
        upload.single('imageFile'),
        authenticateToken,
        controller.pictureAdd
    );

    // --------------------------------------------------------------- new

    /**
     * @swagger
     *
     * /community/create:
     *   post:
     *     tags:
     *       - "community"
     *     summary: Create community
     *     responses:
     *       "200":
     *         description: OK
     *     security:
     *     - api_auth:
     *       - "write:modify":
     */
    route.post(
        '/create',
        authenticateToken,
        communityValidators.create,
        communityController.create
    );

    /**
     * @swagger
     *
     * /community/media/{mime}/{isPromoter}:
     *   get:
     *     tags:
     *       - "community"
     *     summary: Make a request for a presigned URL
     *     parameters:
     *       - in: path
     *         name: mime
     *         schema:
     *           type: string
     *         required: true
     *         description: media mimetype
     *       - in: path
     *         name: isPromoter
     *         schema:
     *           type: boolean
     *         required: false
     *         description: true to upload an image to promoter, false to community
     *     responses:
     *       "200":
     *         description: OK
     *     security:
     *     - api_auth:
     *       - "write:modify":
     */
    route.get(
        '/media/:mime/:isPromoter?',
        authenticateToken,
        controller.getPresignedUrlMedia
    );

    /**
     * @swagger
     *
     * /community/beneficiaries/{query}:
     *   get:
     *     tags:
     *       - "community"
     *     summary: Find or list beneficiaries in manager's community
     *     parameters:
     *       - in: query
     *         name: action
     *         schema:
     *           type: string
     *           enum: [search, list]
     *         required: false
     *         description: search or list beneficiaries in a community (list by default)
     *       - in: query
     *         name: active
     *         schema:
     *           type: boolean
     *         required: false
     *         description: filter search/list by active/inactive/both (both by default)
     *       - in: query
     *         name: offset
     *         schema:
     *           type: integer
     *         required: false
     *         description: offset used for community pagination (default 0)
     *       - in: query
     *         name: limit
     *         schema:
     *           type: integer
     *         required: false
     *         description: limit used for community pagination (default 5)
     *     security:
     *     - api_auth:
     *       - "write:modify":
     *     responses:
     *       "200":
     *         description: OK
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/IListBeneficiary'
     */
    route.get(
        '/beneficiaries/:query?',
        authenticateToken,
        controller.beneficiaries
    );

    /**
     * @swagger
     *
     * /community/address/{address}:
     *   get:
     *     tags:
     *       - "community"
     *     summary: Get community by contract address
     *     parameters:
     *       - in: path
     *         name: address
     *         schema:
     *           type: string
     *         required: true
     *         description: community contract address
     *     responses:
     *       "200":
     *         description: OK
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/UbiCommunity'
     */
    route.get(
        '/address/:address',
        cacheWithRedis('10 minutes'),
        controller.findByContractAddress
    );

    /**
     * @swagger
     *
     * /community/list:
     *   get:
     *     tags:
     *       - "community"
     *     summary: List communities
     *     parameters:
     *       - in: query
     *         name: orderBy
     *         schema:
     *           type: string
     *           enum: [nearest, out_of_funds, newest, bigger]
     *         required: false
     *         description: communities list order (bigger by default)
     *       - in: query
     *         name: filter
     *         schema:
     *           type: string
     *           enum: [featured]
     *         required: false
     *         description: communities filters (no filter by default)
     *       - in: query
     *         name: extended
     *         schema:
     *           type: boolean
     *         required: false
     *         description: include community metrics and contract parameters
     *       - in: query
     *         name: offset
     *         schema:
     *           type: integer
     *         required: false
     *         description: offset used for community pagination
     *       - in: query
     *         name: limit
     *         schema:
     *           type: integer
     *         required: false
     *         description: limit used for community pagination
     *       - in: query
     *         name: lat
     *         schema:
     *           type: number
     *         required: false
     *         description: latitude used for nearest location
     *       - in: query
     *         name: lng
     *         schema:
     *           type: number
     *         required: false
     *         description: longitude used for nearest location
     *     responses:
     *       "200":
     *         description: OK
     */
    route.get('/list/:query?', cacheWithRedis('10 minutes'), controller.list);

    route.get(
        '/:id/ubi',
        cacheWithRedis('10 minutes'),
        controller.findRequestChangeUbiParams
    );

    /**
     * @swagger
     *
     * /community/{id}/past-ssi:
     *   get:
     *     tags:
     *       - "community"
     *     summary: Historical SSI
     *     parameters:
     *       - in: path
     *         name: id
     *         schema:
     *           type: integer
     *         required: true
     *         description: community id
     *     responses:
     *       "200":
     *         description: OK
     *         content:
     *           application/json:
     *             schema:
     *               type: array
     *               items:
     *                 type: integer
     */
    route.get(
        '/:id/past-ssi',
        cacheWithRedis('10 minutes'),
        controller.getPastSSI
    );

    /**
     * @swagger
     *
     * /community/{id}/dashboard:
     *   get:
     *     tags:
     *       - "community"
     *     summary: Get community dashboard details
     *     parameters:
     *       - in: path
     *         name: id
     *         schema:
     *           type: integer
     *         required: true
     *         description: community id
     *     responses:
     *       "200":
     *         description: OK
     */
    route.get(
        '/:id/dashboard',
        cacheWithRedis('1 hour'),
        controller.getDashboard
    );

    /**
     * @swagger
     *
     * /community/{id}/demographics:
     *   get:
     *     tags:
     *       - "community"
     *     summary: Get community demographics
     *     parameters:
     *       - in: path
     *         name: id
     *         schema:
     *           type: integer
     *         required: true
     *         description: community id
     *     responses:
     *       "200":
     *         description: OK
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/UbiCommunityDemographics'
     */
    route.get(
        '/:id/demographics',
        cacheWithRedis('1 day'),
        controller.getDemographics
    );

    /**
     * @swagger
     *
     * /community/{id}/claim-location:
     *   get:
     *     tags:
     *       - "community"
     *     summary: Get community claim locations
     *     parameters:
     *       - in: path
     *         name: id
     *         schema:
     *           type: integer
     *         required: true
     *         description: community id
     *     responses:
     *       "200":
     *         description: OK
     *         content:
     *           application/json:
     *             schema:
     *               type: array
     *               items:
     *                 type: object
     *                 properties:
     *                   latitude:
     *                     type: integer
     *                   longitude:
     *                     type: integer
     */
    route.get(
        '/:id/claim-location',
        cacheWithRedis('1 day'),
        controller.getClaimLocation
    );

    /**
     * @swagger
     *
     * /community/{id}/managers:
     *   get:
     *     tags:
     *       - "community"
     *     summary: Get community managers
     *     parameters:
     *       - in: path
     *         name: id
     *         schema:
     *           type: integer
     *         required: true
     *         description: community id
     *     responses:
     *       "200":
     *         description: OK
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/UbiManager'
     */
    route.get('/:id/managers', controller.getManagers);

    /**
     * @swagger
     *
     * /community/{id}/promoter:
     *   get:
     *     tags:
     *       - "community"
     *     summary: Get community promoter
     *     parameters:
     *       - in: path
     *         name: id
     *         schema:
     *           type: integer
     *         required: true
     *         description: community id
     *     responses:
     *       "200":
     *         description: OK
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/UbiPromoter'
     */
    route.get('/:id/promoter', controller.getPromoter);

    /**
     * @swagger
     *
     * /community/{id}/suspect:
     *   get:
     *     tags:
     *       - "community"
     *     summary: Get suspicious community activity
     *     parameters:
     *       - in: path
     *         name: id
     *         schema:
     *           type: integer
     *         required: true
     *         description: community id
     *     responses:
     *       "200":
     *         description: OK
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/UbiCommunitySuspect'
     */
    route.get('/:id/suspect', controller.getSuspect);

    /**
     * @swagger
     *
     * /community/{id}/contract:
     *   get:
     *     tags:
     *       - "community"
     *     summary: Get community contract UBI parameters
     *     parameters:
     *       - in: path
     *         name: id
     *         schema:
     *           type: integer
     *         required: true
     *         description: community id
     *     responses:
     *       "200":
     *         description: OK
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/UbiCommunityContract'
     */
    route.get('/:id/contract', controller.getContract);

    /**
     * @swagger
     *
     * /community/{id}/state:
     *   get:
     *     tags:
     *       - "community"
     *     summary: Get community state
     *     parameters:
     *       - in: path
     *         name: id
     *         schema:
     *           type: integer
     *         required: true
     *         description: community id
     *     responses:
     *       "200":
     *         description: OK
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/UbiCommunityState'
     */
    route.get('/:id/state', controller.getState);

    /**
     * @swagger
     *
     * /community/{id}/metrics:
     *   get:
     *     tags:
     *       - "community"
     *     summary: Get community metrics
     *     parameters:
     *       - in: path
     *         name: id
     *         schema:
     *           type: integer
     *         required: true
     *         description: community id
     *     responses:
     *       "200":
     *         description: OK
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/UbiCommunityDailyMetrics'
     */
    route.get('/:id/metrics', controller.getMetrics);

    /**
     * @swagger
     *
     * /community/{id}:
     *   get:
     *     tags:
     *       - "community"
     *     summary: Get community by id
     *     parameters:
     *       - in: path
     *         name: id
     *         schema:
     *           type: integer
     *         required: true
     *         description: community id
     *     responses:
     *       "200":
     *         description: OK
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/UbiCommunity'
     */
    route.get('/:id', cacheWithRedis('10 minutes'), controller.findById);

    /**
     * @swagger
     *
     * /community:
     *   put:
     *     tags:
     *       - "community"
     *     summary: Edit existing community
     *     responses:
     *       "200":
     *         description: OK
     *     security:
     *     - api_auth:
     *       - "write:modify":
     */
    route.put(
        '/',
        authenticateToken,
        communityValidators.edit,
        controller.edit
    );
};
