const ChaosComponent = require('./chaos-component');

class Plugin extends ChaosComponent {
  name = 'Name';
  description = null;

  dependencies = [];

  defaultData = [];

  permissions = [];
  services = [];
  configActions = [];
  commands = [];

  constructor(chaos, options) {
    super(chaos);
    Object.assign(this, options);

    this.chaos.on('chaos.listen', () => {
      this.pluginService = this.chaos.getService('core', 'PluginService');
    });
  }

  isEnabled(guild) {
    return this.pluginService.isPluginEnabled(guild.id, this.name);
  }
}

module.exports = Plugin;
