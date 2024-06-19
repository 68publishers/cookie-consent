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

    appendCookieTables(languagesConfig) {
        for (let locale in languagesConfig) {
            if (!(locale in this._cookieTables)) {
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

                if (!('toggle' in block) || !('value' in block.toggle)) {
                    continue;
                }

                block.cookie_table = cookieTable.getRows(block.toggle.value);
            }
        }
    }
}
