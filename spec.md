# Lovely Bites quote tool: spec

*Draft, 6 October 2026. Built on `business.md`, `menu-prices.csv` and `public-data.json`. Anything still to be decided is in **Open questions** at the end.*

## 1. Who uses it

- **Now:** Lovely Bites staff, which means the owners and whoever handles enquiries in the office. They put in the event details, check the result and send the quote to the customer.
- **Later:** customers, getting their own estimate on the website. That isn't being built yet, but nothing in the design should rule it out. In practice that means:
  - the customer view and the internal view are kept separate from the start
  - anything a customer could see must never show our costs, margins or staff pay

## 2. What goes in

### Typed in for each quote
- Customer name and contact details
- Event date, plus start and finish times. The event can run past midnight
- Parish where the event is held (one of the 12)
- Number of guests
- Serving style: **seated** or **buffet**
- Menu tier: **Classic**, **Signature** or **Prestige**
- Number of guests who need a separate dietary dish
- Add-ons, if any: canapés, drinks, corkage (bottles)
- Equipment hire: item and quantity
- Discount, if any: a percentage or a £ amount off
- Quote issue date (defaults to today)

### Read from files (never typed in)
- `menu-prices.csv`: menu prices and price breaks, food cost per head, add-ons, hire prices and minimum charges, dietary surcharge, travel by parish
- `public-data.json`: minimum wage, employer's social security rate, GST rate, bank holiday dates
- Settings: setup time and clear-down time per staff member (suggested starting point: 1.5 hours each, see open questions)

## 3. What comes out

### Customer quote
- Lovely Bites details, quote number and issue date
- **Valid until:** issue date + 30 days
- Event summary: date, times, parish, guests, style, tier
- Price lines:
  - Menu: guests × per-head price for the right price break
  - Dietary surcharge: number of dietary guests × surcharge
  - Each add-on, with its minimum charge applied if it applies
  - Each hire item, with its minimum charge applied if it applies
  - Travel and setup for the parish
  - Discount, if any
- Subtotal before GST, then GST, then **total including GST**
- **Deposit due: 25% of the total including GST**, and the balance
- Staff aren't shown as a line, because they're included in the per-head price

### Internal breakdown (staff only, never shown to customers)
- Number of servers and chefs, and how they were worked out
- Hours per person: setup + event + clear-down, the 4-hour minimum, and normal versus time-and-a-half hours
- Staff cost, food cost and total cost
- **Floor price** (cost + 25%), the quote price, and how much discount room is left
- A clear warning if any figure from `public-data.json` is still marked unconfirmed

### Refusal (when a discount breaks the floor)
- No quote is produced
- A plain explanation, for example: *"A 20% discount would bring the price to £3,147.00 before GST. Our floor for this event is £3,243.72 (cost plus 25%), so we can't offer it. The most we can take off is £671.28."*
- Suggestions instead: a smaller discount, a cheaper tier, or buffet rather than seated service

## 4. What "right" looks like

### The rules, worked through
- **Price break:** use the band the guest number falls in: 1–49, 50–99, 100–199 or 200+. For example, 50 guests is in the 50–99 band, not 1–49.
- **Servers:** guests ÷ 15 for seated, or guests ÷ 25 for buffet, **always rounded up**
- **Chefs:** guests ÷ 40, **always rounded up**, for both seated and buffet
- **Hours per person:** setup + event + clear-down, but never fewer than **4 hours**
- **Hourly staff cost:** Jersey minimum wage × (1 + employer's social security rate)
- **Time and a half:** any hour worked on a Jersey bank holiday, or after 23:00, is paid at 1.5×
  - The two premiums **don't stack**. A late hour on a bank holiday is still 1.5×
  - Part hours count by the minute
  - A shift that runs past midnight into a bank holiday pays 1.5× from midnight
- **Hire and add-ons:** quantity × price, or the minimum charge if that's higher
- **Cost** = food cost per head × guests + staff cost + hire, add-ons and travel. Until we know what hire, add-ons and travel really cost us, they're counted at their full selling price, so they never earn margin we haven't checked (see open questions)
- **Floor:** the price before GST must be at least cost × 1.25
- **GST** is added on the price after any discount
- **Deposit:** 25% of the total including GST
- **Valid until:** issue date + 30 days
- **Money:** work in full precision and round to the penny only on the lines shown

### Worked example (uses the unconfirmed minimum wage of £13.59 and social security at 6.5%)
- **Event:** Saturday 13 June 2026, 80 guests, seated, Signature menu, St Brelade, 18:00 to 23:30, no extras
- **Staff:** 6 servers (80 ÷ 15 = 5.3, rounded up) and 2 chefs (80 ÷ 40 = 2), so 8 people
- **Hours:** shift 16:30 to 01:00 = 8.5 hours. That's 6.5 normal hours and 2 hours at 1.5× (after 23:00), which pays the same as 9.5 hours
- **Staff cost:** 8 × 9.5 × £14.47335 = **£1,099.97**
- **Food cost:** 80 × £17.75 = **£1,420.00**
- **Travel:** £75.00
- **Total cost:** **£2,594.97**
- **Floor:** £2,594.97 × 1.25 = **£3,243.72**
- **Price:** 80 × £48.00 + £75.00 = **£3,915.00**
- **With a 10% discount off the menu:** £3,531.00, which is above the floor, so it's allowed. With GST that's £3,707.55, and the deposit is £926.89
- **With a 20% discount off the menu:** £3,147.00, which is below the floor, so it's **refused**

These figures should become automatic tests. Change any rule and the tests should catch it.

## 5. What it must never do

- **Never quote below cost + 25%.** If a discount would break the floor, refuse and say why. Don't quietly shrink the discount to fit.
- **Never round staff numbers down,** and never let anyone work fewer than 4 hours.
- **Never guess a public figure.** If the event date isn't covered by the bank holiday list (currently 2026 and 2027 only), or a figure is missing from `public-data.json`, stop and say what's missing.
- **Never issue a customer quote using figures marked unconfirmed** in `public-data.json` unless a staff member has ticked to say they've checked them. The internal breakdown always shows the warning.
- **Never show a customer** our costs, margins, floor price, staff numbers or wages.
- **Never let anyone type over prices or rates by hand on a quote.** Prices change in `menu-prices.csv` and `public-data.json`, so every quote uses the same figures.
- **Never treat a quote as valid after 30 days.** An expired quote has to be redone with the current prices.

## Open questions

1. **Setup and clear-down time:** is 1.5 hours each right? Should it vary by event size or serving style?
2. **What hire, add-ons and travel really cost us.** At the moment they're counted at their selling price, which is safe but means discounts can only come out of the menu price.
3. **What does a discount come off?** The menu price only, or the whole quote? The worked example assumes the menu only.
4. **Chef pay:** the rule costs chefs at minimum wage, the same as servers. In real life Jersey chefs are usually paid more, so this probably understates cost and could let a discount through that really breaks the floor. Should chefs have their own rate?
5. **Public data:** every figure in `public-data.json` is still unconfirmed, because gov.je was blocked when it was gathered. It needs checking before the tool is used for real quotes.
6. **Very small events:** under about 15 guests the price is low but the 4-hour minimum still applies to every member of staff. Do we want a minimum spend?
