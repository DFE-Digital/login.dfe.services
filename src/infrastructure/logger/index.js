const config = require("./../config");
const AuditTransporter = require("login.dfe.audit.transporter");
const {
  setupApplicationInsights,
  setupLogging,
} = require("login.dfe.api-client/logging");

const additionalTransports = [];
const applicationName = config.loggerSettings.applicationName || "Services";

const auditTransport = AuditTransporter({
  application: applicationName,
  level: "audit",
});
if (auditTransport) {
  additionalTransports.push(auditTransport);
}
if (config.hostingEnvironment.applicationInsights) {
  setupApplicationInsights(config.hostingEnvironment.applicationInsights);
}

module.exports = setupLogging({
  applicationName,
  logLevel: process.env.LOG_LEVEL,
  additionalTransports,
});
