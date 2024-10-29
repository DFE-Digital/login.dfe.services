const { mockConfig, mockRequest, mockResponse } = require('../../../utils/jestMocks');

jest.mock('../../../../src/infrastructure/config', () => mockConfig());

let req;
const res = mockResponse();
const { addSessionRedirect } = require('../../../../src/infrastructure/utils');

describe('When using the addSessionRedirect middleware', () => {
  beforeEach(() => {
    req = mockRequest({
      session: {
        save: jest.fn(),
      },
    });
    res.mockResetAll();
  });

  afterEach(() => {
    res.sessionRedirect = jest.fn();
  });

  describe('The middleware function', () => {
    it('Adds the sessionRedirect method to the response object', () => {
      res.sessionRedirect = null;
      addSessionRedirect(req, res, () => {});

      expect(typeof res.sessionRedirect).toBe('function');
    });

    it('Returns the result of the 3rd argument (next) to match express middleware functionality', () => {
      const result = addSessionRedirect(req, res, () => 42);
      expect(result).toBe(42);
    });
  });

  describe('The sessionRedirect response method', () => {
    it.each([false, undefined, null, '', 0])(
      'Should redirect if req.session.save returns a falsy value (%p)',
      (value) => {
        req.session.save.mockImplementation((callback) => callback(value));
        addSessionRedirect(req, res, () => {});

        res.sessionRedirect('/test');
        expect(res.redirect).toHaveBeenCalledTimes(1);
        expect(res.redirect).toHaveBeenCalledWith('/test');
      },
    );

    it.each([true, {}, [], 'test', 42])(
      'Should throw an appropriate error if req.session.save returns a truthy value (%p)',
      (value) => {
        req.session.save.mockImplementation((callback) => callback(value));
        req.method = 'POST';
        req.originalUrl = '/testing/test/foo';
        addSessionRedirect(req, res, () => {});

        expect(() => res.sessionRedirect('/test')).toThrow(
          `Error saving session for request ${req.method} ${req.originalUrl}: ${value}`,
        );
      },
    );
  });
});
