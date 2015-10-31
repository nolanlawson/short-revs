'use strict';

var PouchDB = require('pouchdb');
var replicationStream = require('pouchdb-replication-stream');
require('pouchdb/extras/memory');
PouchDB.plugin(replicationStream.plugin);
PouchDB.adapter('writableStream', replicationStream.adapters.writableStream);
PouchDB.plugin({ loadIt: require('pouchdb-load').load });

var memdown = require('memdown');
var MemoryStream = require('memorystream');

var shortRevs = require('../');

var stream2promise = require('stream-to-promise');
var Promise = require('bluebird');
var should = require('chai').should();

describe('main test suite', function () {

  var db;
  var targetDB;

  beforeEach(function () {
    if (!process.browser) {
      db = new PouchDB('inmem', {db: memdown});
      targetDB = new PouchDB('inmem2', {db: memdown});
    } else {
      db = new PouchDB('inmem', {adapter: 'memory'});
      targetDB = new PouchDB('inmem2', {adapter: 'memory'});
    }
  });

  afterEach(function () {
    return Promise.all([db.destroy(), targetDB.destroy()]);
  });

  // rough equality test - just check that all docs in the two DBs
  // have exactly the same tree structure
  function checkDBsEqual() {
    return Promise.all([
      db.info(),
      targetDB.info()
    ]).then(function (res) {
      res[0].doc_count.should.equal(res[1].doc_count);
    }).then(function () {
      return Promise.all([db.allDocs(), targetDB.allDocs()]);
    }).then(function (res) {
      var getId = function (x) {return x.id;};
      res[0].rows.map(getId).should.deep.equal(res[1].rows.map(getId));
    }).then(function () {
      function getRevTree(db) {
        return db.allDocs().then(function (res) {
          return Promise.all(res.rows.map(function (row) {
            return db.get(row.id, {
              revs: true,
              open_revs: 'all',
              conflicts: true,
              revs_info: true
            }).then(function (res) {
              return res.map(function (row) {
                var doc = row.ok;
                doc._rev = doc._rev.match(/^\d+-/)[0];
                if (doc._revisions) {
                  doc._revisions.ids = doc._revisions.ids.map(function () {
                    return '';
                  });
                }
                return row;
              }).sort(function (a, b) {
                // try to sort somewhat consistently
                var startDiff = a.ok._revisions.start - b.ok._revisions.start;
                if (startDiff !== 0) {
                  return startDiff < 0 ? -1 : 1;
                }
                return a.ok._deleted ? -1 : 1;
              });
            });
          }));
        });
      }
      return Promise.all([getRevTree(db), getRevTree(targetDB)]).then(function (res) {
        res[0].should.deep.equal(res[1]);
      });
    });
  }

  it('should transform a dump', function () {
    var docs = [];
    for (var i = 0; i < 5; i++) {
      docs.push({_id: '000' + i});
    }

    return db.bulkDocs(docs).then(function () {
      return db.get('0001');
    }).then(function (doc) {
      return db.put(doc);
    }).then(function () {
      return db.get('0002');
    }).then(function (doc) {
      return db.put(doc)
    }).then(function () {
      return db.get('0002');
    }).then(function (doc) {
      return db.put(doc)
    }).then(function () {
      var stream = new MemoryStream();
      stream = stream.pipe(shortRevs());
      var promise = stream2promise(stream);
      return db.dump(stream).then(function () {
        return promise;
      }).then(function (res) {
        var json = res.toString('utf-8');
        should.exist(json);
        return targetDB.loadIt(json).then(checkDBsEqual);
      });
    });
  });

  it('should transform a conflicty dump', function () {
    var docs = [
      {
        _id: 'fubar',
        _rev: '1-a1',
        _revisions: { start: 1, ids: [ 'a1' ] }
      }, {
        _id: 'fubar',
        _rev: '1-b1',
        _revisions: { start: 1, ids: [ 'b1' ] }
      }, {
        _id: 'fubar',
        _rev: '2-a2',
        _revisions: { start: 2, ids: [ 'a2', 'a1' ] }
      }, {
        _id: 'fubar',
        _deleted: true,
        _rev: '3-a3',
        _revisions: { start: 3, ids: [ 'a3', 'a2', 'a1' ] }
      }
    ];

    return db.bulkDocs(docs, {new_edits: false}).then(function () {
      var stream = new MemoryStream();
      stream = stream.pipe(shortRevs());
      var promise = stream2promise(stream);
      return db.dump(stream).then(function () {
        return promise;
      }).then(function (res) {
        var json = res.toString('utf-8');
        return targetDB.loadIt(json).then(checkDBsEqual);
      });
    });
  });

  it('should transform a conflicty dump2', function () {
    var docs = [
      {
        _id: 'fubar',
        _deleted: true,
        _rev: '1-b1',
        _revisions: { start: 1, ids: [ 'b1' ] }
      }, {
        _id: 'fubar',
        _rev: '2-a2',
        _revisions: { start: 2, ids: [ 'a2', 'a1' ] }
      }, {
        _id: 'fubar',
        _deleted: true,
        _rev: '1-c1',
        _revisions: { start: 1, ids: [ 'c1' ] }
      }
    ];

    return db.bulkDocs(docs, {new_edits: false}).then(function () {
      var stream = new MemoryStream();
      stream = stream.pipe(shortRevs());
      var promise = stream2promise(stream);
      return db.dump(stream).then(function () {
        return promise;
      }).then(function (res) {
        var json = res.toString('utf-8');
        return targetDB.loadIt(json).then(checkDBsEqual);
      });
    });
  });

});