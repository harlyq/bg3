const PLAYER_NAMES = "ABCD"
const PLAYER_COLORS = ["blue", "red", "green", "yellow"]
const MAX_FACE_UP = 6
const MAX_CARRIAGE_LEVEL = 7

const CITY_TILES: [string, string, number, string[]][] = [
  ["Mannheim", "Baden", 3, ["Stuttgart", "Carlsruhe"]],
  ["Carlsruhe", "Baden", 3, ["Stuttgart", "Mannheim", "Freiburg"]],
  ["Freiburg", "Baden", 3, ["Carlsruhe", "Sigmaringen", "Basel", "Zurich"]],
  ["Basel", "Schweiz", 3, ["Freiburg", "Zurich"]],
  ["Zurich", "Schweiz", 3, ["Basel", "Freiburg", "Sigmaringen", "Kempten"]],
  ["Innsbruck", "Tyrol", 3, ["Kempten", "Augsburg", "Munchen", "Salzburg"]],
  ["Sigmaringen", "Hohenzollern", 3, ["Freiburg", "Zurich", "Kempton", "Ulm", "Stuttgart"]],
  ["Stuttgart", "Wurttemberg", 3, ["Carlsruhe", "Mannheim", "Sigmaringen", "Ulm", "Ingolstadt", "Nurnberg", "Wurzburg"]],
  ["Ulm", "Wurttemberg", 3, ["Sigmaringen", "Stuttgart", "Kempton", "Augsburg", "Ingolstadt"]],
  ["Wurzburg", "Baiern", 3, ["Mannheim", "Stuttgart", "Nurnberg"]],
  ["Nurnberg", "Baiern", 3, ["Wurzburg", "Stuttgart", "Ingolstadt", "Regensburg", "Pilsen"]],
  ["Regensburg", "Baiern", 3, ["Nurnberg", "Ingolstadt", "Munchen", "Passau", "Pilsen"]],
  ["Ingolstadt", "Baiern", 3, ["Stuttgart", "Ulm", "Augsburg", "Munchen", "Regensburg", "Nurnberg"]],
  ["Augsburg", "Baiern", 3, ["Ulm", "Kempten", "Innsbruck", "Munchen", "Ingolstadt"]],
  ["Passau", "Baiern", 3, ["Regensburg", "Munchen", "Salzburg", "Linz"]],
  ["Munchen", "Baiern", 3, ["Augsburg", "Innsbruck", "Salzburg", "Passau", "Regensburg"]],
  ["Kempten", "Baiern", 3, ["Ulm", "Sigmaringen", "Zurich", "Innsbruck"]],
  ["Salzburg", "Salzburg", 3, ["Innsbruck", "Munchen", "Passau", "Linz"]],
  ["Linz", "Salzburg", 3, ["Passau", "Salzburg", "Budweis"]],
  ["Lodz", "Polen", 3, ["Pilsen"]],
  ["Pilsen", "Bohmen", 3, ["Nurnberg", "Regensburg", "Budweis", "Lodz"]],
  ["Budweis", "Bohmen", 3, ["Pilsen", "Linz"]],
]

const BONUS_TILES: [string, number[]][] = [
  ["distance-5", [2,1]],
  ["distance-6", [3,2,1]],
  ["distance-7", [4,3,2,1]],
  ["game-end", [1]],
  ["outside-baiern", [6,5,4,3]],
  ["in-baden", [3,2,1]],
  ["in-hohenzollern-wurttemberg", [3,2,1]],
  ["in-schweiz-tyrol", [3,2,1]],
  ["in-baiern", [5,4,3,2]],
  ["in-bohmem-salzburg", [4,3,2]],
]

const OFFICIALS = ["Administrator", "Cartwright", "Postal Carrier", "Postmaster"]

// for names with a trailing number (e.this. "distance5-1") removing the "-<number>"
function decodeName(name: string) {
  let i = name.lastIndexOf('-')
  return (i >= 0) ? name.substring(0, i) : name
}


class Helper {
  public static unique(list: any[]): any[] {
    let uniqueList = []
    for (let x of list) {
      if (uniqueList.indexOf(x) === -1) {
        uniqueList.push(x)
      }
    }
    return uniqueList
  }

