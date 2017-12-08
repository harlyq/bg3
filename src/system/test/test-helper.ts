import * as Tape from 'tape'
import Helper from '../helper'


Tape('test unique', t => {
  t.deepEqual(Helper.unique([]), [], 'empty list')
  t.deepEqual(Helper.unique([1,1,2,2,3,3,3,3,1,1,2,2,3,3]), [1,2,3], 'multiple numerical duplicates')
  t.deepEqual(Helper.unique(['c','b','a','b','c']), ['c','b','a'], 'multiple string duplicates')

  t.end()
})


Tape('test clamp', t => {
  t.equal(Helper.clamp(15,10,20), 15, 'no clamping')
  t.equal(Helper.clamp(5,10,20), 10, 'min clamping')
  t.equal(Helper.clamp(25,10,20), 20, 'max clamping')

  t.end()
})


Tape('test makeMap', t => {
  let a = {name: 'a', value: 10}
  let c = {name: 'c', value: 20}
  let e = {name: 'e', value: 20}

  t.deepEqual(Helper.makeMap([], x => x), {}, 'empty')
  t.deepEqual(Helper.makeMap([a,c,e], x => x.name), {'a': [a], 'c': [c], 'e': [e]}, 'standard map')
  t.deepEqual(Helper.makeMap([a,c,e], x => x.value.toString()), {'10': [a], '20': [c,e]}, 'map with repetitions')

  t.end()
})


Tape('test isEmpty', t => {
  t.equal(Helper.isEmpty({}), true, 'empty')
  t.equal(Helper.isEmpty({'a': 1}), false, 'not empty')

  t.end()
})


Tape('test parseCount', t => {
  t.deepEqual(Helper.parseCount(10), [10,10], 'single number')
  t.deepEqual(Helper.parseCount([1]), [1,1], 'single number in an array')
  t.deepEqual(Helper.parseCount([1,10]), [1,10], 'two numbers in an array')
  t.deepEqual(Helper.parseCount([1,2,3,10]), [1,2], 'more than two numbers in an array')

  t.end()
})


Tape('test parseUrl', t => {
  t.deepEqual(Helper.parseUrl('blah'), {filename: 'blah', ext: '', id: ''}, 'string')
  t.deepEqual(Helper.parseUrl('test.txt'), {filename: 'test.txt', ext: 'txt', id: ''}, 'filename')
  t.deepEqual(Helper.parseUrl('#anchor'), {filename: '', ext: '', id: 'anchor'}, 'anchor')
  t.deepEqual(Helper.parseUrl('test.txt#anchor'), {filename: 'test.txt', ext: 'txt', id: 'anchor'}, 'filename with anchor')
  t.deepEqual(Helper.parseUrl('a.b.c.txt#anchor.two.three'), {filename: 'a.b.c.txt', ext: 'txt', id: 'anchor.two.three'}, 'filename with multiple . and anchor with multiple .')

  t.end()
})


Tape('test randomInt', t => {
  let passes = true
  let lastX = 0
  let sequenceChanged = false

  for (let i = 0; i < 1000; ++i) {
    const x = Helper.randomInt(10)

    if (x < 0 || x >= 10) {
      t.fail(`randomInt(10) returned ${x}`)
      passes = false
    }
    if (i !== 0 && x !== lastX) {
      sequenceChanged = true
    }
    lastX = x
  }
  t.equal(sequenceChanged, true, `randomInt(10)`)

  passes = true
  lastX = 0
  sequenceChanged = false

  for (let i = 0; i < 1000; ++i) {
    const x = Helper.randomInt(5,60)
    if (x < 5 || x >= 60) {
      t.fail(`randomInt(5,60) returned ${x}`)
      passes = false
    }
    if (i !== 0 && x !== lastX) {
      sequenceChanged = true
    }
    lastX = x
  }
  t.equal(sequenceChanged, true, `randomInt(5,60)`)

  t.end()
})


Tape('test randomSample', t => {
  const list = [1,2,3,4,10,12,-3,-7]
  const n = 3

  let passes = true
  let lastX = []
  let sequenceChanged = false

  for (let i = 0; i < 1000; ++i) {
    const x = Helper.randomSample(list, 1)
    if (x.length !== 1 || list.indexOf(x[0]) === -1) {
      t.fail(`randomSample(list, 1) returned ${x}`)
      passes = false
    }

    if (i !== 0 && x.filter((a,i) => a !== lastX[i]).length > 0) {
      sequenceChanged = true
    }
    lastX = x
  }
  t.equal(sequenceChanged, true, `randomSample(list, 1)`)

  passes = true
  lastX = []
  sequenceChanged = false

  for (let i = 0; i < 1000; ++i) {
    const x = Helper.randomSample(list, n)
    if (x.length !== n) {
      t.fail(`randomSample(list, ${n}) returned too many elements ${x}`)
      passes = false
    }
    else if (x.filter((a,i) => x.lastIndexOf(a) === i).length !== x.length) {
      t.fail(`randomSample(list, ${n}) returned duplicate elements ${x}`)
      passes = false
    }
    else if (x.filter(a => list.indexOf(a) !== -1).length !== x.length) {
      t.fail(`randomSample(list, ${n}) returned elements that were no in the original list ${x}`)
      passes = false
    }

    if (i !== 0 && x.filter((a,i) => a !== lastX[i]).length > 0) {
      sequenceChanged = true
    }
    lastX = x
  }
  t.equal(sequenceChanged, true, `randomSample(list, ${n})`)

  passes = true
  lastX = []
  sequenceChanged = false

  for (let i = 0; i < 1000; ++i) {
    const x = Helper.randomSample([1,2], n)
    if (x.length !== 2) {
      t.fail(`randomSample([1,2], ${n}) returned too many elements ${x}`)
      passes = false
    }
    else if (x.filter((a,i) => x.lastIndexOf(a) === i).length !== x.length) {
      t.fail(`randomSample([1,2], ${n}) returned duplicate elements ${x}`)
      passes = false
    }
    else if (x.filter(a => [1,2].indexOf(a) !== -1).length !== x.length) {
      t.fail(`randomSample([1,2], ${n}) returned elements that were no in the original list ${x}`)
      passes = false
    }

    if (i !== 0 && x.filter((a,i) => a !== lastX[i]).length > 0) {
      sequenceChanged = true
    }
    lastX = x
  }
  t.equal(sequenceChanged, true, `randomSample([1,2], ${n})`)

  t.end()
})
