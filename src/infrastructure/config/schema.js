const SimpleSchema = require('simpl-schema').default;
const { validateConfigAgainstSchema, schemas, patterns } = require('login.dfe.config.schema.common');
const config = require('./index');
const logger = require('./../logger');

const identifyingPartySchema = new SimpleSchema({
  url: patterns.url,
  clientId: String,
  clientSecret: String,
  clockTolerance: SimpleSchema.Integer,
});

const togglesSchema = new SimpleSchema({
  useApproverJourney: Boolean,
  useRequestOrganisation: Boolean,
});

const notificationsSchema = new SimpleSchema({
  connectionString: patterns.redis,
});

const organisationRequestsSchema = new SimpleSchema({
  requestLimit: {
    type: SimpleSchema.Integer,
    optional: true,
  },
});

const schema = new SimpleSchema({
  loggerSettings: schemas.loggerSettings,
  hostingEnvironment: schemas.hostingEnvironment,
  identifyingParty: identifyingPartySchema,
  directories: schemas.apiClient,
  organisations: schemas.apiClient,
  applications: schemas.apiClient,
  access: schemas.apiClient,
  search: schemas.apiClient,
  database: schemas.sequelizeConnection,
  toggles: togglesSchema,
  notifications: notificationsSchema,
  organisationRequests: {
    type: organisationRequestsSchema,
    optional: true,
  },
});

module.exports.validate = () => {
  validateConfigAgainstSchema(config, schema, logger);
};
