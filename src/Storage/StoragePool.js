'use strict';

class StoragePool {
    constructor() {
        this._items = [];
    }

    add(storage) {
        this._items[storage.name] = storage;
    }

    has(name) {
        return this._items.hasOwnProperty(name);
    }

    get(name) {
        if (!this.has(name)) {
            throw new Error(`Missing storage "${name}".`);
        }

        return this._items[name];
    }

    all() {
        return this._items;
    }
}

module.exports = StoragePool;
