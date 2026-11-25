# HueVistaa Partner

The phone app for the businesses that work with HueVistaa: **paint shops** and **painters**. There
is one app and one sign-in, and the account decides which side opens. Somebody who is more than one
of these on the same sign-in — a shop owner who also paints, a painter with a counter, an owner with
two branches — switches between them from **Me** ("Your other work"); a shop asks for the code
emailed to them first on a new phone. A shop owner starts their painter work there too ("Work as a
painter too"), which keeps it apart from the shop. Somebody whose own sign-in is a customer's, with a
shop the team added to it, goes straight into that shop.

**A shop** (its owner) sees its day:

| Tab | What it's for |
| --- | --- |
| **Today** | What needs the owner, first: price questions from the staff, and asks for leave. Then today's register (who is in, who isn't marked), and what waits on the website (painters' claims, the godown, painters' payments). When nothing is waiting, it says so. |
| **Staff** | The register for any day: each person's mark, from where and when, how late, and the note they left when they marked from away. A tap marks a day; **Mark the rest present** covers everyone not marked yet. Under it are the places staff mark in from, and **Save where I am now** saves one from where the owner stands. |
| **Asks** | Answer a price question in a line the employee reads in the HueVistaa Staff app. Approve leave (paid or without pay), or refuse it with a word. |
| **Prices** | The shop's price list, searched as it's typed, with the lowest price covered until tapped. Changing prices is on the website. |
| **Me** | The account, the shop, the shop's website (salaries, claims, the godown book, editing prices), the language, help, sign out. |

**A painter** has the painter side from the HueVistaa app, screen for screen (P1–P20):

- points and their statement;
- **Scan** a finished board's QR, or upload the board's PDF;
- rewards and vouchers;
- being found by customers nearby;
- their own books (team, estimates, sites, and their shops' khata);
- their trade profile.

Everything works in Hindi and English, and in light and dark. [docs/screens.md](docs/screens.md)
has every screen, and [docs/design.md](docs/design.md) has the design.

The other apps:

- **HueVistaa Staff**, for the people at a shop's counter.
- **HueVistaa**, for homeowners. It is homeowners-only: a painter or a shop signing in there is
  sent here (VikramMali14/HuevistaaMobile#53).

All three talk to the same backend (`api.huevistaa.com`).

## Getting started

Expo SDK 57, React Native 0.86, TypeScript, expo-router.

```bash
npm install
```

```bash
cp .env.example .env
```

```bash
npm start
```

It opens in **Expo Go**, on a phone or an Android emulator. Point `EXPO_PUBLIC_API_ORIGIN` in `.env`
at a HueVista backend; the Android emulator reaches this computer at `http://10.0.2.2:8080`.

| Script | What it does |
| --- | --- |
| `npm start` | Metro, for Expo Go or an emulator |
| `npm run web` | The screens in a browser, for a quick look (tokens are kept in memory there) |
| `npm run typecheck` | TypeScript, strict |
| `npm run lint` | ESLint with Expo's config and the React Compiler's rules |
| `npm test` | Jest: unit tests, and both sides through their real routes with only the network faked |
| `npm run check` | All three |
| `npm run icons` | Draws the icon and splash images again (`scripts/make-icons.py`, Python with Pillow) |
| `npm run board-reader` | Builds the board reader's page again (pdf.js and jsQR in a WebView, for a board's PDF) |

## Signing in

The rules are the same as on the partner website:

- **Mobile number:** `POST /api/auth/phone/verify` with `intent: "shop"`.
  - A painter's or a shop's number signs in.
  - A shop on a phone it hasn't used for 30 days first confirms a code sent to its email. The
    phone is then trusted for 30 days, and its token is kept in secure storage, across sign-outs.
  - A number with no shop or painter behind it opens nothing (`shopSignupRequired`). The app offers
    the shop's free trial and joining as a painter, both on the website.
- **Email and password:** the same, with the same emailed code for a shop on a new phone.
- **Not a shop or a painter:** nothing of the sign-in is kept, and the app says where the account
  belongs. It is not ended on the server, because the backend's logout ends every session the
  account has, and their own app should stay signed in.
  - Somebody at a shop's counter: HueVistaa Staff.
  - A homeowner: HueVistaa.
  - An admin or a distributor: the website.

The rule lives in one place, `src/auth/sides.ts`.

A link that arrives while nobody is signed in is kept through the sign-in
(`src/auth/pending-route.ts`, as in the HueVistaa app). That is how the HueVistaa app hands a
painter over: its board links open `huevistaapartner://painter/claim/{token}`, and the board's
claim is still there once the painter has signed in. Not after a sign-out by choice, since
whoever signs in next may be someone else.

## The backend it uses

| | |
| --- | --- |
| Sign-in | `POST /api/auth/phone/start`, `…/phone/verify`, `…/login`, `…/login/email-code` (and `/resend`), `GET /api/auth/profile`, `POST /api/auth/refresh`, `…/logout` |
| The shop | `GET /api/organizations/mine`, `GET /api/shop-alerts` |
| The register | `GET /api/organizations/{orgId}/attendance?date=`, `PUT …/attendance/{staffId}/{date}`, `POST …/attendance/day/{date}`, `POST …/attendance/places` |
| Leave | `GET …/attendance/leave`, `POST …/attendance/leave/{id}/answer` |
| Prices | `GET /api/organizations/{orgId}/price-list`, `GET …/price-requests`, `POST …/price-requests/{id}/answer` |
| The painter | `/api/painter/**`, `/api/painters/me`, `/api/rewards/{token}`, `/api/painter/work/**`, `/api/nearby/**`: the HueVistaa app's own calls |

## How it is laid out

```
app/
  (auth)/                 welcome, phone, code, email, email-code
  shop/                   the shop's side (RETAILER): (tabs) index, staff, asks, prices, me
  painter/                the painter's side (PAINTER): ported from the HueVistaa app
  settings.tsx, edit-name.tsx, mobile-number.tsx, not-partner.tsx
src/
  auth/                   the session (shop or painter), sides.ts, secure token storage
  api/endpoints/          auth, shop, and the painter's: painter, rewards, work, nearby
  features/shop/          ShopContext, the register's sheets, places, price cards, words
  features/painter/       the painter's screens' logic, the board reader
  features/settings/      language, help and sign-out, shared by both sides
  i18n/                   en.ts / hi.ts, with painter-en.ts / painter-hi.ts from the HueVistaa app
  navigation/TabBar.tsx   the bottom bar (a painter's Scan in brass)
```

## Building

EAS profiles are in `eas.json`:

- `development`: an internal build.
- `preview`: an APK to pass around.
- `production`: a Play Store bundle.

Android package and iOS bundle: `com.gridstore.huevistaa.partner`.

```bash
npx eas build --profile preview --platform android
```

## Next

- Notifications: a staff member's price question, an ask for leave, a painter's claim.
- Adding staff, and checking claims and painter sales, in the app. Both are on the website for now.
- The board links (`huevistaa.com/r/…`) opening this app for painters. That needs the website's
  `assetlinks.json` to name this app too.
- Crash reports and over-the-air updates, once the app has an EAS project.