  public static clamp<T>(x: T, min: T, max: T): T {
    if (x < min) {
      return min
    } else if (max < x) {
      return max
    } else {
      return x
    }
  }

  // converts and array to a map of arrays indexed by keyFn(array element)
  public static makeMap<T>(list: T[], keyFn: (x: T) => string): {[key: string]: T[]} {
    let map: {[key: string]: T[]} = {}
    for (let item of list) {
      const key: string = keyFn(item)
      if (!map[key]) {
        map[key] = [item]
      } else {
        map[key].push(item)
      }
    }
    return map
  }

  public static isEmpty(json: Object): boolean {
    for (let key in json) {
      return false
    }
    return true
  }

  // returns [min, max] for a count
  public static parseCount(count: number | [number, number]): [number, number] {
    if (typeof count === "number") {
      return [count, count]
    } else if (Array.isArray(count)) {
      if (count.length > 1) {
        return [count[0], count[1]]
      } else if (count.length === 1) {
        return [count[0], count[0]]
      }
    } else {
      console.assert(false, `invalid count '${count}'`)
    }
  }

  // returns a random number in the range (min,max], if max is not specified then the range is (0,min]
  public static randomInt(min: number, max?: number): number {
    if (typeof max === 'undefined') {
      min =  0
      max = min
    }
    return Math.floor(Math.random()*(max - min)) + min // TODO use a seedable random
  }


  // returns a list of k samples from the list (but not exceeding the length of the list)
  public static randomSample<T>(list: T[], k: number): T[] {
    let samples = []

    let listCopy = list.slice()
    while (samples.length < k && listCopy.length > 0) {
      let i = this.randomInt(listCopy.length)
      samples.push(listCopy.splice(i, 1))
    }

    return samples
  }
}


// a chain is a list of unique items. next() will return the next
// item in the list even if the current item , looping around to the first
class Chain<T> {
  private list: {val: T, active: boolean}[] = []

  constructor(vals: T[]) {
    for (let x of vals) {
      this.add(x)
    }
  }

  // returns the next item in the list after the current, works, even if
  // the current has been removed.  If the current is the last item in
  // the list, then returns the first item in the list
  public next(current: T): T {
    let returnNext = false

    for (let x of this.list) {
      if (returnNext && x.active) {
        return x.val
      }
      else if (x.val === current) {
        returnNext = true
      }
    }

    if (returnNext) { // haven't returned yet, start from the beginning
      for (let x of this.list) {
        if (x.active) {
          return x.val
        }
      }
    }

    // return undefined if all elements are inactive, or the list is empty
  }

  public prev(current: T): T {
    let lastVal
    let found = false

    for (let x of this.list) {
      if (x.val === current) {
        if (typeof lastVal !== 'undefined') {
          return lastVal
        }
        found = true
      }

      if (x.active) {
        lastVal = x.val
      }
    }

    if (found) {
      return lastVal
    }

    // return undefined if the list is empty or all elements are inactive
  }

  // this will sort both active and inactive elements
  public sort(compareFn: (a: T, b: T) => number) {
    this.list.sort((a,b) => {
      return compareFn(a.val, b.val)
    })
  }

  public length(): number {
    let len = 0
    for (let x of this.list) {
      len = len + (x.active ? 1 : 0)
    }
    return len
  }

  public remove(val: T) {
    for (let x of this.list) {
      if (x.val === val) {
        x.active = false
        return
      }
    }
    console.assert(false, `unable to find '${val}'`)
  }

  public add(val: T) {
    for (let x of this.list) {
      if (x.val === val) {
        x.active = true
        return
      }
    }

    this.list.push({val, active: true})
  }
}

type GameCount = number | [number, number] // value (-1 for all) | range [min, max] inclusive
type PickConditionFn = (choice: string[]) => boolean // return false if the choice is not valid
type GamePick = { type: string, player: string, options: string[], count: GameCount, condition: PickConditionFn }
type PlayerPickFn = (g: Game, picks: GamePick[]) => Promise<string[]>

class Game {
  cards: {[name: string]: any} = {}
  locations: {[name: string]: any} = {}
  players: {[name: string]: any} = {}

