import {
  getUsers,
  getPositions,
  createPosition,
  getComments,
  createComment,
} from './api.js';
import { getCurrentUserId } from './user-switcher.js';

function getInitials(name) {
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function timeAgo(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const sec = Math.floor((now - date) / 1000);
  if (sec < 60) return 'just now';
  if (sec < 3600) return `${Math.floor(sec / 60)} min ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)} hours ago`;
  if (sec < 604800) return `${Math.floor(sec / 86400)} days ago`;
  return date.toLocaleDateString();
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

async function renderCompose(container, users) {
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

  btnEl.addEventListener('click', async () => {
    const title = titleEl.value.trim();
    const description = descEl.value.trim();
    if (!title || !description) return;
    btnEl.disabled = true;
    try {
      await createPosition({ title, description, authorId: currentId });
      titleEl.value = '';
      descEl.value = '';
      await renderFeed(container);
    } catch (e) {
      alert(e.message || 'Failed to create position');
    } finally {
      btnEl.disabled = false;
    }
  });
}

async function renderPosition(container, position, usersMap) {
  const author = usersMap[position.authorId] || { name: 'Unknown' };
  const comments = await getComments(position.id);
  const commentsWithAuthors = await Promise.all(
    comments.map(async (c) => ({
      ...c,
      author: usersMap[c.authorId] || { name: 'Unknown' },
    }))
  );

  const article = document.createElement('article');
  article.className = 'position';
  article.dataset.positionId = position.id;
  article.innerHTML = `
    <div class="position-header">
      <div class="avatar">${escapeHtml(getInitials(author.name))}</div>
      <div class="position-meta">
        <div class="name">${escapeHtml(author.name)}</div>
        <div class="time">${timeAgo(position.createdAt)}</div>
      </div>
    </div>
    <h3 class="position-title">${escapeHtml(position.title)}</h3>
    <p class="position-description">${escapeHtml(position.description)}</p>
    <div class="position-actions">
      <button type="button" class="js-toggle-comments">Comment (${comments.length})</button>
    </div>
    <div class="comments-section" style="display:none">
      <div class="comments-list"></div>
      <div class="comment-form">
        <input type="text" placeholder="Write a comment..." class="comment-input" maxlength="500">
        <button type="button" class="comment-submit">Post</button>
      </div>
    </div>
  `;

  const commentsSection = article.querySelector('.comments-section');
  const commentsList = article.querySelector('.comments-list');
  const commentInput = article.querySelector('.comment-input');
  const commentSubmit = article.querySelector('.comment-submit');

  function renderComments() {
    commentsList.innerHTML = commentsWithAuthors
      .map(
        (c) => `
      <div class="comment">
        <div class="avatar">${escapeHtml(getInitials(c.author.name))}</div>
        <div class="comment-body">
          <div class="comment-author">${escapeHtml(c.author.name)}</div>
          <div class="comment-content">${escapeHtml(c.content)}</div>
          <div class="comment-time">${timeAgo(c.createdAt)}</div>
        </div>
      </div>
    `
      )
      .join('');
  }

  renderComments();

  article.querySelector('.js-toggle-comments').addEventListener('click', () => {
    const isHidden = commentsSection.style.display === 'none';
    commentsSection.style.display = isHidden ? 'block' : 'none';
  });

  commentSubmit.addEventListener('click', async () => {
    const content = commentInput.value.trim();
    if (!content) return;
    const currentId = getCurrentUserId();
    commentSubmit.disabled = true;
    try {
      const newComment = await createComment(position.id, {
        content,
        authorId: currentId,
      });
      const authorUser = usersMap[currentId] || { name: 'Unknown' };
      commentsWithAuthors.push({ ...newComment, author: authorUser });
      renderComments();
      commentInput.value = '';
      article.querySelector('.js-toggle-comments').textContent = `Comment (${commentsWithAuthors.length})`;
    } catch (e) {
      alert(e.message || 'Failed to post comment');
    } finally {
      commentSubmit.disabled = false;
    }
  });

  commentInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') commentSubmit.click();
  });

  container.appendChild(article);
}

export async function renderFeed(container) {
  if (!container) container = document.getElementById('app');
  container.innerHTML = '';

  const [users, positions] = await Promise.all([getUsers(), getPositions()]);
  const usersMap = Object.fromEntries(users.map((u) => [u.id, u]));

  await renderCompose(container, users);

  for (const pos of positions) {
    await renderPosition(container, pos, usersMap);
  }

  const pagination = document.createElement('div');
  pagination.className = 'pagination';
  pagination.innerHTML = '<span>End of feed</span>';
  container.appendChild(pagination);
}
