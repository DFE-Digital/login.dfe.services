const { getRequestById, putUserInOrganisation } = require('./../../infrastructure/organisations');
const Account = require('./../../infrastructure/account');

const getAndMapOrgRequest = async (req) => {
  const request = await getRequestById(req.params.rid, req.id);
  let mappedRequest;
  if (request) {
    const user = request.status.id === 0 || request.status.id === 2 ? await Account.getById(request.user_id) : await Account.getById(request.actioned_by);
    const usersName = user ? `${user.claims.given_name} ${user.claims.family_name}` : '';
    const usersEmail = user ? user.claims.email : '';
    mappedRequest = Object.assign({usersName, usersEmail}, request);
  }
  return mappedRequest;
};

const get = async (req, res) => {
  //TODO - check if org request has been actioned
  const request = await getAndMapOrgRequest(req);

  return res.render('accessRequests/views/reviewOrganisationRequest', {
    csrfToken: req.csrfToken(),
    title: 'Review request - DfE Sign-in',
    backLink: true,
    request,
    selectedResponse: null,
    validationMessages: {},
  })
};

const validate = async (req) => {
  const request = await getAndMapOrgRequest(req);
  const model = {
    title: 'Review request - DfE Sign-in',
    backLink: true,
    request,
    selectedResponse: req.body.selectedResponse,
    validationMessages: {},
  };
  if (model.selectedResponse === undefined || model.selectedResponse === null) {
    model.validationMessages.selectedResponse = 'Approve or Reject must be selected';
  } else if (model.request.status.id === -1 || model.request.status.id === 1) {
    model.validationMessages.selectedResponse = `Request already actioned by ${model.request.usersEmail}`
  }
  return model;
};

const post = async (req, res) => {
  const model = await validate(req);

  if (Object.keys(model.validationMessages).length > 0) {
    model.csrfToken = req.csrfToken();
    return res.render('accessRequests/views/reviewOrganisationRequest', model);
  }

  if (model.selectedResponse === 'Rejected') {
    return res.redirect('rejected')
  }

  await putUserInOrganisation(model.request.user_id, model.request.org_id, 0, null, req.id);
  // if approved then do -
  // add user to org
  // patch the request
  // redirect to users profile
  //send email


};

module.exports = {
  get,
  post,
};
