
# Development plan

## High-level

1. Initial minimalistic prototype with same repo split between back-end <-> API <-> front-end
2. Add all features neccessary for public testing
3. Make it decentralized ala Fediverse/ActivityPub 
  - not one central server but organizations can run their own servers that communicates with each other
  - Fediverse/ActivityPub compatible

High-level features
  - basic facebook / linkedin features for users/orgs
    - post
    - comment
    - like/support
    - IM/DM
    - notifications
  - volunteer or paid positions
  - events and calendar
  - map of local NGOs, users, events, ...
  - list/overview of open public tenders / founding announcements
    - register for notification
  - de-centralized using ActivityPub


## Milestone #1 - Make it good enough to put it on-line for UI/UX people to take a look

### Milestone #1 feature table ✓

✅︎  - Current state
🎯︎  - Target

| Feature name                                      | None | Mock | Proto | Full  | Notes                                             |
| ------------------------------------------------- | ---- | ---- | ----- | ----- | ------------------------------------------------- |
| Registration                                      |      |      |  ✅︎🎯︎ |       | can create profiles, but no password input/change |
| Non-logged / public: can see all posts            |      |      |       | ✅︎ 🎯︎ |                                                   |
| Non-logged / public: can see all events           |      |      |       | ✅︎ 🎯︎ |                                                   |
| Non-logged / public: can see all map              |      |      |       | ✅︎ 🎯︎ |                                                   |
| User profile: can create posts                    |      |      |       | ✅︎ 🎯︎ |                                                   |
| User profile: can create posts with image         |  ✅︎  |      |       |   🎯︎  |                                                   |
| User profile: can delete posts                    |  ✅︎  |      |       |   🎯︎  |                                                   |
| User profile: can edit posts                      |  ✅︎  |      |       |   🎯︎  |                                                   |
| User profile: can comment posts                   |      |      |       | ✅︎ 🎯︎ |                                                   |
| User profile: can like posts                      |      |  ✅︎  |       |   🎯︎  | Colors a like button, but dissapers on refresh    |
| User profile: can see likes (own posts)           |  ✅︎  |      |       |   🎯︎  | No counter at all, or ways to see who liked       |
| User profile: can offer skills                    |      |  ✅︎  |       |   🎯︎  | There is a dialog, need to check if it goes to DB |
| User profile: can apply to valunteer adds         |      |      |   ✅︎  |   🎯︎  | Button in "Positions" tab, but not in "Feed"      |
| User profile: can see offered skills              |  ✅︎  |      |       |   🎯︎  |                                                   |
| User profile: can send DM                         |  ✅︎  |      |       |   🎯︎  |                                                   |
| User profile: can read DM                         |  ✅︎  |      |       |   🎯︎  |                                                   |
| User profile: can create group DMs                |  ✅︎  |      |       |   🎯︎  |                                                   |
| User profile: Notification for post comment       |  ✅︎  |      |       |   🎯︎  |                                                   |
| User profile: Notification for accepted position  |  ✅︎  |      |       |   🎯︎  |                                                   |
| User profile: Notification for accepted skill     |  ✅︎  |      |       |   🎯︎  |                                                   |
| User profile: Follow post option                  |  ✅︎  |      |       |   🎯︎  |                                                   |
| NGO profile: can see all posts                    |      |      |       | ✅︎ 🎯︎ |                                                   |
| NGO profile: can comment                          |      |      |       | ✅︎ 🎯︎ |                                                   |
| NGO profile: can like posts                       |      | ✅︎   |       |   🎯︎  |                                                   |
| NGO profile: can see likes (own posts)            |  ✅︎  |      |       |   🎯︎  |                                                   |
| NGO profile: can create posts                     |      |      |       | ✅︎ 🎯︎ |                                                   |
| NGO profile: can create posts with image          |  ✅︎  |      |       |   🎯︎  |                                                   |
| NGO profile: can delete posts                     |  ✅︎  |      |       |   🎯︎  |                                                   |
| NGO profile: can edit posts                       |  ✅︎  |      |       |   🎯︎  |                                                   |
| NGO profile: can send DM                          |  ✅︎  |      |       |   🎯︎  |                                                   |
| NGO profile: can read DM                          |  ✅︎  |      |       |   🎯︎  |                                                   |
| NGO profile: can create events                    |      |      |  ✅︎   |   🎯︎  | Only in profile page. Block on empty desc, no warning why |
| NGO profile: can create events - with image       |  ✅︎  |      |       |   🎯︎  |                                                   |
| NGO profile: can cancel events                    |  ✅︎  |      |       |   🎯︎  |                                                   |
| NGO profile: can delete events                    |  ✅︎  |      |       |   🎯︎  |                                                   |
| NGO profile: can edit events                      |  ✅︎  |      |       |   🎯︎  |                                                   |
| NGO profile: can see list of goers                |  ✅︎  |      |       |   🎯︎  |                                                   |
| NGO profile: can create open positions            |  ✅︎  |      |       |   🎯︎  |                                                   |
| NGO profile: can create open positions - with img |  ✅︎  |      |       |   🎯︎  |                                                   |
| NGO profile: can delete positions                 |  ✅︎  |      |       |   🎯︎  |                                                   |
| NGO profile: can edit positions                   |  ✅︎  |      |       |   🎯︎  |                                                   |
| NGO profile: can close open position              |  ✅︎  |      |       |   🎯︎  |                                                   |
| NGO profile: can see people applied to possition  |  ✅︎  |      |       |   🎯︎  |                                                   |
| NGO profile: can see people offering a skill      |  ✅︎  |      |       |   🎯︎  |                                                   |
| NGO profile: can DM people applied to possitions  |  ✅︎  |      |       |   🎯︎  | From the list of applied people                   |
| NGO profile: can DM people offering a skill       |  ✅︎  |      |       |   🎯︎  | From the list of applied people                   |
| NGO profile: can create group DMs                 |  ✅︎  |      |       |   🎯︎  |                                                   |
| NGO profile: Notification for post comment        |  ✅︎  |      |       |   🎯︎  |                                                   |
| NGO profile: Notification for applied possition   |  ✅︎  |      |       |   🎯︎  |                                                   |
| NGO profile: Notification for offered skill       |  ✅︎  |      |       |   🎯︎  |                                                   |
| NGO profile: Follow post option                   |  ✅︎  |      |       |   🎯︎  |                                                   |


### TODOs

- [x] Create a API/subcomponent for image upload (`/api/files`)
- [x] Add ability to upload profile image
- [x] Add ability to upload post image

- [ ] Implement single and group chat functionality


## Feature backlog

- [] Make every post have it's own URL and implement the external share button (just copies URL)
- [] Implement a internal post share - from feed to your profile  (currently just a placeholder)
- [] Following/subscriptions to post/profiles/pages/
- [] Circle functionality - custom feeds
- [] NGO/users can create project pages/feeds
- [] NGO/users can create forums/groups
- [] Add "Stats" page - Displaying total number of users, organizations, and all 3 type of post count


## Non-protoype todo

- ActivityPub: Basic federadecentralization (this should be the first thing on the list after prototype is ready!)
- ActivityPub: Profile and images migration
- Email verification, password reset
- Real push/email notifications for subscriptions
- CSRF tokens, rate limiting
- A real database (currently bunch of human readable JSON files - about one JSON file per each future table)
- Well defined REST API seperation for ability to have independent implementations of BE and FE (API versioning must be robust!)
