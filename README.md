# Short description

(Prototype of) Social network for volunteers and volunteer organizations. Vanilla JS SPA + PHP REST API + JSON storage.

## Pages

- **Feed** — unified posts, positions, events with filters, algorithms, pagination
- **Positions** — volunteering positions with apply and comments
- **Calendar** — events for the next 12 months
- **Map** — Leaflet map of organizations, volunteers, positions, events
- **Profile** — edit own profile or view others; orgs manage projects/positions

## Requirements

- XAMPP (Apache + PHP)
- Apache `mod_rewrite` enabled with `AllowOverride All`

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

### TODOs

- [x] /#/positions: Text not visible on "Apply" button
- [x] Move "Post per page" somewhere else. Nobody will chaning it constantly to be on "prime" position
- [x] Above checkboxes, add a dropdown menu for selecting the algorithm for displaying posts 
- [x] Create a completion matrix for all features. Add columns - placeholder, prototype, full functionality + notes
- [] For 1st milestone add how the completion matrix should look like after milestone is done (only add features for this milestone)
    - [x] List here all features the prototype currently support
    - [x] Add features that it should support, either as mock, proto or full
    - [] Update current status for every feature - non-logged
    - [] Update current status for every feature - users / volunteers
    - [] Update current status for every feature - orgs

- [] Positions: Apply button only visible in "Feed" but not in "Volunteering Positions"
- [] Create a API/subcomponent for image upload
  - [] Ask AI for 3 different suggestions for API
  - [] Pick/merge and clean the suggestions
  - []  

## Milestone #1 feature table ✓

✅︎  - Current state
🎯︎  - Target

| Feature name                                      | None | Mock | Proto | Full  | Notes                                             |
| ------------------------------------------------- | ---- | ---- | ----- | ----- | ------------------------------------------------- |
| Registration                                      |      |      |  ✅︎🎯︎ |       | can create profiles, but no password input/change |
| Non-logged / public: can see all posts            |      |      |       | ✅︎ 🎯︎ |                                                   |
| Non-logged / public: can see all events           |      |      |       | ✅︎ 🎯︎ |                                                   |
| Non-logged / public: can see all map              |      |      |       | ✅︎ 🎯︎ |                                                   |
| User profile: can create posts                    |      |      |       | ✅︎ 🎯︎ |                                                   |
| User profile: can create posts with image         | ✅︎   |      |       |   🎯︎  |                                                   |
| User profile: can delete posts                    | ✅︎   |      |       |   🎯︎  |                                                   |
| User profile: can edit posts                      | ✅︎   |      |       |   🎯︎  |                                                   |
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
| NGO profile: can see all posts                    |      |      |       | ✅︎ 🎯︎ |                                                   |
| NGO profile: can comment                          |      |      |       | ✅︎ 🎯︎ |                                                   |
| NGO profile: can like posts                       |      | ✅︎   |       |   🎯︎  |                                                   |
| NGO profile: can see likes (own posts)            | ✅︎   |      |       |   🎯︎  |                                                   |
| NGO profile: can create posts                     |      |      |       | ✅︎ 🎯︎ |                                                   |
| NGO profile: can create posts with image          | ✅︎   |      |       |   🎯︎  |                                                   |
| NGO profile: can delete posts                     | ✅︎   |      |       |   🎯︎  |                                                   |
| NGO profile: can edit posts                       | ✅︎   |      |       |   🎯︎  |                                                   |
| NGO profile: can create events                    |      |      |  ✅︎   |   🎯︎  | Only in profile page. Block on empty desc, no warning why |
| NGO profile: can create events - with image       | ✅︎   |      |       |   🎯︎  |                                                   |
| NGO profile: can cancel events                    | ✅︎   |      |       |   🎯︎  |                                                   |
| NGO profile: can delete events                    | ✅︎   |      |       |   🎯︎  |                                                   |
| NGO profile: can edit events                      | ✅︎   |      |       |   🎯︎  |                                                   |
| NGO profile: can see list of goers                | ✅︎   |      |       |   🎯︎  |                                                   |
| NGO profile: can create open positions            | ✅︎   |      |       |   🎯︎  |                                                   |
| NGO profile: can create open positions - with img | ✅︎   |      |       |   🎯︎  |                                                   |
| NGO profile: can delete positions                 | ✅︎   |      |       |   🎯︎  |                                                   |
| NGO profile: can edit positions                   |      |      |       |   🎯︎  |                                                   |
| NGO profile: can close opened positions           |      |      |       |   🎯︎  |                                                   |
| NGO profile: can see people applied to possitions |      |      |       |   🎯︎  |                                                   |
| NGO profile: can see people offering a skill      |      |      |       |   🎯︎  |                                                   |
| NGO profile: can send DM                          |      |      |       |   🎯︎  |                                                   |
| NGO profile: can read DM                          |      |      |       |   🎯︎  |                                                   |
| NGO profile: can create group DMs                 |  ✅︎  |      |       |   🎯︎  |                                                   |
| NGO profile: Notification for post comment        |      |      |       |   🎯︎  |                                                   |
| NGO profile: Notification for applied possition   |      |      |       |   🎯︎  |                                                   |
| NGO profile: Notification for offered skill       |      |      |       |   🎯︎  |                                                   |


