# Short description

(Prototype of) Social network for volunteers and volunteer organizations. Vanilla JS SPA + PHP REST API + JSON storage.

## Pages

- **Feed** — unified posts, positions, events with filters, algorithms, pagination
- **Positions** — volunteering positions with apply and comments
- **Calendar** — events for the next 12 months
- **Map** — Leaflet map of organizations, volunteers, positions, events
- **Profile** — edit own profile or view others; orgs manage projects/positions; private messaging entry points
- **Messages** — inbox and threads for 1:1 and group chat (header link when logged in)

## Requirements

- XAMPP (Apache + PHP)
- Apache `mod_rewrite` enabled with `AllowOverride All`


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
- organizations and volunteers can follow profiles of organizations and volunteers (toggle on profile pages; notifications when followed authors publish)
- users and organizations can follow individual posts, positions, and events (⋯ menu on feed cards; notifications on new comments)
- organizations and volunteers can choose algorithm which chooses what they see in their feed
- organizations and volunteers can leave a comment on public posts
- logged-in users can send private direct messages and group chats to other users
- organizations can message position applicants and volunteers who offered skills from their profile
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




