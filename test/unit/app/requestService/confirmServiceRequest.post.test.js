jest.mock('./../../../../src/infrastructure/access');
jest.mock('./../../../../src/infrastructure/config', () => require('./../../../utils/jestMocks').mockConfig());
jest.mock('./../../../../src/infrastructure/logger', () => require('./../../../utils/jestMocks').mockLogger());
jest.mock('./../../../../src/infrastructure/helpers/allServicesAppCache');
jest.mock('login.dfe.dao', () => require('../../../utils/jestMocks').mockDao());
jest.mock('../../../../src/app/requestService/utils');
jest.mock('uuid');
jest.mock('login.dfe.notifications.client');

const { mockRequest, mockResponse } = require('./../../../utils/jestMocks');
const logger = require('./../../../../src/infrastructure/logger');
const postConfirmServiceRequest = require('./../../../../src/app/requestService/confirmServiceRequest').post;

describe('when viewing the service request confirmation', () => {
  let req;
  const res = mockResponse();

  beforeEach(() => {
    req = mockRequest({
      session: {
        user: {},
      },
    });
    res.mockResetAll();
  });

  it('then it should redirect the user to /my-services and log a warning message if user services do not exist in the session', async () => {
    req.session.user.services = undefined;
    req.originalUrl = 'test/foo';
    await postConfirmServiceRequest(req, res);

    expect(res.redirect).toHaveBeenCalledTimes(1);
    expect(res.redirect).toHaveBeenCalledWith('/my-services');
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(
      `POST ${req.originalUrl} missing user session services, redirecting to my-services`,
    );
  });

  it('then it should redirect the user to /my-services and log a warning message if user services are empty in the session', async () => {
    req.session.user.services = [];
    req.originalUrl = 'test/foo';
    await postConfirmServiceRequest(req, res);

    expect(res.redirect).toHaveBeenCalledTimes(1);
    expect(res.redirect).toHaveBeenCalledWith('/my-services');
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(
      `POST ${req.originalUrl} missing user session services, redirecting to my-services`,
    );
  });
});
