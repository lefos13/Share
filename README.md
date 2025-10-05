# Share

## Overview

Share is the Node.js/Express backend that powers the “Share the Ride” carpooling platform. It exposes REST and WebSocket APIs for managing ride posts, interests, reviews, real-time chat, group rides, notifications, and static marketing pages. The service integrates with MySQL via Sequelize, Firebase Cloud Messaging for push notifications, Redis for caching experiments, Google Maps APIs (proxied), and scheduled jobs for background maintenance.

### Highlights

- Multi-language (Greek/English) responses selected per request headers.
- JWT-secured REST APIs for riders, drivers, posts, reviews, and requests.
- Real-time chat using Socket.IO with optional AES encryption of payloads.
- Group ride workflows with invitations, approvals, and shared conversations.
- Firebase push notifications, email OTP flows, and in-app notification ledger.
- Cron jobs to prune stale posts/conversations and keep rider statistics fresh.
- Static landing pages, privacy terms, and REST client collections for quick testing.

## Architecture

The codebase follows a layered architecture:

- **Express entrypoint (`src/index.js`)** – sets up middleware, database connectivity, Redis, Google Maps proxy routes, static assets, Socket.IO server, and route bindings.
- **Routing (`src/v1/routes/**`)\*\* – organizes REST endpoints by domain (posts, users, reviews, requests, last searches, neutral utilities, groups).
- **Controllers (`src/controllers/**`)\*\* – adapt HTTP requests to service calls, translate localization messages, and shape responses.
- **Services (`src/services/**`)\*\* – house business logic (validations, orchestration, notifications, chat hooks, analytics).
- **Data access (`src/database/**`)** – query helper modules built on top of Sequelize models defined under `src/modules/\*\*`.
- **Utilities (`src/utils/functions.js`)** – shared helpers for localization, notifications, chat encryption, Firebase/mailer integrations, and socket orchestration.
- **Jobs (`src/jobs/jobs.js`)** – scheduled maintenance with `node-schedule`.
- **Static assets (`src/static-page/**`)** – marketing site served via Express (`/web`, `/web2`).
- **Terms & policies (`terms/`, `termsPolicies/`)** – served as static HTML/text.

## Tech Stack

| Layer           | Stack                                         |
| --------------- | --------------------------------------------- |
| Runtime         | Node.js (tested with v16+), Express 4         |
| Database        | MySQL 5.7+/8 via Sequelize ORM                |
| Cache/Messaging | Redis (v4 client, optional)                   |
| Real-time       | Socket.IO                                     |
| Scheduling      | node-schedule                                 |
| Notifications   | Firebase Admin SDK, Nodemailer (Gmail)        |
| Auth/Security   | JSON Web Tokens, Helmet, CORS                 |
| Tooling         | Nodemon, Babel/Uglify for static asset builds |

## Directory Map

```text
src/
  index.js             # Express bootstrap & Socket.IO server
  package.json         # Runtime dependencies & scripts
  controllers/         # Thin REST handlers
  services/            # Business logic per domain
  modules/             # Sequelize model definitions
  database/            # Data access helpers per model
  middleware/          # Auth JWT middleware
  jobs/                # Scheduled maintenance jobs
  utils/               # Cross-cutting helpers (notifications, crypto, i18n)
  clientVersions/      # Mobile minimum version gate JSON
  lang/                # Localization bundles (EN/GR)
  v1/routes/           # Express routers per resource
  static-page/         # Landing page bundles & assets
  terms/, termsPolicies/ # Legal text served via `/neutral/getTerms` etc.
  test.rest            # VS Code REST client collection covering APIs
uploads/, postImages/   # User-generated assets (not tracked in Git)
```

## Getting Started

### Prerequisites

- Node.js ≥ 16 (uses optional chaining and ES2021 syntax).
- MySQL instance with a database matching the name in `.env`.
- Redis server (optional but required if you plan to extend caching logic).
- Firebase service account credentials (for push notifications).
- Gmail account (or SMTP credentials) for OTP/notification emails.

### Environment Variables

Create `src/.env` (or configure host-level variables) with the following keys:

| Variable                         | Description                                                                  |
| -------------------------------- | ---------------------------------------------------------------------------- |
| `HOST`                           | MySQL host (e.g. `127.0.0.1`).                                               |
| `USERR`                          | MySQL username (note the double “R” aligns with existing code).              |
| `PASS`                           | MySQL password.                                                              |
| `DATABASE`                       | MySQL database name used by Sequelize models.                                |
| `TOKEN_KEY`                      | Secret used to sign/verify JWTs.                                             |
| `GOOGLE_KEY`                     | Google Maps Places/Geocode API key for proxy routes.                         |
| `EMAIL`                          | SMTP user for OTP and transactional mail (default code expects Gmail).       |
| `PASSEMAIL`                      | SMTP password or app password for the above account.                         |
| `KEYCRYPTO`                      | 32-byte AES key (hex-encoded) for chat message encryption.                   |
| `IVHEX`                          | 16-byte IV (hex-encoded) paired with `KEYCRYPTO`.                            |
| `GOOGLE_APPLICATION_CREDENTIALS` | Absolute path to Firebase service-account JSON (used by Firebase Admin SDK). |

