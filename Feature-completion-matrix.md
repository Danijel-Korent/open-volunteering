# Feature completion matrix

Status of every planned feature in Open Volunteering. Mark **one** column per row: where the feature stands today.

| Symbol   | Meaning                                                              |
| -------- | -------------------------------------------------------------------- |
| ✓        | Current status for this feature                                      |

**Last updated:** 2026-09-05 (chat messaging added)

---

## Legend

| Column                 | Meaning                                                              |
| ---------------------- | -------------------------------------------------------------------- |
| **Placeholder**        | Not built, stub only, or spec-only                                   |
| **Prototype**          | Works end-to-end for local/demo use; gaps acceptable for testing     |
| **Full**               | Production-ready: complete UX, edge cases, security, and ops         |
| **Notes**              | What exists, what is missing                                         |

---

## App shell & navigation

| Feature                                                    |  Placeholder  |  Prototype  |         Full         | Notes                                                                |
| ---------------------------------------------------------- | :-----------: | :---------: | :------------------: | -------------------------------------------------------------------- |
| Main navigation (Feed, Positions, Calendar, Map, Profile)  |               |      ✓      |                      | Hash-routed SPA; mobile-first header nav                             |
| Login / Register entry points in header                    |               |      ✓      |                      | Session-based auth via PHP                                           |
| Mobile-first layout                                        |               |      ✓      |                      | Single-column, touch-friendly controls                               |

---

## Authentication & account security

| Feature                                                    |  Placeholder  |  Prototype  |         Full         | Notes                                                                |
| ---------------------------------------------------------- | :-----------: | :---------: | :------------------: | -------------------------------------------------------------------- |
| Register (name + account type)                             |               |      ✓      |                      | Server generates one-time word-number password                       |
| Login / Logout                                             |               |      ✓      |                      | Name + password; PHP session cookie                                  |
| Email verification                                         |       ✓       |             |                      | Not implemented                                                      |
| Password reset                                             |       ✓       |             |                      | Not implemented                                                      |
| CSRF protection                                            |       ✓       |             |                      | Documented prototype gap                                             |
| Rate limiting                                              |       ✓       |             |                      | Documented prototype gap                                             |

---

## Feed page

| Feature                                                    |  Placeholder  |  Prototype  |         Full         | Notes                                                                  |
| ---------------------------------------------------------- | :-----------: | :---------: | :------------------: | ---------------------------------------------------------------------- |
| Unified feed (user posts, org posts, positions, events)    |               |      ✓      |                      | Server aggregates via `/api/feed`                                      |
| Public feed (no login required)                            |               |      ✓      |                      | All content is public by design                                        |
| Feed algorithm selector                                    |               |      ✓      |                      | Newest, most liked, by location, remote only, following                |
| Feed type filters (checkboxes)                             |               |      ✓      |                      | Persisted in `localStorage`                                            |
| Paginated feed (no infinite scroll)                        |               |      ✓      |                      | Page links at bottom                                                   |
| Posts-per-page control                                     |               |      ✓      |                      | 5 / 10 / 20; moved below feed                                          |
| Create post (logged in)                                    |               |      ✓      |                      | Type auto-set from account (volunteer vs organization)                 |
| Like on feed items                                         |               |      ✓      |                      | Count persists; no per-user like state (can like repeatedly)           |
| Comment on feed items                                      |               |      ✓      |                      | Posts, positions, and events                                           |
| Share posts                                                |               |      ✓      |                      | Copies generic feed URL; increments `shareCount` — not a per-post link |
| Per-post shareable URL                                     |       ✓       |             |                      | Backlog item in README                                                 |
| Post type color coding                                     |       ✓       |             |                      | `type-*` CSS classes exist; no distinct colors yet                     |
| “Following” feed algorithm                                 |               |      ✓      |                      | Filters to followed authors; no-op when logged out                     |

---

## Volunteering positions page

| Feature                                                    |  Placeholder  |  Prototype  |         Full         | Notes                                                                |
| ---------------------------------------------------------- | :-----------: | :---------: | :------------------: | -------------------------------------------------------------------- |
| List open positions                                        |               |      ✓      |                      | Uses feed API with `positionsOnly`                                   |
| Position sorting / algorithms                              |               |      ✓      |                      | Same controls as feed (minus type filters)                           |
| Paginated positions list                                   |               |      ✓      |                      | Shared pagination component                                          |
| Apply to position (volunteers)                             |               |      ✓      |                      | Stored in `applications.json`; disabled after apply                  |
| Comment on positions                                       |               |      ✓      |                      | Via shared comment section                                           |
| Org review of applications                                 |       ✓       |             |                      | API stores applications; no org-facing UI                            |

