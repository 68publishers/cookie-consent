'use strict';

class UiOptions extends require('./AbstractOptions') {
    constructor() {
        super();

        this.include_default_stylesheets = true;
        this.external_stylesheets = [];
        this.internal_stylesheets = [];
    }

    get defaultStylesheets() {
        if (true === this.include_default_stylesheets) {
            return [
                'https://cdn.jsdelivr.net/gh/orestbida/cookieconsent@v2.7.1/dist/cookieconsent.css'
            ];
        }

        return [];
    }
}

module.exports = UiOptions;
