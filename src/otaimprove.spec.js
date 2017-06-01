let otaimprove = require('./otaimprove.js')
describe('A suite', function () {
  it('contains spec with an expectation', function () {
    expect(true).toBe(true)
  })
})

describe('A suite', function () {
  it('contains spec with an expectation', function () {
    expect(true).toBe(true)
    expect(otaimprove).toBeDefined()
  })
})
