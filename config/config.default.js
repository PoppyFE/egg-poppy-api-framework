'use strict';

const path = require('path');
const yaml = require('js-yaml');
const fs = require('fs');

module.exports = appInfo => {
  const config = {};

  /**
   * some description
   * @member Config#test
   * @property {String} key - some description
   */
  config.test = {
    key: appInfo.name + '_123456',
  };

  config.i18n = {
    defaultLocale: 'zh-CN',
  };

  config.logger = {
    appLogName: `${appInfo.name}.log`,
    coreLogName: `${appInfo.name}.log`,
    agentLogName: `${appInfo.name}.log`,
    errorLogName: `${appInfo.name}.log`,
  };

  config.security = {
    csrf: {
      enable: false,
    },
    csp: {
      enable: true,
      policy: {
        'default-src': "'self' 'unsafe-eval' 'unsafe-inline' data:;",
        'base-uri': "'none'",
        'object-src': "'none' ",
        'media-src': "'none'",
        'frame-src': "'none'",
      },
    },
  };


  config.ImageCaptchaService = {
    captchaTokenMaxAge: '2m',
    responseCaptchaText: false,
    captchaOpts: {
      size: 4,
      width: 90,
      height: 34,
      // support array or string
      // font: '7.ttf',
      // font: [ '1.ttf'3.ttf', '7.ttf' ],
      // font: '3.ttf',
      fontSize: 30,
      // background: '#ffffff',
      color: false,
      noise: 2,
      // charPreset: 'QWERTYUPASDFGHJKLZXCVBNM23456789qwertyupasdfghjklzxcvbnm23456789',
      // 20171123 去除5/s
      charPreset: 'QWERTYUPADFGHJKLZXCVBNM2346789qwertyupadfghjklzxcvbnm2346789', // 1234567890
    },
  };

  // walk through config dir's all .yml config files.
  fs.readdirSync(path.join(appInfo.baseDir, 'config')).filter(filename => {
    if (filename.startsWith('_')) return false;
    return (filename.endsWith('.yml') || filename.endsWith('.json'));
  }).forEach(filename => {
    const filePath = path.join(appInfo.baseDir, 'config/' + filename);
    if (!fs.existsSync(filePath)) return;

    const fileBaseName = path.basename(filename, path.extname(filename));
    const itemConfig = (filename.endsWith('.json') ?
      require(filePath) :
      yaml.safeLoad(fs.readFileSync(filePath), 'utf-8')) || {};

    config[fileBaseName] = itemConfig;
  });

  return config;
};
