// Drops rules the wrapper never uses: shadow DOM hosts (":host", the plugin runs in the light DOM)
// and right-to-left layouts (".cc--rtl", none of the bundled locales is RTL; see docs for a custom RTL stylesheet).
const dropUnusedSelectors = () => ({
    postcssPlugin: 'drop-unused-selectors',
    Rule(rule) {
        const unused = (selector) => selector.includes(':host') || selector.includes('.cc--rtl');

        if (!rule.selectors.some(unused)) {
            return;
        }

        const kept = rule.selectors.filter(selector => !unused(selector));
        kept.length ? (rule.selectors = kept) : rule.remove();
    },
});
dropUnusedSelectors.postcss = true;

module.exports = {
    map: false,
    plugins: [
        dropUnusedSelectors,
        require('cssnano'),
    ],
};
