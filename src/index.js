const config = require('./infrastructure/config');
const configSchema = require('./infrastructure/config/schema');
const logger = require('./infrastructure/logger');
const express = require('express');
const passport = require('passport');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const expressLayouts = require('express-ejs-layouts');
const session = require('cookie-session');
const moment = require('moment');
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const csurf = require('csurf');
const flash = require('express-flash-2');
const getPassportStrategy = require('./infrastructure/oidc');
const { setUserContext, asyncMiddleware, setConfigContext } = require('./infrastructure/utils');
const helmet = require('helmet');
const sanitization = require('login.dfe.sanitization');
const { getErrorHandler, ejsErrorPages } = require('login.dfe.express-error-handling');

const registerRoutes = require('./routes');

https.globalAgent.maxSockets = http.globalAgent.maxSockets = config.hostingEnvironment.agentKeepAlive.maxSockets || 50;

configSchema.validate();

const init = async () => {
  let expiryInMinutes = 30;
  const sessionExpiry = parseInt(config.hostingEnvironment.sessionCookieExpiryInMinutes);
  if (!isNaN(sessionExpiry)) {
    expiryInMinutes = sessionExpiry;
  }

  const expiryDate = new Date(Date.now() + 60 * expiryInMinutes * 1000);

  const app = express();
  app.use(
    helmet({
      noCache: true,
      frameguard: {
        action: 'deny',
      },
    }),
  );

  if (config.hostingEnvironment.env !== 'dev') {
    app.set('trust proxy', 1);
  }

  const csrf = csurf({
    cookie: {
      secure: true,
      httpOnly: true,
    },
  });

  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(
    sanitization({
      sanitizer: (key, value) => {
        const fieldToNotSanitize = ['criteria', 'email', 'firstName', 'lastName', 'reason', 'organisationName'];
        if (fieldToNotSanitize.find((x) => x.toLowerCase() === key.toLowerCase())) {
          return value;
        }
        return sanitization.defaultSanitizer(key, value);
      },
    }),
  );
  app.set('view engine', 'ejs');
  app.set('views', path.resolve(__dirname, 'app'));
  app.use(expressLayouts);
  app.set('layout', 'layouts/layout');
  app.use(
    session({
      resave: true,
      saveUninitialized: true,
      secret: config.hostingEnvironment.sessionSecret,
      cookie: {
        httpOnly: true,
        secure: true,
        expires: expiryDate,
      },
    }),
  );
  app.use(flash());

  let assetsUrl = config.hostingEnvironment.assetsUrl || 'https://rawgit.com/DFE-Digital/dfe.ui.toolkit/master/dist/';
  assetsUrl = assetsUrl.endsWith('/') ? assetsUrl.substr(0, assetsUrl.length - 1) : assetsUrl;
  Object.assign(app.locals, {
    moment,
    urls: {
      help: config.hostingEnvironment.helpUrl,
      profile: config.hostingEnvironment.profileUrl,
      interactions: config.hostingEnvironment.interactionsUrl,
      assets: assetsUrl,
      survey: config.hostingEnvironment.surveyUrl,
    },
    app: {
      title: 'DfE Sign-in',
      environmentBannerMessage: config.hostingEnvironment.environmentBannerMessage,
    },
    gaTrackingId: config.hostingEnvironment.gaTrackingId,
    useApproverJourney: config.toggles.useApproverJourney,
    useRequestOrg: config.toggles.useRequestOrganisation,
  });

  passport.use('oidc', await getPassportStrategy());
  passport.serializeUser((user, done) => {
    done(null, user);
  });
  passport.deserializeUser((user, done) => {
    done(null, user);
  });
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(setUserContext);
  //app.use(asyncMiddleware(setApproverContext));
  app.use(setConfigContext);

  registerRoutes(app, csrf);

  const errorPageRenderer = ejsErrorPages.getErrorPageRenderer(
    {
      help: config.hostingEnvironment.helpUrl,
      assets: assetsUrl,
    },
    config.hostingEnvironment.env === 'dev',
  );
  app.use(
    getErrorHandler({
      logger,
      errorPageRenderer,
    }),
  );

  if (config.hostingEnvironment.env === 'dev') {
    app.proxy = true;

    const options = {
      key: config.hostingEnvironment.sslKey,
      cert: config.hostingEnvironment.sslCert,
      requestCert: false,
      rejectUnauthorized: false,
    };
    const server = https.createServer(options, app);

    server.listen(config.hostingEnvironment.port, () => {
      logger.info(
        `Dev server listening on https://${config.hostingEnvironment.host}:${
          config.hostingEnvironment.port
        } with config:\n${JSON.stringify(config)}`,
      );
    });
  } else if (config.hostingEnvironment.env === 'docker') {
    process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0;
    app.listen(config.hostingEnvironment.port, () => {
      logger.info(`Server listening on http://${config.hostingEnvironment.host}:${config.hostingEnvironment.port}`);
    });
  } else {
    app.listen(process.env.PORT, () => {
      logger.info(`Server listening on http://${config.hostingEnvironment.host}:${config.hostingEnvironment.port}`);
    });
  }

  return app;
};

const app = init().catch((err) => {
  logger.error(err);
});

module.exports = app;
