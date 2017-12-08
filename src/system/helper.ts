export default class Helper {
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
  public static parseCount(count: number | number[]): [number, number] {
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


  public static parseUrl(url: string): {filename: string, ext: string, id: string} {
    const hashIndex = url.indexOf("#")
    const filename = hashIndex >= 0 ? url.substring(0,hashIndex) : url
    const id = hashIndex >= 0 ? url.substring(hashIndex + 1) : ""
    const extIndex = filename.lastIndexOf(".")
    const ext = extIndex >= 0 ? filename.substring(extIndex + 1) : ""

    return {filename, ext, id}
  }


  // returns a random number in the range (min,max], if max is not specified then the range is (0,min]
  public static randomInt(min: number, max?: number): number {
    if (typeof max === 'undefined') {
      max = min
      min = 0
    }
    return Math.floor(Math.random()*(max - min)) + min // TODO use a seedable random
  }


  // returns a list of k samples from the list (but not exceeding the length of the list)
  public static randomSample<T>(list: T[], k: number): T[] {
    let samples = []

    let listCopy = list.slice()
    while (samples.length < k && listCopy.length > 0) {
      let i = this.randomInt(listCopy.length)
      samples.push(listCopy.splice(i, 1)[0])
    }

    return samples
  }
}
