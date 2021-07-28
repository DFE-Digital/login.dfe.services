const { getAndMapOrgRequest } = require('../users/utils');
const { updateRequestById } = require('../../infrastructure/organisations');
const logger = require('../../infrastructure/logger');
const config = require('../../infrastructure/config');
const NotificationClient = require('login.dfe.notifications.client');

const notificationClient = new NotificationClient({
  connectionString: config.notifications.connectionString,
});

const get = async (req, res) => {
   //WIP
};

const post = async (req, res) => {
   //WIP
};

module.exports = {
  get,
  post,
};
