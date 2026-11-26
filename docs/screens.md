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
  2. **Needs you:** price questions waiting, with the newest ("Imran Khan: Damp proof 20 kg"),
     asks for leave waiting, and attendance requests (days to put right, overtime to OK, piece
     work). Each opens Asks on its own tab. When none is waiting, it says "Nothing waiting".
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
  - when they came in and left, how late, whether they never marked out, where they marked from
    ("At Shop", "Punched on Counter machine", "Asked, and you OKed it"), and the note they left
    from away.
  - A tap opens their day in a sheet with the marks, half a day's paid leave among them
    (`PUT …/attendance/{staffId}/{date}`). A mark the shop gave can be cleared; a day the employee
    marked in on stays theirs.
- The shop's holiday on the day, by name, and — where staff mark in on the fingerprint machine —
  a line saying so.
- **Where staff mark in from:** the saved places, each with its radius. **Save where I am now**
  takes the phone's position, never a made-up one, and saves it as the Shop or the Godown
  (`POST …/attendance/places`). The server wants the phone sure of where it is to within 100 m.
  Not shown where staff mark in on the machine only.
- **Set up on the website:** the machine, the shop's rules and holidays; salary and advances; and
  piece-work rates — each opens that page of the partner website.

### Asks · `(tabs)/asks.tsx`

- Three tabs, **Prices**, **Leave** and **Attendance**, each with how many are waiting. Today's
  cards open the right one.
- **A price question:**
  - shows who asked, when, the item and their note;
  - **Answer** opens a sheet for one line ("₹1,240 — 4 in stock");
  - the line is sent with `POST …/price-requests/{id}/answer` and the employee reads it in
    HueVistaa Staff.
- **An ask for leave:**
  - shows who, the days and why;
  - half a day off shows as the half it is ("28 Nov · second half off");
  - where the shop gives paid leave by a rule, it says what the person has left that month, and
    **Approve, by your rule** pays as far as that covers and the rest without pay (no `paid` sent);
  - **Approve, paid** and **Approve, without pay** answer it at once. Approved days go into the
    register by themselves, so the register is read again.
  - **Refuse** asks first, with an optional word for them.
- Answered asks follow, quieter, with who decided — "Approved — 1 day paid, ½ day without pay"
  when only some of it was paid.
- **Attendance** (`AttendanceAsks`):
  - **Days to put right** — "forgot to punch", or out on work from somebody who marks on the
    machine — with the times they gave and why. **Approve · mark present** writes the day present
    with those times (`POST …/attendance/corrections/{id}/answer`); **Refuse**.
  - **Overtime to OK** — the day and how long: all of it, fewer half hours with the stepper, or
    **Not paid** (`PUT …/attendance/{staffId}/{date}/overtime`).
  - **Piece work to OK** — what a helper wrote down and what it comes to: **Approve · ₹350** or
    **Refuse** (`POST …/piece-work/{id}/answer`). Adding the others who were on the job is on the
    website.

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
