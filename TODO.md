
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
  - email notifications
  - map of local NGOs, users, events, ...
  - list/overview of open public tenders / founding announcements
    - register for notification
  - de-centralized using ActivityPub

### General timeline

  - Local dev
  - Under test domain: UI/UX reviews

  - Under test domain: Real usage tests
      - general feature tests
      - password still not choosable

  - Under its own domain:
      - JSON --> SQL
      - SQL injection and good safety practices reviews
      - password protection reviews
      - email notifications
      - server moderation
      - usage stats

## Prompts

Do you see any dead code?
Do you see any technical debt?
Do you see any duplicated code?
Do all function names match their behavior?
Do you see any places in code where adding an interface would be beneficial?

Do you have any suggestions on how to better organize the code?
Do you have any suggestions on how to better organize the source code files?
Do you have any suggestions on how to better organize the JavaScript code into multiple files?
Do you have any suggestions on improving the code architecture?
Explain what is the "separation of concerns principle". Does the code adhere to the separation of concerns principle?
Suggest next steps

Are all functions documented? If not, add the documentation. Are all comments in the code up to date? If not, update them. Do not modify code logic.
Check if README.md or ARCHITECTURE.md need an update

Draw on ASCII-friednly overview of XYZ

## Small issues - backlog

 - [ ] No user profile image visible in the comments section
 - [x] Doens't let you to apply to a position unless you enabled "Looking for volunteering positions" (removed gate — apply no longer requires the checkbox)
 - [ ] /#/profile looks horrible even by my standards
 - [ ] Org profile's "Position applicants" and "Skill offers" - need some way to remove them after they are no longer relevant. Maybe just delete/remove/hide button for start?

 - [ ] /#/messages: Ability to set chat title

# TIME-SLOT - Month 9

- Most of the prototype development is done, so at the end of the month the UX/UI check phase begins with whatever I have at that moment (otherwise I will keep delaying it)

- It would be nice to finish all standard user features (movements orgs, custom feeds, org moderators+members, solution against rage-baiting)
- Idealy, server moderation would be also done by the end of the month

## PHASE #1 - UI/UX check: Make it good/complete enough to put it on-line for UI/UX people to take a look

- I don't think it makes sense to ask for UI/UX check until all major development is done, so I can focus on UX
- Basically add as much clickable/interactive stuff and dialogs so that UX people have something to looks at + DM support for communication

### Milestone #1 - Direct and group messages ✓
### Milestone #2 - More flexible org profile management ✓
### Milestone #3 - Support for notifications ✓
### Milestone #4 - Follow post feature ✓
### Milestone #5 - Follow organization feature ✓
### Milestone #6 - Deleting posts/events/positions ✓
### Milestone #7 - Editing posts/events/positions ✓
### Milestone #8 - Full functionality for applying to position ✓
### Milestone #9 - Full functionality for offering skils ✓
### Milestone #10 - Full functionality for events ✓
### Milestone #11 - Ability to set/change a chat title ✓

### Milestone #x - User/ORG profile can create "movements"

 - [ ] TODO: Define tasks

### Milestone #x - User/ORG profile can create multiple custom feeds (like g. circles)

 - [ ] TODO: Define tasks

## Milestone #x - Orgs admins/moderators/members

  - [x] Instead of single username/password for organizations, make user create org, add and remove members/moderators/admins
    - Admins - only ones that can add/remove other members/moderators/admins
    - Moderators - can delete post replays on ORG's posts
    - Members - seen as members when responding to ORG posts, can participate in ORG custom chats


### Milestone #x - Followers, supporters, friends?

 - Solution for rage-baiting algos?
    - High engagement filtering is useful, but also very rage-baiting
    - Add multiple type of reactions - support, sad, insightful, inspirative - and add option for algos to prioritize only specific engagement type?

 - Friends to see who knows who? (Do I actually need this or is following enough?)
 - Users and organizations should be able to "follow" and "unfollow" each other
 - Organizations should be able to know which users are interested in volunteering for them

### Milestone #x - Forums (ala FB groups)


## Milestone #x - Server general/health stats

- Add an server administration panel that shows:
  - General stats (disk usage, number of users)
  - Health stats (logs of errors and triggered asserts, ...)

## Milestone #x - Server moderators

 - [ ] TODO: Define tasks

### Milestone #x - 
### Milestone #x - 
### Milestone #x - 



### Phase full feature table ✓

✅︎  - Current state
🎯︎  - Target

