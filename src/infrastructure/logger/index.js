'use strict';
const winston = require('winston');
const config = require('./../config');
const appInsights = require('applicationinsights');
const AppInsightsTransport = require('login.dfe.winston-appinsights');
const WinstonSequelizeTransport = require('login.dfe.audit.winston-sequelize-transport');
const customLevels = {
  levels: {
    audit: 0,
    error: 1,
    warn: 2,
    info: 3,
    verbose: 4,
    debug: 5,
    silly: 6,
  },
  colors: {
    info: 'yellow',
    ok: 'green',
    error: 'red',
    audit: 'magenta',
  },
};
const loggerConfig = {
  levels: customLevels.levels,
  transports: [],
};
const sequelizeTransport = WinstonSequelizeTransport(config);
if (sequelizeTransport) {
  loggerConfig.transports.push(sequelizeTransport);
}
if (config && config.loggerSettings && config.loggerSettings.redis && config.loggerSettings.redis.enabled) {
  loggerConfig.transports.push(
    new winston.transports.Redis({
      level: 'audit',
      length: 4294967295,
      host: config.loggerSettings.redis.host,
      port: config.loggerSettings.redis.port,
      auth: config.loggerSettings.redis.auth,
    }),
  );
}
if (config.hostingEnvironment.applicationInsights) {
  appInsights
    .setup(config.hostingEnvironment.applicationInsights)
    .setAutoCollectConsole(false, false)
    .setSendLiveMetrics(config.loggerSettings.aiSendLiveMetrics || false)
    .start();
  loggerConfig.transports.push(
    new AppInsightsTransport({
      client: appInsights.defaultClient,
      applicationName: config.loggerSettings.applicationName || 'Services',
      type: 'event',
      treatErrorsAsExceptions: true,
    }),
  );
}
const logger = winston.createLogger(loggerConfig);
process.on('unhandledRejection', (reason, p) => {
  logger.error('Unhandled Rejection at: ', p, 'reason: ', reason);
});
module.exports = logger;
