import * as Tape from 'tape'
import Game from '../game'
import {GamePick} from '../game'


Tape.test('players', t => {
  let g = new Game()
  const bData = {'height': 1}
  const cData = {'age': 5}

  t.deepEqual(g.getPlayers(), [], 'no players')

  g.createPlayer('a')
  g.createPlayer('b', async () => [], bData)
  g.createPlayer('c', async () => [], cData)

  t.deepEqual(g.getPlayers(), ['a','b','c'], '3 players')
  t.deepEqual(g.getPlayerData('b'), bData, 'player b data correct')
  t.deepEqual(g.getPlayerData('c'), cData, 'player c data correct')
  t.throws(() => g.createPlayer('a'), /already present/, 'duplicate player')

  t.end()
})


Tape.test('locations', t => {
  let g = new Game()
  const bData = {'big': true}
  const cData = {'little': false}

  g.createLocation('a')
  g.createLocation('b', bData)
  g.createLocation('c', cData)

  t.deepEqual(g.getLocationData('a'), {}, 'no data')
  t.deepEqual(g.getLocationData('c'), cData, 'some data')
  t.throws(() => g.createLocation('a'), /already present/, 'duplicate location')

  t.end()
})


Tape.test('cards', t => {
  let g = new Game()
  const bData = {'ace': true}
  const cData = {'suit': 'hearts'}

  g.createCard('a')
  g.createCard('b', bData)
  g.createCard('c', cData)

  t.deepEqual(g.getCardData('a'), {}, 'no data')
  t.deepEqual(g.getCardData('c'), cData, 'some data')
  t.throws(() => g.createCard('a'), /already present/, 'duplicate card')

  t.end()
})


Tape.test('addCards', t => {
  let g = new Game()

  g.createLocation('A')
  g.createLocation('B')
  g.createCard('a')
  g.createCard('b')
  g.createCard('c')
  g.createCard('d')
  g.addCards(['a'], 'A')
  g.addCards(['b'], 'A')
  g.addCards(['c','d'], 'B')

  t.throws(() => g.createCard('A'), /already present/, 'a card with the same name as a location')
  t.throws(() => g.createLocation('a'), /already present/, 'a location with the same name as a card')
  t.throws(() => g.addCards(['c'], 'A'), /is already at location/, 're-adding cards')
  t.deepEqual(g.getCards('B'), ['c','d'], 'cards at B')
  t.deepEqual(g.getCards('A'), ['a','b'], 'cards at A')
  t.deepEqual(g.getCardCount('A'), 2, '2 cards at A')

  t.end()
})


Tape.test('move', t => {
  let g = new Game()

  for (let l of ['A','B','C']) {
    g.createLocation(l)
  }
  for (let c of ['a','b','c','d','e','f']) {
    g.createCard(c)
  }

  g.addCards(['a','c','e'], 'A')
  g.addCards(['b','d','f'], 'B')
  t.deepEqual(g.getCards('C'), [], 'no cards at C')
  t.deepEqual(g.getCards('A'), ['a','c','e'], '3 cards at A')
  let cardsMoved = g.move('A', 'B', 1)
  t.deepEqual(cardsMoved, ['e'], 'moved card e')
  t.deepEqual(g.getCards('A'), ['a','c'], 'moved from the end of A')
  t.deepEqual(g.getCards('B'), ['b','d','f','e'], 'moved to the end of B')
  cardsMoved = g.move('A', 'B', 2, 0)
  t.deepEqual(cardsMoved, ['a', 'c'], 'moved 2 cards')
  t.deepEqual(g.getCardCount('A'), 0, 'cards moved from the start of A')
  t.deepEqual(g.getCards('B'), ['b','d','f','e','a','c'], 'to the end of B')
  cardsMoved = g.move('B', 'A', 3, 2, 0)
  t.deepEqual(cardsMoved, ['f', 'e','a'], '3 cards moved')
  t.deepEqual(g.getCards('A'), ['a','e','f'], 'from the second index of B to the start of A')
  t.deepEqual(g.getCards('B'), ['b','d','c'], '3 cards remaining in B')
  cardsMoved = g.move('B', 'A', 3, -1, 0)
  t.deepEqual(cardsMoved, ['c','d','b'], '3 cards moved')
  t.deepEqual(g.getCards('A'), ['b','d','c','a','e','f'], 'all cards in A')
  t.equal(g.getCardCount('B'), 0, 'no cards in B')
  cardsMoved = g.move('A', 'C', 1, -2, 2)
  t.deepEqual(cardsMoved, ['e'], '1 card moved')
  t.deepEqual(g.getCards('A'), ['b','d','c','a','f'], 'all but e in A')
  t.deepEqual(g.getCards('C'), ['e'], 'only e in C')
  t.equal(g.getCardCount('B'), 0, 'no cards in B')

  t.end()
})


