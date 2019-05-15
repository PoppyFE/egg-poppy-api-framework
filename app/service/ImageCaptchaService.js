'use strict';

const Service = require('egg').Service;
const ms = require('ms');
const crypto = require('crypto');
const uuid = require('uuid');
const svgCaptcha = require('svg-captcha');

class ImageCaptchaService extends Service {

  async getCaptchaImageMedia(imageToken) {
    const { logger } = this.ctx;
    const { redis } = this.app;

    logger.info(`通过 ${imageToken} 获取对应的验证图片资源`);

    if (!imageToken) return;

    const captcha = await redis.get(imageToken);
    if (!captcha) {
      logger.info(`${imageToken} 对应的图片已不存在`);
      return;
    }

    const captchaSVG = svgCaptcha(captcha, this.opts.captchaOpts);
    this.ctx.type = 'image/svg+xml; charset=utf-8';
    this.ctx.body = captchaSVG;
  }

  async createCaptcha() {
    const { logger } = this.ctx;
    const { redis } = this.app;

    const captcha = svgCaptcha.randomText();
    const token = crypto.createHash('md5').update(captcha + '.' + uuid()).digest('hex');
    await redis.set(token, captcha, 'PX', ms(this.opts.captchaTokenMaxAge));

    logger.info(`请求创建ImageCaptchaToken imageCaptchaToken: ${token} captcha: ${captcha} 过期时间: ${this.opts.captchaTokenMaxAge}`);

    return {
      token,
      captcha: this.opts.responseCaptchaText ? captcha : '***',
    };
  }

  async verifyCaptcha({ captcha, token, remove }) {
    const { logger } = this;
    const { redis } = this.app;

    if (!captcha || !token) {
      return false;
    }

    let serverCaptcha = await redis.get(token);
    let clientCaptcha = captcha || '';

    if (!serverCaptcha) {
      logger.info(`图片验证码 redis-server key: captcha: ${serverCaptcha} 过期`);
      return false;
    }

    logger.info(`图片验证码 serverCaptcha: ${serverCaptcha} clientCaptcha: ${clientCaptcha}`);

    serverCaptcha = serverCaptcha.toLowerCase();
    clientCaptcha = clientCaptcha.toLowerCase();

    if (serverCaptcha !== clientCaptcha) {
      return false;
    }

    if (remove) {
      await redis.del(token);
    }

    return true;
  }

  async invalidCaptcha(token) {
    const ctx = this.ctx;
    const { logger } = ctx;
    const { redis } = ctx.app;

    await redis.del(token);

    logger.info(`让 Image Captcha token ${token} 失效`);
  }
}

module.exports = ImageCaptchaService;
