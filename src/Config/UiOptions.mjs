import { AbstractOptions } from './AbstractOptions.mjs';
import ccPkg from 'vanilla-cookieconsent/package.json';

const ccVersion = ccPkg.version;

export class UiOptions extends AbstractOptions {
    constructor() {
        super();

        this.include_default_stylesheets = true;
        this.external_stylesheets = [];
        this.internal_stylesheets = [];
    }

    get defaultStylesheets() {
        if (true === this.include_default_stylesheets) {
            return [
                `https://cdn.jsdelivr.net/gh/orestbida/cookieconsent@${ccVersion}/dist/cookieconsent.css`,
            ];
        }

        return [];
    }
}
