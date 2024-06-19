import { AbstractOptions } from './AbstractOptions.mjs';

export class AutoClearOptions extends AbstractOptions {
    constructor() {
        super();

        this.enabled = false;
        this.strategy = AutoClearOptions.STRATEGY_CLEAR_ALL_EXCEPT_DEFINED;
        this.cookie_names = [];
    }

    static get STRATEGY_CLEAR_ALL_EXCEPT_DEFINED() {
        return 'clear_all_except_defined';
    }

    static get STRATEGY_CLEAR_DEFINED_ONLY() {
        return 'clear_defined_only';
    }

    static get STRATEGY_COOKIE_TABLES() {
        return 'cookie_tables';
    }

    merge(options) {
        if ('strategy' in options && -1 === [AutoClearOptions.STRATEGY_CLEAR_ALL_EXCEPT_DEFINED, AutoClearOptions.STRATEGY_CLEAR_DEFINED_ONLY, AutoClearOptions.STRATEGY_COOKIE_TABLES].indexOf(options.strategy)) {
            throw new Error(`AutoClear strategy ${'string' === typeof options.strategy ? options.strategy : options.strategy.toString()} is not supported.`);
        }

        super.merge(options);
    }
}
