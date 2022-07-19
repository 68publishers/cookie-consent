'use strict';

const CookieTable = require('./CookieTable');

class CookieTables {
    constructor() {
        this._cookieTables = {};
    }

    getCookieTable(locale) {
        if (!this._cookieTables.hasOwnProperty(locale)) {
            this._cookieTables[locale] = new CookieTable();
        }

        return this._cookieTables[locale];
    }

    appendCookieTables(languagesConfig) {
        for (let locale in languagesConfig) {
            if (!this._cookieTables.hasOwnProperty(locale)) {
                continue;
            }

            const config = languagesConfig[locale];
            const cookieTable = this.getCookieTable(locale);

            if (0 >= cookieTable.header.length) {
                continue;
            }

            config.settings_modal.cookie_table_headers = cookieTable.header;

            for (let blockIndex in config.settings_modal.blocks) {
                const block = config.settings_modal.blocks[blockIndex];

                if (!block.hasOwnProperty('toggle') || !block.toggle.hasOwnProperty('value')) {
                    continue;
                }

                block.cookie_table = cookieTable.getRows(block.toggle.value);
            }
        }
    }
}

module.exports = CookieTables;
