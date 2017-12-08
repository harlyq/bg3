import Helper from "../system/helper"
import Chain from "../system/chain"
import Game from "../system/game"
import GameView from '../system/gameview'
import {PlayerPickFn, GamePick} from "../system/game"
import * as m from "mithril"

const PLAYER_NAMES = "ABCD"
const PLAYER_COLORS = ["blue", "red", "green", "yellow"] // maybe color should be all css????
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
      this.createLocation("x-carriage" + i)
      this.addCards(cards, "x-carriage" + i)
    }

    for (let bonusInfo of BONUS_TILES) {
      let cards = []
      for (let value of bonusInfo[1]) {
        const longName = bonusInfo[0] + '-' + value
        let c = this.createCard(longName, {value})
        cards.push(c)
      }
      let location = this.createLocation("x-" + bonusInfo[0])
      this.addCards(cards, "x-" + bonusInfo[0])
    }

    this.validateAdjacencies()

    let cityCards = []
    let provinces = []
    for (let cityInfo of CITY_TILES) {
      let province = cityInfo[1]
      let cards = this.createCard(cityInfo[0], {province}, cityInfo[2])
      cityCards.push(...cards)
      provinces.push(cityInfo[1])

      // all images are aligned to the map, pass the player an attribute so css can define a color???
      this.createLocation('x-' + cityInfo[0], {province, adjacent: cityInfo[3]})

      if (provinces.indexOf(province) === -1) {
        this.createLocation(province) // just for picking provinces
        provinces.push(province)
      }
    }

    // the problem with view data on the locations, is that we may have several view using the information for one location e.g. the current player's
    // values and a summary

    this.createLocation("supply")
    this.createLocation("discard")
    this.createLocation("market", {maxCount: MAX_FACE_UP}) // grids are aligned to their maximum extends and evenly spaced
    this.addCards(cityCards, "supply")

    for (let i = 0; i < numPlayers; ++i) {
      let player = PLAYER_NAMES[i]
      let cards = this.createCard("house" + player, {owner: player}, 20) // color is exposed to css as data-color, maybe we could have an html only layout???
      this.createLocation("houseSupply" + player)
      this.addCards(cards, "houseSupply" + player)
      this.createLocation("bonus" + player)
      this.createLocation("hand" + player)
      this.createLocation("carriage" + player)
      this.createLocation("route" + player)
      this.createPlayer(player, playerPickFns[i])
    }

    this.createLocation("officials")

    for (let official in OFFICIALS) {
      let cards = this.createCard(official)
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
        this.move("x-game-end", "bonus" + player, 1)
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
    let locationDataA = this.getLocationData('x-' + cityA)
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
        this.move("x-carriage" + (myLevel + 1), "carriage" + player, 1)
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
            this.move("houseSupply" + player, "x-" + city, 1)
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
    return this.getCards("x-" + city).filter(house => this.getCardData(house).owner === player).length > 0
  }
}


// There is a lot of repetition with the structures from ThurnAndTaxis
// Location.image and card.front/back will use the same technology, if #xx is a view
class ThurnAndTaxisView extends GameView {
  public setup(numPlayers: number) {

    // images a placed down in order of creation, so later locations are placed on top of earlier ones
    this.createSimpleLocationView("map", {bounds: "thurnandtaxis.svg#", image: "thurnandtaxis-board.png"})

    for (let i = 3; i <= MAX_CARRIAGE_LEVEL; ++i) {
      let cards = this.createSimpleCardView("carrriage" + i, {width: 64, height: 52, front: "thurnandtaxis-cards#" + i}, 4)
      this.createSimpleLocationView("x-carriage" + i, {bounds: "thurnandtaxis.svg#", faceUp: "all"})
    }

    for (let bonusInfo of BONUS_TILES) {
      let cards = []
      for (let value of bonusInfo[1]) {
        const longName = bonusInfo[0] + '-' + value
        this.createSimpleCardView(longName, {width: 32, height: 32, front: "thurnandtaxis-cards.json#"})
      }
      this.createSimpleLocationView("x-" + bonusInfo[0], {bounds: "thurnandtaxis.svg#", faceUp: "all"})
    }

    let cityCards = []
    let provinces = []
    for (let cityInfo of CITY_TILES) {
      let province = cityInfo[1]
      this.createSimpleCardView(cityInfo[0], {width: 52, height: 64, front: "thurnandtaxis-cards.json#", back: "thurnandtaxis-cards.json#cityBack"}, cityInfo[2])

      // all images are aligned to the map, pass the player an attribute so css can define a color???
      this.createSimpleLocationView('x-' + cityInfo[0], {
        faceUp: "all",
        bounds: "thurnandtaxis.svg#map",
        image: "thurnandtaxis.svg#", // this can just be a border which we color with css
        xAlign: "grid2",
        yAlign: "grid2"}) // prefix with x to ensure a unique name

      if (provinces.indexOf(province) === -1) {
        this.createSimpleLocationView(province, {bounds: "thurnandtaxis.svg#"}) // just for picking provinces
        provinces.push(province)
      }
    }

    // the problem with view data on the locations, is that we may have several view using the information for one location e.g. the current player's
    // values and a summary

    this.createSimpleLocationView("supply", {faceUp: "none", bounds: "thurnandtaxis.svg#"})
    this.createSimpleLocationView("discard", {faceUp: "all", bounds: "thurnandtaxis.svg#"})
    this.createSimpleLocationView("market", {faceUp: "all", maxCount: MAX_FACE_UP, bounds: "thurnandtaxis.svg#", xAlign: "grid3", yAlign: "grid2"}) // grids are aligned to their maximum extends and evenly spaced

    for (let i = 0; i < numPlayers; ++i) {
      let player = PLAYER_NAMES[i]
      let cards = this.createSimpleCardView("house" + player, {width: 32, height: 32, owner: player, color: PLAYER_COLORS[i], front: "thurnandtaxis-cards.json#house"}, 20) // color is exposed to css as data-color, maybe we could have an html only layout???
      this.createSimpleLocationView("houseSupply" + player, {faceUp: "all", bounds: "thurnandtaxis.svg#", showCount: "all"})
      this.createSimpleLocationView("bonus" + player, {faceUp: "all", bounds: "thurnandtaxis.svg#", yAlign: "fromTop"})
      this.createSimpleLocationView("hand" + player, {faceUp: player, bounds: "thurnandtaxis.svg#", xAlign: "fromLeft"})
      this.createSimpleLocationView("carriage" + player, {faceUp: "all", bounds: "thurnandtaxis.svg#", xAlign: "fromLeft", order: "topToBottom"}) // topToBottom so the right is visible
      this.createSimpleLocationView("route" + player, {faceUp: "all", bounds: "thurnandtaxis.svg#", yAlign: "fromCenter"}) // cards will be centered about the center
      this.createSimplePlayerView(player, {}) // TODO what should this be?
    }

    this.createSimpleLocationView("officials", {faceUp: "all", bounds: "thurnandtaxis.svg#", xAlign: "grid4"}) // gridded cards will keep their position when cards are added or removed

    for (let official in OFFICIALS) {
      // TODO should we use the image's width and height???
      let cards = this.createSimpleCardView(official, {width: 64, height: 64, front: "thurnandtaxis-cards.json#", frontSelected: "thurnandtaxis-cards.json#" + official + "-selected"}) // one card, back is the same as front by default
    }
  }
}
