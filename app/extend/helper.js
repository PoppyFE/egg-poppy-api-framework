'use strict';

const base64Regex = /^data:([A-Za-z-+\/]+);base64,(.+)$/;
const base64ImageToFile = require('base64image-to-file');
const path = require('path');
const uuid = require('uuid');
const msk = require('msk');
const conceal = require('conceal');
const CryptoJS = require('crypto-js');
const randomString = require('random-string');
const moment = require('moment');

module.exports = {

  // Original idea from http://stackoverflow.com/questions/20267939/nodejs-write-base64-image-file
  decodeBase64String(dataString) {

    const matches = dataString.match(base64Regex) || { length: 0 };
    const info = {};

    if (matches.length !== 3) {
      throw new Error('Invalid base64 encoded image');
    }

    info.type = matches[1];
    info.buffer = new Buffer(matches[2], 'base64');
    return info;
  },

  async saveBase64ToImageFile(base64String, dirPath, imageName) {
    imageName = imageName || uuid();
    const imageFileName = await new Promise((resolve, reject) => {
      base64ImageToFile(base64String, dirPath, imageName, (err, imgPath) => {
        if (err) {
          reject(err);
          return;
        }

        const filename = path.basename(imgPath);
        resolve(filename);
      });
    });

    return imageFileName;
  },

  // https://github.com/vtex/msk

  maskString(str, mask) {
    return msk(str, mask);
  },

  // https://github.com/sergi/conceal
  // conceal(str, { start: 4, end: 6 });
  concealString(str, opt) {
    if (!str) return '';
    if (opt && opt.end < 0) {
      opt.end = str.length + opt.end - 1;
    }
    return conceal(str, opt);
  },

  aseEncrypt(message = '', secret) {
    console.log('This method will deprecated');
    return CryptoJS.AES.encrypt(message, secret);
  },

  aseDecrypt(message = '', secret) {
    console.log('This method will deprecated');
    return CryptoJS.AES.decrypt(message, secret).toString(CryptoJS.enc.Utf8);
  },

  aesEncrypt(message = '', secret) {
    return CryptoJS.AES.encrypt(message, secret).toString();
  },

  aesDecrypt(message = '', secret) {
    return CryptoJS.AES.decrypt(message, secret).toString(CryptoJS.enc.Utf8);
  },

  // https://github.com/valiton/node-random-string
  // var x = randomString({
  //   length: 8,
  //   numeric: true,
  //   letters: true,
  //   special: false,
  //   exclude: ['a', 'b', '1']
  // });
  randomString(opts) {
    return randomString(opts);
  },

  serialNo(opts = {}) {
    if (!opts.length) {
      opts.length = 6;
    }

    if (!opts.letters) {
      opts.letters = false;
    }

    opts.special = false;

    return moment().format('YYYYMMDDHHmmss') + randomString(opts);
  },

  sqlNow() {
    // 2019-02-14 18:34:36
    return moment().format('YYYY-MM-DD HH:mm:ss');
  },

  sqlNowAfter(val, mod) {
    // 2019-02-14 18:34:36
    return moment().add(val, mod).format('YYYY-MM-DD HH:mm:ss');
  },
};
