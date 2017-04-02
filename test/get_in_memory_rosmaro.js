const build_storage = require('./storage_test_double')
const build_rosmaro = require('./../src/rosmaro')
const lock_mock = require('./lock_test_double')

module.exports = desc => build_rosmaro(desc, build_storage(), lock_mock().lock)
