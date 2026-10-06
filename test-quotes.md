# Five test quotes, worked out by hand

Each quote below was worked out by hand first, then checked against the quoting engine (`selftest.html`, or `node selftest.js`). All five agree.

**Rounding rules used:** money is rounded to the penny, half a penny rounds up, staff numbers round up, and the floor (cost + 25%) rounds up in our favour.

**Prices:** a frozen copy of `menu-prices.csv` and `public-data.json` as at 6 October 2026 (`selftest-data.js`). The wage of £13.59, 6.5% social security, 5% GST and the bank holiday dates are still **unconfirmed** in `public-data.json`, so check them before relying on these figures.

| # | Quote | Answer | Price before GST | Floor (cost + 25%) |
|---|---|---|---|---|
| 1 | Bank-holiday wedding, 180 seated guests | OK to quote | £14,910.00 | £13,800.88 |
| 2 | Small buffet for 30, under the 4-hour staff minimum | OK to quote | £1,065.00 | £704.60 |
| 3 | Corporate lunch in St Ouen, two dietary requirements | OK to quote | £2,973.00 | £2,098.80 |
| 4 | Event finishing at 00:30 (the after-11pm uplift) | OK to quote | £4,495.00 | £4,084.18 |
| 5 | 20% discount request that would break the margin floor | **REFUSED** | £1,806.00 | £2,201.87 |

## 1. Bank-holiday wedding, 180 seated guests

