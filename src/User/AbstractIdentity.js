'use strict';

class AbstractIdentity {
    toString() {
        throw new Error('Method ::toString() must be reimplemented.');
    }
}

module.exports = AbstractIdentity;