  private pickList: GamePick[] = []
  private pickPending: {[player: string]: GamePick[]} = {} // the pickLists, indexed by player
  private pickPromises: Promise<string[]>[] = [] // one promise per player mentioned in the pickLists

  public createCard(name: string, data = {}, count = 1): string[] {
    console.assert(typeof this.cards[name] === 'undefined', `card '$name' already present in card list`)
    console.assert(typeof this.locations[name] === 'undefined', `card '$name' already present in location list`)
    console.assert(typeof this.cards[name] === 'undefined', `card '$name' already present in player list`)

    let createdCards = []
    if (count === 1) {
      this.cards[name] = data
      createdCards.push(name)
    } else {
      for (let i = 1; i <= count; ++i) {
        let uniqueName = name + '-' + i
        this.cards[uniqueName] = data
        createdCards.push(uniqueName)
      }
    }

    return createdCards
  }


  public createLocation(name: string, data = {}, count = 1): string {
    console.assert(typeof this.cards[name] === 'undefined', `location '$name' already present in card list`)
    console.assert(typeof this.locations[name] === 'undefined', `location '$name' already present in location list`)
    console.assert(typeof this.players[name] === 'undefined', `location '$name' already present in player list`)

    this.locations[name] = data
    return name
  }


  public createPlayer(name: string, data = {}): string {
    console.assert(typeof this.cards[name] === 'undefined', `player '$name' already present in card list`)
    console.assert(typeof this.locations[name] === 'undefined', `player '$name' already present in location list`)
    console.assert(typeof this.players[name] === 'undefined', `player '$name' already present in player list`)

    this.players[name] = data
    return name
  }


  public getPlayers(): string[] {
    return Object.keys(this.players)
  }


  public addCards(cards: string[], location: string) {
    let locationData = this.locations[location]
    console.assert(typeof locationData !== 'undefined', `unable to find location '${location}', must call createLocation() with this location before using addCards()`)
    locationData.cards = cards
  }


  public getCards(location: string): string[] {
    let locationData = this.locations[location]
    console.assert(typeof locationData !== 'undefined', `unable to find location '${location}', must call createLocation() with this location before using getCards()`)

    return locationData.cards
  }


  public getCardCount(location: string): number {
    let locationData = this.locations[location]
    console.assert(typeof locationData !== 'undefined', `unable to find location '${location}', must call createLocation() with this location before using getCards()`)

    return locationData.cards.length
  }


  public getCardData(card: string): any {
    let cardData = this.cards[card]
    console.assert(typeof cardData !== 'undefined', `unable to find card '${card}'`)

    return cardData
  }


  public getLocationData(location: string): any {
    let locationData = this.locations[location]
    console.assert(typeof locationData !== 'undefined', `unable to find location '${location}'`)

    return locationData
  }


  public getPlayerData(player: string): any {
    let playerData = this.players[player]
    console.assert(typeof playerData !== 'undefined', `unable to find player '${player}'`)

    return playerData
  }

  // 'fromIndex' is the starting position to take cards from, 'toIndex' is the starting position to
  // place cards. A negative index is used to take cards from the end, with -1 indicating the last card,
  // -2 the second to last etc. The index is clamped to the maximum number of available cards.
  // Mulitple cards are all inserted at the same index.
  // Only 'count' cards are moved (if possible), if count is negative then all cards are moved.
  // The function returns a list of the cards moved
  public move(from: string, to: string, count: number = 1, fromIndex: number = -1, toIndex: number = -1): string[] {
    let fromLocation = this.locations[from]
    let toLocation = this.locations[to]
    console.assert(typeof fromLocation !== 'undefined', `unable to find from location '${from}'`)
    console.assert(typeof toLocation !== 'undefined', `unable to find to location '${to}'`)

    let fromCards = fromLocation.cards
    let toCards = toLocation.cards

    count = count < 0 ? fromCards.length : Math.min(count, fromCards.length)

    let cardsMoved = []
    for (let k = 0; k < count; ++k) {
      const i = Helper.clamp(fromIndex < 0 ? fromCards.length + fromIndex : fromIndex, 0, fromCards.length - 1)
      const j = Helper.clamp(toIndex < 0 ? toCards.length + toIndex : toIndex, 0, toCards.length - 1)
      let card = fromCards[i]
      fromCards.splice(i, 1) // remove card from 'from'
      toCards.splice(j, 0, card) // add card to 'to'
      cardsMoved.push(card)
    }

    return cardsMoved
  }


