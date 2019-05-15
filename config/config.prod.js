'use strict';

const path = require('path');
const yaml = require('js-yaml');
const fs = require('fs');
const CryptoJS = require('crypto-js');
const objectPath = require('object-path');
const NodeRSA = require('node-rsa');

module.exports = app => {
  const config = {};

  const appEncryptKey = app.pkg.appEncryptKey || app.pkg.name;
  const appEncryptKeyType = app.pkg.appEncryptKeyType || 'AES';

  function decrypt(encryptedMessage) {
    // 默认 AES
    switch (appEncryptKeyType) {
      case 'RSA':
        encryptedMessage = new NodeRSA('-----BEGIN PUBLIC KEY-----\n' +
          appEncryptKey +
          '\n-----END PUBLIC KEY-----', 'pkcs8-public').decryptPublic(encryptedMessage, 'utf8');
        break;

      default:
        encryptedMessage = CryptoJS.AES.decrypt(encryptedMessage, appEncryptKey).toString(CryptoJS.enc.Utf8);
        break;
    }

    return encryptedMessage;
  }

  const appYmalPath = path.join(app.baseDir, 'app.yml');
  if (fs.existsSync(appYmalPath)) {
    const ymlConfig = yaml.safeLoad(fs.readFileSync(appYmalPath), 'utf-8');

    // add by alex for node mysql password Encrypt.
    if (ymlConfig.sequelize && ymlConfig.sequelize.passwordEncrypt) {
      if (ymlConfig.sequelize.password) {
        ymlConfig.sequelize.password = decrypt(ymlConfig.sequelize.password);
      }
    }

    if (ymlConfig.sequelize && ymlConfig.sequelize.usernameEncrypt) {
      if (ymlConfig.sequelize.username) {
        ymlConfig.sequelize.username = decrypt(ymlConfig.sequelize.username);
      }
    }

    if (ymlConfig.logger && ymlConfig.logger.dir) {
      ymlConfig.customLogger = {
        scheduleLogger: {
          file: path.join(ymlConfig.logger.dir, 'egg-schedule.log'),
        },
      };
      // config.customLogger = {
      //   scheduleLogger: {
      //     consoleLevel: 'NONE',
      //     file: path.join(appInfo.root, 'logs', appInfo.name, 'egg-schedule.log'),
      //   },
      // };
    }

    const appCfgValidPath = path.join(app.baseDir, 'appCfgValid.js');
    if (fs.existsSync(appCfgValidPath)) {
      /**
       * {
       *    key: undefined -> just defined
       *    key: []        -> must one of this
       *    key : <String|Number>  -> must equal
       *    key: <function> -> validator
       *    key: Object -> just defined
       * }
       *
       * @type {*}
       */
      const rules = require(appCfgValidPath);
      for (const ruleKey in rules) {
        if (!ruleKey) continue;
        if (ruleKey.startsWith('_')) continue;

        const ymlRuleVal = rules[ruleKey];
        const ymlConfigVal = objectPath.get(ymlConfig, ruleKey);

        // just define check.
        if (!ymlRuleVal ||
          ymlRuleVal.constructor === Object) {
          if (ymlConfigVal === undefined) {
            throw new Error(`app.yml not define error: ${ruleKey} not defined!`);
          }
        }

        if (typeof ymlRuleVal === 'string' || typeof ymlRuleVal === 'boolean') {
          if (ymlConfigVal !== ymlRuleVal) {
            throw new Error(`app.yml define value error: ${ruleKey} must equal ${ymlRuleVal} but now is ${ymlConfigVal}`);
          }
        }

        if (Array.isArray(ymlRuleVal)) {
          if (!ymlRuleVal.includes(ymlConfigVal)) {
            throw new Error(`app.yml define value error: ${ruleKey} must includes in  ${ymlRuleVal.join(',')} but now is ${ymlConfigVal}`);
          }
        }

        if (typeof ymlRuleVal === 'function') {
          if (!ymlRuleVal(ymlConfigVal)) {
            throw new Error(`app.yml define value error: ${ruleKey} in customer function but now is ${ymlConfigVal}`);
          }
        }
      }
    }

    Object.assign(config, ymlConfig);
  }

  return config;
};
