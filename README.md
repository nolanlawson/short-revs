short-revs [![Build Status](https://travis-ci.org/nolanlawson/short-revs.svg?branch=master)](https://travis-ci.org/nolanlawson/short-revs)
====

Shorten the revs in a stream from `pouchdb-replication-stream` (or a dump from `pouchdb-dump-cli`).

Designed to be run over the entire stream (e.g. for a large initial dumpfile). Shortens all the revs to the smallest possible size while retaining uniqueness for that document.

Input:

```js
{"docs":[{"_id":"bar","_rev":"1-315f3ff4beb880fc2888c6b5c314493c"}]}
{"docs":[{"_id":"baz","_rev":"1-77c56f7edfb51c6a5d51bf47b15a1f18"},{"_id":"buzz","_rev":"1-a34f0b7f5ef75d3911355f7398826bb7"},{"_id":"quux","_rev":"1-ed3e56a4f66dc55aa582d9ef24f9e6d9"},{"_id":"toto","_rev":"1-c803e606ca9c905d8126f03cc355e77c"},{"_id":"fifi","_rev":"1-c82778a17dab711489c8b95be0281e19"}]}
{"docs":[{"_id":"fubar","_rev":"1-5b8eb7bb8242571279aeea28dea01943","_deleted":true,"_revisions":{"start":1,"ids":["5b8eb7bb8242571279aeea28dea01943"]}},{"_id":"fubar","_rev":"1-3dd249bec829a05ab5aa998fc97952d1","_deleted":true,"_revisions":{"start":1,"ids":["3dd249bec829a05ab5aa998fc97952d1"]}},{"_id":"fubar","_rev":"2-f870e5f50110e158910807b783737331","_revisions":{"start":2,"ids":["3dd249bec829a05ab5aa998fc97952d1","f870e5f50110e158910807b783737331"]}}]}
```

Output:

```js
{"docs":[{"_id":"bar","_rev":"1-A"}]}
{"docs":[{"_id":"baz","_rev":"1-A"},{"_id":"buzz","_rev":"1-A"},{"_id":"quux","_rev":"1-A"},{"_id":"toto","_rev":"1-A"},{"_id":"fifi","_rev":"1-A"}]}
{"docs":[{"_id":"fubar","_rev":"1-A","_deleted":true,"_revisions":{"start":1,"ids":["A"]}},{"_id":"fubar","_rev":"1-B","_deleted":true,"_revisions":{"start":1,"ids":["B"]}},{"_id":"fubar","_rev":"2-C","_revisions":{"start":2,"ids":["B","C"]}}]}
```

Usage
---

This module can be used via JavaScript or the command line.

### Via the command line

```
npm install -g short-revs
```

```
short-revs < dumpfile.txt > smaller_dumpfile.txt
```

### Via JavaScript

```
npm install short-revs
```

```js
// db is a PouchDB with pouchdb-replication-stream set up
var db = ...

// stream is a stream
var stream = ...

// transform the stream
var shortRevs = require('short-revs');
db.dump(stream).pipe(shortRevs());
```

(See the tests for more example usages, including dumping to in-memory.)

In the browser
----

Need a browser build? Check out [http://wzrd.in/standalone/short-revs](http://wzrd.in/standalone/short-revs).

Otherwise, feel free to browserify/webpack it yourself.

Test
----

```
npm test
npm run coverage
```

Coverage is 100%; check the tests if you need proof. :)