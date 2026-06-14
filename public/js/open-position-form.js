import { createPosition } from './api.js';
import { getCurrentUserId } from './user-switcher.js';

/**
 * Render the "Open a volunteering position" form into a container.
 *
 * After a successful create, the form is cleared and `onCreated` runs (e.g. to
 * refresh the current page).
 *
 * @param {HTMLElement} container Parent element
 * @param {() => void | Promise<void>} onCreated Callback after successful create
 * @returns {Promise<void>}
 */
export async function renderOpenPositionForm(container, onCreated) {
  const currentId = getCurrentUserId();
  const div = document.createElement('div');
  div.className = 'compose';
  div.innerHTML = `
    <h2>Open a volunteering position</h2>
    <input type="text" id="position-title" placeholder="Title" maxlength="200">
    <textarea id="position-description" placeholder="Description"></textarea>
    <button type="button" id="btn-create-position">Post</button>
  `;
  container.appendChild(div);

  const titleEl = div.querySelector('#position-title');
  const descEl = div.querySelector('#position-description');
  const btnEl = div.querySelector('#btn-create-position');
  if (
    !(titleEl instanceof HTMLInputElement) ||
    !(descEl instanceof HTMLTextAreaElement) ||
    !(btnEl instanceof HTMLButtonElement)
  ) {
    return;
  }

  btnEl.addEventListener('click', async () => {
    const title = titleEl.value.trim();
    const description = descEl.value.trim();
    if (!title || !description) return;
    btnEl.disabled = true;
    try {
      await createPosition({ title, description, authorId: currentId });
      titleEl.value = '';
      descEl.value = '';
      await onCreated();
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to create position';
      alert(message);
    } finally {
      btnEl.disabled = false;
    }
  });
}
