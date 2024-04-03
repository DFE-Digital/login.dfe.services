'use strict';

const { format, transports, createLogger, addColors } = require('winston');
const { combine, prettyPrint, errors, simple } = format;
const config = require('./../config');
const AuditTransporter = require('login.dfe.audit.transporter');
const appInsights = require('applicationinsights');
const AppInsightsTransport = require('login.dfe.winston-appinsights');

const logLevel =
  config && config.loggerSettings && config.loggerSettings.logLevel ? config.loggerSettings.logLevel : 'info';

const customLevels = {
  levels: {
    'audit': 0,
    'error': 1,
    'warn': 2,
    'info': 3,
    'verbose': 4,
    'debug': 5,
    'silly': 6,
  },
  colors: {
    audit: 'magenta',
    silly: 'rainbow',
  },
};

// Formatter to hide audit records from other loggers.
const hideAudit = format((info) => ((info.level.toLowerCase() === 'audit') ? false : info));
// Add the custom audit/silly colours, so they don't clash.
addColors(customLevels.colors);

const loggerConfig = {
  levels: customLevels.levels,
  transports: [],
};

loggerConfig.transports.push(new transports.Console({ 
  format: format.combine(hideAudit(), format.simple()),
  level: logLevel
 }));

if (config && config.loggerSettings && config.loggerSettings.redis && config.loggerSettings.redis.enabled) {
  loggerConfig.transports.push(
    new transports.Redis({
      level: 'audit',
      length: 4294967295,
      host: config.loggerSettings.redis.host,
      port: config.loggerSettings.redis.port,
      auth: config.loggerSettings.redis.auth,
    }),
  );
}

const opts = { application: config.loggerSettings.applicationName, level: 'audit' };
const auditTransport = AuditTransporter(opts);

if (auditTransport) {
  loggerConfig.transports.push(auditTransport);
}

if (config.hostingEnvironment.applicationInsights) {
  appInsights.setup(config.hostingEnvironment.applicationInsights).setAutoCollectConsole(false, false).start();
  loggerConfig.transports.push(
    new AppInsightsTransport({
      format: format.combine(hideAudit(), format.json()),
      client: appInsights.defaultClient,
      applicationName: config.loggerSettings.applicationName || 'Services',
      type: 'event',
      treatErrorsAsExceptions: true,
    }),
  );
}

const logger = createLogger({
  format: combine(    
    simple(),
    errors({ stack: true }), 
    prettyPrint()
  ),
  transports: loggerConfig.transports,
  levels: loggerConfig.levels
}); 

process.on('unhandledRejection', (reason, p) => {
  logger.error(`Unhandled Rejection at: ${JSON.stringify(p)}, reason: ${reason}`);
});


module.exports = logger;
