const assert = require('assert')

/*
requirements: {
  thrown,
  expected_parent,
  type
}
*/
const assert_error = requirements => {
  const actual = {
    stack: requirements.thrown.stack,
    original_type: requirements.thrown.original_type,
    type: requirements.thrown.type
  }
  const expected = {
    stack: requirements.expected_parent.stack,
    original_type: requirements.expected_parent.type,
    type: requirements.type
  }
  assert.deepEqual(actual, expected)
}

module.exports = { assert_error }
