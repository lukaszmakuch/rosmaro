const build_storage = require('./../src/in_memory_storage')
const build_rosmaro = require('./../src/rosmaro')
const lock = require('./lock_test_double')().lock

module.exports = desc => build_rosmaro(Math.random(), desc, build_storage(), lock)
