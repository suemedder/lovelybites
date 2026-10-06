# Lovely Bites: standing rules

Lovely Bites is a made-up Jersey event caterer. This repo holds its quoting tool. See `business.md` for the business and `spec.md` for what the tool must do.

## Rules that never change

1. **Prices only come from `menu-prices.csv`.** No price, minimum charge, food cost or travel charge is typed into the code, the screens or the tests for the real tool. Edit the CSV and the tool uses the new prices.
2. **Public figures only come from `public-data.json`, with their source.** That means minimum wage, employer's social security, GST and bank holidays. Every figure needs a `source_url` and a date checked. If a figure can't be confirmed from an official source, the file says so and the tool warns. Never guess a public figure.
3. **Never quote below cost plus 25%.** If a discount would break that, refuse it and say why, showing the floor and the most that could be taken off. Never quietly shrink the discount instead.
4. **No installs.** Plain HTML and JavaScript that opens by double-clicking `index.html`. No server, no build step, no npm, no libraries.

## How the tool is laid out

- `index.html`, `styles.css`, `app.js`: the screens only. No pricing rules in here.
- `pricing.js`: all the pricing rules. No screen code in here.
- `data.js`: reads and checks the two data files.
- `tests.html` (double-click) runs the checks. `node tests.js` runs the same checks in a terminal.

## Things to remember

- Money is in whole pence, never decimals.
- Staff numbers always round **up**: 46 seated guests = 4 servers.
- Time and a half doesn't stack: a late hour on a bank holiday is still 1.5×.
- Scripts load with plain `<script>` tags, not modules, because modules don't work when a page is opened from a file.
- A page opened from a file can't read other files itself (browsers block `fetch` and `XMLHttpRequest` on `file://`). Chrome and Edge can remember a chosen folder, so `app.js` stores the folder handle and re-reads the files every time. Other browsers fall back to the plain folder picker. Remember the folder, never the prices: don't cache prices between sessions.
- Two sets of checks use frozen price copies, not the real files: `tests.js` (its own small fixture) and `selftest.html` (`selftest-data.js`, a snapshot of both data files from 6 Oct 2026). Both test the rules, so they don't change when prices are edited. Don't "fix" them to follow a price edit.
- `selftest.html` holds five quotes worked out by hand (also written up in `test-quotes.md`). If one fails, work out whether the hand working or the engine is wrong before changing either.
- After any change to `pricing.js`, run `node tests.js` and `node selftest.js`. The worked example in `spec.md` is covered by them.
- Everything in `business.md` and `menu-prices.csv` is invented. Everything in `public-data.json` is unconfirmed until its status says otherwise.
