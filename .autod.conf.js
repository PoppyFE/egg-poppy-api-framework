'use strict';

module.exports = {
  write: true,
  prefix: '^',
  plugin: 'autod-egg',
  test: [
    'test',
    'benchmark',
  ],
  dep: [
    'egg-access-token',
    'egg-action-logger',
    'egg-auth-token',
    'egg-command',
    'egg-dev-token',
    'egg-limit-request',
    'egg-image-captcha',
    'egg-normal-response',
    'egg-permission',
    'egg-redis',
    'egg-validator2',
    'egg-user-agent',
    'egg-onefile2',
  ],
  devdep: [
    'egg-ci',
    'egg-bin',
    'autod',
    'eslint',
    'eslint-config-egg',
    'webstorm-disable-index',
  ],
  exclude: [
    './test/fixtures',
    './dist',
  ],
};

