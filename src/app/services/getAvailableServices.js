'use strict';

const { getAvailableServicesForUser } = require('../../infrastructure/services');

const action = async (req, res) => {
  const availableServices = await getAvailableServicesForUser(req.user.sub);
  res.render('services/views/availableServices', {
    availableServices,
  });
};

module.exports = action;
