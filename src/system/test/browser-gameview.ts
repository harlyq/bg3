import Game from '../game'
import GameView from '../gameview'
import * as m from 'mithril'

let g = new Game()
let v = new GameView()

for (let player of ['A']) {
  g.createPlayer(player)
  v.createSimplePlayerView(player)
}
for (let location of ['x-A','x-B','x-C']) {
  g.createLocation(location)
  v.createSimpleLocationView(location)
}
for (let card of ['a','b','c','d','e']) {
  g.createCard(card)
  v.createSimpleCardView(card, {height: 50, width: 40})
}
g.addCards(['a','b','c'],'x-A')
g.addCards(['d','e'],'x-B')

m.render(document.querySelector("#content"), v.render(g))
