const PLAYER_NAMES = "ABCD";
const PLAYER_COLORS = ["blue", "red", "green", "yellow"];
const MAX_FACE_UP = 6;
const MAX_CARRIAGE_LEVEL = 7;
const CITY_TILES = [
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
];
const BONUS_TILES = [
    ["distance-5", [2, 1]],
    ["distance-6", [3, 2, 1]],
    ["distance-7", [4, 3, 2, 1]],
    ["game-end", [1]],
    ["outside-baiern", [6, 5, 4, 3]],
    ["in-baden", [3, 2, 1]],
    ["in-hohenzollern-wurttemberg", [3, 2, 1]],
    ["in-schweiz-tyrol", [3, 2, 1]],
    ["in-baiern", [5, 4, 3, 2]],
    ["in-bohmem-salzburg", [4, 3, 2]],
];
const OFFICIALS = ["Administrator", "Cartwright", "Postal Carrier", "Postmaster"];
function decodeName(name) {
    let i = name.lastIndexOf('-');
    return (i >= 0) ? name.substring(0, i) : name;
}
class Helper {
    static unique(list) {
        let uniqueList = [];
        for (let x of list) {
            if (uniqueList.indexOf(x) === -1) {
                uniqueList.push(x);
            }
        }
        return uniqueList;
    }
    static clamp(x, min, max) {
        if (x < min) {
            return min;
        }
        else if (max < x) {
            return max;
        }
        else {
            return x;
        }
    }
    static makeMap(list, keyFn) {
        let map = {};
        for (let item of list) {
            const key = keyFn(item);
            if (!map[key]) {
                map[key] = [item];
            }
            else {
                map[key].push(item);
            }
        }
        return map;
    }
    static isEmpty(json) {
        for (let key in json) {
            return false;
        }
        return true;
    }
    static parseCount(count) {
        if (typeof count === "number") {
            return [count, count];
        }
        else if (Array.isArray(count)) {
            if (count.length > 1) {
                return [count[0], count[1]];
            }
            else if (count.length === 1) {
                return [count[0], count[0]];
            }
        }
        else {
            console.assert(false, `invalid count '${count}'`);
        }
    }
    static randomInt(min, max) {
        if (typeof max === 'undefined') {
            min = 0;
            max = min;
        }
        return Math.floor(Math.random() * (max - min)) + min;
    }
    static randomSample(list, k) {
        let samples = [];
        let listCopy = list.slice();
        while (samples.length < k && listCopy.length > 0) {
            let i = this.randomInt(listCopy.length);
            samples.push(listCopy.splice(i, 1));
        }
        return samples;
    }
}
class Chain {
    constructor(vals) {
        this.list = [];
        for (let x of vals) {
            this.add(x);
        }
    }
    next(current) {
        let returnNext = false;
        for (let x of this.list) {
            if (returnNext && x.active) {
                return x.val;
            }
            else if (x.val === current) {
                returnNext = true;
            }
        }
        if (returnNext) {
            for (let x of this.list) {
                if (x.active) {
                    return x.val;
                }
            }
        }
    }
    prev(current) {
        let lastVal;
        let found = false;
        for (let x of this.list) {
            if (x.val === current) {
                if (typeof lastVal !== 'undefined') {
                    return lastVal;
                }
                found = true;
            }
            if (x.active) {
                lastVal = x.val;
            }
        }
        if (found) {
            return lastVal;
        }
    }
    sort(compareFn) {
        this.list.sort((a, b) => {
            return compareFn(a.val, b.val);
        });
    }
    length() {
        let len = 0;
        for (let x of this.list) {
            len = len + (x.active ? 1 : 0);
        }
        return len;
    }
    remove(val) {
        for (let x of this.list) {
            if (x.val === val) {
                x.active = false;
                return;
            }
        }
        console.assert(false, `unable to find '${val}'`);
    }
    add(val) {
        for (let x of this.list) {
            if (x.val === val) {
                x.active = true;
                return;
            }
        }
        this.list.push({ val, active: true });
    }
}
class Game {
    constructor() {
        this.cards = {};
        this.locations = {};
        this.players = {};
        this.pickList = [];
        this.pickPending = {};
        this.pickPromises = [];
    }
    createCard(name, data = {}, count = 1) {
        console.assert(typeof this.cards[name] === 'undefined', `card '$name' already present in card list`);
        console.assert(typeof this.locations[name] === 'undefined', `card '$name' already present in location list`);
        console.assert(typeof this.cards[name] === 'undefined', `card '$name' already present in player list`);
        let createdCards = [];
        if (count === 1) {
            this.cards[name] = data;
            createdCards.push(name);
        }
        else {
            for (let i = 1; i <= count; ++i) {
                let uniqueName = name + '-' + i;
                this.cards[uniqueName] = data;
                createdCards.push(uniqueName);
            }
        }
        return createdCards;
    }
    createLocation(name, data = {}, count = 1) {
        console.assert(typeof this.cards[name] === 'undefined', `location '$name' already present in card list`);
        console.assert(typeof this.locations[name] === 'undefined', `location '$name' already present in location list`);
        console.assert(typeof this.players[name] === 'undefined', `location '$name' already present in player list`);
        this.locations[name] = data;
        return name;
    }
    createPlayer(name, data = {}) {
        console.assert(typeof this.cards[name] === 'undefined', `player '$name' already present in card list`);
        console.assert(typeof this.locations[name] === 'undefined', `player '$name' already present in location list`);
        console.assert(typeof this.players[name] === 'undefined', `player '$name' already present in player list`);
        this.players[name] = data;
        return name;
    }
    getPlayers() {
        return Object.keys(this.players);
    }
    addCards(cards, location) {
        let locationData = this.locations[location];
        console.assert(typeof locationData !== 'undefined', `unable to find location '${location}', must call createLocation() with this location before using addCards()`);
        locationData.cards = cards;
    }
    getCards(location) {
        let locationData = this.locations[location];
        console.assert(typeof locationData !== 'undefined', `unable to find location '${location}', must call createLocation() with this location before using getCards()`);
        return locationData.cards;
    }
    getCardCount(location) {
        let locationData = this.locations[location];
        console.assert(typeof locationData !== 'undefined', `unable to find location '${location}', must call createLocation() with this location before using getCards()`);
        return locationData.cards.length;
    }
    getCardData(card) {
        let cardData = this.cards[card];
        console.assert(typeof cardData !== 'undefined', `unable to find card '${card}'`);
        return cardData;
    }
    getLocationData(location) {
        let locationData = this.locations[location];
        console.assert(typeof locationData !== 'undefined', `unable to find location '${location}'`);
        return locationData;
    }
    getPlayerData(player) {
        let playerData = this.players[player];
        console.assert(typeof playerData !== 'undefined', `unable to find player '${player}'`);
        return playerData;
    }
    move(from, to, count = 1, fromIndex = -1, toIndex = -1) {
        let fromLocation = this.locations[from];
        let toLocation = this.locations[to];
        console.assert(typeof fromLocation !== 'undefined', `unable to find from location '${from}'`);
        console.assert(typeof toLocation !== 'undefined', `unable to find to location '${to}'`);
        let fromCards = fromLocation.cards;
        let toCards = toLocation.cards;
        count = count < 0 ? fromCards.length : Math.min(count, fromCards.length);
        let cardsMoved = [];
        for (let k = 0; k < count; ++k) {
            const i = Helper.clamp(fromIndex < 0 ? fromCards.length + fromIndex : fromIndex, 0, fromCards.length - 1);
            const j = Helper.clamp(toIndex < 0 ? toCards.length + toIndex : toIndex, 0, toCards.length - 1);
            let card = fromCards[i];
            fromCards.splice(i, 1);
            toCards.splice(j, 0, card);
            cardsMoved.push(card);
        }
        return cardsMoved;
    }
    moveCards(cards, to, count = -1, toIndex = -1) {
        let toLocation = this.locations[to];
        console.assert(typeof toLocation !== 'undefined', `unable to find to location '${to}'`);
        let toCards = toLocation.cards;
        count = count < 0 ? cards.length : Math.min(count, cards.length);
        let cardsMoved = [];
        for (let k = 0; k < count; ++k) {
            const j = Helper.clamp(toIndex < 0 ? toCards.length + toIndex : toIndex, 0, toCards.length - 1);
            let card = cards[k];
            let fromInfo = this.findCard(card);
            this.locations[fromInfo.location].cards.splice(fromInfo.index, 1);
            toCards.splice(j, 0, card);
            cardsMoved.push(card);
        }
        return cardsMoved;
    }
    findCard(card) {
        console.assert(typeof this.cards[card] !== 'undefined', `unable to find card '${card}'`);
        for (let location in this.locations) {
            let index = this.locations[location].cards.indexOf(card);
            if (index !== -1) {
                return { location, index };
            }
        }
        console.assert(false, `card '${card}' exists, but not is not in any location`);
        return { location: '', index: -1 };
    }
    random() {
        return Math.random();
    }
    randomInt(min, max) {
        if (typeof max === 'undefined') {
            min = 0;
            max = min;
        }
        return Math.floor(Math.random() * (max - min)) + min;
    }
    randomSample(list, k) {
        let samples = [];
        let listCopy = list.slice();
        while (samples.length < k && listCopy.length > 0) {
            let i = this.randomInt(listCopy.length);
            samples.push(listCopy.splice(i, 1));
        }
        return samples;
    }
    shuffle(location) {
        let locationData = this.locations[location];
        console.assert(typeof locationData !== 'undefined', `unable to find location '${location}'`);
        let cards = locationData.cards;
        const n = cards.length;
        for (let i = n - 1; i > 0; --i) {
            let j = this.randomInt(i + 1);
            let t = cards[i];
            cards[i] = cards[j];
            cards[j] = t;
        }
    }
    isAwaitSuccessful(result) {
        return typeof result !== 'undefined';
    }
    async pick(player, options, count = 1, condition = () => true) {
        return this.pickInternal({ type: "pick", player, options, count, condition });
    }
    async pickCards(player, cards, count = 1, condition = () => true) {
        return this.pickInternal({ type: "pickCards", player, options: cards, count, condition });
    }
    async pickLocations(player, locations, count = 1, condition = () => true) {
        return this.pickInternal({ type: "pickLocations", player, options: locations, count, condition });
    }
    async pickNothing() {
        return;
    }
    async groupPicks(promises) {
        return Promise.all(promises);
    }
    isResultValid(pick, results) {
        if (!results) {
            return true;
        }
        else if (Array.isArray(results)) {
            const count = Helper.parseCount(pick.count);
            if (results.length < count[0] || results.length > count[1]) {
                return false;
            }
            for (let x of results) {
                if (pick.options.indexOf(x) === -1) {
                    return false;
                }
            }
            return true;
        }
        return false;
    }
    pickInternal(pick) {
        return new Promise(resolve => {
            this.pickList.push(pick);
            Promise.resolve().then(async () => {
                if (this.pickPromises.length === 0) {
                    this.pickPending = Helper.makeMap(this.pickList, (pick) => pick.player);
                    this.pickPromises = [];
                    for (let player in this.pickPending) {
                        let newPromise = this.players[player].data.pickFn(this, this.pickPending[player]);
                        this.pickPromises.push(newPromise);
                    }
                }
                let results = await Promise.all(this.pickPromises);
                let myPlayersIndex = Object.keys(this.pickPending).indexOf(pick.player);
                console.assert(myPlayersIndex !== -1);
                let choice;
                if (this.isResultValid(pick, results[myPlayersIndex])) {
                    choice = results[myPlayersIndex];
                }
                resolve(choice);
            });
        });
    }
}
let randomPickFn = (g, pickList) => {
    return new Promise(resolve => {
        const i = Helper.randomInt(pickList.length);
        const count = Helper.parseCount(pickList[i].count);
        const choice = Helper.randomSample(pickList[i].options, Helper.randomInt(count[0], count[1]));
        resolve(choice);
    });
};
class ThurnAndTaxis extends Game {
    setup(playerPickFns) {
        const numPlayers = playerPickFns.length;
        for (let i = 3; i <= MAX_CARRIAGE_LEVEL; ++i) {
            let cards = this.createCard("carrriage" + i, { level: i }, 4);
            this.createLocation("x.carriage" + i, { faceUp: true });
            this.addCards(cards, "x.carriage" + i);
        }
        for (let bonusInfo of BONUS_TILES) {
            let cards = [];
            for (let value of bonusInfo[1]) {
                let c = this.createCard(bonusInfo[0] + '-' + value, { value });
                cards.push(c);
            }
            let location = this.createLocation("x." + bonusInfo[0], { faceUp: true });
            this.addCards(cards, "x." + bonusInfo[0]);
        }
        this.validateAdjacencies();
        let cityCards = [];
        let provinces = [];
        for (let cityInfo of CITY_TILES) {
            let province = cityInfo[1];
            let cards = this.createCard(cityInfo[0], { province }, cityInfo[2]);
            cityCards.push(...cards);
            provinces.push(cityInfo[1]);
            this.createLocation('x.' + cityInfo[0], { province, adjacent: cityInfo[3], faceUp: true });
            if (provinces.indexOf(province) === -1) {
                this.createLocation(province);
                provinces.push(province);
            }
        }
        this.createLocation("supply", { faceUp: false });
        this.createLocation("discard", { faceUp: true });
        this.createLocation("market", { faceUp: true, maxCount: MAX_FACE_UP });
        this.addCards(cityCards, "supply");
        for (let i = 0; i < numPlayers; ++i) {
            let player = PLAYER_NAMES[i];
            let cards = this.createCard("house" + player, { owner: player, color: PLAYER_COLORS[i] }, 20);
            this.createLocation("houseSupply" + player);
            this.addCards(cards, "houseSupply" + player);
            this.createLocation("bonus" + player, { faceUp: true });
            this.createLocation("hand" + player, { faceUp: false });
            this.createLocation("carriage" + player, { faceUp: true });
            this.createLocation("route" + player, { faceUp: true });
            this.createPlayer(player, { pickFn: playerPickFns[i] });
        }
        this.createLocation("officials");
        for (let official in OFFICIALS) {
            let cards = this.createCard(official);
            this.addCards(cards, "officials");
        }
    }
    validateAdjacencies() {
        let cityMap = {};
        for (let cityInfo of CITY_TILES) {
            const name = cityInfo[0];
            cityMap[name] = cityInfo[3];
        }
        for (let city in cityMap) {
            for (let adjacentCity of cityMap[city]) {
                console.assert(cityMap[adjacentCity].indexOf(city) === -1, `'${adjacentCity}' does not have '${city}' in it's adjacent list`);
            }
        }
    }
    async rules() {
        let player = this.getPlayers()[0];
        let playerChain = new Chain(this.getPlayers());
        this.shuffle("supply");
        this.refillMarket();
        let endGamePlayer;
        while (player != endGamePlayer) {
            await this.turn(player);
            if (!endGamePlayer && this.endOfGame(player)) {
                this.move("x.game-end", "bonus" + player, 1);
                endGamePlayer = player;
            }
            player = playerChain.next(player);
        }
    }
    endOfGame(player) {
        return this.getPlayerLevel(player) === MAX_CARRIAGE_LEVEL;
    }
    refillMarket() {
        while (this.getCardCount("market") < MAX_FACE_UP) {
            if (this.getCardCount("supply") === 0) {
                this.move("discard", "supply", -1);
                this.shuffle("supply");
            }
            this.move("supply", "market", 1);
        }
    }
    async turn(player) {
        this.official = "";
        let addACardResult;
        while (!this.isAwaitSuccessful(addACardResult)) {
            addACardResult = await this.addACard(player);
        }
        let playACardResult;
        while (!this.isAwaitSuccessful(playACardResult)) {
            playACardResult = await this.playACard(player);
        }
        await this.scoreRoute(player);
    }
    async addACard(player) {
        let administratorPick = this.useAdministrator(player);
        let takeCityPick = this.takeCityCard(player);
        let results = [];
        while (!results[1]) {
            results = await this.groupPicks([administratorPick, takeCityPick]);
        }
        let postmasterPick = this.usePostmaster(player);
        let donePick = this.mustUsePostmaster(player) ? this.pickNothing() : this.pick(player, ["Done"], 1);
        await this.groupPicks([postmasterPick, donePick]);
    }
    mustUsePostmaster(player) {
        return this.getCardCount("hand" + player) == 0;
    }
    async useAdministrator(player) {
        if (this.official === "" && !this.mustUsePostmaster(player)) {
            let result = await this.pickCards(player, ["administrator"], 1);
            if (result) {
                this.move("market", "discard", -1);
                this.refillMarket();
                this.official = "administrator";
                return true;
            }
        }
    }
    async usePostmaster(player) {
        if (this.official === "") {
            let result = await this.pickCards(player, ["postmaster"], 1);
            if (result) {
                this.official = "postmaster";
                return await this.takeCityCard(player);
            }
        }
    }
    async usePostalCarrier(player) {
        if (this.official === "" && !this.mustUsePostmaster(player)) {
            let result = await this.pickCards(player, ["postalcarrier"], 1);
            if (result) {
                let result = await this.playACard(player);
                if (result) {
                    this.official = "postalcarrier";
                    return true;
                }
            }
        }
    }
    async useCartwright(player) {
        if (this.official === "" && !this.mustUsePostmaster(player)) {
            let result = await this.pickCards(player, ["cartwright"], 1);
            if (result) {
                this.official = "cartwright";
                return true;
            }
        }
    }
    async takeCityCard(player) {
        let supplyPick = this.pickLocations(player, ["supply"], 1);
        let marketPick = this.pickCards(player, this.getCards("market"), 1);
        let results = await this.groupPicks([supplyPick, marketPick]);
        if (results[0]) {
            this.move("supply", "hand" + player, 1);
            return true;
        }
        else if (results[1]) {
            this.moveCards(results[1], "hand" + player, 1);
            this.refillMarket();
            return true;
        }
    }
    async playACard(player) {
        let discardPick = this.pick(player, ["DiscardRoute"], 1);
        let cityPick = this.pickCards(player, this.getCards("hand" + player), 1);
        let results;
        while (!this.isAwaitSuccessful(results) || !results[1]) {
            results = await this.groupPicks([discardPick, cityPick]);
            if (results[0]) {
                this.move("route" + player, "discard", -1);
            }
            else if (results[1]) {
                let cities = results[1];
                let routeCities = this.getCards("route" + player);
                if (routeCities.length === 0) {
                    this.moveCards(cities, "route" + player, 1);
                }
                else {
                    let city = decodeName(cities[0]);
                    let canStart = this.areCitiesAdjacent(city, decodeName(routeCities[0]));
                    let canEnd = this.areCitiesAdjacent(city, decodeName(routeCities[routeCities.length - 1]));
                }
            }
        }
        return;
    }
    areCitiesAdjacent(cityA, cityB) {
        let locationDataA = this.getLocationData('x.' + cityA);
        return locationDataA.adjacent.indexOf(cityB);
    }
    async scoreRoute(player) {
        let cartwrightPick = this.useCartwright(player);
        let scorePick = this.pick(player, ["ScoreRoute"], 1);
        let donePick = this.pick(player, ["Done"], 1);
        let results = await this.groupPicks([cartwrightPick, scorePick, donePick]);
        if (results[0] || results[1]) {
            let myLevel = this.getPlayerLevel(player);
            let myRouteLevel = this.getCardCount("route" + player);
            let cartwrightBonus = this.official === "cartwright" ? 2 : 0;
            if (myLevel < MAX_CARRIAGE_LEVEL && myLevel + 1 <= myRouteLevel + cartwrightBonus) {
                this.move("x.carriage" + (myLevel + 1), "carriage" + player, 1);
            }
            let cities = this.getCards("route" + player);
            let provinces = cities.map(city => this.getCardData(city).province);
            let uniqueProvinces = Helper.unique(provinces);
            let numUniqueProvince = uniqueProvinces.length;
            let unusedCities = cities.filter(city => !this.hasOwner(city, player));
            let provincePick = this.pickLocations(player, uniqueProvinces, 1);
            let citiesPick = this.pickCards(player, unusedCities, [0, numUniqueProvince], pickedCities => {
                let uniquePicks = Helper.unique(pickedCities.map(city => this.getCardData(city).province));
                return uniquePicks.length === pickedCities.length;
            });
            let results = await this.groupPicks([provincePick, citiesPick]);
            if (results[0]) {
                let chosenProvince = results[0];
                cities.forEach(city => {
                    if (this.getCardData(city).province === chosenProvince && !this.hasOwner(city, player)) {
                        this.move("houseSupply" + player, "x." + city, 1);
                    }
                });
            }
            else if (results[1]) {
                let chosenCities = results[1];
                chosenCities.forEach(city => this.move("houseSupply", city, 1));
            }
        }
        return true;
    }
    getPlayerLevel(player) {
        let playerCarriageCards = this.getCards("carriage" + player);
        let playerLevel = playerCarriageCards.reduce((mx, card) => mx = Math.max(mx, this.getCardData(card).level), 0);
        return playerLevel;
    }
    hasOwner(city, player) {
        return this.getCards("x." + city).filter(house => this.getCardData(house).owner === player).length > 0;
    }
}
