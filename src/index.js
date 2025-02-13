const config = require("./infrastructure/config");
const configSchema = require("./infrastructure/config/schema");
const logger = require("./infrastructure/logger");
const express = require("express");
const passport = require("passport");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const expressLayouts = require("express-ejs-layouts");
const session = require("express-session");
const { createClient } = require("redis");
const RedisStore = require("connect-redis").default;
const http = require("http");
const https = require("https");
const path = require("path");
const { doubleCsrf } = require("csrf-csrf");
const flash = require("login.dfe.express-flash-2");
const getPassportStrategy = require("./infrastructure/oidc");
const {
  setUserContext,
  setConfigContext,
  addSessionRedirect,
} = require("./infrastructure/utils");
const helmet = require("helmet");
const sanitization = require("login.dfe.sanitization");
const {
  getErrorHandler,
  ejsErrorPages,
} = require("login.dfe.express-error-handling");

const registerRoutes = require("./routes");

https.globalAgent.maxSockets = http.globalAgent.maxSockets =
  config.hostingEnvironment.agentKeepAlive.maxSockets || 50;

configSchema.validate();

// Initialize client.
const redisUrl = new URL(config.cookieSessionRedis.params.connectionString);
const tlsParam = redisUrl.searchParams.get("tls");
const tlsParamBoolean =
  typeof tlsParam === "string" ? tlsParam.toLowerCase() === "true" : false;
let redisClient = createClient({
  url: config.cookieSessionRedis.params.connectionString,
  socket: {
    tls: tlsParamBoolean,
  },
});

// Initialize store.
let redisStore = new RedisStore({
  client: redisClient,
  prefix: "CookieSession:",
});

redisClient.connect().catch(console.error);

redisClient.on("error", function (err) {
  console.log("Could not establish a connection with redis. ", err);
});

redisClient.on("connect", function () {
  console.log("Connected to redis successfully");
});

