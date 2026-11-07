/** Centralized transient announcements, accessible via role=status in HTML. */
import { $ } from '../utils/dom.js';
let timer;
export function toast(message) {
  const el = $('#toast');
  if (!el) return;
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(timer);
  timer = setTimeout(() => el.classList.remove('show'), 4100);
}
