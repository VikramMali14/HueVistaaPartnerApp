# The screens

## Signing in — `app/(auth)/`

- **Welcome:** two cards (for paint shops, for painters), one way in, and the language switch.
  Nobody picks a side here; the account they sign in to decides it.
- **Your mobile number**, then **Enter the code** (`intent: "shop"`). Every outcome is handled:
  - the account signs in and opens its side;
  - a shop on a new phone is sent to **Check your email**;
  - no shop or painter behind the number gets the shop's free trial and joining as a painter, on
    the website;
  - somebody at a shop's counter, a homeowner or an admin is told where they belong, with nothing
    kept;
  - a number held unconfirmed by another account gets **Sign in with email** or **This isn't my
    account — continue**.
- **Sign in with email:** the same outcomes.
- **Check your email:** a shop's emailed code. Confirming it keeps this phone trusted for 30 days.

## The shop — `app/shop/`

Behind a RETAILER-only guard. The shop on screen is chosen once, and every tab follows it
(`ShopContext`). An owner of one shop never sees the switch.

### Today · `(tabs)/index.tsx`

- **Layout, from the top:**
  1. The date, "Good afternoon, Ramesh", and the shop.
  2. **Needs you:** price questions waiting, with the newest ("Imran Khan: Damp proof 20 kg"), and
     asks for leave waiting. Each opens Asks on its own tab. When neither is waiting, it says
     "Nothing waiting".
  3. **Today's register:** the counts and each person.
  4. **On the website:** only what is waiting there (claims, painter sales, material lists,
     payments not received, dues asked, godown entries).
- **Source:** `GET /api/shop-alerts`, read every minute, and today's register.
- **States:**
  - A skeleton while loading.
  - Staff not switched on for the shop (the HueVistaa team switches them on).
  - No shop on the account yet (set one up on the website).

### Staff · `(tabs)/staff.tsx`

**Web reference:** HueVistaFrontEnd `app/(app)/attendance`.

- The day, which can go back but never past today, and whether an unmarked day counts as present
  or absent.
- **Mark the rest present** (`POST …/attendance/day/{date}` with `onlyUnmarked`).
- **Each person:**
  - their mark, or "Not marked";
  - when they came in and left, how late, where they marked from, and the note they left from
    away.
  - A tap opens their day in a sheet with the six marks (`PUT …/attendance/{staffId}/{date}`). A
    mark the shop gave can be cleared; a day the employee marked in on stays theirs.
- **Where staff mark in from:** the saved places, each with its radius. **Save where I am now**
  takes the phone's position, never a made-up one, and saves it as the Shop or the Godown
  (`POST …/attendance/places`). The server wants the phone sure of where it is to within 100 m.

### Asks · `(tabs)/asks.tsx`

- Two tabs, **Prices** and **Leave**, each with how many are waiting. Today's cards open the right
  one.
- **A price question:**
  - shows who asked, when, the item and their note;
  - **Answer** opens a sheet for one line ("₹1,240 — 4 in stock");
  - the line is sent with `POST …/price-requests/{id}/answer` and the employee reads it in
    HueVistaa Staff.
- **An ask for leave:**
  - shows who, the days and why;
  - **Approve, paid** and **Approve, without pay** answer it at once. Approved days go into the
    register by themselves, so the register is read again.
  - **Refuse** asks first, with an optional word for them.
- Answered asks follow, quieter, with who decided.

### Prices · `(tabs)/prices.tsx`

- The staff app's search and cards.
- The lowest price is covered until tapped, and covers itself again after 15 seconds or when the
  app is put away.
- A link to change prices on the website.

### Me · `(tabs)/me.tsx`

- The account and the shop.
- **Open the shop's website**, for salaries, claims, the godown book and editing prices.
- The language, help, privacy, terms, sign out, and the version.

## The painter — `app/painter/`

The HueVistaa app's painter side (its `docs/05-screens-painter.md`), carried over with its tests
(`src/__tests__/painter-screens.test.tsx`, `work-screens.test.tsx`).

- **Tabs:** Home, Points, **Scan**, Rewards, Nearby.
- **Other screens:** claiming a board, the board as a PDF, rewards and vouchers, the trade profile,
  and My work (team, estimates, sites, shops' khata).
- **What's different in this app:**
  - The trade profile's **Settings** opens this app's settings (language, help, sign out).
  - **Your own home** opens the painter's customer side on the website. In the HueVistaa app it
    switches in place.
  - **Help** opens the website's contact page.
  - The question about notifications after a redemption waits until this app has notifications.
- A PDF opened with the app from WhatsApp or Files goes straight to "The board came as a PDF".
