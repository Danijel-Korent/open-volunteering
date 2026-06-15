# Project Instructions

## Testing

- The code is live at the following URL: http://localhost/git/open-volunteering/
- When using browser integration to test:
  - Always set viewport to mobile dimensions — Samsung Galaxy S22 (360×780)
  - Always do a hard reload before testing

### Seeded login

All seeded accounts use password: **password123**

| Email | Type | Name |
|-------|------|------|
| maria@example.com | volunteer | Maria Santos |
| james@example.com | volunteer | James Chen |
| green@example.com | organization | Green City Initiative |
| shelter@example.com | organization | Community Shelter |
| youth@example.com | organization | Youth Mentors Network |


### Test selectors

Prefer `data-testid` attributes:

- `nav-feed`, `nav-positions`, `nav-calendar`, `nav-map`, `nav-profile`
- `btn-login`, `btn-register`, `btn-logout`
- `feed-algorithm`, `feed-filter-user-post`, `feed-filter-org-post`, `feed-filter-position`, `feed-filter-event`
- `post-card-{type}-{id}`, `pagination-next`, `map-container`
- `calendar-event-{id}`, `create-post-form`, `profile-save`

## UI style

- Mobile-first; The main priority for the UX is to be mobile and touch-screen friendly

## Code style

- If the function you modified does not have documentation, add it using standard practice (JSDoc, PHPDoc, type hinting)
- After JS changes: `npx tsc -p public/js/jsconfig.json --noEmit`