  public moveCards(cards: string[], to: string, count: number = -1 /*all*/, toIndex: number = -1): string[] {
    let toLocation = this.locations[to]
    console.assert(typeof toLocation !== 'undefined', `unable to find to location '${to}'`)

    let toCards = toLocation.cards

    count = count < 0 ? cards.length : Math.min(count, cards.length)

    let cardsMoved = []
    for (let k = 0; k < count; ++k) {
      const j = Helper.clamp(toIndex < 0 ? toCards.length + toIndex : toIndex, 0, toCards.length - 1)
      let card = cards[k]
      let fromInfo = this.findCard(card)
      this.locations[fromInfo.location].cards.splice(fromInfo.index, 1) // remove card from its current location
      toCards.splice(j, 0, card) // add card to 'to'
      cardsMoved.push(card)
    }

    return cardsMoved
  }


  public findCard(card: string): {location: string, index: number} {
    console.assert(typeof this.cards[card] !== 'undefined', `unable to find card '${card}'`)
    for (let location in this.locations) {
      let index = this.locations[location].cards.indexOf(card)
      if (index !== -1) {
        return {location, index}
      }
    }
    console.assert(false, `card '${card}' exists, but not is not in any location`)
    return {location: '', index: -1} // card is not in any location
  }


  // returns a number in the range (0,1]
  public random(): number {
    return Math.random() // TODO use a seedable random
  }

  // returns a random number in the range (min,max], if max is not specified then the range is (0,min]
  public randomInt(min: number, max?: number): number {
    if (typeof max === 'undefined') {
      min =  0
      max = min
    }
    return Math.floor(Math.random()*(max - min)) + min // TODO use a seedable random
  }


  // returns a list of k samples from the list (but not exceeding the length of the list)
  public randomSample<T>(list: T[], k: number): T[] {
    let samples = []

    // if (k === 1 && list.length > 0) {
    //   let i = this.randomInt(list.length)
    //   samples.push(list[i])
    // } else if (k < list.length/3) {
    //   // when sampling a small part of the list, then sample by index
    //   let sampledIndices = []
    //   while (samples.length < k) {
    //     let i = this.randomInt(list.length)
    //     if (sampledIndices.indexOf(i) === -1) {
    //       sampledIndices.push(i)
    //       samples.push(list[i])
    //     }
    //   }
    // } else {
      // when sampling a large part of the list, remove samples from a copy
      let listCopy = list.slice()
      while (samples.length < k && listCopy.length > 0) {
        let i = this.randomInt(listCopy.length)
        samples.push(listCopy.splice(i, 1))
      }
    // }

    return samples
  }

  public shuffle(location: string) {
    let locationData = this.locations[location]
    console.assert(typeof locationData !== 'undefined', `unable to find location '${location}'`)

    let cards = locationData.cards
    const n = cards.length
    for (let i = n-1; i > 0; --i) { // Fisher Yates shuffle
      let j = this.randomInt(i + 1)
      let t = cards[i]
      cards[i] = cards[j]
      cards[j] = t
    }
  }


  // TODO make this work for nested calls
  public isAwaitSuccessful(result: any): boolean {
    // TODO reset pickID for AI
    return typeof result !== 'undefined'
  }


  public async pick(player: string, options: string[], count: GameCount = 1, condition: PickConditionFn = () => true): Promise<string[]> {
    return this.pickInternal({type: "pick", player, options, count, condition})
  }


  public async pickCards(player: string, cards: string[], count: GameCount = 1, condition: PickConditionFn = () => true): Promise<string[]> {
    return this.pickInternal({type: "pickCards", player, options: cards, count, condition})
  }


  public async pickLocations(player: string, locations: string[], count: GameCount = 1, condition: PickConditionFn = () => true): Promise<string[]> {
    return this.pickInternal({type: "pickLocations", player, options: locations, count, condition})
  }


  public async pickNothing(): Promise<string[]> {
    return
  }