## Milestone backlog

- [] Make every post have it's own URL and implement the share button (currently just a placeholder)
- [] Add "Stats" page - Displaying total number of users, organizations, and all 3 type of post count


## Non-protoype todo

- ActivityPub federation (this should be the first thing on the list after prototype is ready!)
- Email verification, password reset, 
- Real push/email notifications for subscriptions
- CSRF tokens, rate limiting
- A real database (currently bunch of human readable JSON files - about one JSON file per each future table)
- Well defined REST API seperation for ability to have independent implementations of BE and FE (API versioning must be robust!)


# Specifications

For stack and folder layout, see [ARCHITECTURE.md](ARCHITECTURE.md).

## Features and Specification

### Overview

- It will be social-media-like page
- It will be primarily used by people who volunteer and organizations that provide volunteering positions
- There will be two types of users/profiles. An ordinary user (also referenced as volunteers) and an organization.
- Users will be able to creat posts, while organizations will be able to create posts, events and open volunteering positions
- UX: Eaach type of post (user post, organization post, volunteering position, event) will have different color
- It will have 5 pages: "Feed", "Profile", "Calendar", "Map" and page for available volunteering positions


### Use cases

Why would this page be used by volunteers:
- To see the list of open volunteering positions/events
- To subscribe for notifications about new positions/events by category, organization or location
- To create events - opening proposals or organizing activities by volunteers
- To see the calendar of volunteering related activities
- To see the interactive map of organizations at your location
- A volunteer can set themselves available to an organization, project, or event

Why would this page be used by volunteer organizations:
- Can open volunteering positions that other people can see and share
- Can create projects to showcase what they are doing now
- To see the calendar of volunteering related activities
- To see the interactive map of organizations at your location
- Easier communication and information sharing between organizations


### Specification / features

A social-network-like web page where people/organizations could perform the following actions:
- organizations can open volunteering positions
- volunteer can apply for an open volunteering position
- A volunteer can add skills and previous experience (that could be useful for the organization, project, or event) to the personal profile 
- organizations and volunteers can create public posts
- organizations and volunteers can see public posts in their feed
- organizations and volunteers can follow profiles of organizations and volunteers 
- organizations and volunteers can choose algorithm which chooses what they see in their feed
- organizations and volunteers can leave a comment on public posts
- organizations and volunteers can create events (some activity/actions with specific date/range, and physical or online location)
- volunteer can subscribe for new volunteering positions and events from organizations
- organizations and volunteer can set going/maybe on the events
- organizations and volunteer can see a calendar page with list of events happening in next 12 months
- organizations and volunteer can create a project page which contains description of a project and news posts about it
- A volunteer can set themselves available to an organization, project, or event
  - a volunteer can add which skills they are offering to the organization, project, or event


### Web pages

#### Page: Available volunteering positions

- if the user is not logged in
  - If user is not logged in, user can still see every position because there are no private positions
  - user can choose the algorithm for how the feed chooses presented content (newest to latest / most liked/supported, by location, only remote)

- Aditional features if the user is logged in:
  - User can comment on volunteering positions

#### Page: feed page (default home page)

- if the user is not logged in
  - Even if user is not logged in, page visitor can see all posts (user post, organization post, volunteering position, event)
  - user can choose the algorithm for how the feed chooses presented content (newest to latest / most liked/supported, by location, etc)
  - Can filter posts (select with checkboxes which post type to include to the feed)

- Aditional features if the user is logged in:
  - user can comment on posts
  - user can share posts
  - user can create a post
  - user can choose the algorithm for how the feed chooses presented content (newest to latest / most liked/supported, by location, etc)

- The feed
  - There is no endless scrolling feature. At the end of feed, there is a link for the second page of the feed and so on.
  - The user can set how many posts the user can see per page


#### Page: volunteer/organization profile page

Shows users/organizations:
- User/organization description
- User/organization location
- volunteer's skills if set
- volunteer's volunteering experience if set
- The feed of the volunteer/organization

#### Page: Calendar of events

- List all events in the next 1 year

#### Page: Map of organizations and events

- Shows map with organizations HQ locations (if set), user locations (if set) and volunteering positions (if set)




