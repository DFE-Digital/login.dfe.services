const getOrganisationAndServiceForUser = async (userId, correlationId) => {
  return Promise.resolve([]);
};

const getOrganisationUsersForApproval = async (userId) => {
  return Promise.resolve([ {
    org_id: '60EEAA8D-D21D-44E9-BF10-6220E841FDAB',
    org_name: 'Oxley Park Academy',
    user_id: '5B664F21-293B-41C3-85F7-A4BB8C9DC9EE',
    created_date: '2018-05-03T15:27:04.212Z',
    status: {
    id: 0,
      name: 'Pending'
  }
  }]);
};

module.exports = {
  getOrganisationAndServiceForUser,
  getOrganisationUsersForApproval,
};