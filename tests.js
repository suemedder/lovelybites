/* Checks for the pricing rules and data reading.
   Run by opening tests.html (double-click), or `node -e "require('./tests.js')"` is not needed.
   These use their own small fixture prices, so they test the RULES, not today's price list.
   Change a rule in pricing.js and the matching test here should go red. */
(function (root) {
  'use strict';

  var FIXTURE_CSV = [
    'section,item,tier,min_guests,max_guests,unit,price_gbp,minimum_charge_gbp,notes',
    'menu,Classic,Classic,1,49,per head,34.00,,',
    'menu,Classic,Classic,50,99,per head,31.00,,',
    'menu,Classic,Classic,100,,per head,28.00,,',
    'menu,Signature,Signature,1,49,per head,52.00,,',
    'menu,Signature,Signature,50,99,per head,48.00,,',
    'menu,Signature,Signature,100,,per head,44.00,,',
    'menu,Prestige,Prestige,1,49,per head,82.00,,',
    'menu,Prestige,Prestige,50,99,per head,76.00,,',
    'menu,Prestige,Prestige,100,,per head,71.00,,',
    'food_cost,Classic food cost,Classic,,,per head,11.50,,',
    'food_cost,Signature food cost,Signature,,,per head,17.75,,',
    'food_cost,Prestige food cost,Prestige,,,per head,29.00,,',
    'canapes,Canapés (3 per guest),,,,per head,7.50,150.00,',
    'drinks,Corkage,,,,per bottle,8.00,,',
    'equipment,Round table (seats 10),,,,per item,14.00,70.00,',
    'dietary,Dietary surcharge,,,,per head,4.00,,"Vegan, gluten-free"',
    'travel,St Brelade,,,,per event,75.00,,',
    'travel,St Helier,,,,per event,45.00,,',
    'travel,St Saviour,,,,per event,35.00,,',
    'travel,Grouville,,,,per event,55.00,,',
    'travel,St Clement,,,,per event,50.00,,',
    'travel,St John,,,,per event,70.00,,',
    'travel,St Lawrence,,,,per event,60.00,,',
    'travel,St Martin,,,,per event,60.00,,',
    'travel,St Mary,,,,per event,75.00,,',
    'travel,St Ouen,,,,per event,85.00,,',
    'travel,St Peter,,,,per event,70.00,,',
    'travel,Trinity,,,,per event,60.00,,'
  ].join('\r\n');

  function fixturePublic(status) {
    function h(d, n) { return { date: d, name: n }; }
    return {
      retrieved_on: '2026-10-01',
      minimum_wage: { status: status, hourly_rate_gbp: 13.59, applies_from: '2026-04-01', source_url: 'https://example.test/wage' },
      employers_social_security: { status: status, class_1_secondary_rate_up_to_standard_earnings_limit: 0.065, source_url: 'https://example.test/ss' },
      gst: { status: status, standard_rate: 0.05, source_url: 'https://example.test/gst' },
      bank_holidays: {
        status: status, source_url: 'https://example.test/bh',
        '2026': [h('2026-01-01', 'New Year'), h('2026-12-25', 'Christmas Day'), h('2026-12-28', 'Boxing Day')],
        '2027': [h('2027-01-01', 'New Year')]
      }
    };
  }

  function run(Pricing, LBData) {
    var results = [];
    function test(name, fn) {
      try { fn(); results.push({ name: name, pass: true }); }
      catch (e) { results.push({ name: name, pass: false, detail: e.message }); }
    }
    function eq(actual, expected, what) {
      if (actual !== expected) throw new Error((what || 'value') + ': expected ' + expected + ' but got ' + actual);
    }

    var built = LBData.build(FIXTURE_CSV, fixturePublic('CONFIRMED'));
    var data = built.data;
    var base = { guests: 80, style: 'seated', tier: 'Signature', parish: 'St Brelade', eventDate: '2026-06-13',
                 startTime: '18:00', endTime: '23:30', dietaryGuests: 0, extras: [], issueDate: '2026-10-06', discount: { type: 'none' } };
    function q(changes, d) {
      var o = {}; Object.keys(base).forEach(function (k) { o[k] = base[k]; });
      Object.keys(changes || {}).forEach(function (k) { o[k] = changes[k]; });
      return Pricing.calculate(o, d || data);
    }

    // ----- reading the files -----
    test('Fixture data loads with no problems', function () { eq(built.problems.length, 0, 'problems: ' + built.problems.join(' | ')); });
    test('CSV reader copes with quotes, commas inside quotes, CRLF and a BOM', function () {
      var rows = LBData.parseCSV('﻿a,b\r\n"x, y","say ""hi"""\r\n');
      eq(rows.length, 2, 'rows'); eq(rows[0][0], 'a', 'BOM stripped'); eq(rows[1][0], 'x, y', 'comma in quotes'); eq(rows[1][1], 'say "hi"', 'escaped quote');
    });
    test('Overlapping price bands are caught', function () {
      var bad = FIXTURE_CSV.replace('menu,Classic,Classic,50,99', 'menu,Classic,Classic,40,99');
      var b = LBData.build(bad, fixturePublic('CONFIRMED'));
      if (!b.problems.some(function (p) { return /overlap/.test(p); })) throw new Error('no overlap problem reported');
    });
    test('A gap in price bands is caught', function () {
      var bad = FIXTURE_CSV.replace('menu,Classic,Classic,50,99', 'menu,Classic,Classic,60,99');
      var b = LBData.build(bad, fixturePublic('CONFIRMED'));
      if (!b.problems.some(function (p) { return /gap/.test(p); })) throw new Error('no gap problem reported');
    });
    test('A missing parish is caught', function () {
      var bad = FIXTURE_CSV.replace('travel,Trinity,,,,per event,60.00,,', '');
      var b = LBData.build(bad, fixturePublic('CONFIRMED'));
      if (!b.problems.some(function (p) { return /Trinity/.test(p); })) throw new Error('no Trinity problem reported');
    });
    test('A bad price is caught rather than guessed', function () {
      var bad = FIXTURE_CSV.replace('34.00', 'thirty-four');
      var b = LBData.build(bad, fixturePublic('CONFIRMED'));
      if (!b.problems.some(function (p) { return /isn't a valid amount/.test(p); })) throw new Error('no price problem reported');
    });
    test('A public figure with no source is caught', function () {
      var p = fixturePublic('CONFIRMED'); delete p.gst.source_url;
      var b = LBData.build(FIXTURE_CSV, p);
      if (!b.problems.some(function (m) { return /source_url/.test(m); })) throw new Error('no source problem reported');
    });
    test('Unconfirmed public figures are flagged on the quote', function () {
      var d = LBData.build(FIXTURE_CSV, fixturePublic('NOT_CONFIRMED_FROM_PAGE')).data;
      eq(q({}, d).unconfirmed.length, 4, 'unconfirmed count');
    });

    // ----- staff numbers always round UP -----
    test('Seated: 15 guests = 1 server, 16 = 2', function () {
      eq(Pricing.staffNeeded(15, 'seated', Pricing.RULES).servers, 1); eq(Pricing.staffNeeded(16, 'seated', Pricing.RULES).servers, 2);
    });
    test('Seated: 46 guests = 4 servers, not 3', function () { eq(Pricing.staffNeeded(46, 'seated', Pricing.RULES).servers, 4); });
    test('Seated: 45 guests = 3 servers', function () { eq(Pricing.staffNeeded(45, 'seated', Pricing.RULES).servers, 3); });
    test('Buffet: 25 guests = 1 server, 26 = 2, 46 = 2', function () {
      eq(Pricing.staffNeeded(25, 'buffet', Pricing.RULES).servers, 1); eq(Pricing.staffNeeded(26, 'buffet', Pricing.RULES).servers, 2);
      eq(Pricing.staffNeeded(46, 'buffet', Pricing.RULES).servers, 2);
    });
    test('Chefs: 40 guests = 1, 41 = 2 (seated or buffet)', function () {
      eq(Pricing.staffNeeded(40, 'seated', Pricing.RULES).chefs, 1); eq(Pricing.staffNeeded(41, 'seated', Pricing.RULES).chefs, 2);
      eq(Pricing.staffNeeded(41, 'buffet', Pricing.RULES).chefs, 2);
    });
    test('The quote itself uses 4 servers and 2 chefs for 46 seated guests', function () {
      var r = q({ guests: 46 }); eq(r.staff.servers, 4, 'servers'); eq(r.staff.chefs, 2, 'chefs');
    });

    // ----- price breaks -----
    test('49 guests use the 1–49 price, 50 guests the 50–99 price', function () {
      eq(q({ guests: 49 }).lines[0].unitPence, 5200, '49 guests'); eq(q({ guests: 50 }).lines[0].unitPence, 4800, '50 guests');
      eq(q({ guests: 99 }).lines[0].unitPence, 4800, '99 guests'); eq(q({ guests: 100 }).lines[0].unitPence, 4400, '100 guests');
    });

    // ----- hours and premiums -----
    var holidays = data.pub.holidays;
    test('4-hour minimum: a short shift is paid for 4 hours', function () {
      var s = Pricing.shiftBreakdown('2026-06-13', '19:00', '21:00', 0, 0, holidays, Pricing.RULES);
      eq(s.workedMinutes, 120, 'worked'); eq(s.paidMinutes, 240, 'paid');
    });
    test('Time and a half starts at 23:00 (setup 90, 18:00–23:30, clear 90)', function () {
      var s = Pricing.shiftBreakdown('2026-06-13', '18:00', '23:30', 90, 90, holidays, Pricing.RULES);
      eq(s.normalMinutes, 390, 'normal'); eq(s.premiumMinutes, 120, 'premium');
    });
    test('A shift that crosses midnight into a bank holiday: premium isn\'t doubled', function () {
      var s = Pricing.shiftBreakdown('2026-12-24', '18:00', '01:00', 0, 0, holidays, Pricing.RULES);
      eq(s.normalMinutes, 300, 'normal'); eq(s.premiumMinutes, 120, 'premium');
    });
    test('On a bank holiday every hour is premium, and late hours don\'t stack', function () {
      var s = Pricing.shiftBreakdown('2026-12-25', '18:00', '23:30', 0, 0, holidays, Pricing.RULES);
      eq(s.normalMinutes, 0, 'normal'); eq(s.premiumMinutes, 330, 'premium');
      eq(Pricing.staffCostPence(1, s, 1359, 650), Math.round(330 * 1.5 / 60 * 1359 * 1.065), 'cost is 1.5x, not 2x');
    });

    // ----- the worked example from spec.md -----
    test('Worked example: 80 seated Signature guests in St Brelade, 18:00–23:30', function () {
      var r = q({});
      eq(r.status, 'ok', 'status');
      eq(r.staff.servers, 6, 'servers'); eq(r.staff.chefs, 2, 'chefs');
      eq(r.staff.costPence, 109997, 'staff cost');
      eq(r.foodCostPence, 142000, 'food cost'); eq(r.costPence, 259497, 'total cost');
      eq(r.floorPence, 324372, 'floor'); eq(r.priceExGstPence, 391500, 'price');
    });
    test('Worked example: 10% off is allowed; GST and deposit are right', function () {
      var r = q({ discount: { type: 'percent', value: 10 } });
      eq(r.status, 'ok', 'status'); eq(r.priceExGstPence, 353100, 'price'); eq(r.gstPence, 17655, 'GST');
      eq(r.totalPence, 370755, 'total'); eq(r.depositPence, 92689, 'deposit'); eq(r.balancePence, 278066, 'balance');
    });
    test('Worked example: 20% off is REFUSED, with the reason and the most we can take off', function () {
      var r = q({ discount: { type: 'percent', value: 20 } });
      eq(r.status, 'refused', 'status'); eq(r.refusal.reason, 'discount', 'reason'); eq(r.maxDiscountPence, 67128, 'max discount');
      if (!/£3,243\.72/.test(r.refusal.message)) throw new Error('message doesn\'t state the floor: ' + r.refusal.message);
      if (!/£671\.28/.test(r.refusal.message)) throw new Error('message doesn\'t state the max discount');
    });
    test('A £ discount exactly at the limit is allowed; one penny more is refused', function () {
      eq(q({ discount: { type: 'amount', value: 671.28 } }).status, 'ok', 'at the limit');
      eq(q({ discount: { type: 'amount', value: 671.29 } }).status, 'refused', 'one penny over');
    });
    test('Even with no discount, an event under the floor is refused', function () {
      var r = q({ guests: 10, tier: 'Classic', style: 'buffet' });
      eq(r.status, 'refused', 'status'); eq(r.refusal.reason, 'base', 'reason');
    });
    test('A refusal never produces a customer total to quote', function () {
      var r = q({ discount: { type: 'percent', value: 20 } });
      eq(r.status === 'ok', false, 'must not be ok');
    });

    // ----- other lines -----
    test('Hire minimum charge: 2 tables at £14 is under the £70 minimum, so £70', function () {
      var r = q({ extras: [{ key: 'equipment|Round table (seats 10)', qty: 2 }] });
      var line = r.lines.filter(function (l) { return l.kind === 'extra'; })[0];
      eq(line.totalPence, 7000, 'charge'); eq(line.minApplied, true, 'min applied');
    });
    test('Hire above the minimum is quantity × price', function () {
      var r = q({ extras: [{ key: 'equipment|Round table (seats 10)', qty: 8 }] });
      eq(r.lines.filter(function (l) { return l.kind === 'extra'; })[0].totalPence, 11200, 'charge');
    });
    test('Dietary surcharge is per dietary guest', function () {
      var r = q({ dietaryGuests: 5 });
      eq(r.lines.filter(function (l) { return l.kind === 'dietary'; })[0].totalPence, 2000, 'surcharge');
    });
    test('Dietary guests can\'t exceed guests', function () { eq(q({ dietaryGuests: 81 }).status, 'invalid'); });
    test('A discount bigger than the menu price is rejected', function () {
      eq(q({ discount: { type: 'amount', value: 5000 } }).status, 'invalid');
    });

    // ----- dates and public figures -----
    test('Quote is valid for 30 days', function () {
      eq(q({ issueDate: '2026-10-06' }).validUntil, '2026-11-05', 'valid until'); eq(q({ issueDate: '2026-12-10' }).validUntil, '2027-01-09', 'across new year');
    });
    test('An event date with no bank holiday list (2028) is refused, not guessed', function () {
      var r = q({ eventDate: '2028-06-13' }); eq(r.status, 'invalid', 'status');
      if (!/2028/.test(r.errors.join(' '))) throw new Error('error doesn\'t mention 2028');
    });
    test('An event before the minimum wage start date is refused', function () { eq(q({ eventDate: '2026-02-14' }).status, 'invalid'); });
    test('An event a year past the wage start date gets a "check the rate" warning', function () {
      var r = q({ eventDate: '2027-06-12' });
      if (!r.warnings.some(function (w) { return /newer rate/.test(w); })) throw new Error('no warning');
    });
    test('Deposit is 25% of the total including GST', function () {
      var r = q({}); eq(r.depositPence, Pricing.roundDiv(r.totalPence * 25, 100), 'deposit');
    });

    // ----- Good / Better / Best -----
    test('Good/Better/Best: one result per tier, in menu order, and the chosen tier matches the normal quote', function () {
      var o = Pricing.compareTiers(base, data);
      eq(o.map(function (x) { return x.tier; }).join(','), 'Classic,Signature,Prestige', 'tiers');
      eq(o[1].result.totalPence, q({}).totalPence, 'Signature matches the normal quote');
      eq(o[1].result.priceExGstPence, 391500, 'Signature price');
    });
    test('Good/Better/Best: each tier has its own floor (food cost differs)', function () {
      var o = Pricing.compareTiers(base, data);
      eq(o[1].result.floorPence, 324372, 'Signature floor'); eq(o[2].result.floorPence, 436872, 'Prestige floor');
    });
    test('Good/Better/Best: with 20% off, Classic and Signature are refused but Prestige is fine', function () {
      var o = Pricing.compareTiers(q({ discount: { type: 'percent', value: 20 } }).input, data);
      eq(o[0].result.status, 'refused', 'Classic'); eq(o[1].result.status, 'refused', 'Signature'); eq(o[2].result.status, 'ok', 'Prestige');
    });
    test('Good/Better/Best: a tier under the floor at full price is refused, not quoted', function () {
      var o = Pricing.compareTiers(base, data);   // Classic for 80 seated guests is below cost + 25%
      eq(o[0].result.status, 'refused', 'Classic'); eq(o[0].result.refusal.reason, 'base', 'reason');
    });

    // ----- quote-register.csv -----
    test('Register CSV: commas and quotes are wrapped, plain text is left alone', function () {
      eq(LBData.csvLine(['a,b', 'say "hi"', 'plain']), '"a,b","say ""hi""",plain');
    });
    test('Register CSV: text that could run as a spreadsheet formula gets an apostrophe', function () {
      eq(LBData.csvCell('=1+1'), "'=1+1", '='); eq(LBData.csvCell('@SUM(A1)'), "'@SUM(A1)", '@');
      eq(LBData.csvCell('-5'), "'-5", '-'); eq(LBData.csvCell('+44 1534 000000'), "'+44 1534 000000", '+');
    });
    test('Register CSV: a blank cell stays blank and the column list has 24 columns', function () {
      eq(LBData.csvCell(''), '', 'blank'); eq(LBData.REGISTER_COLUMNS.length, 24, 'columns');
    });

    return results;
  }

  var api = { run: run, FIXTURE_CSV: FIXTURE_CSV };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
    if (require.main === module) {
      var res = run(require('./pricing.js'), require('./data.js'));
      res.forEach(function (r) { console.log((r.pass ? 'PASS  ' : 'FAIL  ') + r.name + (r.detail ? '\n        ' + r.detail : '')); });
      var failed = res.filter(function (r) { return !r.pass; }).length;
      console.log('\n' + (res.length - failed) + ' passed, ' + failed + ' failed');
      process.exit(failed ? 1 : 0);
    }
  } else root.LBTests = api;
})(typeof window !== 'undefined' ? window : globalThis);
