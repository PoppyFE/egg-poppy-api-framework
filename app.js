'use strict';

const fs = require('fs');
const path = require('path');

// const sharp = require('sharp');

module.exports = app => {
  const { logger, config } = app;

  app.config.coreMiddleware.push('normalResponse');
  app.config.coreMiddleware.push('userAgent');

  // https://github.com/lovell/sharp
  app.image = {
    // sharp,
  };

  app.router.batchRoute = function(controllerDirName, opts = {}) {
    if (!controllerDirName) {
      controllerDirName = '';
    } else if (controllerDirName.startsWith('/') || controllerDirName.startsWith('.')) {
      controllerDirName = controllerDirName.slice(1);
      app.router.batchRoute(controllerDirName, opts);
      return;
    } else if (controllerDirName.endsWith('/') || controllerDirName.endsWith('.')) {
      controllerDirName = controllerDirName.slice(0, -1);
      app.router.batchRoute(controllerDirName, opts);
      return;
    }

    const dirPath = path.join(config.baseDir, 'app/controller', controllerDirName);

    if (!fs.lstatSync(dirPath).isDirectory()) {
      throw new Error(`${controllerDirName} is not a directory`);
    }

    fs.readdirSync(dirPath)
      .filter(filename => {
        if (!filename.endsWith('Controller.js')) {
          logger.warn(`${filename} not end with Controller.js will ignore!`);
          return false;
        }
        if (filename.startsWith('_')) {
          logger.warn(`${filename} start with _ will ignore!`);
          return false;
        }

        if (opts.filter && typeof opts.filter === 'function' && !opts.filter(filename)) {
          logger.warn(`${filename} customer filter rule will ignore!`);
          return false;
        }

        return true;
      })
      .forEach(filename => {
        const module = require(path.join(dirPath, filename));
        const routeName = opts.routeName || 'route';

        if (typeof module[routeName] !== 'function') {
          throw new Error(`${routeName} is not a function`);
        }

        // here call actions
        let controllerRef = app.controller;
        controllerDirName.split('/').forEach(itemName => {
          if (!itemName || !controllerRef) return;
          controllerRef = controllerRef[itemName];
        });

        const controllerName = filename.charAt(0).toLowerCase() + filename.slice(1, -3);// oxxxxx.js
        const actionRef = controllerRef[controllerName];

        module[routeName](app, app.middleware, actionRef);
      });
  };
};
