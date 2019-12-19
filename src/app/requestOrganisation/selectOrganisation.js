const { searchOrganisations, getRequestsForOrganisation, getOrganisationAndServiceForUserV2 } = require('./../../infrastructure/organisations');

const search = async (req) => {
  const inputSource = req.method.toUpperCase() === 'POST' ? req.body : req.query;
  const criteria = inputSource.criteria ? inputSource.criteria.trim() : '';
  const filterStatus = [1,3,4];

  let pageNumber = parseInt(inputSource.page) || 1;
  if (isNaN(pageNumber)) {
    pageNumber = 1;
  }
  return await searchOrganisations(criteria, pageNumber, undefined, filterStatus, req.id);
};

const buildModel = async (req, results) => {
  const inputSource = req.method.toUpperCase() === 'POST' ? req.body : req.query;

  const model = {
    criteria: inputSource.criteria || '',
    currentPage: 'organisations',
    validationMessages: {},
    backLink: true,
  };
  if (results) {
    model.organisations = results.organisations;
    model.page = results.page;
    model.totalNumberOfPages = results.totalNumberOfPages;
    model.totalNumberOfRecords = results.totalNumberOfRecords;
  }
  return model;
};

const get = async (req, res) => {
  const model = await buildModel(req);
  model.csrfToken = req.csrfToken();
  return res.render('requestOrganisation/views/search', model);
};


const post = async (req, res) => {
  const searchResults = await search(req);
  const model = await buildModel(req, searchResults);
  model.csrfToken = req.csrfToken();

  if (req.body.selectedOrganisation) {
    // check if associated to org
    const userOrgs = await getOrganisationAndServiceForUserV2(req.user.sub, req.id);
    const userAssociatedToOrg = userOrgs ? userOrgs.find(x => x.organisation.id === req.body.selectedOrganisation) : null;
    if (userAssociatedToOrg) {
      model.validationMessages.selectedOrganisation = 'You are already linked to this organisation';
      return res.render('requestOrganisation/views/search', model);
    }

    // check if outstanding request
    const requestsForOrg = await getRequestsForOrganisation(req.body.selectedOrganisation, req.id);
    const userRequested = requestsForOrg ? requestsForOrg.find(x => x.user_id === req.user.sub) : null;
    if (userRequested) {
      model.validationMessages.selectedOrganisation = 'You have already requested this organisation';
      return res.render('requestOrganisation/views/search', model);
    }
    req.session.organisationId = req.body.selectedOrganisation;
    return res.redirect('review');
  }
  return res.render('requestOrganisation/views/search', model);
};

module.exports = {
  get,
  post,
};
