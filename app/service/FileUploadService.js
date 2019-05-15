'use strict';

const Service = require('egg').Service;
const path = require('path');
const fs = require('fs');
const mkdirp = require('mkdirp');
const uuid = require('uuid');
const awaitWriteStream = require('await-stream-ready').write;
const sendToWormhole = require('stream-wormhole');
const send = require('koa-send');

class FileUploadService extends Service {

  async getFileStream(opts) {
    const parts = this.ctx.multipart(Object.assign({ autoFields: true }, opts));
    const stream = await parts();
    // stream not exists, treat as an exception
    if (!stream || !stream.filename) {
      this.throw(400, 'Can\'t found upload file');
    }
    stream.fields = parts.field;
    stream.once('limit', () => {
      const err = new Error('Request file too large');
      err.name = 'MultipartFileTooLargeError';
      err.status = 413;
      err.fields = stream.fields;
      err.filename = stream.filename;
      if (stream.listenerCount('error') > 0) {
        stream.emit('error', err);
        // this.coreLogger.warn(err);
      } else {
        // this.coreLogger.error(err);
        // ignore next error event
        stream.on('error', () => {});
      }
      // ignore all data
      stream.resume();
    });
    return stream;
  }

  async upload(opts) {
    const ctx = this.ctx;
    const { logger } = ctx;

    const uploadOpts = Object.assign({}, this.config.FileUploadService, opts);
    const { uploadDir, uploadFileName } = uploadOpts;

    logger.info(`start to upload file to ${uploadDir}`);

    const stream = await this.getFileStream(uploadOpts);

    const originalFileName = path.basename(stream.filename);
    const originalFileExtName = path.extname(originalFileName);

    let fileName;
    if (typeof uploadFileName === 'string') {
      fileName = uploadFileName;
    } else if (typeof uploadFileName === 'function') {
      fileName = uploadFileName(originalFileName, uploadOpts, ctx);
    } else {
      fileName = originalFileName + '';
    }

    fileName = fileName || uuid() + originalFileExtName;

    let fileDir;
    if (typeof uploadDir === 'string') {
      fileDir = uploadDir;
    } else if (typeof uploadDir === 'function') {
      fileDir = uploadDir(originalFileName, fileName, uploadOpts, ctx);
    } else {
      fileDir = uploadDir + '';
    }

    if (typeof uploadOpts.valid === 'function') {
      uploadOpts.valid(originalFileName, fileName, fileDir, uploadOpts, ctx);
    }

    logger.info(`upload file name is ${fileName} dir: ${fileDir}`);

    mkdirp.sync(fileDir);

    const writeStream = fs.createWriteStream(path.join(fileDir, fileName));

    try {
      await awaitWriteStream(stream.pipe(writeStream));
    } catch (err) {
      await sendToWormhole(stream);
      throw err;
    }

    logger.info(`complete to upload file to ${fileName}`);

    return {
      dir: uploadDir,
      fileName,
    };
  }

  async download(opts) {
    const ctx = this.ctx;
    const { logger } = ctx;

    const downloadOpts = Object.assign({}, this.config.FileUploadService, opts);
    const { downloadDir, downLoadFileName } = downloadOpts;

    let fileName;
    if (typeof downLoadFileName === 'string') {
      fileName = downLoadFileName;
    } else if (typeof downLoadFileName === 'function') {
      fileName = downLoadFileName(downloadOpts, ctx);
    }

    fileName = fileName || path.basename(ctx.path);

    logger.info(`start to download file ${fileName}`);

    ctx.attachment(fileName);

    await send(ctx, fileName, { root: downloadDir });

    logger.info(`complete to download file to ${fileName}`);
  }


}

module.exports = FileUploadService;
