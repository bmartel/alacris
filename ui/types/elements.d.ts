// Tag map so querySelector('ui-button') and similar type-check.
// Component modules register the custom element as a side effect; they have
// no runtime export besides that (and showSnackbar on ui-snackbar).

export {};

declare global {
  interface HTMLElementTagNameMap {
    'ui-accordion': HTMLElement;
    'ui-accordion-item': HTMLElement;
    'ui-alert': HTMLElement;
    'ui-app-bar': HTMLElement;
    'ui-autocomplete': HTMLElement;
    'ui-avatar': HTMLElement;
    'ui-backdrop': HTMLElement;
    'ui-badge': HTMLElement;
    'ui-bottom-app-bar': HTMLElement;
    'ui-bottom-nav': HTMLElement;
    'ui-breadcrumbs': HTMLElement;
    'ui-button': HTMLElement;
    'ui-button-group': HTMLElement;
    'ui-card': HTMLElement;
    'ui-carousel': HTMLElement;
    'ui-carousel-item': HTMLElement;
    'ui-checkbox': HTMLElement;
    'ui-chip': HTMLElement;
    'ui-chip-set': HTMLElement;
    'ui-container': HTMLElement;
    'ui-date-picker': HTMLElement;
    'ui-dialog': HTMLElement;
    'ui-divider': HTMLElement;
    'ui-drawer': HTMLElement;
    'ui-fab': HTMLElement;
    'ui-fab-menu': HTMLElement;
    'ui-icon': HTMLElement;
    'ui-icon-button': HTMLElement;
    'ui-list': HTMLElement;
    'ui-list-item': HTMLElement;
    'ui-loading-indicator': HTMLElement;
    'ui-menu': HTMLElement;
    'ui-menu-item': HTMLElement;
    'ui-nav-item': HTMLElement;
    'ui-nav-rail': HTMLElement;
    'ui-option': HTMLElement;
    'ui-pagination': HTMLElement;
    'ui-progress': HTMLElement;
    'ui-radio': HTMLElement;
    'ui-radio-group': HTMLElement;
    'ui-rating': HTMLElement;
    'ui-search': HTMLElement;
    'ui-select': HTMLElement;
    'ui-sheet': HTMLElement;
    'ui-side-sheet': HTMLElement;
    'ui-skeleton': HTMLElement;
    'ui-slider': HTMLElement;
    'ui-snackbar': HTMLElement;
    'ui-spinner': HTMLElement;
    'ui-split-button': HTMLElement;
    'ui-stack': HTMLElement;
    'ui-step': HTMLElement;
    'ui-stepper': HTMLElement;
    'ui-surface': HTMLElement;
    'ui-swipe-row': HTMLElement;
    'ui-switch': HTMLElement;
    'ui-tab': HTMLElement;
    'ui-tab-panel': HTMLElement;
    'ui-table': HTMLElement;
    'ui-table-footer': HTMLElement;
    'ui-table-toolbar': HTMLElement;
    'ui-tabs': HTMLElement;
    'ui-text': HTMLElement;
    'ui-text-field': HTMLElement;
    'ui-time-picker': HTMLElement;
    'ui-toggle-button': HTMLElement;
    'ui-toggle-group': HTMLElement;
    'ui-toolbar': HTMLElement;
    'ui-tooltip': HTMLElement;
  }
}
