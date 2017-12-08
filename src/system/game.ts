import Helper from "./helper"

export type GameCount = number | [number, number] // value (-1 for all) | range [min, max] inclusive
export type PickConditionFn = (choice: string[]) => boolean // return false if the choice is not valid
export type GamePick = { type: string, player: string, options: string[], count: GameCount, condition: PickConditionFn, rule: string }
export type PlayerPickFn = (g: Game, picks: GamePick[]) => Promise<string[]>

interface CardInfo {
  location?: string // this MUST be in sync with LocationInfo.cards if the card is at a location
  data: any
}

interface LocationInfo {
  cards: string[] // this MUST be in sync with CardInfo.location
  data: any
}

interface PlayerInfo {
  pickFn: PlayerPickFn
  data: any
}

export default class Game {
  cards: {[name: string]: CardInfo} = {}
  locations: {[name: string]: LocationInfo} = {}
  players: {[name: string]: PlayerInfo} = {}

  private pickList: GamePick[] = []
  private pickPending: {[player: string]: GamePick[]} = {} // the pickLists, indexed by player
  private pickPromises: Promise<string[]>[] = [] // one promise per player mentioned in the pickLists

  public createCard(name: string, data = {}, count = 1): string[] {
    console.assert(typeof this.cards[name] === 'undefined', `card '${name}' already present in card list`)
    console.assert(typeof this.locations[name] === 'undefined', `card '${name}' already present in location list`)
    console.assert(typeof this.cards[name] === 'undefined', `card '${name}' already present in player list`)

    let createdCards = []
    if (count === 1) {
      this.cards[name] = {data}
      createdCards.push(name)
    } else {
      for (let i = 1; i <= count; ++i) {
        let uniqueName = name + '-' + i
        this.cards[uniqueName] = {data}
        createdCards.push(uniqueName)
      }
    }

    return createdCards
  }


  public createLocation(name: string, data = {}, count = 1): string {
    console.assert(typeof this.cards[name] === 'undefined', `location '${name}' already present in card list`)
    console.assert(typeof this.locations[name] === 'undefined', `location '${name}' already present in location list`)
    console.assert(typeof this.players[name] === 'undefined', `location '${name}' already present in player list`)

    this.locations[name] = {cards:[], data}
    return name
  }


  public createPlayer(name: string, pickFn?: PlayerPickFn, data = {}): string {
    console.assert(typeof this.cards[name] === 'undefined', `player '${name}' already present in card list`)
    console.assert(typeof this.locations[name] === 'undefined', `player '${name}' already present in location list`)
    console.assert(typeof this.players[name] === 'undefined', `player '${name}' already present in player list`)

    this.players[name] = {pickFn, data}
    return name
  }


  public getPlayers(): string[] {
    return Object.keys(this.players)
  }


  // add new cards to a location, asserts if a card is already in a different location
  public addCards(cards: string[], location: string) {
    let locationInfo = this.locations[location]
    console.assert(typeof locationInfo !== 'undefined', `unable to find location '${location}', must call createLocation() with this location before using addCards()`)
    console.assert(Helper.unique(cards).length === cards.length, `duplicate cards listed in '${cards}'`)
    for (let c of cards) {
      let cardData = this.cards[c]
      console.assert(!cardData.location, `card ${c} is already at location ${cardData.location}`)
      cardData.location = location
    }
    locationInfo.cards.push(...cards)
  }


  public getCards(location: string): string[] {
    let locationInfo = this.locations[location]
    console.assert(typeof locationInfo !== 'undefined', `unable to find location '${location}', must call createLocation() with this location before using getCards()`)

    return locationInfo.cards // TODO use slice?
  }


  // public getCardIndex(card: string, location?: string): number {
  //   if (typeof location === 'undefined') {
  //     return this.findCard(card).index
  //   } else {
  //     return this.getCards(location).indexOf(card)
  //   }
  // }

  public getCardCount(location: string): number {
    let locationInfo = this.locations[location]
    console.assert(typeof locationInfo !== 'undefined', `unable to find location '${location}', must call createLocation() with this location before using getCards()`)

    return locationInfo.cards.length
  }


  public getCardData(card: string): any {
    let cardInfo = this.cards[card]
    console.assert(typeof cardInfo !== 'undefined', `unable to find card '${card}'`)

    return cardInfo.data
  }


