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
  generateUserOrgIdentifiers: Boolean,
  environmentName: String,
});

const notificationsSchema = new SimpleSchema({
  connectionString: patterns.redis,
});

const cookieSessionRedisSchema = new SimpleSchema({
  type: {
    type: String,
    allowedValues: ['redis'],
  },
  params: {
    type: Object,
    optional: true,
    custom: function () {
      if (this.siblingField('type').value === 'redis' && !this.isSet) {
        return SimpleSchema.ErrorTypes.REQUIRED
      }
    }
  },
  'params.connectionString': {
    type: String,
    regEx: patterns.redis,
    optional: true,
    custom: function () {
      if (this.field('type').value === 'redis' && !this.isSet) {
        return SimpleSchema.ErrorTypes.REQUIRED
      }
    },
  },
});


const organisationRequestsSchema = new SimpleSchema({
  requestLimit: {
    type: SimpleSchema.Integer,
    optional: true,
  },
});

const adapterSchema = new SimpleSchema({
  type: {
    type: String,
    allowedValues: ['file', 'redis', 'mongo', 'azuread', 'sequelize'],
  },
  directories: {
    type: schemas.sequelizeConnection,
    optional: true,
  },
  organisation: {
    type: schemas.sequelizeConnection,
    optional: true,
  },
});

const accessIdentifiers = new SimpleSchema({
  identifiers: {
    type: Object,
  },
  'identifiers.service': patterns.uuid,
  'identifiers.organisation': patterns.uuid,
});

accessIdentifiers.extend(schemas.apiClient);

const schema = new SimpleSchema({
  loggerSettings: schemas.loggerSettings,
  hostingEnvironment: schemas.hostingEnvironment,
  identifyingParty: identifyingPartySchema,
  directories: schemas.apiClient,
  organisations: schemas.apiClient,
  applications: schemas.apiClient,
  access: accessIdentifiers,
  search: schemas.apiClient,
  database: schemas.sequelizeConnection,
  toggles: togglesSchema,
  notifications: notificationsSchema,
  organisationRequests: {
    type: organisationRequestsSchema,
    optional: true,
  },
  adapter: adapterSchema,
  cookieSessionRedis: cookieSessionRedisSchema,
  assets: schemas.assets,
});

module.exports.validate = () => {
  validateConfigAgainstSchema(config, schema, logger);
};
