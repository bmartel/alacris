// rovingTabindex — arrow-key navigation for composite widgets
// (tabs, menus, radio groups, chip sets), per the ARIA Authoring Practices:
// one Tab stop for the whole widget, arrows move the active item.

/**
 * rovingTabindex(container, {
 *   selector,                  // matches the items (live-queried each time)
 *   orientation = 'horizontal',// 'horizontal' | 'vertical' | 'both'
 *   wrap = true,
 *   skip,                      // (el) => true to pass over (disabled items)
 *   onMove,                    // (el, index) called after focus moves
 * })
 *
 * Returns { focus(el|index), refresh(), destroy() }. `refresh()` re-applies
 * tabindexes after items change; call it from a thunk or effect when the
 * item list is dynamic.
 */
export function rovingTabindex(container, opts = {}) {
  const { selector = '[role]', orientation = 'horizontal', wrap = true, skip, onMove } = opts;

  const items = () => [...container.querySelectorAll(selector)].filter((el) => !skip?.(el));

  const setActive = (list, el) => {
    for (const it of list) it.tabIndex = it === el ? 0 : -1;
  };

  const move = (delta, edge) => {
    const list = items();
    if (!list.length) return;
    const active = container.getRootNode().activeElement;
    let i = list.indexOf(active);
    if (edge !== undefined) i = edge;
    else if (i < 0) i = 0;
    else {
      i += delta;
      if (wrap) i = (i + list.length) % list.length;
      else i = Math.max(0, Math.min(list.length - 1, i));
    }
    const el = list[i];
    setActive(list, el);
    el.focus();
    onMove?.(el, i);
  };

  const horizontal = orientation !== 'vertical';
  const vertical = orientation !== 'horizontal';

  const onKeydown = (e) => {
    if (e.defaultPrevented) return;
    switch (e.key) {
      case 'ArrowRight': if (horizontal) { e.preventDefault(); move(1); } break;
      case 'ArrowLeft': if (horizontal) { e.preventDefault(); move(-1); } break;
      case 'ArrowDown': if (vertical) { e.preventDefault(); move(1); } break;
      case 'ArrowUp': if (vertical) { e.preventDefault(); move(-1); } break;
      case 'Home': e.preventDefault(); move(0, 0); break;
      case 'End': e.preventDefault(); move(0, items().length - 1); break;
    }
  };

  const refresh = () => {
    const list = items();
    if (!list.length) return;
    const current = list.find((el) => el.tabIndex === 0) || list[0];
    setActive(list, current);
  };

  container.addEventListener('keydown', onKeydown);
  refresh();

  return {
    focus(which) {
      const list = items();
      const el = typeof which === 'number' ? list[which] : which;
      if (!el) return;
      setActive(list, el);
      el.focus();
    },
    refresh,
    destroy() {
      container.removeEventListener('keydown', onKeydown);
    },
  };
}