---

## Events & calendar

| Feature                                                    |  Placeholder  |  Prototype  |         Full         | Notes                                                                |
| ---------------------------------------------------------- | :-----------: | :---------: | :------------------: | -------------------------------------------------------------------- |
| Create event (organization)                                |               |      ✓      |                      | From org profile                                                     |
| Create event (volunteer)                                   |               |      ✓      |                      | From volunteer profile                                               |
| Calendar page (upcoming events)                            |               |      ✓      |                      | Next 12 months, grouped by month                                     |
| Event RSVP (going / maybe)                                 |               |      ✓      |                      | API upserts RSVP; UI does not show current RSVP state                |
| Comment on events                                          |               |      ✓      |                      | On feed cards                                                        |
| Like events                                                |               |      ✓      |                      | Same limitations as other likes                                      |

---

## Map page

| Feature                                                    |  Placeholder  |  Prototype  |         Full         | Notes                                                                |
| ---------------------------------------------------------- | :-----------: | :---------: | :------------------: | -------------------------------------------------------------------- |
| Leaflet map with markers                                   |               |      ✓      |                      | Orgs, volunteers, positions, physical events                         |
| Marker popups with links                                   |               |      ✓      |                      | Links to profile, positions, or calendar                             |
| Map legend                                                 |               |      ✓      |                      | Colour-coded by entity type                                          |

---

## Profile pages

| Feature                                                    |  Placeholder  |  Prototype  |         Full         | Notes                                                                |
| ---------------------------------------------------------- | :-----------: | :---------: | :------------------: | -------------------------------------------------------------------- |
| View / edit own profile                                    |               |      ✓      |                      | Name, bio, location (label + lat/lng)                                |
| Volunteer skills on profile                                |               |      ✓      |                      | Comma-separated list                                                 |
| Volunteer experience on profile                            |               |      ✓      |                      | One entry per line                                                   |
| View another user’s profile                                |               |      ✓      |                      | Read-only header + feed                                              |
| Profile-scoped feed                                        |               |      ✓      |                      | `/api/users/{id}/feed`                                               |
| Organization: open position                                |               |      ✓      |                      | Inline form on own profile                                           |
| Organization: create project                               |               |      ✓      |                      | Listed on org profile                                                |
| Project detail + news posts                                |               |      ✓      |                      | `#/profile/{orgId}/project/{projectId}`                              |
| Follow profile                                             |               |      ✓      |                      | Follow button only; no unfollow UI or “already following” state      |
| Unfollow profile                                           |       ✓       |             |                      | API exists (`DELETE /follow`); no UI                                 |
| Multiple roles per user (volunteer + org member)           |       ✓       |             |                      | Single `type` at registration                                        |
| Switch between user and managed org profile                |       ✓       |             |                      | Milestone #2 spec; not built                                         |
| Registered vs informal organization type                   |       ✓       |             |                      | Milestone #2 spec; not built                                         |

---

## Subscriptions & availability

| Feature                                                    |  Placeholder  |  Prototype  |         Full         | Notes                                                                |
| ---------------------------------------------------------- | :-----------: | :---------: | :------------------: | -------------------------------------------------------------------- |
| Subscribe to category / org / location                     |               |      ✓      |                      | CRUD on volunteer profile                                            |
| Deliver notifications for subscriptions                    |       ✓       |             |                      | Stored only; no push or email                                        |
| Volunteer “Offer skills” / availability                    |               |      ✓      |                      | Modal on feed cards; upsert via API                                  |

---

## Content creation (by role)

| Feature                                                    |  Placeholder  |  Prototype  |         Full         | Notes                                                                |
| ---------------------------------------------------------- | :-----------: | :---------: | :------------------: | -------------------------------------------------------------------- |
| Volunteer: create user post                                |               |      ✓      |                      |                                                                      |
| Organization: create org post                              |               |      ✓      |                      |                                                                      |
| Organization: open volunteering position                   |               |      ✓      |                      |                                                                      |
| Organization: create event                                 |               |      ✓      |                      |                                                                      |
| Volunteer: create event                                    |               |      ✓      |                      |                                                                      |
| Organization: create project + project news                |               |      ✓      |                      |                                                                      |

