'use strict';

class AbstractOptions {
    merge(options) {
        let property;

        for (property in options) {
            if (options.hasOwnProperty(property) && this.hasOwnProperty(property)) {
                this[property] = options[property];
            }
        }
    }
}

module.exports = AbstractOptions;
