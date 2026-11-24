# The design

HueVistaa Partner shares its design with HueVistaa Staff and with the HueVistaa app. The design
language, the tokens and what each reference gave are written down once, in the staff app's
`docs/design.md`. This page covers what is the partner app's own.

## Who it is for

- **A shop's owner** checks the app a few times a day, between customers. What they need is short:
  what is waiting for them, who is in, and an answer they can give in a line.
- **A painter** opens it on site or at a counter to scan a finished board, check their points, or
  redeem a reward. Those screens are the HueVistaa app's own, carried over unchanged. A painter
  moving between the two apps finds the same words and the same places.

## The shop's side

- **Today leads with what needs the owner.** Waiting price questions and leave asks are brass
  cards, each a tap from its answer. Only what is waiting shows. A day with nothing waiting says
  so in sage: a calm screen is good news.
- **The register reads like the shop's own book.**
  - Each person is a card with their initials, their mark as a word in a pill, and the facts
    behind it: when they came in, from where, how late, and the note they left.
  - A tap opens the six marks an owner can give a day.
  - **Mark the rest present** is the one big action, and it shows only while someone is unmarked.
- **Asks wait in brass.** A card still waiting for the owner has a brass edge and a clock; once
  answered it goes quiet and moves under *Answered*.
  - Approving leave with pay is the primary action. Without pay comes next, then Refuse.
  - Refusing asks first, in a sheet that also takes the word the owner wants to give.
- **The price list is the staff's own list.** It has the same search, the same cards, and the same
  15-second cover on the lowest price, so an owner and their staff read one list one way.
- **The phone does what the phone is good at.** *Save where I am now* stores the shop's place from
  where the owner stands. Staff are then checked against that place when they mark in.

## The icon

The H stands on **paper**, with the brass bar under it. The three apps look like one family, and
the background tells them apart:

- HueVistaa: the H on ink.
- HueVistaa Staff: the H on ink, with the brass bar.
- HueVistaa Partner: the H on paper, with the brass bar.

## The navigation bar

- Material 3's navigation bar, drawn by `src/navigation/TabBar.tsx`, as in the staff app.
- The painter's **Scan** tab is always a brass capsule, because it is the one thing a painter opens
  the app to do.
- The shop's **Asks** tab carries a badge counting what is waiting.
