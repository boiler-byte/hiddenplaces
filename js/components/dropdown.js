/** Shared toolbar dropdown behavior; ensures only one popup is open. */
import { $ } from '../utils/dom.js';
const MENUS = [['modeMenuBtn', 'modeMenu'], ['positionMenuBtn', 'positionMenu']];
export const smallScreen = window.matchMedia('(max-width:760px)');

export function createDropdowns() {
  function close() {
    for (const [triggerId, menuId] of MENUS) {
      const trigger = document.getElementById(triggerId);
      document.getElementById(menuId).hidden = true;
      trigger.setAttribute('aria-expanded', 'false');
    }
  }
  function toggle(triggerId, menuId) {
    const trigger = document.getElementById(triggerId);
    const menu = document.getElementById(menuId);
    const opening = menu.hidden;
    close();
    if (!opening) return;
    if (smallScreen.matches) {
      const top = Math.ceil($('.topbar').getBoundingClientRect().bottom + 5);
      document.documentElement.style.setProperty('--mobile-popover-top', `${top}px`);
    }
    menu.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
  }
  for (const [triggerId, menuId] of MENUS) {
    document.getElementById(triggerId).addEventListener('click', () => toggle(triggerId, menuId));
  }
  document.addEventListener('pointerdown', event => {
    if (!event.target.closest('.toolbar-dropdown')) close();
  });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || !MENUS.some(([, id]) => !document.getElementById(id).hidden)) return;
    const active = MENUS.find(([, id]) => !document.getElementById(id).hidden);
    close();
    document.getElementById(active[0]).focus();
    event.stopPropagation();
  });
  return {close};
}
