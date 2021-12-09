'use strict';

const Catalogue = require('./Catalogue');

class Dictionary {
    constructor() {
        this._catalogues = {};
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

    translate(locale, key) {
        if (this._catalogues.hasOwnProperty(locale)) {
            return this._catalogues[locale].translate(key);
        }

        return key;
    }

    build(storagePool) {
        const dictionary = {};
        let key;
        let catalogue;

        for (key in this._catalogues) {
            if (!this._catalogues.hasOwnProperty(key)) {
                continue;
            }

            catalogue = this._catalogues[key];
            dictionary[catalogue.locale] = catalogue.build(storagePool);
        }

        return dictionary;
    }
}

module.exports = Dictionary;