*Friday 1 January 2027 (New Year's Day), Prestige menu, Trinity, 14:00 to 21:00, canapés (5 per guest). Quote issued 6 October 2026.*

1. 1 January is New Year's Day, a Jersey bank holiday (public-data.json). Every hour is time and a half.
2. Price band: 180 guests is in 100–199, so Prestige is £71.00 a head.
3. Servers: 180 ÷ 15 = 12 exactly, so 12. Chefs: 180 ÷ 40 = 4.5, round UP, so 5. That is 17 people.
4. Shift: event 14:00–21:00, setup 90 minutes (starts 12:30), clear-down 90 minutes (ends 22:30). That is 10 hours = 600 minutes, over the 4-hour minimum.
5. All 600 minutes are on a bank holiday, so all 600 are time and a half. Nothing is "after 23:00", and even if it were, the premiums never stack.
6. Hourly staff cost: minimum wage £13.59 × 1.065 (6.5% employer's social security) = £14.47335.
7. Staff cost: 17 people × 10 hours × 1.5 = 255 hours × £14.47335 = £3,690.70425, which is £3,690.70.
8. Price: Prestige menu 180 × £71.00 = £12,780.00. Canapés 180 × £11.50 = £2,070.00 (the £200 minimum doesn't matter). Travel to Trinity £60.00. Price before GST = £14,910.00.
9. GST at 5% = £745.50. Total = £15,655.50. Deposit 25% = £3,913.875, which rounds to £3,913.88. Balance = £11,741.62.
10. Cost: food 180 × £29.00 = £5,220.00. Staff £3,690.70. Canapés and travel counted at selling price = £2,130.00. Total cost = £11,040.70.
11. Floor: £11,040.70 × 1.25 = £13,800.875, rounded UP to £13,800.88. The price of £14,910.00 is above it, so it's fine (room £1,109.12).
12. Valid until: 6 October 2026 + 30 days = 5 November 2026.

## 2. Small buffet for 30, under the 4-hour staff minimum

*Saturday 14 November 2026, Classic menu as a buffet, St Helier, 12:00 to 13:30. Setup and clear-down set to 30 minutes each (in Settings) for this quick lunch.*

1. 14 November 2026 is an ordinary Saturday, not a bank holiday.
2. Price band: 30 guests is in 1–49, so Classic is £34.00 a head.
3. Servers (buffet is 1 per 25): 30 ÷ 25 = 1.2, round UP, so 2. Chefs: 30 ÷ 40 = 0.75, round UP, so 1. That is 3 people.
4. Shift: event 12:00–13:30, setup 30 minutes (starts 11:30), clear-down 30 minutes (ends 14:00). That is 2.5 hours = 150 minutes.
5. 150 minutes is under the 4-hour (240 minute) minimum, so each person is paid 240 minutes: 150 worked + 90 topped up, at the normal rate. Nothing is after 23:00.
6. Hourly staff cost: minimum wage £13.59 × 1.065 (6.5% employer's social security) = £14.47335.
7. Staff cost: 3 people × 4 hours = 12 hours × £14.47335 = £173.6802, which is £173.68.
8. Price: Classic menu 30 × £34.00 = £1,020.00. Travel to St Helier £45.00. Price before GST = £1,065.00.
9. GST at 5% = £53.25. Total = £1,118.25. Deposit 25% = £279.5625, which rounds to £279.56. Balance = £838.69.
10. Cost: food 30 × £11.50 = £345.00. Staff £173.68. Travel £45.00. Total cost = £563.68.
11. Floor: £563.68 × 1.25 = £704.60. The price of £1,065.00 is above it, so it's fine.

## 3. Corporate lunch in St Ouen, two dietary requirements

*Thursday 19 November 2026, Signature menu, 60 seated guests, St Ouen, 12:00 to 15:00, 2 guests need a separate dietary dish.*

1. 19 November 2026 is an ordinary Thursday, not a bank holiday.
2. Price band: 60 guests is in 50–99, so Signature is £48.00 a head.
3. Servers: 60 ÷ 15 = 4 exactly, so 4. Chefs: 60 ÷ 40 = 1.5, round UP, so 2. That is 6 people.
4. Shift: event 12:00–15:00, setup 90 minutes (starts 10:30), clear-down 90 minutes (ends 16:30). That is 6 hours = 360 minutes, all at the normal rate.
5. Hourly staff cost: minimum wage £13.59 × 1.065 (6.5% employer's social security) = £14.47335.
6. Staff cost: 6 people × 6 hours = 36 hours × £14.47335 = £521.0406, which is £521.04.
7. Price: Signature menu 60 × £48.00 = £2,880.00. Dietary surcharge 2 × £4.00 = £8.00. Travel to St Ouen £85.00. Price before GST = £2,973.00.
8. GST at 5% = £148.65. Total = £3,121.65. Deposit 25% = £780.4125, which rounds to £780.41. Balance = £2,341.24.
9. Cost: food 60 × £17.75 = £1,065.00. Staff £521.04. Dietary and travel counted at selling price = £93.00. Total cost = £1,679.04.
10. Floor: £1,679.04 × 1.25 = £2,098.80. The price of £2,973.00 is above it, so it's fine.

## 4. Event finishing at 00:30 (the after-11pm uplift)

*Saturday 12 December 2026, Signature menu, 100 seated guests, St Helier, 19:00 to 00:30.*

1. 12 December 2026 is a Saturday and the Sunday after it isn't a bank holiday either, so the only uplift is for time after 23:00.
2. Price band: 100 guests is in 100–199, so Signature is £44.50 a head.
3. Servers: 100 ÷ 15 = 6.67, round UP, so 7. Chefs: 100 ÷ 40 = 2.5, round UP, so 3. That is 10 people.
4. Shift: event 19:00–00:30, setup 90 minutes (starts 17:30), clear-down 90 minutes (ends 02:00 on the Sunday).
5. 17:30 to 23:00 = 5.5 hours = 330 minutes at the normal rate. 23:00 to 02:00 = 3 hours = 180 minutes at time and a half. Passing midnight changes nothing.
6. Hourly staff cost: minimum wage £13.59 × 1.065 (6.5% employer's social security) = £14.47335.
7. Hours paid per person: 5.5 + (3 × 1.5) = 10 hours. 10 people × 10 hours = 100 hours × £14.47335 = £1,447.335. Half a penny rounds UP, so £1,447.34.
8. Price: Signature menu 100 × £44.50 = £4,450.00. Travel to St Helier £45.00. Price before GST = £4,495.00.
9. GST at 5% = £224.75. Total = £4,719.75. Deposit 25% = £1,179.9375, which rounds to £1,179.94. Balance = £3,539.81.
10. Cost: food 100 × £17.75 = £1,775.00. Staff £1,447.34. Travel £45.00. Total cost = £3,267.34.
11. Floor: £3,267.34 × 1.25 = £4,084.175, rounded UP to £4,084.18. The price of £4,495.00 is above it, so it's fine.

## 5. 20% discount request that would break the margin floor

*Saturday 5 December 2026, Classic menu, 70 seated guests, St Peter, 18:00 to 23:00. The customer asks for 20% off the menu price.*

1. 5 December 2026 is an ordinary Saturday, not a bank holiday.
2. Price band: 70 guests is in 50–99, so Classic is £31.00 a head.
3. Servers: 70 ÷ 15 = 4.67, round UP, so 5. Chefs: 70 ÷ 40 = 1.75, round UP, so 2. That is 7 people.
4. Shift: event 18:00–23:00, setup 90 minutes (starts 16:30), clear-down 90 minutes (ends 00:30). 16:30 to 23:00 = 6.5 hours = 390 minutes at the normal rate. 23:00 to 00:30 = 1.5 hours = 90 minutes at time and a half.
5. Hourly staff cost: minimum wage £13.59 × 1.065 (6.5% employer's social security) = £14.47335.
6. Hours paid per person: 6.5 + (1.5 × 1.5) = 8.75 hours. 7 people × 8.75 = 61.25 hours × £14.47335 = £886.4927, which is £886.49.
7. Cost: food 70 × £11.50 = £805.00. Staff £886.49. Travel to St Peter £70.00. Total cost = £1,761.49.
8. Floor: £1,761.49 × 1.25 = £2,201.8625, rounded UP to £2,201.87.
9. At full price: Classic menu 70 × £31.00 = £2,170.00 + travel £70.00 = £2,240.00. That is above the floor, but only by £38.13.
10. With 20% off the menu: £2,170.00 × 20% = £434.00 off, so the menu is £1,736.00. Plus travel £70.00 = £1,806.00 before GST.
11. £1,806.00 is below the floor of £2,201.87 (short by £395.87).
12. RIGHT ANSWER: REFUSED. Reason: the price would be £1,806.00 before GST, below our floor of £2,201.87 (cost plus 25%).
13. The most that can come off is £2,240.00 − £2,201.87 = £38.13 (about 1.7% of the menu price, rounded down).

