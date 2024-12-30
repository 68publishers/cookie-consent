import { AbstractOptions } from './AbstractOptions.mjs';

export class UiOptions extends AbstractOptions {
    constructor(scriptBasePath) {
        super();

        this._scriptBasePath = scriptBasePath;

        this.include_default_stylesheets = true;
        this.external_stylesheets = [];
        this.internal_stylesheets = [];
    }

    get defaultStylesheets() {
        if (true === this.include_default_stylesheets) {
            return [
                `${this._scriptBasePath}/cookie-consent.css`,
            ];
        }

        return [];
    }
}
