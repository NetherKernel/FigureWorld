import mongoose from "mongoose";

// Global persistence for Next.js hot reload / dev
declare global {
  // eslint-disable-next-line no-var
  var __memoryDbCollections: Map<string, Map<string, Record<string, any>>> | undefined;
}

if (!global.__memoryDbCollections) {
  global.__memoryDbCollections = new Map<string, Map<string, Record<string, any>>>();
}

export function getCollectionStore(name: string): Map<string, Record<string, any>> {
  if (!global.__memoryDbCollections!.has(name)) {
    global.__memoryDbCollections!.set(name, new Map<string, Record<string, any>>());
  }
  return global.__memoryDbCollections!.get(name)!;
}

function matchFilter(doc: Record<string, any>, filter: Record<string, any>): boolean {
  for (const key of Object.keys(filter)) {
    const val = filter[key];

    // Handle _id matching
    if (key === "_id") {
      const docId = doc._id?.toString();
      const targetId = val?.toString();
      if (docId !== targetId) return false;
      continue;
    }

    // Handle complex comparison operators: $in, $gt, $gte, $lt, $lte, $ne
    if (val && typeof val === "object" && !(val instanceof Date) && !(val instanceof RegExp)) {
      const docVal = doc[key];

      if ("$in" in val && Array.isArray(val.$in)) {
        const docValStr = docVal?._id?.toString?.() || docVal?.toString?.() || String(docVal);
        const inList = val.$in.map((item: any) => item?._id?.toString?.() || item?.toString?.() || String(item));
        if (!inList.includes(docValStr)) return false;
      }

      if ("$gt" in val) {
        const targetVal = val.$gt;
        const dVal = docVal instanceof Date ? docVal.getTime() : docVal;
        const tVal = targetVal instanceof Date ? targetVal.getTime() : targetVal;
        if (dVal <= tVal) return false;
      }

      if ("$gte" in val) {
        const targetVal = val.$gte;
        const dVal = docVal instanceof Date ? docVal.getTime() : docVal;
        const tVal = targetVal instanceof Date ? targetVal.getTime() : targetVal;
        if (dVal < tVal) return false;
      }

      if ("$lt" in val) {
        const targetVal = val.$lt;
        const dVal = docVal instanceof Date ? docVal.getTime() : docVal;
        const tVal = targetVal instanceof Date ? targetVal.getTime() : targetVal;
        if (dVal >= tVal) return false;
      }

      if ("$lte" in val) {
        const targetVal = val.$lte;
        const dVal = docVal instanceof Date ? docVal.getTime() : docVal;
        const tVal = targetVal instanceof Date ? targetVal.getTime() : targetVal;
        if (dVal > tVal) return false;
      }

      if ("$ne" in val) {
        const targetVal = val.$ne;
        if (docVal === targetVal || (docVal?.toString && targetVal?.toString && docVal.toString() === targetVal.toString())) {
          return false;
        }
      }

      continue;
    }

    // Direct match
    if (doc[key] !== val) {
      // If comparing ObjectIds
      if (doc[key]?.toString && val?.toString && doc[key].toString() === val.toString()) {
        continue;
      }
      return false;
    }
  }
  return true;
}

function wrapDocument(collectionName: string, data: Record<string, any>): any {
  const store = getCollectionStore(collectionName);

  const doc: any = {
    ...data,
    save: async function () {
      this.updatedAt = new Date();
      store.set(this._id.toString(), { ...this });
      return this;
    },
  };

  return doc;
}

export class MemoryModel {
  public collectionName: string;

  constructor(collectionName: string) {
    this.collectionName = collectionName;
  }

  findOne(filter: Record<string, any> = {}) {
    const self = this;
    return {
      _filter: filter,
      select() {
        return this;
      },
      populate() {
        return this;
      },
      then(resolve: (val: any) => any, reject?: (err: any) => any) {
        const store = getCollectionStore(self.collectionName);
        for (const item of store.values()) {
          if (matchFilter(item, this._filter)) {
            const doc = wrapDocument(self.collectionName, { ...item });
            return Promise.resolve(doc).then(resolve, reject);
          }
        }
        return Promise.resolve(null).then(resolve, reject);
      },
    };
  }

