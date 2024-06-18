'use strict';

const Catalogue = require('./Catalogue');

class Dictionary {
    constructor() {
        this._catalogues = {};
        this._placeholders = {};
    }

    loadTranslations(locale, url, override = false) {
        let catalogue;

        if (!this._catalogues.hasOwnProperty(locale)) {
            catalogue = new Catalogue(locale);

            this._catalogues[locale] = catalogue;
        } else {
            catalogue = this._catalogues[locale];
        }

        return catalogue.loadFromUrl(url, override);
    }

    addTranslations(locale, translations = {}) {
        let catalogue;

        if (!this._catalogues.hasOwnProperty(locale)) {
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
        if (this._catalogues.hasOwnProperty(locale)) {
            return this._catalogues[locale].translate(key, this._placeholders);
        }

        return key;
    }

    async exportTranslations(storagePool, config) {
        const dictionary = {};
        let key;
        let catalogue;

        for (key in this._catalogues) {
            if (!this._catalogues.hasOwnProperty(key)) {
                continue;
            }

            catalogue = this._catalogues[key];
            dictionary[catalogue.locale] = await catalogue.exportTranslations(storagePool, config, this._placeholders);
        }

        return dictionary;
    }
}

module.exports = Dictionary;
