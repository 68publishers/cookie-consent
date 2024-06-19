export class StoragePool {
    constructor() {
        this._items = {};
    }

    add(storage) {
        this._items[storage.name] = storage;
    }

    has(name) {
        return name in this._items;
    }

    get(name) {
        if (!this.has(name)) {
            throw new Error(`Missing storage "${name}".`);
        }

        return this._items[name];
    }

    all() {
        return Object.values(this._items);
    }
}
