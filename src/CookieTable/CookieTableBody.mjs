export class CookieTableBody {
    constructor() {
        this._rows = [];
    }

    get rows() {
        return this._rows;
    }

    addRow(row) {
        this._rows.push(row);
    }
}
