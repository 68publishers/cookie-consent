/**
 * Plugin 3.x manages only scripts with the fixed "data-category" attribute.
 * Scripts marked with the configured selector (1.x default "data-cookiecategory") are rewritten before CookieConsent.run().
 */
export function rewriteScriptAttributes(document, selector) {
    if (!selector || 'data-category' === selector) {
        return 0;
    }

    const scripts = document.querySelectorAll(`script[${selector}]`);

    scripts.forEach((script) => {
        if (!script.hasAttribute('data-category')) {
            script.setAttribute('data-category', script.getAttribute(selector));
        }
    });

    return scripts.length;
}
