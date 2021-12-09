'use strict';

class StylesheetLoader {
    constructor(document) {
        this._document = document;
    }

    static loadFromConfig(document, uiOptions) {
        const loader = new StylesheetLoader(document);

        const internalStylesheets = uiOptions.internal_stylesheets;
        let externalStylesheets = uiOptions.defaultStylesheets;
        let stylesheetKey;

        externalStylesheets = [...externalStylesheets, ...uiOptions.external_stylesheets];

        for (stylesheetKey in externalStylesheets) {
            if (!externalStylesheets.hasOwnProperty(stylesheetKey)) {
                continue;
            }

            loader.loadExternal(externalStylesheets[stylesheetKey]);
        }

        for (stylesheetKey in internalStylesheets) {
            if (!internalStylesheets.hasOwnProperty(stylesheetKey)) {
                continue;
            }

            loader.loadInternal(internalStylesheets[stylesheetKey]);
        }
    }

    loadExternal(url) {
        const element = this._document.createElement('link');
        element.rel = 'stylesheet';
        element.href = url;

        this._appendStylesheet(element);
    }

    loadInternal(content) {
        const element = this._document.createElement('style');
        element.innerText = content;

        this._appendStylesheet(element);
    }

    _appendStylesheet(stylesheet) {
        this._document.getElementsByTagName('head')[0].appendChild(stylesheet);
    }
}

module.exports = StylesheetLoader;
