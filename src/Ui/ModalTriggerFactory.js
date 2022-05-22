'use strict';

class ModalTriggerFactory {
    constructor(document, dictionary) {
        this._document = document;
        this._dictionary = dictionary;
    }

    create(selector, locale) {
        const items = this._document.querySelectorAll(selector);
        const item = items.length ? items[items.length - 1] : undefined;

        if (!item) {
            console.warn(`HTML element with selector ${selector} not found.`);

            return {
                itemElement: undefined,
                linkElement: undefined,
            };
        }

        const newItem = item.cloneNode(true);
        let link;

        if ('A' === newItem.nodeName) {
            link = newItem;
        } else {
            link = newItem.getElementsByTagName('a')[0] || undefined;
        }

        if (!link) {
            link = this._document.createElement('a');

            const nestedItemElements = newItem.querySelectorAll('*');
            let lastItemElement = nestedItemElements.length ? nestedItemElements[nestedItemElements.length - 1] : newItem;

            lastItemElement.innerHTML = '';
            lastItemElement.appendChild(link);
        }

        const nestedLinkElements = link.querySelectorAll('*');
        let lastLinkElement = nestedLinkElements.length ? nestedLinkElements[nestedLinkElements.length - 1] : link;

        lastLinkElement.innerHTML = this._dictionary.translate(locale, 'modal_trigger_title');

        link.setAttribute('data-cc', 'c-settings');
        link.setAttribute('href', '#cookie-settings');

        item.parentNode.appendChild(newItem);

        return {
            itemElement: newItem,
            textElement: lastLinkElement,
        };
    }
}

module.exports = ModalTriggerFactory;
