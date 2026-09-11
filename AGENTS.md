# Project Instructions

## IMPORTANT

- NEVER modify AGENTS.md without asking first
- NEVER do "git push"

## Code style
- ALWAYS add type hinting!
- If you have added/modified a function, ALWAYS add or update documentation, using standard practice (PHPDoc, JSDoc, type hinting, typedefs and parameter types, etc...)
- After code changes, ALWAYS check JS typing with the command "npx tsc -p code/js/jsconfig.json --noEmit"
- After code changes, ALWAYS check PHP typing with the command "php.exe tools\phpstan.phar analyse"

## UI style

- Mobile-first; The main priority for the UX is to be mobile and touch-screen friendly

## Testing

- The code is live at the following URL: http://localhost/git/open-volunteering/
- When using browser integration to test:
  - Always set viewport to mobile dimensions — Samsung Galaxy S22 (360×780)
  - Always do a hard reload before testing

### Seeded login

Seeded accounts log in with **name + password** (not email). All seeded accounts use password: **password123**

Only **users** can log in (`data/users.json`). Organizations (`data/organizations.json`) have no passwords — access is via memberships in `data/organization_members.json`.

| Name | Login | Org admin of |
|------|-------|----------------|
| Maria Santos | password123 | Green City Initiative (1), Community Shelter (2), Youth Mentors Network (3) |
| James Chen | password123 | Test Org Alpha (4), ngo1 (5) |

Organization profiles: `#/organization/{id}`. User profiles: `#/profile/{id}`.

Switch org context via header **account switcher** (admins only). Create org from switcher or user profile.

### Test selectors

Prefer `data-testid` attributes:

- `nav-feed`, `nav-positions`, `nav-calendar`, `nav-map`, `nav-profile`
- `btn-login`, `btn-register`, `btn-logout`
- `account-switcher`, `account-switcher-toggle`, `account-switcher-create`, `account-switch-org-{id}`, `account-switch-user`
- `login-name`, `login-password`, `register-name`, `register-success`, `register-success-password`, `register-copy-credentials`, `register-continue`
- `profile-seeking-volunteering`, `profile-weekly-volunteering-hours`, `btn-create-organization`, `create-org-modal`, `create-org-name`
- `user-memberships-section`, `membership-{orgId}`, `org-members-section`, `org-member-{userId}`, `org-member-search`
- `feed-algorithm`, `feed-filter-user-post`, `feed-filter-org-post`, `feed-filter-position`, `feed-filter-event`
- `post-card-{type}-{id}`, `post-card-menu-{feedType}-{id}`, `post-card-menu-follow-{feedType}-{id}`, `post-card-menu-edit-{feedType}-{id}`, `post-card-menu-delete-{feedType}-{id}`, `confirm-delete-dialog`, `confirm-delete-submit`, `confirm-delete-cancel`, `edit-content-dialog`, `edit-content-submit`, `edit-content-cancel`, `pagination-next`, `map-container`
- `calendar-event-{id}`, `create-post-form`, `create-post-dropzone`, `create-post-file-input`, `create-post-image-preview`, `profile-save`
- `profile-avatar-section`, `profile-avatar-dropzone`, `profile-avatar-file-input`, `profile-avatar-display`
- `post-image-{type}-{id}` (e.g. `post-image-user_post-1`)
- `header-messages`, `header-messages-unread`
- `messages-inbox`, `conversation-row-{id}`, `btn-new-conversation`
- `message-user-picker`, `message-picker-search`, `group-chat-title`
- `message-thread-{id}`, `message-list`, `message-{id}`, `message-compose-input`, `message-send`
- `btn-message-user-{id}`, `btn-message-applicant-{id}`, `btn-message-volunteer-{id}`
- `org-applicants-section`, `org-availability-section`
