const MemoryDataSource = require('nix-data-memory');
const DiskDataSource = require('nix-data-disk');
const path = require('path');
const fs = require('fs');
const Rx = require('rx');

const MockNixLogger = require("../../support/mock-logger");
const DataManager = require('../../../lib/managers/data-manager');

describe('DataManager', function () {
  beforeEach(function () {
    this.nix = {
      config: { dataSource: {} },
      logger: new MockNixLogger(),
    };

    this.dataManager = new DataManager(this.nix);
  });

  describe(".nix", function () {
    it('returns a reference to nix', function () {
      expect(this.dataManager.nix).to.eq(this.nix);
    });
  });

  describe('constructor', function () {
    context('when no datasource is in the nix config', function() {
      beforeEach(function () {
        delete this.nix.config.dataSource;
      });

      it('defaults to a memory datasource', function () {
        this.dataManager = new DataManager(this.nix);
        expect(this.dataManager._dataSource).to.be.a.instanceOf(MemoryDataSource);
      });
    });

    context('when a datasource is specified in the nix config', function() {
      beforeEach(function () {
        this.tmpDir = path.resolve(__dirname, "../../tmp");

        this.nix.config.dataSource.type = "disk";
        this.nix.config.dataSource.dataDir = this.tmpDir;
      });
      
      it('correctly loads the datasource', function () {
        this.dataManager = new DataManager(this.nix);
        expect(this.dataManager._dataSource).to.be.a.instanceOf(DiskDataSource);
      });

      afterEach(function () {
        fs.rmdirSync(this.tmpDir);
      });
    });
  });

  describe('#type', function () {
    it('returns the type from the DataSource', function () {
      class MockDataSource {
        constructor() { this.type = "Mock"; }
      }

      this.dataManager._dataSource = new MockDataSource();
      expect(this.dataManager.type).to.eq("Mock");
    });
  });

  describe('#onNixListen', function () {

  });

  describe('#onNixJoinGuild', function () {

  });

  describe('#setGuildData', function () {
    it('calls through to the datasource setData', function () {
      this.dataManager._dataSource.setData = sinon.fake.returns(Rx.Observable.of(true));
      this.dataManager.setGuildData("guildId", "keyword", "data")
      expect(this.dataManager._dataSource.setData).to.have.been
        .calledWith("guild", "guildId", "keyword", "data");
    });
  });

  describe('#getGuildData', function () {
    it('calls through to the datasource getData', function () {
      this.dataManager._dataSource.getData = sinon.fake.returns(Rx.Observable.of(true));
      this.dataManager.getGuildData("guildId", "keyword");
      expect(this.dataManager._dataSource.getData).to.have.been
        .calledWith("guild", "guildId", "keyword");
    });
  });
});
