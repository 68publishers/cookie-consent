'use strict';

const CookieConsentWrapperFactory = require('./src/CookieConsentWrapperFactory');

module.exports = (function () {
    const factory = new CookieConsentWrapperFactory();

    return factory.create();
})();
