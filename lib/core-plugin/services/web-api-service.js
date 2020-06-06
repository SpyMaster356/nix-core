const webpack = require('webpack');
const path = require('path');
const fs = require('fs');
const express = require('express');

const Service = require('../../models/service.js');
const webpackConfig = require('../web-client/webpack.config.js');
const webServer = require('../web-server');

class WebApiService extends Service {
  constructor(chaos) {
    super(chaos);

    if (this.chaos.config.web.enabled) {
      this.chaos.on('chaos.startup', async () => {
        await this.buildClient();
        await this.buildServer();
      });

      this.chaos.on('chaos.listen', async () => {
        if (!this.server) return;
        await this.startServer();
      });
    }
  }

  buildClient() {
    return new Promise((resolve, reject) => {
      this.logger.info("Building web client");

      this.generateChaosClientFile();
      webpackConfig.resolve.alias = this.aliasWebClientPlugins();

      webpack(webpackConfig, (err, stats) => { // Stats Object
        if (err) {
          reject(err);
        } else if (stats.hasErrors()) {
          reject(stats.toJson().errors);
        } else {
          this.logger.info(
            'Web Client Built:\n' +
            stats.toString({
              modules: false,
            }),
          );
          resolve();
        }
      });
    });
  }

  buildServer() {
    const buildDir = path.join(__dirname, './../build');

    this.server = express();
    this.server.use("/assets", express.static(buildDir));
    this.server.use("/api", webServer(this.chaos));
    this.server.use('/*', (req, res) => res.sendFile(path.join(buildDir, 'index.html')));
  }

  startServer() {
    return new Promise((resolve) => {
      this.logger.info("Starting web server");
      const host = this.chaos.config.web.host;
      const port = this.chaos.config.web.port;

      this.server.listen(port, host, () => {
        this.logger.info(`WebAPI server started at http://${host}:${port}`);
        resolve();
      });
    });
  }

  /**
   * aliases __chaos-{pluginName} to the webClient folder for each plugin loaded
   * Allows webpack to find the React components for importing into the client.
   */
  aliasWebClientPlugins() {
    const aliases = {};
    this.chaos.pluginManager.plugins.forEach((plugin) => {
      if (!plugin.webClient) return;

      const jsSafeName = this.jsSafePluginName(plugin);

      this.logger.info(`adding webClient plugin for ${plugin.name}`);
      aliases[`__chaos-${jsSafeName}`] = plugin.webClient;
    });
    return aliases;
  }

  /**
   * Prepares a file that will import all the plugin React Components into the
   * client.
   */
  generateChaosClientFile() {
    let pluginsFile = [];

    const clientConfig = {
      clientId: this.chaos.config.web.clientId,
      clientUrl: this.chaos.config.web.clientUrl,
    };
    pluginsFile.push(`export const config = ${JSON.stringify(clientConfig)};`);

    pluginsFile.push("export const pluginApps = {};");
    this.chaos.pluginManager.plugins.forEach((plugin) => {
      if (!plugin.webClient) return;
      if (!fs.existsSync(path.resolve(plugin.webClient, 'app.jsx'))) return;

      const jsSafeName = this.jsSafePluginName(plugin);

      pluginsFile.push(`import ${jsSafeName}App from "__chaos-${jsSafeName}/app.jsx";`);
      pluginsFile.push(`pluginApps["${jsSafeName}"] = ${jsSafeName}App;`);
    });

    fs.writeFileSync(path.resolve(__dirname, "../web-client/chaos-client.js"), pluginsFile.join("\n"));
  }

  jsSafePluginName(plugin) {
    return plugin.name.replace(/[^\w]/, "_");
  }
}

module.exports = WebApiService;