> **Note:** There is no migration tooling bundled. Create your schema manually to match the Sequelize models in `src/modules/**`.

### Installation

1. Install dependencies:

```powershell
cd src
npm install
```

1. Ensure MySQL and Redis are running and accessible using the credentials above.
1. (Optional) Build/minify static marketing assets:

```powershell
npm run compile-js
npm run minify-js
```

### Running Locally

Launch the development server (with auto-reload via nodemon):

```powershell
npm run start
```

The API listens on `http://0.0.0.0:3000`. Static content is available at:

- `/web/` → Marketing bundle under `static-page/`.
- `/web2/` → Vue build under `static-page/site-vue/hello-world/dist`.
- `/images`, `/postimages` → Uploaded media (ensure directories exist).

### REST Client Collection

Open `src/test.rest` or `src/test copy.rest` with the VS Code REST Client extension to trigger sample requests covering most endpoints.

## Authentication & Authorization

- JWT tokens are expected in the `Authorization: Bearer <token>` header.
- `/users/createtoken` issues JWTs after OTP validation.
- Most routes require authentication (enforced by `middleware/auth.js`), except registration, OTP, token creation, public reports, group web hooks, and health probes.
- Tokens embed the user email which controllers access via `req.body.extra`.

## Database Entities

Sequelize models (under `src/modules/`) map to MySQL tables:

| Model            | Table            | Purpose                                                                            |
| ---------------- | ---------------- | ---------------------------------------------------------------------------------- |
| `user`           | `users`          | User profiles, credentials, socket state, language, driver/passenger counters.     |
| `post`           | `posts`          | Ride listings (dates, seats, preferences, favourite flags, images).                |
| `postinterested` | `postinterested` | Passenger interests, verification status, notification flags, optional group link. |
| `review`         | `reviews`        | Peer feedback entries with ratings/text.                                           |
| `request`        | `postsearch`     | Saved ride requests (passenger looking for ride).                                  |
| `lastsearch`     | `lastsearches`   | Recent & favourite searches per user.                                              |
| `notifications`  | `notifications`  | Server-side notification ledger surfaced via `/neutral/getNotifications`.          |
| `convusers`      | `convusers`      | One-on-one chats, encrypted message history, expiration.                           |
| `convgroups`     | `convgroups`     | Group chat conversations keyed by group ID.                                        |
| `group`          | `groups`         | Carpool groups (admin, members, pending invites).                                  |
| `toreview`       | `toreview`       | Queue of user pairs that should leave a review after a trip.                       |
| `fcmtoken`       | `fcmtoken`       | Mapping of user emails to Firebase device tokens.                                  |

Additional helper tables exist in `src/database/**` for complex queries (pagination, analytics, language resolution).

## HTTP API Overview

### User & Auth (`/users`)

| Method | Path                     | Auth | Description                                                                               |
| ------ | ------------------------ | ---- | ----------------------------------------------------------------------------------------- |
| POST   | `/users/register`        | No   | Register user (saves profile, sends OTP email).                                           |
| POST   | `/users/verify`          | No   | Confirm OTP and mark user as verified.                                                    |
| POST   | `/users/createtoken`     | No   | Issue JWT and resend OTP if needed.                                                       |
| POST   | `/users/passotp`         | No   | Trigger password-reset OTP email.                                                         |
| POST   | `/users/updateUserPass`  | No   | Update password (validates current + OTP).                                                |
| POST   | `/users/login`           | Yes  | Authenticate with password/auto-login token, returns minimum client versions and profile. |
| POST   | `/users/loginThirdParty` | No   | Google/third-party login flow that upserts user and token.                                |
| POST   | `/users/updateProfile`   | Yes  | Update personal info and profile photo.                                                   |
| POST   | `/users/searchuser`      | Yes  | Fetch profile + ride stats for a given email.                                             |
| POST   | `/users/searchUsers`     | Yes  | Full name autocomplete for chat/group search.                                             |
| GET    | `/users/notifyMe`        | Yes  | Pending notifications: new interests, review prompts, favourites.                         |
| POST   | `/users/deactivateUser`  | Yes  | Soft-delete account (toggle `deleted`).                                                   |
| POST   | `/users/deleteUser`      | Yes  | Request permanent deletion.                                                               |
| GET    | `/users/1`               | No   | Health probe returning `{ message: 1 }`.                                                  |

