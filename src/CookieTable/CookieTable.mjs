import { CookieTableBody } from './CookieTableBody.mjs'

export class CookieTable {
    constructor() {
        this._header = [];
        this._bodies = {};
    }

    get header() {
        return this._header;
    }

    addHeader(name, translatedName) {
        const col = {};
        col[name] = translatedName;

        this._header.push(col);

        return this;
    }

    getRows(storageName) {
        if (!(storageName in this._bodies)) {
            return [];
        }

        return this._bodies[storageName].rows;
    }

    addRow(storageName, row) {
        if (!(storageName in this._bodies)) {
            this._bodies[storageName] = new CookieTableBody();
        }

        this._bodies[storageName].addRow(row);

        return this;
    }
}
