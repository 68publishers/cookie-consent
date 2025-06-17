export function checkVisibility(element) {
    if (!(element instanceof Element)) {
        return false;
    }

    let el = element;

    while (el) {
        const style = getComputedStyle(el);

        if (
            style.display === 'none' ||
            el.hasAttribute('hidden')
        ) {
            return false;
        }

        el = el.parentElement;
    }

    return true;
}
