'use strict';

const fs = require('fs');
const Rx = require('rx');
const Discord = require('discord.js');

const CommandManager = require('./lib/managers/command-manager');
const DataManager = require('./lib/managers/data-manager');
const ConfigManager = require('./lib/managers/config-manager');

const defaultResponseStrings = require('./lib/built-in/reponse-strings');
const defaultCommandFiles = fs.readdirSync(__dirname + '/lib/built-in/commands')
  .map((file) => require(__dirname + '/lib/built-in/commands/' + file));
const defaultConfigModuleFiles = fs.readdirSync(__dirname + '/lib/built-in/config')
  .map((file) => require(__dirname + '/lib/built-in/config/' + file));

class NixCore {
  /**
   * Create a new instance of Nix
   *
   * @param config {Object} The settings for Nix to use
   * @param config.discord {Object} The instance of a Discord.js Client for Nix to use.
   * @param config.loginToken {String} A Discord login token to authenticate with Discord.
   * @param config.ownerUserId {String} The user ID of the owner of the bot.
   * @param config.commands {Array<CommandConfig>}
   * @param config.dataSource {Object} Configuration settings for the data source
   * @param config.responseStrings {Object}
   */
  constructor(config) {
    config = Object.assign({
      discord: {},
      commands: [],
      dataSource: {
        type: 'none',
      },
      responseStrings: {},
    }, config);

    this.responseStrings = Object.assign(defaultResponseStrings, config.responseStrings);
    this.streams = null;
    this.listening = false;

    this._discord = new Discord.Client(config.discord);
    this._loginToken = config.loginToken;
    this._ownerUserId = config.ownerUserId;
    this._owner = null;

    this._commandManager = new CommandManager(config.commands);
    this._dataManager = new DataManager(config.dataSource);
    this._configManager = new ConfigManager();

    this._shutdownSubject = new Rx.Subject();

    // Load default modules
    defaultCommandFiles.forEach((command) => this.addCommand(command));
    defaultConfigModuleFiles.forEach((module) => this.addConfigActions(module));
  }

  get commandManager() {
    return this._commandManager;
  }

  get dataManager() {
    return this._dataManager;
  }

  get configManager() {
    return this._configManager;
  }

  /**
   * alias the addCommand function to the Nix object for easier use.
   *
   * @param command {CommandConfig} The command to add to Nix
   */
  addCommand(command) {
    this.commandManager.addCommand(command);
  }

  /**
   * alias the addConfigActions function to the Nix object for easier use.
   *
   * @param module {Object} The config module to add to Nix
   */
  addConfigActions(module) {
    this.configManager.addConfigActions(module);
  }

  /**
   * Start the discord bot
   *
   * @return {Rx.Observable} an observable stream to subscribe to
   */
  listen() {
    if (this.listening) {
      return Rx.Observable.throw(new Error("Already listening"));
    }

    this.listening = true;
    this._createStreams();

    let subject = new Rx.Subject();
    Rx.Observable.return()
      .flatMap(() => this.discord.login(this._loginToken))
      .flatMap(() => this._findOwner())
      .do(() => {
        Rx.Observable
          .merge([
            this.streams.command$.flatMap((message) => this.commandManager.runCommandForMsg(message, this)),
          ])
          .subscribe(
            () => {},
            () => {},
            () => {
              console.log('main$ complete');
              this.listening = false;
              subject.onCompleted();
            }
          );
      })
      .subscribe(
        () => {
          this.messageOwner("I'm now online.");
          subject.onNext('Ready!');
        },
        (error) => subject.onError(error)
      );

    return subject;
  }

  /**
   * Triggers a soft shutdown of the bot.
   */
  shutdown() {
    console.log("[INFO] Asked to shut down");
    this._shutdownSubject.onNext(true);
  }

  /**
   * Sends a message to the owner of the bot
   *
   * @param message
   * @param options
   *
   * @return {Rx.Observable} an observable stream to subscribe to
   */
  messageOwner(message, options={}) {
    if (this.owner === null) {
      return Rx.Observable.throw(new Error('Owner was not found.'));
    }

    return Rx.Observable.fromPromise(this.owner.send(message, options));
  }

  /**
   * Returns the Discord client instance that the bot is using.
   *
   * @return {Discord.Client}
   */
  get discord() {
    return this._discord;
  }

  /**
   * Returns the owner user, if they were found.
   *
   * @return {null|Discord.User}
   */
  get owner() {
    return this._owner;
  }

  _findOwner() {
    return Rx.Observable
      .fromPromise(this._discord.users.fetch(this._ownerUserId))
        .do((user) => console.log('owner "' + user.username + '" found.'))
        .do((user) => this._owner = user);
  }

  /**
   * Creates the message processing stream from the Discord 'message' event
   *
   * @private
   *
   * @return {Rx.Observable} Observable stream of messages from Discord
   */
  _createStreams() {
    this.streams = {};

    this.streams.guildCreate$ =
      Rx.Observable
        .fromEvent(this._discord, 'guildCreate')
        .takeUntil(this._shutdownSubject)
        .doOnCompleted(() => console.log('guildCreate$ complete'))
        .share();

    this.streams.disconnect$ =
      Rx.Observable
        .fromEvent(this._discord, 'disconnect')
        .takeUntil(this._shutdownSubject)
        .doOnCompleted(() => console.log('disconnect$ complete'))
        .share();

    this.streams.message$ =
      Rx.Observable
        .fromEvent(this._discord, 'message')
        .takeUntil(this._shutdownSubject)
        .doOnCompleted(() => console.log('message$ complete'))
        .share();

    this.streams.command$ =
      this.streams.message$
        .filter((message) => this.commandManager.msgIsCommand(message))
        .takeUntil(this._shutdownSubject)
        .doOnCompleted(() => console.log('command$ complete'))
        .share();
  }

  handleError(context, error) {
    console.error(error);

    this.messageOwner(
      this.responseStrings.commandRun.unhandledException.forOwner({}),
      {embed: this.createErrorEmbed(context, error)}
    );

    let content = this.responseStrings.commandRun.unhandledException.forUser({owner: context.nix.owner});
    context.message.channel.send(content);

    return Rx.Observable.return();
  }

  createErrorEmbed(context, error) {
    let embed = {
      fields: [
        {
          name: 'Error:',
          value: error.message,
        },
        {
          name: 'User:',
          value: context.user.tag,
        },
        {
          name: 'Message:',
          value: context.message.content,
        },
        {
          name: 'Channel Type:',
          value: context.channel.type,
        },
      ],
    };

    if (context.channel.type === 'text') {
      embed.fields.push({
        name: 'Guild:',
        value: context.channel.guild.name,
      });
      embed.fields.push({
        name: 'Channel:',
        value: context.channel.name,
      });
    }

    let stack = error.stack.split('\n');
    let stackString = '';
    let nextLine = stack.shift();

    while (nextLine && (stackString + '\n' + nextLine).length <= 1008) { // max length of 1008-ish characters
      stackString += '\n' + nextLine;
      nextLine = stack.shift();
    }

    if (stack.length >= 1) {
      stackString += '\n  ...';
    }

    embed.fields.push({
      name: 'Stack:',
      value: stackString,
    });

    return embed;
  }
}

module.exports = NixCore;
