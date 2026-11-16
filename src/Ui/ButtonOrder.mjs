/**
 * Consent modal: plugin 3.x renders "accept all, accept necessary | show preferences".
 * Wrapper 1.x rendered "primary, secondary, third", so with the secondary role "settings" and the third button
 * the "show preferences" button goes before "accept necessary" (DOM order = visual order = tab order).
 */
export function placeSecondaryBeforeThird(modal, secondaryButtonRole) {
    if ('settings' !== secondaryButtonRole) {
        return;
    }

    const all = modal.querySelector('.cm__btns [data-role="all"]');
    const necessary = modal.querySelector('.cm__btns [data-role="necessary"]');
    const show = modal.querySelector('.cm__btns [data-role="show"]');

    if (!all || !necessary || !show) {
        return;
    }

    // the emptied group stays in the DOM (hidden by CSS), the plugin appends into it again on setLanguage()
    necessary.parentElement.insertBefore(show, necessary);
}

/**
 * Buttons ordered visually by the CSS "order" property are physically reordered in the DOM to keep
 * the tab order (behavior of 1.4.0). Buttons of all groups of the container are moved to the first group.
 */
export function reorderByCssOrder(container) {
    if (!container) {
        return;
    }

    const buttons = Array.from(container.querySelectorAll('button'));
    const withOrder = buttons.map((button) => {
        const order = parseInt(getComputedStyle(button).order, 10);

        return { button, order: isNaN(order) ? 0 : order };
    });

    if (!withOrder.some(item => 0 !== item.order)) {
        return;
    }

    const target = buttons[0].parentElement;

    withOrder
        .map((item, index) => ({ ...item, index }))
        .sort((a, b) => a.order - b.order || a.index - b.index)
        .forEach(({ button }) => target.appendChild(button));
}