### Ride Posts (`/posts`)

| Method | Path                          | Description                                                                    |
| ------ | ----------------------------- | ------------------------------------------------------------------------------ |
| POST   | `/posts/createPost`           | Create a ride (max 3 per day per user, optional image/favourite).              |
| POST   | `/posts/editPost`             | Update ride details and image.                                                 |
| POST   | `/posts/searchposts`          | Search rides with filters (dates, seats, pets, return trip).                   |
| POST   | `/posts/feedScreen`           | Feed tailored to user’s last searches.                                         |
| POST   | `/posts/feedAll`              | Global feed with pagination.                                                   |
| POST   | `/posts/getPostsUser`         | Paginated rides created by a user.                                             |
| GET    | `/posts/getPostPerId`         | Fetch ride by ID.                                                              |
| POST   | `/posts/interested`           | Create/cancel interest in a ride (handles groups, rate limits, notifications). |
| POST   | `/posts/getInterestedPerUser` | Rides the user is interested in.                                               |
| POST   | `/posts/getIntPost`           | Interested passengers for a ride (with pagination).                            |
| POST   | `/posts/deletePost`           | Remove ride and cascading interests.                                           |
| POST   | `/posts/deleteInterested`     | Remove a passenger interest by `piid`.                                         |
| POST   | `/posts/verInterested`        | Approve interest, start chat, update review queue.                             |
| POST   | `/posts/handleFavourite`      | Toggle ride as favourite (max 5 per user).                                     |
| GET    | `/posts/getFavourites`        | Favourite rides + owner snapshots.                                             |

### Requests (`/requests`)

| Method | Path                      | Description                                           |
| ------ | ------------------------- | ----------------------------------------------------- |
| POST   | `/requests/createRequest` | Save a “looking for ride” request (driver discovery). |
| GET    | `/requests/getRequests`   | List active ride requests for the logged-in user.     |
| POST   | `/requests/deleteRequest` | Remove request by `postSearchId`.                     |

### Reviews (`/reviews`)

| Method | Path                    | Description                                       |
| ------ | ----------------------- | ------------------------------------------------- |
| POST   | `/reviews/getReviews`   | Paginated reviews for a user including averages.  |
| POST   | `/reviews/createreview` | Create or update review (driven by review queue). |

### Last Searches (`/searches`)

| Method | Path                           | Description                                      |
| ------ | ------------------------------ | ------------------------------------------------ |
| POST   | `/searches/addFavouriteSearch` | Store last search and optionally favourite flag. |
| GET    | `/searches/getAllSearches`     | Retrieve favourites and history.                 |
| POST   | `/searches/deleteFavourite`    | Remove favourite search by `lsid`.               |

### Neutral Utilities (`/neutral`)

| Method | Path                          | Description                                                      |
| ------ | ----------------------------- | ---------------------------------------------------------------- |
| POST   | `/neutral/sendReport`         | Authenticated support/contact form submission emailed to admins. |
| POST   | `/neutral/webSendReport`      | Public version for marketing site contact form.                  |
| GET    | `/neutral/getTerms`           | Return HTML terms/privacy text based on query.                   |
| POST   | `/neutral/moreMessages`       | Paginate older direct chat messages (AES decrypted server-side). |
| POST   | `/neutral/moreMessagesGroups` | Paginate older group chat messages.                              |
| GET    | `/neutral/getNotifications`   | List in-app notifications stored in DB.                          |
| POST   | `/neutral/readNotification`   | Mark notification as read.                                       |
| POST   | `/neutral/deleteNotification` | Delete notification record.                                      |

### Group Rides (`/groups`)

| Method | Path                        | Description                                        |
| ------ | --------------------------- | -------------------------------------------------- |
| POST   | `/groups/createGroup`       | Create a ride group and bootstrap chat.            |
| GET    | `/groups/getGroups`         | List groups (admin + membership info).             |
| POST   | `/groups/deleteGroup`       | Delete a group (fails if active post is tied).     |
| POST   | `/groups/changeName`        | Rename group.                                      |
| POST   | `/groups/leaveGroup`        | Leave or remove member, handles pending approvals. |
| POST   | `/groups/acceptInvitation`  | Accept group invite and update notifications.      |
| POST   | `/groups/declineInvitation` | Decline invite and notify admin.                   |

### Google Maps Proxy

- `GET /autocomplete/json?input=...` – proxied to Places Autocomplete with enforced language/region.
- `GET /details/json?place_id=...` – proxied to retrieve place geometry.
- `GET /geocode/json?latlng=...` – proxied to geocode coordinates to locality (Greek language).

All proxies inherit authentication middleware and append the `GOOGLE_KEY` server-side to avoid exposing secrets to clients.

## WebSocket API (Socket.IO)

