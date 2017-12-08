import Game from './game'
import Helper from './helper'
import * as m from 'mithril'

interface GameViewOptions {

}


export default class GameView {
  private locations: {[location: string]: string[]} = {} // map of locationViews by location, note one location may have several locationViews
  private locationViews: {[locationView: string]: any} = {} // map of locationViewInfo by locationView
  private cardViews: {[cardView: string]: any} = {}
  private playerViews: {[playerView: string]: any} = {}

  private boundsCache: {[filename: string]: [number,number,number,number]} = {}
  private fileLoader: {[filename: string]: any} = {}
  private tempList: {[url: string]: any[]} = {}

  options: GameViewOptions = {}


  constructor(options: GameViewOptions = {}) {
    this.options = Object.assign({}, options)
  }


  private patchNumberSign(data: any, postfix: string) {
    for (let key in data) {
      let value = data[key]
      if (typeof value === 'string' && value[value.length - 1] === '#') {
        data[key] = value + postfix
      }
    }
  }


  public createSimpleCardView(card: string, data: any = {}, count = 1) {
    this.patchNumberSign(data, card)
    this.createCardView(card, card, data, count)
  }


  public createCardView(cardView: string, card: string, data: any = {}, count = 1) {
    console.assert(!this.cardViews[cardView], `the cardView '${cardView}' already exists`)
    console.assert(!this.playerViews[cardView], `the cardView '${cardView}' is already a playerView`)
    console.assert(!this.locationViews[cardView], `the cardView '${cardView}' is already a locationView`)

    if (count > 1) {
      for (let i = 1; i < count; ++i) {
        const longCardView = cardView + "-" + i
        const longCard = card + "-" + i
        this.cardViews[longCardView] = {card: longCard, data}
      }
    } else if (count === 1) {
      this.cardViews[cardView] = {card, data}
    }
  }


  public createSimpleLocationView(location: string, data: any = {}) {
    this.patchNumberSign(data, location)
    this.createLocationView(location, location, data)
  }


  public createLocationView(locationView: string, location: string, data: any = {}) {
    console.assert(!this.cardViews[locationView], `the cardView '${locationView}' is already a cardView`)
    console.assert(!this.playerViews[locationView], `the cardView '${locationView}' is already a playerView`)
    console.assert(!this.locationViews[locationView], `the cardView '${locationView}' already exists`)

    let locationData = {location, data}
    this.locationViews[locationView] = locationData
    if (!this.locations[location]) {
      this.locations[location] = [locationView]
    } else {
      this.locations[location].push(locationView)
    }
  }


  public createSimplePlayerView(player: string, data: any = {}) {
    this.patchNumberSign(data, player)
    this.createPlayerView(player, player, data)
  }


  public createPlayerView(playerView: string, player: string, data: any = {}) {
    console.assert(!this.cardViews[playerView], `the playerView '${playerView}' is already a cardView`)
    console.assert(!this.playerViews[playerView], `the playerView '${playerView}' already exists`)
    console.assert(!this.locationViews[playerView], `the playerView '${playerView}' is already a locationView`)

    this.playerViews[playerView] = {player, data}
  }


  private getBoundsFromFile(url: string): [number, number, number, number] {
    if (this.boundsCache[url]) {
      return this.boundsCache[url]
    } else if (!this.fileLoader[url]) {
      const urlInfo = Helper.parseUrl(url)
      const filename = urlInfo.filename
      if (urlInfo.ext === 'svg' && urlInfo.id && filename) {
        this.tempList[filename] = this.tempList[filename] || []
        this.tempList[filename].push(urlInfo)
        this.fileLoader[url] = fetch(filename).then(response => response.text()).then(text => {
          let div = document.createElement('div')
          div.innerHTML = text
          document.appendChild(div)
          this.tempList[filename].forEach(urlInfo => {
            const svgElem = div.querySelector("#" + urlInfo.id) as SVGGraphicsElement
            console.assert(typeof svgElem !== 'undefined', `unable to find element '${urlInfo.id}' in '${filename}' for '${url}'`)
            const bbox = svgElem.getBBox()
            this.boundsCache[url] = [bbox.x, bbox.y, bbox.x + bbox.width, bbox.y + bbox.height]
          })
          document.removeChild(div)
          delete this.tempList[filename]
          delete this.fileLoader[url]
        })
      } else {
        console.assert(false, `cannot compute bounds from ${url}`)
        this.boundsCache[url] = [0,0,0,0]
      }
    }
  }


