# Test-play launch fix

- Added `01_START_GAME.html`, a self-contained build with all local CSS and JavaScript inlined.
- Added an early startup error panel that exposes browser runtime failures to the player.
- Added `02_START_LOCAL_SERVER.command` as a macOS local-server fallback.
- The original `index.html`, gameplay code, balance, save schema, and game version are unchanged.

## v1.0.1 mobile modal hotfix

- Fixed the mobile bottom navigation intercepting modal buttons at widths up to 1050px.
- Modal open/close now toggles `body.modal-open`; mobile navigation is hidden while a modal is active.
- Raised modal and toast stacking levels.
