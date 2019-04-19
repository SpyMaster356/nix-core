const configActions = require('./config-actions');
const commands = require('./commands');
const defaultData = require('./default-data');
const services = require('./services');

module.exports = {
  name: 'core',
  description: "ChaosCore Core plugin.",

  defaultData,
  permissions: [
    'admin',
  ],
  configActions: Object.values(configActions),
  commands: Object.values(commands),
  services: Object.values(services),
};
