#!/usr/bin/env node
'use strict';
var shortRevs = require('../');
return process.stdin.pipe(shortRevs()).pipe(process.stdout);