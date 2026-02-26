# Short description

Social network for volunteers and volunteer organizations

# Specifications

## Technical

- **Front-end:** Vanilla JavaScript
- **Back-end:** Vanilla PHP
- **Data storage:** JSON files (for the prototyping phase, later SQL)

## Features and Specification

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
- organizations and volunteer can see a calendar page with list of events happening in next 4 weeks
- organizations and volunteer can create a project page which contains description of a project and news posts about it
- A volunteer can set themselves available to an organization, project, or event
  - a volunteer can add which skills they are offering to the organization, project, or event


### Web pages

#### 1. Page: feed page (default home page)

- if the user is not logged in
  - If user is not logged in, user can still see everything because there are no private posts
  - user can choose the algorithm for how the feed chooses content presented on feed

- If the user is logged in
  - user can comment on posts
  - user can share posts
  - user can create a post

- The feed
  - There is no endless scrolling feature. At the end of feed, there is a link for the second page of the feed and so on.
  - The user can set how many posts the user can see per page


#### 2. Page: volunteer/organization profile page

Shows:
- volunteer's skills if set
- volunteer's volunteering experience if set
- The feed of the volunteer/organization

#### 3. Page: Calendar of events

- List all events in the next 1 year, ordered chronologically

#### 4. Page: Map of organizations and events

- Shows map with organizations locations on the map


