'use strict';

class AutoClearOptions extends require('./AbstractOptions') {
    constructor() {
        super();

        this.enabled = false;
        this.strategy = AutoClearOptions.STRATEGY_CLEAR_ALL_EXCEPT_DEFINED;
        this.cookie_names = [];
    }

    static get STRATEGY_CLEAR_ALL_EXCEPT_DEFINED() {
        return 'clear_all_except_defined';
    };

    static get STRATEGY_CLEAR_DEFINED_ONLY() {
        return 'clear_defined_only';
    }

    merge(options) {
        if (options.hasOwnProperty('strategy') && -1 === [AutoClearOptions.STRATEGY_CLEAR_ALL_EXCEPT_DEFINED, AutoClearOptions.STRATEGY_CLEAR_DEFINED_ONLY].indexOf(options.strategy)) {
            throw new Error(`AutoClear strategy ${'string' === typeof options.strategy ? options.strategy : options.strategy.toString()} is not supported.`);
        }

        super.merge(options);
    }
}

module.exports = AutoClearOptions;