  public async groupPicks(promises: Promise<any>[]): Promise<any[]> {
    return Promise.all(promises)
  }


  private isResultValid(pick: GamePick, results: string[]): boolean {
    if (!results) {
      return true // undefined is valid
    } else if (Array.isArray(results)) {
      const count = Helper.parseCount(pick.count)
      if (results.length < count[0] || results.length > count[1]) {
        return false // size is invalid
      }

      for (let x of results) {
        if (pick.options.indexOf(x) === -1) {
          return false // a result was not in the original pick options
        }
      }

      return true
    }

    return false
  }


  private pickInternal(pick: GamePick): Promise<string[]> {
    return new Promise<string[]>(resolve => {
      // all picks in this frame go onto this list
      this.pickList.push(pick)

      // this Promise.resolve() will be executed at the end of the frame
      Promise.resolve().then(async () => {
        if (this.pickPromises.length === 0) {
          // the FIRST pick sets up the promises for ALL picks. The pickPending
          // is a map of pickLists by player
          this.pickPending = Helper.makeMap(this.pickList, (pick) => pick.player)

          // build an array of promises in the same order as the pickPending keys
          this.pickPromises = []
          for (let player in this.pickPending) {
            let newPromise = this.players[player].data.pickFn(this, this.pickPending[player])
            this.pickPromises.push(newPromise)
          }
        }

        // ALL picks wait for ALL promises (one per player who has a pending pick) to be complete
        let results = await Promise.all(this.pickPromises)
        let myPlayersIndex = Object.keys(this.pickPending).indexOf(pick.player)
        console.assert(myPlayersIndex !== -1)

        // check my pick against the results for this player. A single result may
        // satisfy multiple picks, or there may be no match (the choice is undefined)
        let choice
        if (this.isResultValid(pick, results[myPlayersIndex])) {
          choice = results[myPlayersIndex]
        }

        resolve(choice) // resolve the initial promise
      })
    })
  }
}


let randomPickFn: PlayerPickFn = (g: Game, pickList: GamePick[]) => {
  return new Promise<string[]>(resolve => {
    // DO NOT use the random number generator from g
    const i = Helper.randomInt(pickList.length)
    const count = Helper.parseCount(pickList[i].count)
    const choice = Helper.randomSample(pickList[i].options, Helper.randomInt(count[0], count[1]))
    resolve(choice)
  })
}


class ThurnAndTaxis extends Game {
  official: string

  public setup(playerPickFns: PlayerPickFn[]) {
    const numPlayers = playerPickFns.length

    for (let i = 3; i <= MAX_CARRIAGE_LEVEL; ++i) {
      let cards = this.createCard("carrriage" + i, {level: i}, 4)
      this.createLocation("x.carriage" + i, {faceUp: true})
      this.addCards(cards, "x.carriage" + i)
    }

    for (let bonusInfo of BONUS_TILES) {
      let cards = []
      for (let value of bonusInfo[1]) {
        let c = this.createCard(bonusInfo[0] + '-' + value, {value})
        cards.push(c)
      }
      let location = this.createLocation("x." + bonusInfo[0], {faceUp: true})
      this.addCards(cards, "x." + bonusInfo[0])
    }

    this.validateAdjacencies()

    let cityCards = []
    let provinces = []
    for (let cityInfo of CITY_TILES) {
      let province = cityInfo[1]
      let cards = this.createCard(cityInfo[0], {province}, cityInfo[2])
      cityCards.push(...cards)
      provinces.push(cityInfo[1])
      this.createLocation('x.' + cityInfo[0], {province, adjacent: cityInfo[3], faceUp: true}) // prefix with x to ensure a unique name

      if (provinces.indexOf(province) === -1) {
        this.createLocation(province) // just for picking provinces
        provinces.push(province)
      }
    }

    this.createLocation("supply", {faceUp: false})
    this.createLocation("discard", {faceUp: true})
    this.createLocation("market", {faceUp: true, maxCount: MAX_FACE_UP})
    this.addCards(cityCards, "supply")

    for (let i = 0; i < numPlayers; ++i) {
      let player = PLAYER_NAMES[i]
      let cards = this.createCard("house" + player, {owner: player, color: PLAYER_COLORS[i]}, 20)
      this.createLocation("houseSupply" + player)
      this.addCards(cards, "houseSupply" + player)
      this.createLocation("bonus" + player, {faceUp: true})
      this.createLocation("hand" + player, {faceUp: false}) // TODO faceUp is a visualization concept, if we ignore multiplayer
      this.createLocation("carriage" + player, {faceUp: true})
      this.createLocation("route" + player, {faceUp: true})
      this.createPlayer(player, {pickFn: playerPickFns[i]})
    }

    this.createLocation("officials")

    for (let official in OFFICIALS) {
      let cards = this.createCard(official) // one card
      this.addCards(cards, "officials")
    }
  }