Tape.test('moveCards', t => {
  let g = new Game()

  for (let l of ['A','B','C']) {
    g.createLocation(l)
  }
  for (let c of ['a','b','c','d','e','f']) {
    g.createCard(c)
  }

  g.addCards(['a','c','e'], 'A')
  g.addCards(['b','d','f'], 'B')
  t.equal(g.getCardCount('A'), 3, 'start with 3 cards in A')
  t.equal(g.getCardCount('B'), 3, 'and 3 cards in B')
  let cardsMoved = g.moveCards(['a'], 'C')
  t.deepEqual(g.getCards('C'), ['a'], 'a moved to C')
  t.deepEqual(g.getCards('A'), ['c','e'], '2 cards left in A')
  cardsMoved = g.moveCards(['a','c'], 'B')
  t.deepEqual(g.getCards('A'), ['e'], '1 card left in A')
  t.deepEqual(g.getCards('B'), ['b','d','f','a','c'], 'the other cards in B')
  t.equal(g.getCardCount('C'), 0)
  cardsMoved = g.moveCards(['b','f','c'], 'A', 2, 0)
  t.deepEqual(cardsMoved, ['b','f'], 'provided 3 cards, but only b and f moved')
  t.deepEqual(g.getCards('A'), ['f','b','e'], 'to the beginning of A')
  t.deepEqual(g.getCards('B'), ['d','a','c'], 'from B')
  cardsMoved = g.moveCards(g.getCards('A'), 'A', 10, 0)
  t.deepEqual(cardsMoved, ['f','b','e'], 'asked for 10, but only 4 cards to move')
  t.deepEqual(g.getCards('A'), ['e','b','f'], 'cards moved from A to the beginning of A, effectively reversed')

  t.end()
})


Tape('Game randomInt', t => {
  let g = new Game()
  let passes = true
  let lastX = 0
  let sequenceChanged = false

  for (let i = 0; i < 1000; ++i) {
    const x = g.randomInt(15)

    if (x < 0 || x >= 15) {
      t.fail(`randomInt(15) returned ${x}`)
      passes = false
    }
    if (i !== 0 && x !== lastX) {
      sequenceChanged = true
    }
    lastX = x
  }
  t.equal(sequenceChanged, true, `randomInt(15)`)

  passes = true
  lastX = 0
  sequenceChanged = false

  for (let i = 0; i < 1000; ++i) {
    const x = g.randomInt(-5,45)
    if (x < -5 || x >= 45) {
      t.fail(`randomInt(-5,45) returned ${x}`)
      passes = false
    }
    if (i !== 0 && x !== lastX) {
      sequenceChanged = true
    }
    lastX = x
  }
  t.equal(sequenceChanged, true, `randomInt(-5,45)`)

  t.end()
})