  // TODO what if a location is on a grid?
  private getCardXYZ(locationView: string, index: number, count: number): {x: number, y: number, z: number} {
    const viewInfo = this.locationViews[locationView]
    console.assert(viewInfo, `unable to find locationView '${locationView}'`)
    let x = 0
    let y = 0
    let z = 0

    switch (viewInfo.data.xAlign) {
      case "center":
      default:
        x = (viewInfo.cachedBounds[0] + viewInfo.cachedBounds[2])*0.5
        y = (viewInfo.cachedBounds[1] + viewInfo.cachedBounds[3])*0.5
        z = index
    }
    return {x,y,z}
  }


  private getCardTag(cardView: string): string {
    return cardView + '.card'
  }


  private getCardAttributes(cardView: string, locationView: string, index: number, count: number): any {
    let cardViewInfo = this.cardViews[cardView]
    console.assert(cardViewInfo, `unknown cardView ${cardView}`)
    let pos = this.getCardXYZ(locationView, index, count)

    // transform has better performance than top/left when moving the object around
    return { style: {width: cardViewInfo.data.width + 'px', height: cardViewInfo.data.height + 'px'}, transform: `translate(${pos.x},${pos.y})`, zIndex: pos.z }
  }


  private getCardChildren(cardView: string): any {
    let viewInfo = this.cardViews[cardView]
    console.assert(viewInfo, `unknown cardView '${cardView}'`)

    if (viewInfo.data.front) {
      return this.renderImage(viewInfo.data.front)
    }
  }


  private getLocationTag(locationView: string): string {
    return locationView + '.location'
  }


  private getLocationAttributes(locationView: string): any {
    console.assert(this.locationViews[locationView], `unknown locationView '${locationView}'`)
    const viewInfo = this.locationViews[locationView]

    if (typeof viewInfo.data.bounds === 'string') {
      viewInfo.cachedBounds = this.getBoundsFromFile(viewInfo.data.bounds)
    } else if (Array.isArray(viewInfo.data.bounds)) {
      viewInfo.cachedBounds = viewInfo.data.bounds
    } else {
      viewInfo.cachedBounds = [0,0,0,0]
    }

    const cachedBounds = viewInfo.cachedBounds
    let left = 0
    let top = 0
    let right = 0
    let bottom = 0

    if (cachedBounds) {
      left = cachedBounds[0]
      top = cachedBounds[1]
      right = cachedBounds[2]
      bottom = cachedBounds[3]
    }

    return {left, top, right, bottom}
  }


  private getLocationChildren(locationView: string): any {
    console.assert(this.locationViews[locationView], `unknown locationView '${locationView}'`)
    let viewInfo = this.locationViews[locationView]
    if (viewInfo.data.image) {
      return this.renderImage(viewInfo.data.image)
    }
  }


  private getImageType(url: string): string {
    let hashIndex = url.indexOf("#")
    let filename = hashIndex > 0 ? url.substring(0,hashIndex) : url
    let extensionIndex = filename.lastIndexOf(".")
    let extension = extensionIndex > 0 ? filename.substring(extensionIndex + 1) : ""
    if (hashIndex === -1) {
      return "filename"
    }
    return ""
  }


  private renderImage(url: string) {
    let urlInfo = Helper.parseUrl(url)
    if (urlInfo.ext === 'svg') {
      return m("svg", {}, m("use", {href: url}))
    } else {
      return m("img", {src: url})
    }
  }


  // all location and card vnodes and generated in a flat list to avoid unnecessary
  // rebuilding.  the zIndex property is used to ensure correct draw order
  public render(game: Game) {
    let vnodes = []

    // render each location
    for (let locationView in this.locationViews) {
      const locationViewInfo = this.locationViews[locationView]
      const location = locationViewInfo.location
      vnodes.push( m(this.getLocationTag(locationView), this.getLocationAttributes(locationView), this.getLocationChildren(locationView)) )
    }

    // render each card, note one card may appear at mupltiple locations
    // TODO how to render different appearences for cars at different locations, maybe we can have skins? These could be used for
    // 'selected' cards as well. We may want to restrict 'selected' to certain views e.g. the player can select cards in their main
    // view, but don't show their selections in the summary views (even though the summary view is also a list of cards)
    for (let cardView in this.cardViews) {
      let cardViewInfo = this.cardViews[cardView]
      let location = game.findCard(cardViewInfo.card)
      if (location) {
        const locationCards = game.getCards(location)
        const n = locationCards.length
        const i = locationCards.indexOf(cardViewInfo.card)

        for (let locationView of this.locations[location]) {
          vnodes.push( m(this.getCardTag(cardView), this.getCardAttributes(cardView, locationView, i, n), this.getCardChildren(cardView)) )
        }
      }
    }

    return vnodes
  }
}
