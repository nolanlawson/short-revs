'use strict';

var through = require('through2');
var base64int = require('base64int');

function getRevId(rev) {
  return rev.replace(/^\d+-/, '');
}

function getRevDepth(rev) {
  return rev.match(/^\d+-/)[0];
}

module.exports = function () {
  var dump = '';

  return through(function (chunk, enc, callback) {
    dump += chunk;
    callback();
  }, function (callback) {
    var lines = dump.split('\n');

    var docsToRevsToNewRevs = {};
    var docsToCounters = {};

    var res = lines.map(function (line) {
      if (!line) {
        return line;
      }
      var json = JSON.parse(line);
      if (!json.docs) {
        return line;
      }
      // comb through all lines, build up a unique mapping of ids per-doc
      json.docs.forEach(function (doc) {
        var revs = [getRevId(doc._rev)];

        if (doc._revisions) {
          doc._revisions.ids.forEach(function (id) {
            revs.push(id);
          });
        }

        docsToRevsToNewRevs['$' + doc._id] =
          docsToRevsToNewRevs['$' + doc._id] || {};
        docsToCounters['$' + doc._id] =
          docsToCounters['$' + doc._id] || 0;

        var revsToNewRevs = docsToRevsToNewRevs['$' + doc._id];

        revs.forEach(function (revId) {
          if (revsToNewRevs[revId]) {
            return;
          }
          var counter = docsToCounters['$' + doc._id];
          revsToNewRevs[revId] = base64int.encode(counter);
          docsToCounters['$' + doc._id] = counter + 1;
        });
      });

      // comb back through all the lines, replace everything with the new IDs
      json.docs = json.docs.map(function (doc) {
        var revsToNewRevs = docsToRevsToNewRevs['$' + doc._id];

        doc._rev = getRevDepth(doc._rev) + revsToNewRevs[getRevId(doc._rev)];

        if (doc._revisions) {
          doc._revisions.ids = doc._revisions.ids.map(function (id) {
            return revsToNewRevs[id];
          });
        }
        return doc;
      });

      return JSON.stringify(json);
    });
    this.push(res.join('\n'));
    callback();
  });
};