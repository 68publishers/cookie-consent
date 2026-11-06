import { Catalogue } from './Catalogue.mjs';

export class Dictionary {
    constructor() {
        this._catalogues = {};
        this._placeholders = {};
    }

    loadTranslations(locale, url, override = false) {
        let catalogue;

        if (!(locale in this._catalogues)) {
            catalogue = new Catalogue(locale);

            this._catalogues[locale] = catalogue;
        } else {
            catalogue = this._catalogues[locale];
        }

        return catalogue.loadFromUrl(url, override);
    }

    addTranslations(locale, translations = {}) {
        let catalogue;

        if (!(locale in this._catalogues)) {
            catalogue = new Catalogue(locale);

            this._catalogues[locale] = catalogue;
        } else {
            catalogue = this._catalogues[locale];
        }

        catalogue.merge(translations);
    }

    addPlaceholder(name, value) {
        this._placeholders[name] = value;

        return this;
    }

    translate(locale, key) {
        if (locale in this._catalogues) {
            return this._catalogues[locale].translate(key, this._placeholders);
        }

        return key;
    }

    registerSource(locale, url) {
        this.#catalogue(locale).setSource(url);
    }

    get locales() {
        return Object.keys(this._catalogues);
    }

    has(locale) {
        return locale in this._catalogues;
    }

    async load(locale) {
        if (locale in this._catalogues) {
            await this._catalogues[locale].load();
        }
    }

    async exportTranslation(locale, storagePool, config, cookieTable = null, revisionEnabled = false) {
        return this.#catalogue(locale).exportTranslations(storagePool, config, this._placeholders, cookieTable, revisionEnabled);
    }

    #catalogue(locale) {
        if (!(locale in this._catalogues)) {
            this._catalogues[locale] = new Catalogue(locale);
        }

        return this._catalogues[locale];
    }
}
