'use strict';

const fs = require('fs');
const Path = require('path');
import config from '../../../config/services.js';

const getSettingsObject = (settings) => {
  try {
    return JSON.parse(settings);
  } catch (e) {
    return null;
  }
};

const getSettingsFromFile = (settingsPath) => {
  if (fs.existsSync(settingsPath)) {
    const file = fs.readFileSync(settingsPath, 'utf8');
    try {
      return JSON.parse(file);
    } catch (e) {
      return null;
    }
  }
  return null;
};

const fetchConfig = () => config

module.exports = fetchConfig();
