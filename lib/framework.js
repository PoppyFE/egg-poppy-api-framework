'use strict';

const path = require('path');
const egg = require('egg');

const EGG_PATH = Symbol.for('egg#eggPath');

class Application extends egg.Application {

  get [EGG_PATH]() {
    return path.dirname(__dirname);
  }
}

class Agent extends egg.Agent {
  get [EGG_PATH]() {
    return path.dirname(__dirname);
  }
}

class Service extends egg.Service {

  constructor(ctx) {
    super(ctx);

    const name = this.constructor.name;
    this.opts = Object.assign({}, ctx.app.config[name]);
  }
}

class APIService extends Service {

  constructor(ctx) {
    super(ctx);

    this.opts = Object.assign({
      apiName: '',
      apiUrl: '',
      fromRealIp: false,
      curlOptions: {},
    }, this.opts);
  }

  afterRequest(response, opts) {
    let respError;
    const data = response.data || {};

    if (response.status >= 300 || response.status < 200 ||
      data.respCode !== 'S0001') {

      respError = new Error(data.respMessage || data.message || '服务异常');
      respError.normalResponse = true;
      respError.errCode = data.respCode || 'F500';
      respError.status = response.status;
      throw respError;
    }

    return data.data;
  }

  beforeRequest(opts) {
  }

  async curl(url, opts) {
    opts = Object.assign({}, this.opts.curlOptions, opts);
    url = this.opts.apiUrl + url;
    opts.method = opts.method || 'POST';
    opts.dataType = opts.dataType || 'json';
    const slience = opts.hasOwnProperty('slience') ? !!opts.slience : !!this.opts.slience;

    const { logger } = this;

    this.beforeRequest(opts);

    let logData = {};
    if (!slience) {
      logData = Object.assign(logData, opts.data);

      if (opts.logIgnore) {
        if (typeof opts.logIgnore === 'string') {
          logData[opts.logIgnore] = '***';
        } else if (Array.isArray(opts.logIgnore)) {
          opts.logIgnore.forEach(key => {
            if (logData.hasOwnProperty(key)) {
              logData[key] = '***';
            }
          });
        }
      }
    }

    if (!slience) {
      logger.info(`调用 ${this.opts.apiName} server url: ${url} method: ${opts.method} data: ${JSON.stringify(logData)}`);
    }

    let response = null;
    let responseErr = null;

    try {
      response = await this.ctx.curl(url, opts);
    } catch (err) {
      logger.info(`调用 ${this.opts.apiName} server url: ${url} 返回异常出错 Error: ${err.message} ${err.stack}`);
      throw err;
    }

    if (!response || !response.data) {
      logger.info(`调用 ${this.opts.apiName} 返回为空`);
      responseErr = new Error('返回格式错误');
      throw responseErr;
    }

    let data = null;

    if (typeof this.afterRequest === 'function') {
      try {
        data = this.afterRequest(response, opts);
      } catch (err) {
        logger.info(`调用 ${this.opts.apiName} server url: ${url} 失败返回数据  status:${response.status} ${JSON.stringify(response.data)} Error: ${err.message}`);
        throw err;
      }

      if (!slience) {
        logger.info(`调用 ${this.opts.apiName} server url: ${url} 成功返回数据 status: ${response.status}`);
      }

      return data;
    }

    if (!slience) {
      logger.info(`调用 ${this.opts.apiName} server url: ${url} 成功返回数据 status: ${response.status}`);
    }

    return response.data;
  }
}

module.exports = Object.assign(egg, {
  Application,
  Agent,
  APIService,
  Service,
});