  private validateAdjacencies() {
    let cityMap = {}
    for (let cityInfo of CITY_TILES) {
      const name = cityInfo[0]
      cityMap[name] = cityInfo[3]
    }

    for (let city in cityMap) {
      for (let adjacentCity of cityMap[city]) {
        console.assert(cityMap[adjacentCity].indexOf(city) === -1, `'${adjacentCity}' does not have '${city}' in it's adjacent list`)
      }
    }
  }


  public async rules() {
    let player = this.getPlayers()[0] // this does imply that the first player will always be the same colour
    let playerChain = new Chain(this.getPlayers())

    this.shuffle("supply")
    this.refillMarket()

    let endGamePlayer
    while (player != endGamePlayer) {
      await this.turn(player)

      if (!endGamePlayer && this.endOfGame(player)) {
        this.move("x.game-end", "bonus" + player, 1)
        endGamePlayer = player
      }

      player = playerChain.next(player)
    }
  }


  private endOfGame(player: string): boolean {
    return this.getPlayerLevel(player) === MAX_CARRIAGE_LEVEL
  }


  private refillMarket() {
    while (this.getCardCount("market") < MAX_FACE_UP) {
      if (this.getCardCount("supply") === 0) {
        this.move("discard", "supply", -1)
        this.shuffle("supply")
      }

      this.move("supply", "market", 1)
    }
  }


  private async turn(player: string) {
    this.official = ""

    let addACardResult
    while (!this.isAwaitSuccessful(addACardResult)) {
      addACardResult = await this.addACard(player)
    }

    let playACardResult
    while (!this.isAwaitSuccessful(playACardResult)) {
      playACardResult = await this.playACard(player)
    }

    await this.scoreRoute(player) // optional, the await return a failed result
  }


  private async addACard(player: string) {
    let administratorPick = this.useAdministrator(player)
    let takeCityPick = this.takeCityCard(player)
    let results = []
    while (!results[1]) { // must take a city
      results = await this.groupPicks([administratorPick, takeCityPick])
    }

    let postmasterPick = this.usePostmaster(player)
    let donePick = this.mustUsePostmaster(player) ? this.pickNothing() : this.pick(player, ["Done"], 1)
    await this.groupPicks([postmasterPick, donePick])
  }


  private mustUsePostmaster(player: string): boolean {
    return this.getCardCount("hand" + player) == 0
  }


  private async useAdministrator(player: string): Promise<boolean> {
    if (this.official === "" && !this.mustUsePostmaster(player)) {
      let result = await this.pickCards(player, ["administrator"], 1)
      if (result) {
        this.move("market", "discard", -1)
        this.refillMarket()
        this.official = "administrator"
        return true
      }
    }
  }


  private async usePostmaster(player: string): Promise<boolean> {
    if (this.official === "") {
      let result = await this.pickCards(player, ["postmaster"], 1)
      if (result) {
        this.official = "postmaster"
        return await this.takeCityCard(player)
      }
    }
  }


  private async usePostalCarrier(player: string): Promise<boolean> {
    if (this.official === "" && !this.mustUsePostmaster(player)) {
      let result = await this.pickCards(player, ["postalcarrier"], 1)
      if (result) {
        let result = await this.playACard(player)
        if (result) {
          this.official = "postalcarrier"
          return true
        }
      }
    }
  }


  // player must have completed a route, and the route must still exist
  private async useCartwright(player: string): Promise<boolean> {
    if (this.official === "" && !this.mustUsePostmaster(player)) {
      let result = await this.pickCards(player, ["cartwright"], 1)
      if (result) {
        this.official = "cartwright"
        return true
      }
    }
  }


