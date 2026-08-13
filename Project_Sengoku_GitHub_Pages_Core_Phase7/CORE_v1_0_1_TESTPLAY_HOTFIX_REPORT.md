# Project Sengoku Core v1.0.1 Test Play Hotfix Report

## Fixed issue

At viewport widths of 1050px or less, the fixed mobile bottom navigation used z-index 55 while the modal backdrop used z-index 30. The navigation therefore appeared above the modal and intercepted clicks near the bottom of the screen, including the opening `軍議を始める` button.

## Changes

- Raised the modal backdrop stacking level above the mobile navigation.
- Added `body.modal-open` while any modal is active.
- Hidden and disabled the mobile navigation while a modal is active.
- Kept toast messages above the modal.
- Added DOM regression coverage for modal-open class lifecycle.
- Rebuilt the self-contained `01_START_GAME.html`.

## Scope

No gameplay, balance, AI, event data, save schema, or save-version changes.

## Verified flow

New game → prologue → `軍議を始める` → opening choices → event result → battle council.
Verified at 390px, 900px, and 1280px in headless Chromium.
