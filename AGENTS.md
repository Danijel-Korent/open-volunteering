# Project Instructions

## Testing

- The code is live at the following URL: http://localhost/git/open-volunteering/
- When using browser integration to test:
  - Always set viewport to mobile dimensions — Samsung Galaxy S22 (360×780)
  - Always do a hard reload before testing

### Seeded login

Seeded accounts log in with **name + password** (not email). All seeded accounts use password: **password123**

| Name | Type | Login password |
|------|------|----------------|
| Maria Santos | volunteer | password123 |
| James Chen | volunteer | password123 |
| Green City Initiative | organization | password123 |
| Community Shelter | organization | password123 |
| Youth Mentors Network | organization | password123 |

### Registration (testing)

The register form only asks for **name** and **account type**. The server generates a simple word-number password (e.g. `apple-42`) and shows it once on a success screen with a copy button. Users must memorize or copy it before continuing.

New accounts log in with their **name** and the generated password.


### Test selectors

Prefer `data-testid` attributes:

- `nav-feed`, `nav-positions`, `nav-calendar`, `nav-map`, `nav-profile`
- `btn-login`, `btn-register`, `btn-logout`
- `login-name`, `login-password`, `register-name`, `register-type`, `register-success`, `register-success-password`, `register-copy-credentials`, `register-continue`
- `feed-algorithm`, `feed-filter-user-post`, `feed-filter-org-post`, `feed-filter-position`, `feed-filter-event`
- `post-card-{type}-{id}`, `pagination-next`, `map-container`
- `calendar-event-{id}`, `create-post-form`, `create-post-dropzone`, `create-post-file-input`, `create-post-image-preview`, `profile-save`
- `profile-avatar-section`, `profile-avatar-dropzone`, `profile-avatar-file-input`, `profile-avatar-display`
- `post-image-{type}-{id}` (e.g. `post-image-user_post-1`)

## UI style

- Mobile-first; The main priority for the UX is to be mobile and touch-screen friendly

## Code style

- If the function you modified does not have documentation, add it using standard practice (JSDoc, PHPDoc, type hinting)
- After JS changes: `npx tsc -p public/js/jsconfig.json --noEmit`