---

## Developer & admin tooling

| Feature                                                    |  Placeholder  |  Prototype  |         Full         | Notes                                                                |
| ---------------------------------------------------------- | :-----------: | :---------: | :------------------: | -------------------------------------------------------------------- |
| User switcher (dev tool)                                   |       ✓       |             |                      | Mentioned in Milestone #1; use login with seeded accounts instead    |
| Stats page (user/org/post counts)                          |       ✓       |             |                      | Backlog item in README                                               |

---

## Messaging

| Feature                                                    |  Placeholder  |  Prototype  |         Full         | Notes                                                                |
| ---------------------------------------------------------- | :-----------: | :---------: | :------------------: | -------------------------------------------------------------------- |
| Direct messages (1:1)                                      |               |      ✓      |                      | From profile, org applicant/offer lists; deduplicated threads        |
| Group messages                                             |               |      ✓      |                      | 3–20 participants; optional title; via inbox modal                   |
| Inbox with unread badge                                    |               |      ✓      |                      | Header link; polls every 15s on inbox                                |
| Message thread view                                        |               |      ✓      |                      | `#/messages/{id}`; polls every 10s; mark read on open                |
| Org: message position applicants                           |               |      ✓      |                      | Own org profile → Position applicants section                        |
| Org: message skill offers                                  |               |      ✓      |                      | Own org profile → Skill offers section                               |
| Image attachments in chat                                  |       ✓       |             |                      | Text only for prototype                                              |
| Real-time delivery (WebSockets)                            |       ✓       |             |                      | HTTP polling only                                                    |

---

## Platform & infrastructure

| Feature                                                    |  Placeholder  |  Prototype  |         Full         | Notes                                                                |
| ---------------------------------------------------------- | :-----------: | :---------: | :------------------: | -------------------------------------------------------------------- |
| PHP REST API + JSON file storage                           |               |      ✓      |                      | Whole-file read/write; no transactions                               |
| Real database backend                                      |       ✓       |             |                      | Planned evolution                                                    |
| ActivityPub / Fediverse federation                         |       ✓       |             |                      | North-star; not started                                              |
| Private positions or posts                                 |       ✓       |             |                      | Spec assumes all public content                                      |

---

## Summary counts

| Status                 |   Count |
| ---------------------- | ------: |
| Placeholder            |      20 |
| Prototype              |      49 |
| Full                   |       0 |

*68 features tracked.*

---

## Milestone targets (planned matrix state)

How this matrix should look when each milestone is **done** (target, not current state).

### Milestone #0 — UI/UX review online

| Target                                                     |    Placeholder    |   Prototype    |   Full   |
| ---------------------------------------------------------- | :---------------: | :------------: | :------: |
| All core pages navigable with seeded data                  |         0         |      ~45       |    0     |
| Auth, feed controls, positions apply UX polished           |         0         | remaining gaps |    0     |
| Per-post URLs, stats, color coding                         | still placeholder |       —        |    —     |

### Milestone #1 — Single user type: positions + comments

| Target                                                     |   Placeholder    |  Prototype  |   Full   |
| ---------------------------------------------------------- | :--------------: | :---------: | :------: |
| Feed + positions browse/comment                            |        0         |      ✓      |    0     |
| Profile (name, bio)                                        |        0         |      ✓      |    0     |
| User switcher dev tool                                     |        0         |      ✓      |    0     |
| Register/login, map, calendar, projects                    | optional / later |      —      |    —     |

### Milestone #2 — First public testing release

| Target                                                     |  Placeholder  |  Prototype  |   Full   |
| ---------------------------------------------------------- | :-----------: | :---------: | :------: |
| Register, roles, org creation, profile switching           |       0       |      ✓      |    0     |
| Posts, comments, positions, feed, profiles                 |       0       |      ✓      |    0     |
| Subscriptions storage, follow, RSVP, map, calendar         |       0       |      ✓      |    0     |
| Email verification, notifications, federation              |       ✓       |      —      |    —     |

### Production / post-prototype

| Target                                                     |  Placeholder  |  Prototype  |     Full      |
| ---------------------------------------------------------- | :-----------: | :---------: | :-----------: |
| Security hardening, notifications, DB                      |       0       |      0      |       ✓       |
| ActivityPub federation                                     |       0       |      0      | ✓ (long-term) |