  findById(id: string | mongoose.Types.ObjectId) {
    return this.findOne({ _id: id });
  }

  async create(data: Record<string, any>) {
    const store = getCollectionStore(this.collectionName);
    const now = new Date();
    const id = data._id ? data._id.toString() : new mongoose.Types.ObjectId().toString();

    const newDoc: Record<string, any> = {
      isActive: true,
      addresses: [],
      ...data,
      _id: new mongoose.Types.ObjectId(id),
      createdAt: now,
      updatedAt: now,
    };

    store.set(id, newDoc);
    return wrapDocument(this.collectionName, newDoc);
  }

  find(filter: Record<string, any> = {}) {
    const self = this;
    return {
      _filter: filter,
      _sortObj: null as Record<string, number> | null,
      select() {
        return this;
      },
      populate() {
        return this;
      },
      sort(sortObj: Record<string, number>) {
        this._sortObj = sortObj;
        return this;
      },
      then(resolve: (val: any) => any, reject?: (err: any) => any) {
        const store = getCollectionStore(self.collectionName);
        const results: any[] = [];
        for (const item of store.values()) {
          if (matchFilter(item, this._filter)) {
            results.push(wrapDocument(self.collectionName, { ...item }));
          }
        }

        if (this._sortObj) {
          const [sortKey, sortDir] = Object.entries(this._sortObj)[0] || ["createdAt", -1];
          results.sort((a: any, b: any) => {
            if (a[sortKey] > b[sortKey]) return sortDir;
            if (a[sortKey] < b[sortKey]) return -sortDir;
            return 0;
          });
        }

        return Promise.resolve(results).then(resolve, reject);
      },
    };
  }

  countDocuments(filter: Record<string, any> = {}) {
    const store = getCollectionStore(this.collectionName);
    let count = 0;
    for (const item of store.values()) {
      if (matchFilter(item, filter)) count++;
    }
    return Promise.resolve(count);
  }

  async findByIdAndUpdate(id: string | mongoose.Types.ObjectId, update: Record<string, any>, options?: Record<string, any>) {
    const store = getCollectionStore(this.collectionName);
    const docId = id.toString();
    const existing = store.get(docId);
    if (!existing) return null;

    const updated: Record<string, any> = { ...existing, updatedAt: new Date() };

    for (const [key, val] of Object.entries(update)) {
      if (!key.startsWith("$")) {
        updated[key] = val;
      }
    }

    if (update.$set) {
      Object.assign(updated, update.$set);
    }
    if (update.$addToSet) {
      for (const [key, val] of Object.entries(update.$addToSet as Record<string, any>)) {
        if (!Array.isArray(updated[key])) updated[key] = [];
        const arr = updated[key] as any[];
        if (!arr.some((item: any) => item?.toString() === val?.toString())) {
          arr.push(val);
        }
      }
    }
    if (update.$pull) {
      for (const [key, val] of Object.entries(update.$pull as Record<string, any>)) {
        if (Array.isArray(updated[key])) {
          updated[key] = (updated[key] as any[]).filter(
            (item: any) => item?.toString() !== val?.toString()
          );
        }
      }
    }

    store.set(docId, updated);
    return wrapDocument(this.collectionName, updated);
  }

  async findOneAndDelete(filter: Record<string, any>) {
    const store = getCollectionStore(this.collectionName);
    for (const [id, item] of store.entries()) {
      if (matchFilter(item, filter)) {
        store.delete(id);
        return wrapDocument(this.collectionName, item);
      }
    }
    return null;
  }

  async updateMany(filter: Record<string, any>, update: Record<string, any>) {
    const store = getCollectionStore(this.collectionName);
    let count = 0;
    for (const [id, item] of store.entries()) {
      if (matchFilter(item, filter)) {
        const updated: Record<string, any> = { ...item, updatedAt: new Date() };
        if (update.$set) {
          Object.assign(updated, update.$set);
        }
        store.set(id, updated);
        count++;
      }
    }
    return { modifiedCount: count };
  }
}
