export default class Queue<T> {
    _arr: Array<T>
    constructor() {
        this._arr = [];
    }
    push(item: T) {
        this._arr.push(item);
    }
    pop(): T | undefined {
        return this._arr.shift();
    }
    empty(): boolean {
        return this._arr.length === 0
    }
    front(): T | undefined {
        return this._arr[0]
    }
    array(): Array<T> {
        return this._arr
    }
    length(): number {
        return this._arr.length
    }
  }