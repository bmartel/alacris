// A usage of @alacris/ui — not the design system itself.
// Theme first so the first paint is already themed, then the tags upgrade.
import { applyTheme, toggleScheme, showSnackbar } from '@alacris/ui';

applyTheme({ seed: '#e8ad18' });

document.querySelector('#signup').addEventListener('submit', (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));
  showSnackbar(
    data.email
      ? `Saved ${data.email}${data.digest ? ', digest on' : ''}`
      : 'Enter an email',
  );
});

document.querySelector('#scheme').addEventListener('click', () => toggleScheme());
