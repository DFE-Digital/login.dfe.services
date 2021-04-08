'use strict';

const express = require('express');
const logger = require('../../infrastructure/logger');
const {asyncWrapper} = require('login.dfe.express-error-handling');
const AppCache = require('../../infrastructure/helpers/AppCache');
const router = express.Router({mergeParams: true});
const auth = require('../../infrastructure/helpers/auth');

const signout = () => {
    logger.info('Mounting appcache route');

    router.use(auth({
        audience: 'signin.education.gov.uk',
        clockTolerance: 30,
    }));

    router.get(
        '/flush/:id',
        asyncWrapper((req, res) => {
            AppCache.delete(req.params.id);
            res.status(200).send('Cache item deleted').end();
        }),
    );
    router.get(
        '/flushall',
        asyncWrapper((req, res) => {
            AppCache.flushAll();
            res.status(200).send('Cache flushed').end();
        }),
    );
    return router;
};

module.exports = signout;