| Feature name                                      | None | Mock | Proto | Full  | Notes                                             |
| ------------------------------------------------- | ---- | ---- | ----- | ----- | ------------------------------------------------- |
| Registration                                      |      |      |  ✅︎🎯︎ |       | can create profiles, but no password input/change |
| Non-logged / public: can see all posts            |      |      |       | ✅︎ 🎯︎ |                                                   |
| Non-logged / public: can see all events           |      |      |       | ✅︎ 🎯︎ |                                                   |
| Non-logged / public: can see all map              |      |      |       | ✅︎ 🎯︎ |                                                   |
|        --- Ordinary users ---                                                                                                      |
| User profile: can create posts                    |      |      |       | ✅︎ 🎯︎ |                                                   |
| User profile: can create posts with image         |      |      |       | ✅︎ 🎯︎ |                                                   |
| User profile: can delete posts                    |  ✅︎  |      |       |   🎯︎  |                                                   |
| User profile: can edit posts                      |  ✅︎  |      |       |   🎯︎  |                                                   |
| User profile: can comment posts                   |      |      |       | ✅︎ 🎯︎ |                                                   |
| User profile: can like posts                      |      |  ✅︎  |       |   🎯︎  | Colors a like button, but dissapers on refresh    |
| User profile: can see likes (own posts)           |  ✅︎  |      |       |   🎯︎  | No counter at all, or ways to see who liked       |
| User profile: can offer skills                    |      |  ✅︎  |       |   🎯︎  | There is a dialog, need to check if it goes to DB |
| User profile: can apply to valunteer adds         |      |      |   ✅︎  |   🎯︎  | Button in "Positions" tab, but not in "Feed"      |
| User profile: can see offered skills              |  ✅︎  |      |       |   🎯︎  |                                                   |
| User profile: can send DM                         |      |      |       | ✅︎ 🎯︎ |                                                   |
| User profile: can read DM                         |      |      |       | ✅︎ 🎯︎ |                                                   |
| User profile: can create group DMs                |      |      |       | ✅︎ 🎯︎ |                                                   |
| User profile: Notification for post comment       |  ✅︎  |      |       |   🎯︎  |                                                   |
| User profile: Notification for accepted position  |  ✅︎  |      |       |   🎯︎  |                                                   |
| User profile: Notification for accepted skill     |  ✅︎  |      |       |   🎯︎  |                                                   |
| User profile: Follow post option                  |  ✅︎  |      |       |   🎯︎  |                                                   |
|        --- Organization profile ---                                                                                                 |
| Org profile: can see all posts                    |      |      |       | ✅︎ 🎯︎ |                                                   |
| Org profile: can comment                          |      |      |       | ✅︎ 🎯︎ |                                                   |
| Org profile: can like posts                       |      | ✅︎   |       |   🎯︎  |                                                   |
| Org profile: can see likes (own posts)            |  ✅︎  |      |       |   🎯︎  |                                                   |
| Org profile: can create posts                     |      |      |       | ✅︎ 🎯︎ |                                                   |
| Org profile: can create posts with image          |      |      |       | ✅︎ 🎯︎ |                                                   |
| Org profile: can delete posts                     |  ✅︎  |      |       |   🎯︎  |                                                   |
| Org profile: can edit posts                       |  ✅︎  |      |       |   🎯︎  |                                                   |
| Org profile: can send DM                          |      |      |       | ✅︎ 🎯︎ |                                                   |
| Org profile: can read DM                          |      |      |       | ✅︎ 🎯︎ |                                                   |
| Org profile: can create events                    |      |      |  ✅︎   |   🎯︎  | Only in profile page. Block on empty desc, no warning why |
| Org profile: can create events - with image       |      |      |       | ?? 🎯︎ |                                                   |
| Org profile: can cancel events                    |  ✅︎  |      |       |   🎯︎  |                                                   |
| Org profile: can delete events                    |  ✅︎  |      |       |   🎯︎  |                                                   |
| Org profile: can edit events                      |  ✅︎  |      |       |   🎯︎  |                                                   |
| Org profile: can see list of goers                |  ✅︎  |      |       |   🎯︎  |                                                   |
| Org profile: can create open positions            |  ✅︎  |      |       |   🎯︎  |                                                   |
| Org profile: can create open positions - with img |  ✅︎  |      |       |   🎯︎  |                                                   |
| Org profile: can delete positions                 |  ✅︎  |      |       |   🎯︎  |                                                   |
| Org profile: can edit positions                   |  ✅︎  |      |       |   🎯︎  |                                                   |
| Org profile: can close open position              |  ✅︎  |      |       |   🎯︎  |                                                   |
| Org profile: can see people applied to possition  |  ✅︎  |      |       |   🎯︎  |                                                   |
| Org profile: can see people offering a skill      |  ✅︎  |      |       |   🎯︎  |                                                   |
| Org profile: can DM people applied to possitions  |      |      |       | ?? 🎯︎ | From the list of applied people                   |
| Org profile: can DM people offering a skill       |      |      |       | ?? 🎯︎ | From the list of applied people                   |
| Org profile: can create group DMs                 |      |      |       | ✅︎ 🎯︎ |                                                   |
| Org profile: Notification for post comment        |  ✅︎  |      |       |   🎯︎  |                                                   |
| Org profile: Notification for applied possition   |  ✅︎  |      |       |   🎯︎  |                                                   |
| Org profile: Notification for offered skill       |  ✅︎  |      |       |   🎯︎  |                                                   |
| Org profile: Follow post option                   |  ✅︎  |      |       |   🎯︎  |                                                   |



# TIME-SLOT Month 10

## PHASE #6 - The most basic ActivityPub integration

- [] Add feature table

## PHASE #7 - open-volunteering instances discovery service

  - One or more servers where Open-volunteering instances can register themself so they can be discovered by others instances

- [] Add feature table

## PHASE #8 - Post analytics for posters

# Other

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
