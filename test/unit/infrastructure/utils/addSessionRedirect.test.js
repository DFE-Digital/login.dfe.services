const { mockConfig, mockRequest, mockResponse } = require('../../../utils/jestMocks');

jest.mock('../../../../src/infrastructure/config', () => mockConfig());

let req, consoleMock;
const res = mockResponse();
const { addSessionRedirect } = require('../../../../src/infrastructure/utils');
const errorPageRenderer = jest.fn();

describe('When using the addSessionRedirect middleware', () => {
  beforeEach(() => {
    req = mockRequest({
      session: {
        save: jest.fn(),
      },
    });
    res.mockResetAll();

    consoleMock = jest.spyOn(console, 'error').mockImplementation();
    errorPageRenderer.mockImplementation(() => ({
      content: 'test',
      contentType: 'html',
    }));
  });

  afterEach(() => {
    res.sessionRedirect = jest.fn();
    consoleMock.mockRestore();
  });

  describe('The middleware builder', () => {
    it.each([123, {}, [], null, undefined, false, 'test'])(
      'Throws an error if errorPageRenderer is not a function (%p)',
      (value) => {
        expect(() => addSessionRedirect(value)).toThrow('addSessionRedirect errorPageRenderer must be a function');
      },
    );

    it('Does not throw an error if errorPageRenderer is a function', () => {
      expect(() => addSessionRedirect(() => {})).not.toThrow();
    });

    it('Throws an error if logger does not have an error method', () => {
      expect(() => addSessionRedirect(errorPageRenderer, { warn: () => {} })).toThrow(
        'addSessionRedirect logger must have an error method',
      );
    });

    it('Does not throw an error if logger has an error method', () => {
      expect(() => addSessionRedirect(errorPageRenderer, { error: () => {} })).not.toThrow();
    });

    it('Returns the middleware function', () => {
      expect(typeof addSessionRedirect(errorPageRenderer)).toBe('function');
    });
  });

  describe('The middleware function', () => {
    it('Adds the sessionRedirect method to the response object', () => {
      res.sessionRedirect = null;
      addSessionRedirect(errorPageRenderer)(req, res, () => {});

      expect(typeof res.sessionRedirect).toBe('function');
    });

    it('Returns the result of the 3rd argument (next) to match express middleware functionality', () => {
      const result = addSessionRedirect(errorPageRenderer)(req, res, () => 42);
      expect(result).toBe(42);
    });
  });

  describe('The sessionRedirect response method', () => {
    it.each([123, {}, [], null, undefined, false])(
      'Should throw an error if the redirect location is not a string (%p)',
      (value) => {
        addSessionRedirect(errorPageRenderer)(req, res, () => {});
        expect(() => res.sessionRedirect(value)).toThrow('sessionRedirect redirect location must be a string');
      },
    );

    it.each([false, undefined, null, '', 0])(
      'Should redirect if req.session.save returns a falsy value (%p)',
      (value) => {
        req.session.save.mockImplementation((callback) => callback(value));
        addSessionRedirect(errorPageRenderer)(req, res, () => {});

        res.sessionRedirect('/test');
        expect(res.redirect).toHaveBeenCalledTimes(1);
        expect(res.redirect).toHaveBeenCalledWith('/test');
      },
    );

    it.each([true, {}, [], 'test', 42])(
      'Should log the string representation of error if req.session.save returns a truthy value (%p)',
      (value) => {
        req.session.save.mockImplementation((callback) => callback(value));
        req.method = 'POST';
        req.originalUrl = '/testing/test/foo';
        addSessionRedirect(errorPageRenderer)(req, res, () => {});

        res.sessionRedirect('/test');
        expect(consoleMock).toHaveBeenCalledTimes(1);
        expect(consoleMock).toHaveBeenCalledWith(
          `Error saving session for request ${req.method} ${req.originalUrl}: ${value}`,
        );
      },
    );

    it("Should log the error's message property if req.session.save returns an instance of Error", () => {
      const error = new Error('test error');
      req.session.save.mockImplementation((callback) => callback(error));
      req.method = 'POST';
      req.originalUrl = '/testing/test/foo';
      addSessionRedirect(errorPageRenderer)(req, res, () => {});

      res.sessionRedirect('/test');
      expect(consoleMock).toHaveBeenCalledTimes(1);
      expect(consoleMock).toHaveBeenCalledWith(
        `Error saving session for request ${req.method} ${req.originalUrl}: ${error.message}`,
      );
    });

    it('Should send an error response to the user if req.session.save returns a truthy value', () => {
      req.session.save.mockImplementation((callback) => callback(new Error('')));
      req.method = 'POST';
      req.originalUrl = '/testing/test/foo';
      errorPageRenderer.mockImplementation(() => ({
        content: 'test',
        contentType: 'html',
      }));
      addSessionRedirect(errorPageRenderer)(req, res, () => {});

      res.sessionRedirect('/test');
      expect(errorPageRenderer).toHaveBeenCalledTimes(1);
      expect(errorPageRenderer).toHaveBeenCalledWith(
        `Error saving session for request ${req.method} ${req.originalUrl}: `,
      );
      expect(res.status).toHaveBeenCalledTimes(1);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.contentType).toHaveBeenCalledTimes(1);
      expect(res.contentType).toHaveBeenCalledWith('html');
      expect(res.send).toHaveBeenCalledTimes(1);
      expect(res.send).toHaveBeenCalledWith('test');
    });
  });
});