  public getLocationData(location: string): any {
    let locationInfo = this.locations[location]
    console.assert(typeof locationInfo !== 'undefined', `unable to find location '${location}'`)

    return locationInfo.data
  }


  public getPlayerData(player: string): any {
    let playerInfo = this.players[player]
    console.assert(typeof playerInfo !== 'undefined', `unable to find player '${player}'`)

    return playerInfo.data
  }

  // 'fromIndex' is the starting position to take cards from, and we insert cards before the
  // 'toIndex'. A negative index is used to take cards from the end (-1 for the last card), or
  // insert after the end cards (-1 for the last card)
  // The index is clamped to the maximum number of available cards.
  // Mulitple cards are all inserted at the same index.
  // Only 'count' cards are moved (if possible), if count is negative then all cards are moved.
  // The function returns a list of the cards moved
  public move(from: string, to: string, count: number = 1, fromIndex: number = -1 /*end*/, toIndex: number = -1 /*end*/): string[] {
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
      const j = Helper.clamp(toIndex < 0 ? toCards.length + toIndex + 1 : toIndex, 0, toCards.length)
      let card = fromCards[i]
      fromCards.splice(i, 1) // remove card from 'from'
      toCards.splice(j, 0, card) // add card to 'to'
      console.assert(this.cards[card].location === from, `expected card '${card}' to be at '${from}' but internally it is '${this.cards[card].location}'`)
      this.cards[card].location = to

      cardsMoved.push(card)
    }

    return cardsMoved
  }


  public moveCards(cards: string[], to: string, count: number = -1 /*all*/, toIndex: number = -1 /*end*/): string[] {
    let toLocation = this.locations[to]
    console.assert(typeof toLocation !== 'undefined', `unable to find to location '${to}'`)

    let toCards = toLocation.cards

    count = count < 0 ? cards.length : Math.min(count, cards.length)

    let cardsMoved = []
    for (let k = 0; k < count; ++k) {
      const j = Helper.clamp(toIndex < 0 ? toCards.length + toIndex + 1 : toIndex, 0, toCards.length)
      let card = cards[k]
      const from = this.cards[card].location
      const fromCards = this.locations[from].cards
      const fromIndex = fromCards.indexOf(card)
      console.assert(fromIndex !== -1, `cannot find card '${card}' at '${from}'`)
      fromCards.splice(fromIndex, 1) // remove card from its current location
      toCards.splice(j, 0, card) // add card to 'to'
      this.cards[card].location = to

      cardsMoved.push(card)
    }

    return cardsMoved
  }


  public findCard(card: string): string {
    const cardData = this.cards[card]
    console.assert(typeof cardData !== 'undefined', `unable to find card '${card}'`)
    return cardData.location
  }


  // returns a number in the range (0,1]
  public random(): number {
    return Math.random() // TODO use a seedable random
  }

  // returns a random number in the range (min,max], if max is not specified then the range is (0,min]
  public randomInt(min: number, max?: number): number {
    if (typeof max === 'undefined') {
      max = min
      min = 0
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
        samples.push(listCopy.splice(i, 1)[0])
      }
    // }

    return samples
  }


  public shuffle(location: string) {
    let locationInfo = this.locations[location]
    console.assert(typeof locationInfo !== 'undefined', `unable to find location '${location}'`)

    let cards = locationInfo.cards
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


  public async pick(player: string, options: string[], count: GameCount = 1, condition: PickConditionFn = () => true, rule = ""): Promise<string[]> {
    return this.pickInternal({type: "pick", player, options, count, condition, rule})
  }


  public async pickCards(player: string, cards: string[], count: GameCount = 1, condition: PickConditionFn = () => true, rule = ""): Promise<string[]> {
    return this.pickInternal({type: "pickCards", player, options: cards, count, condition, rule})
  }


  public async pickLocations(player: string, locations: string[], count: GameCount = 1, condition: PickConditionFn = () => true, rule = ""): Promise<string[]> {
    return this.pickInternal({type: "pickLocations", player, options: locations, count, condition, rule})
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
            let newPromise = this.players[player].pickFn(this, this.pickPending[player])
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

        // clean the pick lists
        const pickIndex = this.pickList.indexOf(pick)
        console.assert(pickIndex !== -1)

        this.pickList.splice(pickIndex, 1)
        if (this.pickList.length === 0) {
          this.pickPending = {}
          this.pickPromises = []
        }

        resolve(choice) // resolve the initial promise
      })
    })
  }
}
