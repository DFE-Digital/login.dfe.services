const config = require('./../config');

let account;
if (config.directories.type.toLowerCase() === 'api') {
  account = require('./DirectoriesApiAccount');
} else {
  account = require('./StaticAccount');
}
module.exports = account;
