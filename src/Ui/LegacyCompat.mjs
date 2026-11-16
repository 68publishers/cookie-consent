/**
 * Adds ids and classes of the plugin 2.9 markup to the modals of plugin 3.x ("compat_legacy_ids").
 * Clients bound GTM click triggers ({{Click ID}}) and variables to them, e.g.
 * "s-sv-bn", "c-p-bn" and document.getElementsByClassName("c-tgl")[1].checked.
 */
export function applyLegacyConsentModalIds(modal, secondaryButtonRole) {
    const buttons = modal.querySelector('.cm__btns');
    const all = modal.querySelector('[data-role="all"]');
    const necessary = modal.querySelector('[data-role="necessary"]');
    const show = modal.querySelector('[data-role="show"]');
    const secondary = 'accept_necessary' === secondaryButtonRole ? necessary : show;
    const third = 'accept_necessary' === secondaryButtonRole ? show : necessary;

    buttons && (buttons.id = 'c-bns');
    setId(all, 'c-p-bn');
    setId(secondary, 'c-s-bn');
    setId(third, 'c-t-bn');
}

export function applyLegacyPreferencesModalIds(modal) {
    const footer = modal.querySelector('.pm__footer');

    footer && (footer.id = 's-bns');
    setId(modal.querySelector('.pm__footer [data-role="all"]'), 's-all-bn');
    setId(modal.querySelector('.pm__footer [data-role="necessary"]'), 's-rall-bn');
    setId(modal.querySelector('.pm__footer [data-role="save"]'), 's-sv-bn');

    const close = modal.querySelector('.pm__close-btn');
    close && (close.id = 's-c-bn');

    // category toggles only (service toggles are named "cc-<category>-<service>")
    modal.querySelectorAll('.pm__section--toggle > .pm__section-title-wrapper input.section__toggle').forEach((input) => {
        input.classList.add('c-tgl');
    });
}

function setId(button, id) {
    if (!button) {
        return;
    }

    button.id = id;
    button.classList.add('c-bn');
}
