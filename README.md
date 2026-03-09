# Short description

Social network for volunteers and volunteer organizations

# Development plan

## High-level

1. Initial minimalistic prototype with split between back-end <-> REST API <-> front-end
2. Add all features neccessary for public testing
3. Make it decentralized ala Fediverse/ActivityPub 
  - not one central server but organizations can run their own servers that communicates with each other
  - Fediverse/ActivityPub compatible

## Milestone #1 - 1st working prototype with only one user type, opening and seeing and commenting volunteering positions

### Feature list

- Pages:
  - Feed page
    - You can open a volunteering position
    - You can scroll through all already existing volunteering positions
    - You can comment on a volunteering position

  - Profile page
    - User can see its name and bio

- Common to all pages
  - User switcher - development tool to easily switch between users for testing purposes
  - Navigation page at the top of the screen containing buttons for opening feed page or a profile page


Other info:
  - No register or login page. Prototype will have already created/pre-seeded users in the JSON file


### Technical

- **Front-end:** Vanilla JavaScript (no frameworks)
- **Back-end:** Vanilla PHP (no frameworks)
- **Data storage:** JSON files (for the prototyping phase, later SQL)

- Split the app between back-end and front-end using REST API

## Milestone #2 - 1st public testing release

### Feature list

- Can register as user and select zero, one or more roles (volunteer, organization member)
- User can edit its roles anytime
- Registered user can create an organization, that can be registered organization or unofficial/informal organization
- User can switch between user profile and profile of organization he/she manages
- Organization can open a volunteering position
- Users and organizations can
  - Create a post
  - Comment on a post

- The app has 3 pages
  - Available volunteer positions page 
    - Lists all open volunteer positions

  - Feed page 
    - where all post of users and organizations can be seen

  - Your own profile page (either user or organization) 
    - for seeing/editing profile data

  - Someone else's profile page 
    - seeing profile data


# Specifications

## Technical

- **Front-end:** Vanilla JavaScript
- **Back-end:** Vanilla PHP
- **Data storage:** JSON files (for the prototyping phase, later SQL)


## Project structure

```
├── index.html       # App entry point
├── public/          # Frontend assets
│   ├── css/
│   └── js/
├── api/             # PHP REST API
├── data/            # JSON storage (users, positions, comments)
└── ui_prototypes/   # Design references
```

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

#### Page: Available volunteer positions

- if the user is not logged in
  - If user is not logged in, user can still see every position because there are no private positions
  - user can choose the algorithm for how the feed chooses presented content (newest to latest / most liked/supported, by location, only remote)

- If the user is logged in
  - 

#### Page: feed page (default home page)

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


#### Page: volunteer/organization profile page

Shows:
- volunteer's skills if set
- volunteer's volunteering experience if set
- The feed of the volunteer/organization

#### Page: Calendar of events

- List all events in the next 1 year, ordered chronologically

#### Page: Map of organizations and events

- Shows map with organizations locations on the map


