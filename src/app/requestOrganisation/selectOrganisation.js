const { searchOrganisations } = require('./../../infrastructure/organisations');

const search = async (req) => {
  const inputSource = req.method.toUpperCase() === 'POST' ? req.body : req.query;
  const criteria = inputSource.criteria || '';
  let pageNumber = parseInt(inputSource.page) || 1;
  if (isNaN(pageNumber)) {
    pageNumber = 1;
  }
  return await searchOrganisations(criteria, pageNumber, undefined, undefined, req.id);
};

const buildModel = async (req, results) => {
  const inputSource = req.method.toUpperCase() === 'POST' ? req.body : req.query;

  const model = {
    csrfToken: req.csrfToken(),
    criteria: inputSource.criteria || '',
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
  return res.render('requestOrganisation/views/search', model);
};

const post = async (req, res) => {
  if (req.body.selectedOrganisation) {
    req.session.organisationId = req.body.selectedOrganisation;
    return res.redirect('review');
  }
  const searchResults = await search(req);
  const model = await buildModel(req, searchResults);
  return res.render('requestOrganisation/views/search', model);
};

module.exports = {
  get,
  post,
};
