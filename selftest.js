/* Five test quotes, each worked out BY HAND (the working is written out under each one),
   then checked against the quoting engine in pricing.js.
   The answers below were worked out first, with a separate calculation that shares no code with
   the engine. The engine is then judged against them, not the other way round.

   They use the frozen copy of the price list in selftest-data.js, so they check the RULES.
   If menu-prices.csv is edited later these answers stay valid for the frozen copy. All money is in pence. */
(function (root) {
  'use strict';

  var HOURLY = 'Hourly staff cost: minimum wage £13.59 × 1.065 (6.5% employer\'s social security) = £14.47335.';

  var CASES = [
    {
      id: 1,
      title: 'Bank-holiday wedding, 180 seated guests',
      summary: 'Friday 1 January 2027 (New Year\'s Day), Prestige menu, Trinity, 14:00 to 21:00, canapés (5 per guest). Quote issued 6 October 2026.',
      input: { guests: 180, style: 'seated', tier: 'Prestige', parish: 'Trinity', eventDate: '2027-01-01', startTime: '14:00', endTime: '21:00',
               dietaryGuests: 0, extras: [{ key: 'canapes|Canapés (5 per guest)', qty: 180 }], issueDate: '2026-10-06', discount: { type: 'none' } },
      working: [
        '1 January is New Year\'s Day, a Jersey bank holiday (public-data.json). Every hour is time and a half.',
        'Price band: 180 guests is in 100–199, so Prestige is £71.00 a head.',
        'Servers: 180 ÷ 15 = 12 exactly, so 12. Chefs: 180 ÷ 40 = 4.5, round UP, so 5. That is 17 people.',
        'Shift: event 14:00–21:00, setup 90 minutes (starts 12:30), clear-down 90 minutes (ends 22:30). That is 10 hours = 600 minutes, over the 4-hour minimum.',
        'All 600 minutes are on a bank holiday, so all 600 are time and a half. Nothing is "after 23:00", and even if it were, the premiums never stack.',
        HOURLY,
        'Staff cost: 17 people × 10 hours × 1.5 = 255 hours × £14.47335 = £3,690.70425, which is £3,690.70.',
        'Price: Prestige menu 180 × £71.00 = £12,780.00. Canapés 180 × £11.50 = £2,070.00 (the £200 minimum doesn\'t matter). Travel to Trinity £60.00. Price before GST = £14,910.00.',
        'GST at 5% = £745.50. Total = £15,655.50. Deposit 25% = £3,913.875, which rounds to £3,913.88. Balance = £11,741.62.',
        'Cost: food 180 × £29.00 = £5,220.00. Staff £3,690.70. Canapés and travel counted at selling price = £2,130.00. Total cost = £11,040.70.',
        'Floor: £11,040.70 × 1.25 = £13,800.875, rounded UP to £13,800.88. The price of £14,910.00 is above it, so it\'s fine (room £1,109.12).',
        'Valid until: 6 October 2026 + 30 days = 5 November 2026.'
      ],
      expect: { status: 'ok', servers: 12, chefs: 5, workedMinutes: 600, normalMinutes: 0, premiumMinutes: 600, paidMinutes: 600,
                staffCostPence: 369070, foodCostPence: 522000, costPence: 1104070, floorPence: 1380088, roomPence: 110912,
                priceExGstPence: 1491000, gstPence: 74550, totalPence: 1565550, depositPence: 391388, balancePence: 1174162, validUntil: '2026-11-05',
                lines: [['Prestige menu', 180, 1278000], ['Canapés (5 per guest)', 180, 207000], ['Travel and setup, Trinity', 1, 6000]] }
    },
    {
      id: 2,
      title: 'Small buffet for 30, under the 4-hour staff minimum',
      summary: 'Saturday 14 November 2026, Classic menu as a buffet, St Helier, 12:00 to 13:30. Setup and clear-down set to 30 minutes each (in Settings) for this quick lunch.',
      input: { guests: 30, style: 'buffet', tier: 'Classic', parish: 'St Helier', eventDate: '2026-11-14', startTime: '12:00', endTime: '13:30',
               dietaryGuests: 0, extras: [], issueDate: '2026-10-06', discount: { type: 'none' }, setupMinutes: 30, clearMinutes: 30 },
      working: [
        '14 November 2026 is an ordinary Saturday, not a bank holiday.',
        'Price band: 30 guests is in 1–49, so Classic is £34.00 a head.',
        'Servers (buffet is 1 per 25): 30 ÷ 25 = 1.2, round UP, so 2. Chefs: 30 ÷ 40 = 0.75, round UP, so 1. That is 3 people.',
        'Shift: event 12:00–13:30, setup 30 minutes (starts 11:30), clear-down 30 minutes (ends 14:00). That is 2.5 hours = 150 minutes.',
        '150 minutes is under the 4-hour (240 minute) minimum, so each person is paid 240 minutes: 150 worked + 90 topped up, at the normal rate. Nothing is after 23:00.',
        HOURLY,
        'Staff cost: 3 people × 4 hours = 12 hours × £14.47335 = £173.6802, which is £173.68.',
        'Price: Classic menu 30 × £34.00 = £1,020.00. Travel to St Helier £45.00. Price before GST = £1,065.00.',
        'GST at 5% = £53.25. Total = £1,118.25. Deposit 25% = £279.5625, which rounds to £279.56. Balance = £838.69.',
        'Cost: food 30 × £11.50 = £345.00. Staff £173.68. Travel £45.00. Total cost = £563.68.',
        'Floor: £563.68 × 1.25 = £704.60. The price of £1,065.00 is above it, so it\'s fine.'
      ],
      expect: { status: 'ok', servers: 2, chefs: 1, workedMinutes: 150, normalMinutes: 240, premiumMinutes: 0, paidMinutes: 240, minimumApplied: true,
                staffCostPence: 17368, foodCostPence: 34500, costPence: 56368, floorPence: 70460, roomPence: 36040,
                priceExGstPence: 106500, gstPence: 5325, totalPence: 111825, depositPence: 27956, balancePence: 83869, validUntil: '2026-11-05',
                lines: [['Classic menu', 30, 102000], ['Travel and setup, St Helier', 1, 4500]] }
    },
    {
      id: 3,
      title: 'Corporate lunch in St Ouen, two dietary requirements',
      summary: 'Thursday 19 November 2026, Signature menu, 60 seated guests, St Ouen, 12:00 to 15:00, 2 guests need a separate dietary dish.',
      input: { guests: 60, style: 'seated', tier: 'Signature', parish: 'St Ouen', eventDate: '2026-11-19', startTime: '12:00', endTime: '15:00',
               dietaryGuests: 2, extras: [], issueDate: '2026-10-06', discount: { type: 'none' } },
      working: [
        '19 November 2026 is an ordinary Thursday, not a bank holiday.',
        'Price band: 60 guests is in 50–99, so Signature is £48.00 a head.',
        'Servers: 60 ÷ 15 = 4 exactly, so 4. Chefs: 60 ÷ 40 = 1.5, round UP, so 2. That is 6 people.',
        'Shift: event 12:00–15:00, setup 90 minutes (starts 10:30), clear-down 90 minutes (ends 16:30). That is 6 hours = 360 minutes, all at the normal rate.',
        HOURLY,
        'Staff cost: 6 people × 6 hours = 36 hours × £14.47335 = £521.0406, which is £521.04.',
        'Price: Signature menu 60 × £48.00 = £2,880.00. Dietary surcharge 2 × £4.00 = £8.00. Travel to St Ouen £85.00. Price before GST = £2,973.00.',
        'GST at 5% = £148.65. Total = £3,121.65. Deposit 25% = £780.4125, which rounds to £780.41. Balance = £2,341.24.',
        'Cost: food 60 × £17.75 = £1,065.00. Staff £521.04. Dietary and travel counted at selling price = £93.00. Total cost = £1,679.04.',
        'Floor: £1,679.04 × 1.25 = £2,098.80. The price of £2,973.00 is above it, so it\'s fine.'
      ],
      expect: { status: 'ok', servers: 4, chefs: 2, workedMinutes: 360, normalMinutes: 360, premiumMinutes: 0, paidMinutes: 360,
                staffCostPence: 52104, foodCostPence: 106500, costPence: 167904, floorPence: 209880, roomPence: 87420,
                priceExGstPence: 297300, gstPence: 14865, totalPence: 312165, depositPence: 78041, balancePence: 234124, validUntil: '2026-11-05',
                lines: [['Signature menu', 60, 288000], ['Dietary surcharge', 2, 800], ['Travel and setup, St Ouen', 1, 8500]] }
    },
    {
      id: 4,
      title: 'Event finishing at 00:30 (the after-11pm uplift)',
      summary: 'Saturday 12 December 2026, Signature menu, 100 seated guests, St Helier, 19:00 to 00:30.',
      input: { guests: 100, style: 'seated', tier: 'Signature', parish: 'St Helier', eventDate: '2026-12-12', startTime: '19:00', endTime: '00:30',
               dietaryGuests: 0, extras: [], issueDate: '2026-10-06', discount: { type: 'none' } },
      working: [
        '12 December 2026 is a Saturday and the Sunday after it isn\'t a bank holiday either, so the only uplift is for time after 23:00.',
        'Price band: 100 guests is in 100–199, so Signature is £44.50 a head.',
        'Servers: 100 ÷ 15 = 6.67, round UP, so 7. Chefs: 100 ÷ 40 = 2.5, round UP, so 3. That is 10 people.',
        'Shift: event 19:00–00:30, setup 90 minutes (starts 17:30), clear-down 90 minutes (ends 02:00 on the Sunday).',
        '17:30 to 23:00 = 5.5 hours = 330 minutes at the normal rate. 23:00 to 02:00 = 3 hours = 180 minutes at time and a half. Passing midnight changes nothing.',
        HOURLY,
        'Hours paid per person: 5.5 + (3 × 1.5) = 10 hours. 10 people × 10 hours = 100 hours × £14.47335 = £1,447.335. Half a penny rounds UP, so £1,447.34.',
        'Price: Signature menu 100 × £44.50 = £4,450.00. Travel to St Helier £45.00. Price before GST = £4,495.00.',
        'GST at 5% = £224.75. Total = £4,719.75. Deposit 25% = £1,179.9375, which rounds to £1,179.94. Balance = £3,539.81.',
        'Cost: food 100 × £17.75 = £1,775.00. Staff £1,447.34. Travel £45.00. Total cost = £3,267.34.',
        'Floor: £3,267.34 × 1.25 = £4,084.175, rounded UP to £4,084.18. The price of £4,495.00 is above it, so it\'s fine.'
      ],
      expect: { status: 'ok', servers: 7, chefs: 3, workedMinutes: 510, normalMinutes: 330, premiumMinutes: 180, paidMinutes: 510,
                staffCostPence: 144734, foodCostPence: 177500, costPence: 326734, floorPence: 408418, roomPence: 41082,
                priceExGstPence: 449500, gstPence: 22475, totalPence: 471975, depositPence: 117994, balancePence: 353981, validUntil: '2026-11-05',
                lines: [['Signature menu', 100, 445000], ['Travel and setup, St Helier', 1, 4500]] }
    },
    {
      id: 5,
      title: '20% discount request that would break the margin floor',
      summary: 'Saturday 5 December 2026, Classic menu, 70 seated guests, St Peter, 18:00 to 23:00. The customer asks for 20% off the menu price.',
      input: { guests: 70, style: 'seated', tier: 'Classic', parish: 'St Peter', eventDate: '2026-12-05', startTime: '18:00', endTime: '23:00',
               dietaryGuests: 0, extras: [], issueDate: '2026-10-06', discount: { type: 'percent', value: 20 } },
      working: [
        '5 December 2026 is an ordinary Saturday, not a bank holiday.',
        'Price band: 70 guests is in 50–99, so Classic is £31.00 a head.',
        'Servers: 70 ÷ 15 = 4.67, round UP, so 5. Chefs: 70 ÷ 40 = 1.75, round UP, so 2. That is 7 people.',
        'Shift: event 18:00–23:00, setup 90 minutes (starts 16:30), clear-down 90 minutes (ends 00:30). 16:30 to 23:00 = 6.5 hours = 390 minutes at the normal rate. 23:00 to 00:30 = 1.5 hours = 90 minutes at time and a half.',
        HOURLY,
        'Hours paid per person: 6.5 + (1.5 × 1.5) = 8.75 hours. 7 people × 8.75 = 61.25 hours × £14.47335 = £886.4927, which is £886.49.',
        'Cost: food 70 × £11.50 = £805.00. Staff £886.49. Travel to St Peter £70.00. Total cost = £1,761.49.',
        'Floor: £1,761.49 × 1.25 = £2,201.8625, rounded UP to £2,201.87.',
        'At full price: Classic menu 70 × £31.00 = £2,170.00 + travel £70.00 = £2,240.00. That is above the floor, but only by £38.13.',
        'With 20% off the menu: £2,170.00 × 20% = £434.00 off, so the menu is £1,736.00. Plus travel £70.00 = £1,806.00 before GST.',
        '£1,806.00 is below the floor of £2,201.87 (short by £395.87).',
        'RIGHT ANSWER: REFUSED. Reason: the price would be £1,806.00 before GST, below our floor of £2,201.87 (cost plus 25%).',
        'The most that can come off is £2,240.00 − £2,201.87 = £38.13 (about 1.7% of the menu price, rounded down).'
      ],
      expect: { status: 'refused', reason: 'discount', servers: 5, chefs: 2, workedMinutes: 480, normalMinutes: 390, premiumMinutes: 90, paidMinutes: 480,
                staffCostPence: 88649, foodCostPence: 80500, costPence: 176149, floorPence: 220187,
                priceExGstPence: 180600, discountPence: 43400, maxDiscountPence: 3813, roomPence: -39587,
                messageIncludes: ['20%', '£1,806.00', '£2,201.87', '£38.13', 'cost plus 25%'],
                lines: [['Classic menu', 70, 217000], ['Travel and setup, St Peter', 1, 7000]] }
    }
  ];

  function pounds(p) {
    var neg = p < 0; p = Math.abs(p);
    return (neg ? '-' : '') + '£' + (p / 100).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  var FIELDS = [   // [label, how to read it from the engine, kind]
    ['Result', function (r) { return r.status; }, 'text', 'status'],
    ['Why it was refused', function (r) { return r.refusal && r.refusal.reason; }, 'text', 'reason'],
    ['Servers', function (r) { return r.staff.servers; }, 'num', 'servers'],
    ['Chefs', function (r) { return r.staff.chefs; }, 'num', 'chefs'],
    ['Minutes actually worked per person', function (r) { return r.staff.shift.workedMinutes; }, 'num', 'workedMinutes'],
    ['Normal-rate minutes paid per person', function (r) { return r.staff.shift.normalMinutes; }, 'num', 'normalMinutes'],
    ['Time-and-a-half minutes per person', function (r) { return r.staff.shift.premiumMinutes; }, 'num', 'premiumMinutes'],
    ['Total minutes paid per person', function (r) { return r.staff.shift.paidMinutes; }, 'num', 'paidMinutes'],
    ['4-hour minimum applied', function (r) { return r.staff.shift.minimumApplied; }, 'text', 'minimumApplied'],
    ['Staff cost', function (r) { return r.staff.costPence; }, 'money', 'staffCostPence'],
    ['Food cost', function (r) { return r.foodCostPence; }, 'money', 'foodCostPence'],
    ['Total cost', function (r) { return r.costPence; }, 'money', 'costPence'],
    ['Floor (cost + 25%)', function (r) { return r.floorPence; }, 'money', 'floorPence'],
    ['Discount', function (r) { return r.discountPence; }, 'money', 'discountPence'],
    ['Price before GST', function (r) { return r.priceExGstPence; }, 'money', 'priceExGstPence'],
    ['Room above the floor', function (r) { return r.roomPence; }, 'money', 'roomPence'],
    ['Most that could come off', function (r) { return r.maxDiscountPence; }, 'money', 'maxDiscountPence'],
    ['GST', function (r) { return r.gstPence; }, 'money', 'gstPence'],
    ['Total including GST', function (r) { return r.totalPence; }, 'money', 'totalPence'],
    ['Deposit (25%)', function (r) { return r.depositPence; }, 'money', 'depositPence'],
    ['Balance', function (r) { return r.balancePence; }, 'money', 'balancePence'],
    ['Quote valid until', function (r) { return r.validUntil; }, 'text', 'validUntil']
  ];

  function run(Pricing, LBData, snapshot) {
    var built = LBData.build(snapshot.csv, snapshot.json);
    if (built.problems.length) {
      return { setupProblems: built.problems, cases: [] };
    }
    var cases = CASES.map(function (c) {
      var result = Pricing.calculate(c.input, built.data);
      var checks = [];
      function add(label, expected, actual, kind) {
        checks.push({ label: label, expected: expected, actual: actual, kind: kind, pass: expected === actual });
      }
      if (result.status === 'invalid') {
        add('The engine accepted the details', 'accepted', 'rejected: ' + result.errors.join(' '), 'text');
      } else {
        FIELDS.forEach(function (f) {
          if (!(f[3] in c.expect)) return;
          add(f[0], c.expect[f[3]], f[1](result), f[2]);
        });
        add('Number of price lines', c.expect.lines.length, result.lines.length, 'num');
        c.expect.lines.forEach(function (l, i) {
          var got = result.lines[i] || { label: '(missing)', qty: null, totalPence: null };
          add('Line ' + (i + 1) + ': ' + l[0], l[0] + ' × ' + l[1] + ' = ' + pounds(l[2]), got.label + ' × ' + got.qty + ' = ' + (got.totalPence == null ? '—' : pounds(got.totalPence)), 'text');
        });
        (c.expect.messageIncludes || []).forEach(function (s) {
          var msg = (result.refusal && result.refusal.message) || '';
          add('Refusal message mentions "' + s + '"', 'yes', msg.indexOf(s) !== -1 ? 'yes' : 'no: "' + msg + '"', 'text');
        });
      }
      return { id: c.id, title: c.title, summary: c.summary, working: c.working, checks: checks,
               pass: checks.every(function (k) { return k.pass; }), result: result };
    });
    return { setupProblems: [], cases: cases };
  }

  var api = { CASES: CASES, run: run, pounds: pounds };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
    if (require.main === module) {
      var fs = require('fs'), vm = require('vm');
      var ctx = { window: {} }; vm.createContext(ctx);
      vm.runInContext(fs.readFileSync(__dirname + '/selftest-data.js', 'utf8'), ctx);
      var out = run(require('./pricing.js'), require('./data.js'), ctx.window.SELFTEST_DATA);
      out.setupProblems.forEach(function (p) { console.log('SETUP PROBLEM: ' + p); });
      out.cases.forEach(function (c) {
        console.log((c.pass ? 'PASS  ' : 'FAIL  ') + c.id + '. ' + c.title);
        c.checks.filter(function (k) { return !k.pass; }).forEach(function (k) {
          console.log('        ' + k.label + ': hand-worked ' + (k.kind === 'money' ? pounds(k.expected) : k.expected) + ' but engine gave ' + (k.kind === 'money' ? pounds(k.actual) : k.actual));
        });
      });
      var failed = out.cases.filter(function (c) { return !c.pass; }).length;
      console.log('\n' + (out.cases.length - failed) + ' of ' + out.cases.length + ' quotes passed');
      process.exit(failed || out.setupProblems.length ? 1 : 0);
    }
  } else root.LBSelfTest = api;
})(typeof window !== 'undefined' ? window : globalThis);
