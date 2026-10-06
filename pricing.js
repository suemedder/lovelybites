/* Lovely Bites pricing rules.
   No screen code in here: it takes the event details plus the loaded data (see data.js)
   and returns a quote, a refusal, or a list of things still wrong with the input.
   Every price and public figure arrives through `data`. Only the business rules
   from business.md live here. All money is in whole pence. */
(function (root) {
  'use strict';

  var RULES = {
    seatedGuestsPerServer: 15,
    buffetGuestsPerServer: 25,
    guestsPerChef: 40,
    minShiftMinutes: 4 * 60,
    setupMinutes: 90,          // assumption, see spec.md open question 1
    clearMinutes: 90,          // assumption, see spec.md open question 1
    lateAfterMinute: 23 * 60,  // hours from 23:00 are time and a half
    depositBp: 2500,           // 25%
    quoteValidDays: 30,
    floorMarkupBp: 2500        // never below cost + 25%
  };

  // ---------- small helpers (integers only, so no rounding surprises) ----------
  function roundDiv(n, d) { return Math.floor((2 * n + d) / (2 * d)); } // round half up
  function ceilDiv(n, d) { return Math.floor((n + d - 1) / d); }          // always up

  function toInt(v) {
    if (typeof v === 'number') return Number.isInteger(v) ? v : null;
    if (typeof v === 'string' && /^\s*\d+\s*$/.test(v)) return parseInt(v, 10);
    return null;
  }

  function parseISODate(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
    if (!m) return null;
    var d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    if (d.getUTCFullYear() !== +m[1] || d.getUTCMonth() !== +m[2] - 1 || d.getUTCDate() !== +m[3]) return null;
    return d;
  }
  function fmtISO(d) { return d.toISOString().slice(0, 10); }
  function addDays(iso, n) {
    var d = parseISODate(iso);
    d.setUTCDate(d.getUTCDate() + n);
    return fmtISO(d);
  }
  function addYears(iso, n) {
    var d = parseISODate(iso);
    d.setUTCFullYear(d.getUTCFullYear() + n);
    return fmtISO(d);
  }
  function parseTime(s) {
    var m = /^(\d{1,2}):(\d{2})$/.exec(s || '');
    if (!m || +m[1] > 23 || +m[2] > 59) return null;
    return +m[1] * 60 + +m[2];
  }

  // ---------- the rules, one small function each ----------
  function findBand(bands, guests) {
    for (var i = 0; i < bands.length; i++) {
      var b = bands[i];
      if (guests >= b.min && (b.max === null || guests <= b.max)) return b;
    }
    return null;
  }

  // Staff numbers always round UP: 46 seated guests = 4 servers.
  function staffNeeded(guests, style, rules) {
    var perServer = style === 'buffet' ? rules.buffetGuestsPerServer : rules.seatedGuestsPerServer;
    return { servers: ceilDiv(guests, perServer), chefs: ceilDiv(guests, rules.guestsPerChef) };
  }

  // One shift per person: setup + event + clear-down. Each minute is normal or time and a half.
  // Time and a half = on a bank holiday, or from 23:00 until the shift ends.
  // The two never stack: a late hour on a bank holiday is still 1.5x.
  function shiftBreakdown(eventDate, startTime, endTime, setup, clear, holidays, rules) {
    var s = parseTime(startTime), e = parseTime(endTime);
    var end = e <= s ? e + 1440 : e;        // finishing "earlier" than the start means after midnight
    var from = s - setup, to = end + clear;
    var holidayCache = {};
    var normal = 0, premium = 0;
    for (var m = from; m < to; m++) {
      var dayOffset = Math.floor(m / 1440);
      var tod = m - dayOffset * 1440;
      if (!(dayOffset in holidayCache)) holidayCache[dayOffset] = holidays.has(addDays(eventDate, dayOffset));
      var late = m >= rules.lateAfterMinute || (m < 0 && tod >= rules.lateAfterMinute);
      if (late || holidayCache[dayOffset]) premium++; else normal++;
    }
    var worked = normal + premium;
    var padded = 0;
    if (worked < rules.minShiftMinutes) {   // 4-hour minimum, topped up at the normal rate
      padded = rules.minShiftMinutes - worked;
      normal += padded;
    }
    return {
      fromMinute: from, toMinute: to,
      workedMinutes: worked, normalMinutes: normal, premiumMinutes: premium,
      paidMinutes: normal + premium, minimumApplied: padded > 0, paddedMinutes: padded
    };
  }

  // Staff cost = minimum wage + employer's social security, premium minutes at 1.5x.
  function staffCostPence(headcount, shift, wagePence, ssBp) {
    var num = headcount * (2 * shift.normalMinutes + 3 * shift.premiumMinutes) * wagePence * (10000 + ssBp);
    return roundDiv(num, 2 * 60 * 10000);
  }

  function lineWithMinimum(qty, unitPence, minPence) {
    var raw = qty * unitPence;
    var applied = minPence !== null && minPence !== undefined && raw < minPence;
    return { totalPence: applied ? minPence : raw, minApplied: applied };
  }

  function discountWords(d) {
    return d.type === 'percent' ? (+d.value) + '%' : '£' + (Math.round(+d.value * 100) / 100).toFixed(2);
  }
  function pounds(p) { return '£' + (p / 100).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

  // ---------- the quote ----------
  function compute(input, data, userRules) {
    var rules = {};
    Object.keys(RULES).forEach(function (k) { rules[k] = RULES[k]; });
    Object.keys(userRules || {}).forEach(function (k) { rules[k] = userRules[k]; });
    var errors = [], warnings = [];
    var pub = data.pub;

    var guests = toInt(input.guests);
    if (guests === null || guests < 1) errors.push('Enter the number of guests (a whole number, 1 or more).');
    if (input.style !== 'seated' && input.style !== 'buffet') errors.push('Choose seated or buffet.');
    if (!data.menu[input.tier]) errors.push('Choose a menu tier.');
    if (!(input.parish in data.travel)) errors.push('Choose the parish.');
    if (!parseISODate(input.eventDate)) errors.push('Enter the event date.');
    var st = parseTime(input.startTime), en = parseTime(input.endTime);
    if (st === null) errors.push('Enter the event start time.');
    if (en === null) errors.push('Enter the event finish time.');
    if (st !== null && en !== null && st === en) errors.push('The start and finish times are the same.');
    if (!parseISODate(input.issueDate)) errors.push('Enter the date the quote is issued.');
    var dietary = toInt(input.dietaryGuests === '' || input.dietaryGuests == null ? 0 : input.dietaryGuests);
    if (dietary === null) errors.push('Dietary guests must be a whole number.');
    else if (guests !== null && dietary > guests) errors.push('There can\'t be more dietary guests than guests.');

    var extras = [];
    (input.extras || []).forEach(function (x) {
      var q = toInt(x.qty);
      var item = data.items[x.key];
      if (!item) errors.push('Unknown extra: ' + x.key);
      else if (q === null || q < 0) errors.push('Quantity for "' + item.item + '" must be a whole number.');
      else if (q > 0) extras.push({ item: item, qty: q });
    });

    var disc = input.discount || { type: 'none' };
    var discountBp = 0, discountFixed = 0;
    if (disc.type === 'percent') {
      var pv = Number(disc.value);
      if (!(pv > 0 && pv <= 100)) errors.push('A percentage discount must be more than 0 and no more than 100.');
      else discountBp = Math.round(pv * 100);
    } else if (disc.type === 'amount') {
      var av = Number(disc.value);
      if (!(av > 0) || Math.abs(av * 100 - Math.round(av * 100)) > 1e-6) errors.push('A £ discount must be more than 0, in pounds and pence.');
      else discountFixed = Math.round(av * 100);
    } else if (disc.type !== 'none') {
      errors.push('Unknown discount type.');
    }

    // Public figures: refuse to guess when the date isn't covered.
    var eventDate = parseISODate(input.eventDate) ? input.eventDate : null;
    if (eventDate && st !== null && en !== null && st !== en) {
      var lastDay = addDays(eventDate, Math.floor((Math.max(en <= st ? en + 1440 : en, 0) + rules.clearMinutes) / 1440));
      var firstDay = addDays(eventDate, Math.floor((st - rules.setupMinutes) / 1440));
      [firstDay, eventDate, lastDay].forEach(function (day) {
        var y = day.slice(0, 4);
        if (!pub.holidayYears.has(y) && errors.indexOf('MISSING-' + y) === -1) errors.push('MISSING-' + y);
      });
      errors = errors.map(function (e) {
        return e.indexOf('MISSING-') === 0
          ? 'public-data.json has no Jersey bank holidays for ' + e.slice(8) + ', so staff cost can\'t be worked out for that date. Add them (with their source) first.'
          : e;
      }).filter(function (e, i, a) { return a.indexOf(e) === i; });
      if (eventDate < pub.wageFrom) {
        errors.push('The minimum wage on file only applies from ' + pub.wageFrom + ', so it can\'t be used for an event on ' + eventDate + '.');
      } else if (eventDate >= addYears(pub.wageFrom, 1)) {
        warnings.push('The minimum wage on file applies from ' + pub.wageFrom + '. Check whether a newer rate applies by ' + eventDate + '.');
      }
    }
    if (eventDate && parseISODate(input.issueDate) && eventDate < input.issueDate) {
      warnings.push('The event date is before the date the quote is issued.');
    }
    if (errors.length) return { status: 'invalid', errors: errors, warnings: warnings };

    // Price lines
    var bands = data.menu[input.tier];
    var band = findBand(bands, guests);
    var lines = [];
    var menuPence = guests * band.pricePence;
    lines.push({ kind: 'menu', label: input.tier + ' menu', qty: guests, unit: 'per head', unitPence: band.pricePence,
                 minPence: null, minApplied: false, totalPence: menuPence,
                 bandText: band.max === null ? band.min + '+ guests' : band.min + '–' + band.max + ' guests' });
    if (dietary > 0) {
      var dl = lineWithMinimum(dietary, data.dietary.pricePence, data.dietary.minPence);
      lines.push({ kind: 'dietary', label: data.dietary.item, qty: dietary, unit: data.dietary.unit, unitPence: data.dietary.pricePence,
                   minPence: data.dietary.minPence, minApplied: dl.minApplied, totalPence: dl.totalPence });
    }
    extras.forEach(function (x) {
      var l = lineWithMinimum(x.qty, x.item.pricePence, x.item.minPence);
      lines.push({ kind: 'extra', section: x.item.section, label: x.item.item, qty: x.qty, unit: x.item.unit,
                   unitPence: x.item.pricePence, minPence: x.item.minPence, minApplied: l.minApplied, totalPence: l.totalPence });
    });
    var travelPence = data.travel[input.parish];
    lines.push({ kind: 'travel', label: 'Travel and setup, ' + input.parish, qty: 1, unit: 'per event',
                 unitPence: travelPence, minPence: null, minApplied: false, totalPence: travelPence });

    var beforeDiscount = lines.reduce(function (a, l) { return a + l.totalPence; }, 0);

    // Discounts come off the menu price only.
    var discountPence = discountBp ? roundDiv(menuPence * discountBp, 10000) : discountFixed;
    if (discountPence > menuPence) {
      return { status: 'invalid', warnings: warnings,
               errors: ['The discount (' + pounds(discountPence) + ') is more than the menu price (' + pounds(menuPence) + ').'] };
    }
    var priceExGst = beforeDiscount - discountPence;

    // Staff
    var staff = staffNeeded(guests, input.style, rules);
    var headcount = staff.servers + staff.chefs;
    var setup = input.setupMinutes != null ? input.setupMinutes : rules.setupMinutes;
    var clear = input.clearMinutes != null ? input.clearMinutes : rules.clearMinutes;
    var shift = shiftBreakdown(eventDate, input.startTime, input.endTime, setup, clear, pub.holidays, rules);
    var wagePence = pub.wagePence, ssBp = pub.ssBp;
    var staffPence = staffCostPence(headcount, shift, wagePence, ssBp);

    // Cost: food + staff + everything else at its selling price (we don't know our own cost for it).
    var foodPence = guests * data.foodCostPence[input.tier];
    var otherPence = beforeDiscount - menuPence;
    var costPence = foodPence + staffPence + otherPence;
    var floorPence = ceilDiv(costPence * (10000 + rules.floorMarkupBp), 10000);   // rounded up, in our favour
    var maxDiscountPence = Math.max(0, Math.min(menuPence, beforeDiscount - floorPence));

    var gstPence = roundDiv(priceExGst * pub.gstBp, 10000);
    var totalPence = priceExGst + gstPence;
    var depositPence = roundDiv(totalPence * rules.depositBp, 10000);

    var result = {
      status: 'ok', errors: [], warnings: warnings, unconfirmed: pub.unconfirmed.slice(),
      input: input, guests: guests, band: band,
      staff: { servers: staff.servers, chefs: staff.chefs, headcount: headcount, shift: shift,
               setupMinutes: setup, clearMinutes: clear, wagePence: wagePence, ssBp: ssBp, costPence: staffPence },
      lines: lines, menuPence: menuPence, beforeDiscountPence: beforeDiscount,
      discountPence: discountPence, discount: disc, priceExGstPence: priceExGst,
      gstPence: gstPence, gstBp: pub.gstBp, totalPence: totalPence,
      depositPence: depositPence, balancePence: totalPence - depositPence,
      foodCostPence: foodPence, otherCostPence: otherPence, costPence: costPence,
      floorPence: floorPence, roomPence: priceExGst - floorPence, maxDiscountPence: maxDiscountPence,
      validUntil: addDays(input.issueDate, rules.quoteValidDays), issueDate: input.issueDate
    };

    if (priceExGst < floorPence) {
      var withDiscount = discountPence > 0;
      var msg;
      if (withDiscount) {
        msg = 'A ' + discountWords(disc) + ' discount would bring the price to ' + pounds(priceExGst) + ' before GST. ' +
          'Our floor for this event is ' + pounds(floorPence) + ' (cost plus 25%), so we can\'t offer it. ' +
          (maxDiscountPence > 0
            ? 'The most we can take off is ' + pounds(maxDiscountPence) + ' (about ' + (Math.floor(maxDiscountPence * 1000 / menuPence) / 10) + '% of the menu price).'
            : 'We can\'t take anything off this event.');
      } else {
        msg = 'Even with no discount, the price of ' + pounds(priceExGst) + ' before GST is below our floor of ' +
          pounds(floorPence) + ' (cost plus 25%) for this event, so we can\'t quote it as it stands.';
      }
      result.status = 'refused';
      result.refusal = { reason: withDiscount ? 'discount' : 'base', message: msg, alternatives: [] };
    }
    return result;
  }

  // Same as compute, but when a quote is refused it also tries a few other set-ups
  // with the same discount, so staff can offer something instead.
  function calculate(input, data, userRules) {
    var r = compute(input, data, userRules);
    if (r.status !== 'refused') return r;
    var copy = function (changes) {
      var o = {};
      Object.keys(input).forEach(function (k) { o[k] = input[k]; });
      Object.keys(changes).forEach(function (k) { o[k] = changes[k]; });
      return o;
    };
    data.tiers.forEach(function (t) {
      if (t === input.tier) return;
      var a = compute(copy({ tier: t }), data, userRules);
      if (a.status === 'ok') r.refusal.alternatives.push({ label: 'Switch to the ' + t + ' menu', priceExGstPence: a.priceExGstPence, totalPence: a.totalPence });
    });
    if (input.style === 'seated') {
      var b = compute(copy({ style: 'buffet' }), data, userRules);
      if (b.status === 'ok') r.refusal.alternatives.push({ label: 'Serve it as a buffet instead', priceExGstPence: b.priceExGstPence, totalPence: b.totalPence });
    }
    return r;
  }

  // Good / Better / Best: the same event, quoted on every menu tier, each with the same discount.
  // Each tier gets its own floor check, so one tier can be refused while the others are fine.
  function compareTiers(input, data, userRules) {
    return data.tiers.map(function (tier) {
      var o = {};
      Object.keys(input).forEach(function (k) { o[k] = input[k]; });
      o.tier = tier;
      return { tier: tier, result: compute(o, data, userRules) };
    });
  }

  var api = {
    RULES: RULES, calculate: calculate, compute: compute, compareTiers: compareTiers,
    staffNeeded: staffNeeded, findBand: findBand, shiftBreakdown: shiftBreakdown, staffCostPence: staffCostPence,
    roundDiv: roundDiv, ceilDiv: ceilDiv, addDays: addDays, parseISODate: parseISODate, parseTime: parseTime
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Pricing = api;
})(typeof window !== 'undefined' ? window : globalThis);
