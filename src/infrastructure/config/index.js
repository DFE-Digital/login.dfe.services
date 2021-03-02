'use strict';

const fs = require('fs');
const Path = require('path');

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

const fetchConfig = () => {
  if (process.env.settings) {
    const settings = process.env.settings;
    let settingsObject = getSettingsObject(settings);
    if (settingsObject !== null) {
      return settingsObject;
    }
    const settingsPath = Path.resolve(settings);
    if (fs.existsSync(settingsPath)) {
      settingsObject = getSettingsFromFile(settingsPath);
      if (settingsObject !== null) {
        return settingsObject;
      }
    }
  }
  const settings = require('login.dfe.config')['login.dfe.services'];
  process.env.settings = JSON.stringify('settings');
  return settings;
};

module.exports = fetchConfig();
