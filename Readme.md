# Draftmancer

## Contact

Join the discord for development related discussions: https://discord.gg/XscXXNw

## How to run the project locally

-   Clone repository (`git clone https://github.com/Senryoku/Draftmancer.git`)
-   Open repository (`cd Draftmancer`)
-   Execute `npm install` to install dependencies.
-   Execute `npm run build` to build the server using typescript and the client using webpack (for production).
-   Execute `npm start` to start the server (which also serves the webapp).
-   Navigate to `http://localhost:3000/`

### Development tips

-   Running `npm run start-dev` instead of `npm start` will restart the node server on any changes. (Install nodemon globally with `npm install nodemon -g`)
-   Use `npm run build-client-dev` to watch for changes in the client js code and automatically re-build it.
-   Use `npm run build-server-dev` to watch for changes in the server typescript code and automatically re-build it.

-   Setting the environment variable `DISABLE_PERSISTENCE` to `TRUE` (one can use a `.env` file for development) will disable retrieving/saving the states of Connections/Sessions between server execution from disk (see `src/Persistence.ts`).

### Tests

-   `npm test` runs all tests in the `test` folder (non recursive). This is the command run by GitHub actions on each commit.
-   `npm run manualtest` runs tests from the `test/manual` folder, it contains additional (and long) statistical tests. These are not included in the automatic test suite.
-   `npm run fronttest` runs tests from the `test/frontend` folder, it contains additional end-to-end tests, including the client. These are not included in the automatic test suite.

Add `-bail` (e.g. `npm run test-bail`) to stop on the first error.

## Reporting draft logs to another service

A session's owner can register a hook (`setHooks`) and Draftmancer will POST the draft log to it
once the decks settle. An instance run alongside the service that sends players here can skip that
handshake entirely and hand every session a hook up front:

-   `DRAFTLOG_HOOK_URL` — where to POST the draft log. The body is the log itself, the same shape
    `/getDraftLog/<sessionID>` serves (and `sessionID` is in it), so a receiver can treat both the
    same. Put any credential the receiver needs in the URL; nothing else identifies the sender.
-   `DRAFTLOG_HOOK_SESSION_PREFIX` — only give the hook to sessions whose ID starts with this.
    Defaults to empty, i.e. every session. Set it when the instance is shared with walk-in drafts.
-   `DRAFTLOG_HOOK_DELAY` (default `3000` ms) — how long to wait for deck edits to stop before
    sending, since every card moved updates the log.
-   `DRAFTLOG_HOOK_MAX_DELAY` (default `30000` ms) — how long a steady stream of edits can hold a
    send off.
-   `DRAFTLOG_HOOK_TIMEOUT` (default `10000` ms) — per-request timeout.

The log is sent when the draft ends, whenever the decks have been quiet for `DRAFTLOG_HOOK_DELAY`,
and when the session is disposed of. Sends are best-effort (one retry): each POST carries the whole
log, so the next one supersedes anything lost, and a receiver can always fall back to asking
`/getDraftLog` itself.

A site embedding Draftmancer in a frame should also pass `?userID=` alongside `?session=` and
`?userName=`: a browser won't keep our cookie for a frame on someone else's origin, and a player who
comes back under a fresh ID can't rejoin the draft they were in the middle of. Storage in a frame is
handled for you — where a browser refuses it outright (Chrome blocks third-party storage in
Incognito, and reading it there *throws*) the client falls back to keeping it in memory for the
session rather than failing to start, see `client/src/safeStorage.ts`.

## Notes on Arena Importer

-   Splits Cards (Ravnica) needs both card names, e.g. Discovery // Dispersal
-   Adventures (ELD) and Dual Faces (IXL) need only one.
-   AKR Splits Cards uses triple forward slashes (///) instead of double.

## Custom Set format

See cubeformat.html

## Acknowledgement

-   Card data and images provided by [Scryfall](https://scryfall.com/)
-   Data used for automatic collation from https://github.com/taw/magic-sealed-data ; Used https://www.lethe.xyz/mtg/collation/ as reference for manual implementations.
-   Can use bots from [CubeCobra](https://cubecobra.com/)
