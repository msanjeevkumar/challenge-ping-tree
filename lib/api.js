const { promisify } = require('util')
const redis = require('../lib/redis')

const upsertTarget = async (target) => {
  await _execRedisCommandAsync('hset', 'targets', `${target.id}`, JSON.stringify(target))
  return {
    code: 200,
    result: {
      status: 'ok'
    }
  }
}

const getTargets = async () => {
  const targets = await _execRedisCommandAsync('hvals', 'targets')
  return {
    code: 200,
    result: targets.map(target => JSON.parse(target))
  }
}

const getTarget = async (id) => {
  return {
    code: 200,
    result: await _execRedisCommandAsync('hget', 'targets', `${id}`)
  }
}

async function _execRedisCommandAsync (cmd, ...params) {
  const commandAsync = promisify(redis[cmd]).bind(redis)
  return commandAsync(...params)
}

async function _isAccepted (target, visitor) {
  const traffic = await _execRedisCommandAsync('hget', 'traffic', target.id)
  return Number(target.maxAcceptsPerDay) > (traffic ? Number(traffic) : 0) &&
    target.accept.geoState.$in.includes(visitor.geoState) &&
    target.accept.hour.$in.includes(
      new Date(visitor.timestamp).getUTCHours().toString()
    )
}

const makeDecision = async (visitor) => {
  const { result: targets } = await getTargets()

  if (!targets || targets.length === 0) {
    return {
      code: 503,
      result: {
        decision: 'reject'
      }
    }
  }

  const sortedTargets = targets
    .sort((target1, target2) => Number(target2.value) - Number(target1.value))

  let isTargetAccepted = false
  let index = 0
  while (!isTargetAccepted && index < sortedTargets.length) {
    isTargetAccepted = await _isAccepted(sortedTargets[index], visitor)
    index += 1
  }

  if (!isTargetAccepted) {
    return {
      code: 503,
      result: {
        decision: 'reject'
      }
    }
  }

  const acceptedTarget = sortedTargets[index - 1]

  const traffic = await _execRedisCommandAsync('hget', 'traffic', `${acceptedTarget.id}`)
  await _execRedisCommandAsync('hset', 'traffic', `${acceptedTarget.id}`, `${traffic ? Number(traffic) + 1 : 1}`)
  await upsertTarget(acceptedTarget)

  return {
    code: 200,
    result: {
      decision: 'accept',
      url: acceptedTarget.url
    }
  }
}

module.exports = {
  upsertTarget,
  getTargets,
  getTarget,
  makeDecision
}
