export class DataDiff {
  compare(obj1: any, obj2: any): any {
    const changes: any = {}

    for (const key in obj1) {
      if (obj1[key] !== obj2[key]) {
        changes[key] = {
          old: obj1[key],
          new: obj2[key]
        }
      }
    }

    for (const key in obj2) {
      if (!(key in obj1)) {
        changes[key] = {
          old: undefined,
          new: obj2[key]
        }
      }
    }

    return changes
  }

  hasChanges(obj1: any, obj2: any): boolean {
    const changes = this.compare(obj1, obj2)
    return Object.keys(changes).length > 0
  }

  patch(original: any, changes: any): any {
    const result = { ...original }

    for (const key in changes) {
      result[key] = changes[key].new
    }

    return result
  }
}