const init = async () => {
  let expiryInMinutes = 30;
  const sessionExpiry = parseInt(
    config.hostingEnvironment.sessionCookieExpiryInMinutes,
  );
  if (!isNaN(sessionExpiry)) {
    expiryInMinutes = sessionExpiry;
  }

  const app = express();

  if (config.hostingEnvironment.hstsMaxAge) {
    app.use(
      helmet({
        strictTransportSecurity: {
          maxAge: config.hostingEnvironment.hstsMaxAge,
          preload: true,
          includeSubDomains: true,
        },
      }),
    );
  }

  logger.info("set helmet policy defaults");

  // Setting helmet Content Security Policy
  const self = "'self'";
  const allowedOrigin = "*.signin.education.gov.uk";

  const scriptSources = [
    self,
    "'unsafe-inline'",
    "'unsafe-eval'",
    allowedOrigin,
  ];
  const styleSources = [self, "'unsafe-inline'", allowedOrigin];
  const imgSources = [self, "data:", "blob:", allowedOrigin];
  const fontSources = [self, "data:", allowedOrigin];

  if (config.hostingEnvironment.env === "dev") {
    scriptSources.push("localhost");
    styleSources.push("localhost");
    imgSources.push("localhost");
    fontSources.push("localhost");
  }

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: [self],
          scriptSrc: scriptSources,
          styleSrc: styleSources,
          imgSrc: imgSources,
          fontSrc: fontSources,
          connectSrc: [self],
          formAction: [self, "*"],
        },
      },
      crossOriginOpenerPolicy: { policy: "unsafe-none" }, // crossOriginOpenerPolicy: false is ignored and unsafe-none is the default on MDM
    }),
  );

  logger.info("Set helmet filters");

  app.use(helmet.xssFilter());
  app.use(helmet.frameguard("false"));
  app.use(helmet.ieNoOpen());

  logger.info("helmet setup complete");

  if (config.hostingEnvironment.env !== "dev") {
    app.set("trust proxy", 1);
  }

  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(cookieParser(config.hostingEnvironment.sessionSecret));
  app.use(
    sanitization({
      sanitizer: (key, value) => {
        const fieldToNotSanitize = [
          "criteria",
          "email",
          "firstName",
          "lastName",
          "reason",
          "organisationName",
        ];
        if (
          fieldToNotSanitize.find((x) => x.toLowerCase() === key.toLowerCase())
        ) {
          return value;
        }
        return sanitization.defaultSanitizer(key, value);
      },
    }),
  );
  app.set("view engine", "ejs");

  app.set("views", path.resolve(__dirname, "app"));
  app.use(expressLayouts);
  app.set("layout", "layouts/layout");

  app.use(
    session({
      name: "session",
      store: redisStore,
      resave: false,
      saveUninitialized: false,
      secret: config.hostingEnvironment.sessionSecret,
      maxAge: expiryInMinutes * 60000, // Expiry in milliseconds
      cookie: {
        httpOnly: true,
        secure: true,
        maxAge: expiryInMinutes * 60000, // Expiry in milliseconds
      },
    }),
  );

  app.use((req, res, next) => {
    req.session.now = Date.now();
    next();
  });

  const { doubleCsrfProtection: csrf } = doubleCsrf({
    getSecret: (req) => req.secret,
    // eslint-disable-next-line no-underscore-dangle
    getTokenFromRequest: (req) => req.body._csrf,
    secret: config.hostingEnvironment.csrfSecret,
    cookieName: "__host-csrf",
    cookieOptions: {
      sameSite: "strict",
      secure: true,
      signed: true,
    },
    path: "/",
    size: 64,
    ignoredMethods: ["GET", "HEAD", "OPTIONS"],
  });

  app.use(flash());

  let assetsUrl = config.assets.url;
  assetsUrl = assetsUrl.endsWith("/")
    ? assetsUrl.substr(0, assetsUrl.length - 1)
    : assetsUrl;
  Object.assign(app.locals, {
    urls: {
      help: config.hostingEnvironment.helpUrl,
      profile: config.hostingEnvironment.profileUrl,
      interactions: config.hostingEnvironment.interactionsUrl,
      assets: assetsUrl,
      survey: config.hostingEnvironment.surveyUrl,
    },
    app: {
      title: "DfE Sign-in",
      environmentBannerMessage:
        config.hostingEnvironment.environmentBannerMessage !== "null"
          ? config.hostingEnvironment.environmentBannerMessage
          : null,
    },
    gaTrackingId: config.hostingEnvironment.gaTrackingId,
    useApproverJourney: config.toggles.useApproverJourney,
    assets: {
      version: config.assets.version,
    },
  });

  passport.use("oidc", await getPassportStrategy());
  passport.serializeUser((user, done) => {
    done(null, user);
  });
  passport.deserializeUser((user, done) => {
    done(null, user);
  });
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(setUserContext);
  app.use(setConfigContext);

  const errorPageRenderer = ejsErrorPages.getErrorPageRenderer(
    {
      ...app.locals.urls,
      assetsVersion: config.assets.version,
    },
    config.hostingEnvironment.env === "dev",
  );

  app.use(addSessionRedirect(errorPageRenderer, logger));

  registerRoutes(app, csrf);

  app.use(
    getErrorHandler({
      logger,
      errorPageRenderer,
    }),
  );

  if (config.hostingEnvironment.env === "dev") {
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
  } else if (config.hostingEnvironment.env === "docker") {
    process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;
    app.listen(config.hostingEnvironment.port, () => {
      logger.info(
        `Server listening on http://${config.hostingEnvironment.host}:${config.hostingEnvironment.port}`,
      );
    });
  } else {
    app.listen(process.env.PORT, () => {
      logger.info(
        `Server listening on http://${config.hostingEnvironment.host}:${config.hostingEnvironment.port}`,
      );
    });
  }

  return app;
};

const app = init().catch((err) => {
  logger.error("Error ocurred: ", err);
});

module.exports = app;
