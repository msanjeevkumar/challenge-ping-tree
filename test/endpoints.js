process.env.NODE_ENV = 'test'

const test = require('ava')
const servertest = require('servertest')

const server = require('../lib/server')

const data = {
  id: '0',
  url: 'http://example.com',
  value: '0.50',
  maxAcceptsPerDay: '10',
  accept: {
    geoState: {
      $in: ['ca', 'ny']
    },
    hour: {
      $in: ['13', '14', '15']
    }
  }
}

const postData = (stream, obj) => {
  stream.write(JSON.stringify(obj))
  stream.end()
}

test.serial.cb('healthcheck', t => {
  const url = '/health'
  servertest(server(), url, { encoding: 'json' }, (err, res) => {
    t.falsy(err, 'no error')

    t.is(res.statusCode, 200, 'correct statusCode')
    t.is(res.body.status, 'OK', 'status is ok')
    t.end()
  })
})

test.serial.cb('GET /route with no targets', (t) => {
  const visitor = {
    geoState: 'ca',
    publisher: 'abc',
    timestamp: '2018-07-19T23:28:59.513Z'
  }

  postData(servertest(server(), '/route', { method: 'POST' }, (err, res) => {
    const response = JSON.parse(res.body.toString())
    t.falsy(err, 'no error')
    t.is(res.statusCode, 503)
    t.deepEqual(response, {
      decision: 'reject'
    })

    t.end()
  }), visitor)
})

test.serial.cb('POST /api/targets', t => {
  const url = '/api/targets'
  postData(servertest(server(), url, { method: 'POST' }, (err, res) => {
    t.falsy(err, 'no error')

    t.is(res.statusCode, 200, 'correct statusCode')
    t.end()
  }), data)
})

test.serial.cb('GET /api/targets', (t) => {
  servertest(server(), '/api/targets', {}, (err, res) => {
    const expectedTargets = JSON.parse(res.body.toString())
    t.falsy(err, 'no error')
    t.is(res.statusCode, 200, 'correct statusCode')
    t.truthy(expectedTargets.length === 1, 'GET /api/targets return returned than expected number of targets')
    t.deepEqual(data, expectedTargets[0])
    t.end()
  })
})

test.serial.cb('GET /api/targets/:id', (t) => {
  servertest(server(), '/api/targets/0', {}, (err, res) => {
    const target = JSON.parse(res.body.toString())
    t.falsy(err, 'no error')
    t.is(res.statusCode, 200, 'correct statusCode')
    t.deepEqual(data, target, 'GET /api/targets/1 response does not match with expected data')
    t.end()
  })
})

test.serial.cb('GET /route', (t) => {
  const visitor = {
    geoState: 'ca',
    publisher: 'abc',
    timestamp: '2018-07-19T23:28:59.513Z'
  }

  postData(servertest(server(), '/route', { method: 'POST' }, (err, res) => {
    const response = JSON.parse(res.body.toString())
    t.falsy(err, 'no error')
    t.is(res.statusCode, 503)
    t.deepEqual(response, {
      decision: 'reject'
    })

    t.end()
  }), visitor)
})

test.serial.cb('GET /route with 13th hour in timestamp', (t) => {
  const visitor = {
    geoState: 'ca',
    publisher: 'abc',
    timestamp: '2018-07-19T13:28:59.513Z'
  }

  postData(servertest(server(), '/route', { method: 'POST' }, (err, res) => {
    const response = JSON.parse(res.body.toString())
    t.falsy(err, 'no error')
    t.is(res.statusCode, 200)
    t.deepEqual(response, {
      decision: 'accept',
      url: data.url
    })

    t.end()
  }), visitor)
})

test.serial.cb('GET /route with ny geoState', (t) => {
  const visitor = {
    geoState: 'ny',
    publisher: 'abc',
    timestamp: '2018-07-19T13:28:59.513Z'
  }

  postData(servertest(server(), '/route', { method: 'POST' }, (err, res) => {
    const response = JSON.parse(res.body.toString())
    t.falsy(err, 'no error')
    t.is(res.statusCode, 200)
    t.deepEqual(response, {
      decision: 'accept',
      url: data.url
    })

    t.end()
  }), visitor)
})

test.serial.cb('GET /route with hours match and no geoState match', (t) => {
  const visitor = {
    geoState: 'la',
    publisher: 'abc',
    timestamp: '2018-07-19T13:28:59.513Z'
  }

  postData(servertest(server(), '/route', { method: 'POST' }, (err, res) => {
    const response = JSON.parse(res.body.toString())
    t.falsy(err, 'no error')
    t.is(res.statusCode, 503)
    t.deepEqual(response, {
      decision: 'reject'
    })

    t.end()
  }), visitor)
})

test.serial.cb('GET /route with 14th hour in timestamp', (t) => {
  const visitor = {
    geoState: 'ca',
    publisher: 'abc',
    timestamp: '2018-07-19T14:28:59.513Z'
  }

  postData(servertest(server(), '/route', { method: 'POST' }, (err, res) => {
    const response = JSON.parse(res.body.toString())
    t.falsy(err, 'no error')
    t.is(res.statusCode, 200)
    t.deepEqual(response, {
      decision: 'accept',
      url: data.url
    })

    t.end()
  }), visitor)
})

test.serial.cb('GET /route with 15th hour in timestamp', (t) => {
  const visitor = {
    geoState: 'ca',
    publisher: 'abc',
    timestamp: '2018-07-19T15:28:59.513Z'
  }

  postData(servertest(server(), '/route', { method: 'POST' }, (err, res) => {
    const response = JSON.parse(res.body.toString())
    t.falsy(err, 'no error')
    t.is(res.statusCode, 200)
    t.deepEqual(response, {
      decision: 'accept',
      url: data.url
    })

    t.end()
  }), visitor)
})

test.serial.cb('GET /route with multiple acceptable targets with different values', (t) => {
  const visitor = {
    geoState: 'ca',
    publisher: 'abc',
    timestamp: '2018-07-19T15:28:59.513Z'
  }

  const target1 = {
    ...data,
    id: '1',
    url: 'http://example1.com',
    value: '3'
  }

  const target2 = {
    ...data,
    id: '2',
    url: 'http://example2.com',
    value: '7'
  }

  postData(servertest(server(), '/api/targets', { method: 'POST' }, () => {
    postData(servertest(server(), '/api/targets', { method: 'POST' }, () => {
      postData(servertest(server(), '/route', { method: 'POST' }, (err, res) => {
        const response = JSON.parse(res.body.toString())
        t.falsy(err, 'no error')
        t.is(res.statusCode, 200)
        t.deepEqual(response, {
          decision: 'accept',
          url: target2.url
        })

        t.end()
      }), visitor)
    }), target2)
  }), target1)
})