Tape('Game randomSample', t => {
  let g = new Game()
  const list = ["a","h","u","k","l","p"]
  const n = 5

  let passes = true
  let lastX = []
  let sequenceChanged = false

  for (let i = 0; i < 1000; ++i) {
    const x = g.randomSample(list, 1)
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
    const x = g.randomSample(list, n)
    if (x.length !== n) {
      t.fail(`randomSample(list, ${n}) returned too many elements ${x}`)
      passes = false
    }
    else if (x.some((a,i) => x.lastIndexOf(a) !== i)) {
      t.fail(`randomSample(list, ${n}) returned duplicate elements ${x}`)
      passes = false
    }
    else if (x.some(a => list.indexOf(a) === -1)) {
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
    const x = g.randomSample([1,2], n)
    if (x.length !== 2) {
      t.fail(`randomSample([1,2], ${n}) returned too many elements ${x}`)
      passes = false
    }
    else if (x.some((a,i) => x.lastIndexOf(a) !== i)) {
      t.fail(`randomSample([1,2], ${n}) returned duplicate elements ${x}`)
      passes = false
    }
    else if (x.some(a => [1,2].indexOf(a) === -1)) {
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


async function testPicker(g: Game, picks: GamePick[]) {
  switch (picks[0].rule) {
    case 't0': return ['c']
    case 't1': return ['z']
    case 't2': return ['a','c']
    case 't3': return ['c','f']
    case 't4': return ['c','a']
    case 't4.5': return []
    case 't5': return []
    case 't6': return []
    case 't7': return ['a']
    case 't8': console.assert(false, 'not used')
    case 't9': return ['c']
    case 't10': console.assert(false, 'not used')
    case 't11': return ['a']
    case 't12': return ['y','x']
  }
}

Tape('pick', async t => {
  let g = new Game()
  g.createPlayer('A', testPicker)
  g.createPlayer('B', testPicker)
  g.createPlayer('C', testPicker)

  let picked = await g.pickCards('A', ['a','c','e','f'], 1, () => true, 't0')
  t.deepEqual(picked, ['c'], 'pick one card from a set')
  picked = await g.pickCards('A', ['a','c','e','f'], 1, () => true, 't1')
  t.deepEqual(typeof picked, 'undefined', 'pick one invalid card from a set')
  picked = await g.pickCards('A', ['a','c','e','f'], 1, () => true, 't2')
  t.deepEqual(typeof picked, 'undefined', 'pick incompatible with the set')
  picked = await g.pickCards('A', ['a','c','e','f'], 2, () => true, 't3')
  t.deepEqual(picked, ['c','f'], 'pick two cards')
  picked = await g.pickCards('A', ['a','c','e','f'], [1,3], () => true, 't4')
  t.deepEqual(picked, ['c','a'], 'pick two cards, out of 3')
  picked = await g.pickCards('A', ['a','c','e','f'], [0,3], () => true, 't4.5')
  t.deepEqual(picked, [], 'pick no cards out of 3')
  picked = await g.pickCards('A', ['a','c','e','f'], 5, () => true, 't5')
  t.equal(typeof picked, 'undefined', 'asked for 5, but only 4 available')
  picked = await g.pickCards('A', ['a','c','e','f'], 1, () => true, 't6')
  t.deepEqual(typeof picked, 'undefined', 'asked for one card, but returned none')

  let firstPick = g.pickCards('A', ['a','b'], 1, () => true, 't7')
  let secondPick = g.pickCards('A', ['a','c'], 1, () => true, 't8')
  picked = await g.groupPicks([firstPick, secondPick])
  t.equal(picked.length, 2, 'two results from two parallel picks')
  t.deepEqual(picked[0], ['a'], '"a" matches first pick')
  t.deepEqual(picked[1], ['a'], '"a" matches second pick')

  firstPick = g.pickCards('A', ['a','b'], 1, () => true, 't9')
  secondPick = g.pickCards('A', ['a','c'], 1, () => true, 't10')
  picked = await g.groupPicks([firstPick, secondPick])
  t.equal(picked.length, 2, 'still two results from two parallel picks')
  t.deepEqual(typeof picked[0], 'undefined', '"c" does not match the first pick')
  t.deepEqual(picked[1], ['c'], '"c" matches second pick')

  firstPick = g.pickCards('A', ['a','b'], 1, () => true, 't11')
  secondPick = g.pickCards('B', ['x','y','z'], [1,2], () => true, 't12')
  picked = await g.groupPicks([firstPick, secondPick])
  t.equal(picked.length, 2, 'two results from two parallel picks from two different players')
  t.deepEqual(picked[0], ['a'], '"a" matches the pick for player A')
  t.deepEqual(picked[1], ['y','x'], '"y,x" matches the pick for player B')

  t.end()
})
