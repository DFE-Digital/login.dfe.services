const {
  putUserInOrganisation,
  updateRequestById,
  getOrganisationById,
} = require('../../infrastructure/organisations');
const logger = require('../../infrastructure/logger');
const config = require('../../infrastructure/config');
const { getById, updateIndex } = require('../../infrastructure/search');
const { waitForIndexToUpdate } = require('../users/utils');
const { getAndMapOrgRequest } = require('../accessRequests/utils');
const NotificationClient = require('login.dfe.notifications.client');

const notificationClient = new NotificationClient({
  connectionString: config.notifications.connectionString,
});

const get = async (req, res) => {
  //WIP
  res.redirect(`/my-services`);
};

const post = async (req, res) => {
  //WIP
  res.redirect(`/my-services`);
};

module.exports = {
  get,
  post,
};
