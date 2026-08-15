// formBind — form participation for shadow-DOM controls.
//
// A control inside a shadow root is invisible to an enclosing `<form>`, so a
// named component mirrors its value into a hidden light-DOM `<input>` on the
// host. The form sees a perfectly ordinary field; the component keeps its
// encapsulation. Checkbox semantics apply: when `checked` is provided and
// falsy, nothing is submitted — exactly like a native unchecked checkbox.

import { effect, onCleanup } from 'alacris';

/**
 * Call inside `setup`, passing the prop signals themselves:
 *
 *   formBind(host, { name, value, disabled });          // text-like
 *   formBind(host, { name, value, checked, disabled }); // checkable
 */
export function formBind(host, { name, value, checked, disabled }) {
  let input = null;

  effect(() => {
    const n = name ? name() : '';
    const submit = !!n && !(disabled ? disabled() : false) && (checked ? !!checked() : true);
    if (submit) {
      if (!input) {
        input = document.createElement('input');
        input.type = 'hidden';
        host.append(input);
      }
      input.name = n;
      const v = value ? value() : 'on';
      input.value = v == null || v === '' ? (checked ? 'on' : '') : String(v);
    } else if (input) {
      input.remove();
      input = null;
    }
  });

  onCleanup(() => {
    input?.remove();
    input = null;
  });
}
