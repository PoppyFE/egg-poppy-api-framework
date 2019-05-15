'use strict';

const Service = require('egg').APIService;
const ms = require('ms');
const moment = require('moment');
const randomstring = require('randomstring');
const crypto = require('crypto');

class EimsAPIService extends Service {

  constructor(ctx) {
    super(ctx);

    this.opts.curlOptions.contentType = 'application/x-www-form-urlencoded';
  }

  async sendSmsCaptcha(mobileNo) {
    const ctx = this.ctx;
    const { logger } = ctx;
    const { redis } = ctx.app;

    const templateNo = this.opts.captchaTemplateNo;

    const datetime = moment().format('YYYY-MM-DD HH:mm:ss').toString();
    const captcha = randomstring.generate({
      length: 6,
      charset: 'numeric',
    });

    const smsMsg = JSON.stringify({
      captcha,
      datetime,
    });

    logger.info(`sendSmsCaptcha mobileNo:${mobileNo} captcha: ${captcha}`);

    try {
      const data = await this.curl('/sendMessage/sms', {
        logIgnore: 'userpwd',
        data: {
          templateNo,
          valueAll: smsMsg,
          target: mobileNo,
          userid: this.opts.smsAppId,
          userpwd: this.opts.smsAppKey,
          mode: '0',
          sign: '0',
          charset: 'UTF-8',
        },
      });

      // here 绑定 redis
      const smsMaxAge = ms(this.opts.smsMaxAge || '5m');
      const redisKey = `captcha:${mobileNo}`;

      logger.info(`sendSmsCaptcha Complete. mobileNo:${mobileNo} captcha: ${captcha} 有效期 ${smsMaxAge}`);

      await redis.set(redisKey, captcha, 'EX', smsMaxAge * 0.001);

      return data;
    } catch (err) {
      throw err;
    }
  }

  async sendSmsCaptchaNew(mobileNo) {
    const ctx = this.ctx;
    const { logger } = ctx;
    const { redis } = ctx.app;

    const templateNo = this.opts.captchaTemplateNo;

    const datetime = moment().format('YYYY-MM-DD HH:mm:ss').toString();
    const captcha = randomstring.generate({
      length: 6,
      charset: 'numeric',
    });

    const smsMsg = JSON.stringify({
      captcha,
      datetime,
    });

    const sendData = {
      templateNo,
      jsonString: smsMsg,
      target: mobileNo,
      appId: this.opts.smsAppId,
    };

    const msgContentArr = [];
    Object.keys(sendData).sort().forEach(key => {
      msgContentArr.push(`${key}=${sendData[key]}`);
    });

    const msgContent = msgContentArr.join('&') + `&key=${this.opts.smsAppKey}`;

    sendData.sign = crypto.createHash('sha1').update(msgContent).digest('hex');

    logger.info(`sendSmsCaptcha mobileNo:${mobileNo} captcha: ${captcha}`);

    try {
      const data = await this.curl('/sendMessage/sms', {
        data: sendData,
      });

      // here 绑定 redis
      const smsMaxAge = ms(this.opts.smsMaxAge || '5m');
      const redisKey = `captcha:${mobileNo}`;

      logger.info(`sendSmsCaptcha Complete. mobileNo:${mobileNo} captcha: ${captcha} 有效期 ${smsMaxAge}`);

      await redis.set(redisKey, captcha, 'EX', smsMaxAge * 0.001);

      return data;
    } catch (err) {
      throw err;
    }
  }

  async verifySmsCaptcha(mobileNo, captcha, remove) {
    const ctx = this.ctx;
    const { logger } = ctx;
    const { redis } = ctx.app;

    const redisKey = `captcha:${mobileNo}`;
    const redisCaptcha = await redis.get(redisKey);
    if (redisCaptcha !== captcha) {
      logger.info(`mobileNo: ${mobileNo} 验证校验不同通过 redisCaptcha: ${redisCaptcha} captcha: ${captcha}`);

      return false;
    }

    if (remove) {
      await redis.del(redisKey);
    }

    return true;
  }

  async invalidSmsCaptcha(mobileNo, captcha) {
    const ctx = this.ctx;
    const { logger } = ctx;
    const { redis } = ctx.app;

    const redisKey = `captcha:${mobileNo}`;
    await redis.del(redisKey);

    logger.info(`让 mobileNo: ${mobileNo} captcha ${captcha} 失效`);
  }


  // ========================
  // "result": null,
  // "errorMsg": null,
  // "rescode": "00",
  // "resmsg": "success",
  // "messageId": "79746"

  // {
  //   "result": null,
  //   "errorMsg": "无效手机号1316607650",
  //   "rescode": "01",
  //   "resmsg": null,
  //   "messageId": "0"
  // }
  // ========================

  afterRequest(response) {
    let respError;
    const data = response.data || {};

    if (response.status >= 300 || response < 200 ||
      data.rescode !== '00') {
      respError = new Error(data.errorMsg || data.resmsg || '服务异常');
      respError.normalResponse = true;
      respError.errCode = data.rescode || 'F500';
      respError.status = response.status;
      throw respError;
    }

    return data;
  }
}

module.exports = EimsAPIService;