  private async takeCityCard(player: string): Promise<boolean> {
    let supplyPick = this.pickLocations(player, ["supply"], 1)
    let marketPick = this.pickCards(player, this.getCards("market"), 1)

    let results = await this.groupPicks([supplyPick, marketPick])
    if (results[0]) {
      this.move("supply", "hand" + player, 1)
      return true
    } else if (results[1]) {
      this.moveCards(results[1], "hand" + player, 1)
      this.refillMarket()
      return true
    }
  }


  private async playACard(player: string): Promise<boolean> {
    let discardPick = this.pick(player, ["DiscardRoute"], 1)
    let cityPick = this.pickCards(player, this.getCards("hand" + player), 1)
    let results
    while (!this.isAwaitSuccessful(results) || !results[1]) { // must place a card on the route
      results = await this.groupPicks([discardPick, cityPick])
      if (results[0]) { // discard
        this.move("route" + player, "discard", -1)
      } else if (results[1]) { // place city
        let cities = results[1]
        let routeCities = this.getCards("route" + player)
        if (routeCities.length === 0) {
          this.moveCards(cities, "route" + player, 1) // should only be one
        } else {
          let city = decodeName(cities[0]) // there is only one
          let canStart = this.areCitiesAdjacent(city, decodeName(routeCities[0]))
          let canEnd = this.areCitiesAdjacent(city, decodeName(routeCities[routeCities.length - 1]))
        }
      }
    }

    return
  }


  private areCitiesAdjacent(cityA: string, cityB: string): boolean {
    let locationDataA = this.getLocationData('x.' + cityA)
    return locationDataA.adjacent.indexOf(cityB)
  }


  private async scoreRoute(player: string): Promise<boolean> {
    let cartwrightPick = this.useCartwright(player)
    let scorePick = this.pick(player, ["ScoreRoute"], 1)
    let donePick = this.pick(player, ["Done"], 1)
    let results = await this.groupPicks([cartwrightPick, scorePick, donePick])

    if (results[0] || results[1]) {
      // Award carriage
      let myLevel = this.getPlayerLevel(player)
      let myRouteLevel = this.getCardCount("route" + player)
      let cartwrightBonus = this.official === "cartwright" ? 2 : 0
      if (myLevel < MAX_CARRIAGE_LEVEL && myLevel + 1 <= myRouteLevel + cartwrightBonus) {
        this.move("x.carriage" + (myLevel + 1), "carriage" + player, 1)
      }

      // Place houses
      let cities = this.getCards("route" + player)
      let provinces = cities.map(city => this.getCardData(city).province)
      let uniqueProvinces = Helper.unique(provinces)
      let numUniqueProvince = uniqueProvinces.length
      let unusedCities = cities.filter(city => !this.hasOwner(city, player))

      let provincePick = this.pickLocations(player, uniqueProvinces, 1)
      let citiesPick = this.pickCards(player, unusedCities, [0,numUniqueProvince], pickedCities => {
        // pick at most one unused city per province from the route list
        let uniquePicks = Helper.unique(pickedCities.map(city => this.getCardData(city).province))
        return uniquePicks.length === pickedCities.length
      })

      let results = await this.groupPicks([provincePick, citiesPick])
      if (results[0]) {
        let chosenProvince = results[0]
        cities.forEach(city => {
          // place a house in each unused city of this province
          if (this.getCardData(city).province === chosenProvince && !this.hasOwner(city, player)) {
            this.move("houseSupply" + player, "x." + city, 1)
          }
        })
      } else if (results[1]) {
        let chosenCities = results[1]
        chosenCities.forEach(city => this.move("houseSupply", city, 1))
      }
    }

    return true
  }


  private getPlayerLevel(player: string): number {
    let playerCarriageCards = this.getCards("carriage" + player)
    let playerLevel = playerCarriageCards.reduce((mx, card) => mx = Math.max(mx, this.getCardData(card).level), 0)
    return playerLevel
  }


  private hasOwner(city: string, player: string): boolean {
    return this.getCards("x." + city).filter(house => this.getCardData(house).owner === player).length > 0
  }
}
