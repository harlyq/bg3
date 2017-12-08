// a chain is a list of unique items. next() will return the next
// item in the list even if the current item , looping around to the first
export default class Chain<T> {
  private list: {val: T, active: boolean}[] = []


  constructor(vals: T[] = []) {
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


  public toArray() {
    let arr = []
    for (let x of this.list) {
      if (x.active) {
        arr.push(x.val)
      }
    }
    return arr
  }
}