Clients connect to the Socket.IO namespace served alongside Express. The server expects events shaped as `{ type, data }` objects. Core inbound events:

| Event (`action.type`)                                                             | Purpose                                                                             |
| --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `server/join`                                                                     | Register user after login; loads private/group conversations and marks user online. |
| `server/private_message`                                                          | Send direct message; handles encryption, read receipts, Firebase fallback.          |
| `server/private_message_groups`                                                   | Send message within a group conversation.                                           |
| `server/personalChatOpened` / `server/personalChatClosed`                         | Mark active DM for read receipts.                                                   |
| `server/personalGroupChatOpened` / `server/personalGroupChatClosed`               | Same for group chats.                                                               |
| `server/AppInBackground` / `server/AppInForeground`                               | Update presence for notification delivery.                                          |
| `server/ActiveConversationInBackground` / `server/ActiveConversationInForeground` | Fine-grained read receipts and conversation focus events.                           |
| `server/updateExpirationDate`                                                     | Refresh chat expiration when approvals change.                                      |
| `server/replace_socket_id`                                                        | Recover session when socket ID changes (e.g., reconnect).                           |
| `server/handShakeEstablished`                                                     | Bootstrap chat immediately after verification handshake.                            |

Outbound events (emitted by the server) include `conversations`, `conversationsGroups`, `private_message`, `setConversationSeen`, `setIsConversationRead`, `onConversationAdded`, and group-specific read/online indicators. See `src/index.js` for the full event catalogue and payload shapes.

Encryption of stored messages is controlled by the `allowCrypto` flag. When enabled, messages are encrypted with AES-256-CBC using `KEYCRYPTO`/`IVHEX` before persisting to MySQL and decrypted on retrieval.

## Background Jobs

Defined in `src/jobs/jobs.js` and started on server boot:

1. **deleteOldPosts (daily 00:45)** – Purges posts older than three months, removes related interests, and archives the post JSON under a `deleted/` snapshot.
2. **deleteConversations (daily 00:30)** – Removes expired conversations based on `expiresIn` dates.
3. **addNewDriversPassengers (daily 00:30)** – Increments `asDriver`/`asPassenger` counters for users whose rides expired the previous day and had verified passengers.

Adjust schedules via standard cron syntax strings in `jobs.js`.

## Notifications & Messaging

- **Firebase Cloud Messaging** – `utils/functions.js` sends push notifications for interest approvals, group events, chat fallbacks, and reminder flows. Ensure `GOOGLE_APPLICATION_CREDENTIALS` points to a valid service account with Messaging access.
- **Email (Nodemailer)** – SMTP credentials dispatch OTPs and contact form submissions.
- **In-app notifications** – Stored in `notifications` table, retrievable by `/neutral/getNotifications`.

## Internationalization (i18n)

- Language preference is detected via request `Accept-Language` header and persisted on the user record.
- Localized strings live in `src/lang/english.json` and `src/lang/greek.json`.
- Controllers invoke `determineLang` to pick correct copy for success/error messages and notifications.

## Version Gating

- Minimum mobile app versions are read from `src/clientVersions/versions.json` and returned by login flows (`minimumAndroidVersion`, `minimumIosVersion`). Update this file to force client upgrades without redeploying code.

## Static Assets & Legal Content

- Marketing site is bundled under `src/static-page/` and exposed via `/web` and `/web2`.
- Privacy terms localized in `termsPolicies/` are served through the neutral controller and also accessible as static downloads.
- Uploaded user avatars are stored as `<email>.jpeg` under `uploads/` and served via `/images/...`.

## Development Notes

- Use the VS Code REST Client file (`test.rest`) as an executable API notebook.
- Socket events can be inspected via logs emitted throughout `src/index.js`.
- Redis is currently wired with a sample key set/get to verify connectivity; extend `redisClient` usage for caching heavy queries or rate limiting as needed.
- No automated tests are bundled. Consider adding Jest/Mocha suites for services and controllers.

## Deployment Tips

- Replace `npm run start` (nodemon) with `node index.js` or a process manager (PM2, systemd) in production.
- Keep `allowCrypto` enabled in production to persist encrypted chat history.
- Ensure directories `uploads/`, `postImages/`, and `deleted/` exist with write permissions.
- Secure SMTP/Google credentials via environment secrets rather than checking into source control.

## Maintenance & Next Steps

- Document database schema migrations (consider adding Sequelize migrations or Prisma).
- Expand Redis usage for frequently accessed lists (feeds, notifications).
- Introduce automated integration tests covering interest approval and chat flows.
- Review authentication middleware (e.g., allowing login without prior token) to match desired UX.

For additional context on historical API changes, refer to the `Documentation` file in the repository root, which chronicles endpoint adjustments chronologically.
