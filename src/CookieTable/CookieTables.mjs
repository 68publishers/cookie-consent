import { CookieTable } from './CookieTable.mjs';

export class CookieTables {
    constructor() {
        this._cookieTables = {};
    }

    getCookieTable(locale) {
        if (!(locale in this._cookieTables)) {
            this._cookieTables[locale] = new CookieTable();
        }

        return this._cookieTables[locale];
    }

    /**
     * Cookie table of the locale in the format of vanilla-cookieconsent 3.x, null if the locale has none.
     * @returns {{headers: Object<string, string>, rows: function(string): Object<string, string>[]}|null}
     */
    exportFor(locale) {
        const table = this._cookieTables[locale];

        if (!table || 0 >= table.header.length) {
            return null;
        }

        const headers = {};

        for (const column of table.header) {
            const [key, label] = Object.entries(column)[0];

            if ('_name' !== key) {
                headers[key] = label;
            }
        }

        return {
            headers,
            rows: (storageName) => table.getRows(storageName).map((row) => {
                const out = {};
                Object.keys(headers).forEach(key => { out[key] = row[key] ?? ''; });
                return out;
            }),
        };
    }

    /**
     * Cookie names (string or RegExp) of the storage (and the provider) from tables of all locales, for the "cookie_tables" auto clear.
     * @returns {(string|RegExp)[]}
     */
    cookieNamesOf(storageName, provider = null) {
        const names = {};

        for (const table of Object.values(this._cookieTables)) {
            for (const row of table.getRows(storageName)) {
                if (null !== provider && row._provider !== provider) {
                    continue;
                }

                names[(row.is_regex ? 're:' : 's:') + row._name] = row.is_regex ? new RegExp(row._name) : row._name;
            }
        }

        return Object.values(names);
    }
}
