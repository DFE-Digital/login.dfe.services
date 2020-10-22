'use strict';

const path = require('path');
const request = require('supertest');
const moment = require('moment');

const { expressAppWithViews, expressAuthenticationStub } = require('./../../utils');

let app;

describe.skip('Integration tests for', () => {
  describe('Home functional area ', () => {
    beforeEach(() => {
      process.env.settings = 'config/login.dfe.portal.dev.json';
      app = expressAppWithViews(path.resolve(__dirname, '../../../', 'src/app/'));
      app.locals.title = 'Test Title';
      app.locals.urls = {
        interactions: '',
        help: '',
      };
    });
    describe('as an authenticated user', () => {
      beforeEach(() => {
        process.env.settings = 'config/login.dfe.services.dev.json';
        app.use(expressAuthenticationStub(true, { user: {} }));
        app.locals.moment = moment;
      });

      it('Get / should return status 500', async () => {
        const home = require('../../../src/app/home/index');
        app.use('/', home(null));
        const response = await request(app).get('/');
        expect(response.statusCode).toBe(500);
      });
    });
    describe('as an unauthenticated user', () => {
      beforeEach(() => {
        process.env.settings = 'config/login.dfe.services.dev.json';
        app.use(expressAuthenticationStub(false, { user: {}, session: { redirectUrl: '/' } }));
      });
      it('Get / path should return status 500', async () => {
        const home = require('../../../src/app/home/index');
        app.use('/', home(null));

        const response = await request(app).get('/');
        expect(response.statusCode).toBe(500);
      });
    });
  });
});
