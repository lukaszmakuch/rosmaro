const build_storage = require('./../src/in_memory_storage')
const build_rosmaro = require('./../src/rosmaro')

module.exports = desc => build_rosmaro(Math.random(), desc, build_storage())
