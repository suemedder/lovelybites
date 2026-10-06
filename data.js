/* Lovely Bites data loading.
   Turns the text of menu-prices.csv and public-data.json into the data pricing.js uses,
   and checks it. If anything is wrong it reports a problem rather than guessing. */
(function (root) {
  'use strict';

  var PARISHES = ['Grouville', 'St Brelade', 'St Clement', 'St Helier', 'St John', 'St Lawrence',
                  'St Martin', 'St Mary', 'St Ouen', 'St Peter', 'St Saviour', 'Trinity'];
  var COLUMNS = ['section', 'item', 'tier', 'min_guests', 'max_guests', 'unit', 'price_gbp', 'minimum_charge_gbp', 'notes'];
  var SECTIONS = ['menu', 'food_cost', 'canapes', 'drinks', 'equipment', 'dietary', 'travel'];
  var UNITS = ['per head', 'per item', 'per event', 'per bottle'];

  // Proper CSV reading: quotes, commas inside quotes, CRLF, and the BOM Excel adds.
  function parseCSV(text) {
    if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
    var rows = [], row = [], field = '', inQuotes = false, i = 0;
    while (i < text.length) {
      var c = text[i];
      if (inQuotes) {
        if (c === '"') {
          if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
          inQuotes = false; i++; continue;
        }
        field += c; i++; continue;
      }
      if (c === '"') { inQuotes = true; i++; }
      else if (c === ',') { row.push(field); field = ''; i++; }
      else if (c === '\r' || c === '\n') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(field); field = ''; rows.push(row); row = []; i++;
      } else { field += c; i++; }
    }
    if (field !== '' || row.length) { row.push(field); rows.push(row); }
    return rows;
  }

  function toPence(s) {
    s = String(s == null ? '' : s).trim().replace(/^£/, '').replace(/,/g, '');
    return /^\d+(\.\d{1,2})?$/.test(s) ? Math.round(parseFloat(s) * 100) : null;
  }
  function toInt(s) {
    s = String(s == null ? '' : s).trim();
    return /^\d+$/.test(s) ? parseInt(s, 10) : null;
  }
  function validDate(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
    if (!m) return false;
    var d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
  }

  function buildPrices(csvText, problems) {
    var data = { tiers: [], menu: {}, foodCostPence: {}, items: {}, itemOrder: [], dietary: null, travel: {} };
    if (csvText.indexOf('�') !== -1) {
      problems.push('menu-prices.csv has garbled characters. Save it again as "CSV UTF-8" in Excel.');
    }
    var table = parseCSV(csvText).filter(function (r) { return r.some(function (f) { return f.trim() !== ''; }); });
    if (!table.length) { problems.push('menu-prices.csv is empty.'); return data; }
    var header = table[0].map(function (h) { return h.trim(); });
    var missing = COLUMNS.filter(function (c) { return header.indexOf(c) === -1; });
    if (missing.length) { problems.push('menu-prices.csv is missing the column(s): ' + missing.join(', ') + '.'); return data; }
    var col = {}; header.forEach(function (h, i) { col[h] = i; });

    var bandsByTier = {};
    table.slice(1).forEach(function (r, idx) {
      var rowNo = idx + 2;
      var get = function (c) { return (r[col[c]] || '').trim(); };
      var section = get('section'), item = get('item'), tier = get('tier'), unit = get('unit');
      var where = 'menu-prices.csv row ' + rowNo + ' (' + (item || section) + '): ';
      if (SECTIONS.indexOf(section) === -1) { problems.push(where + 'unknown section "' + section + '".'); return; }
      var price = toPence(get('price_gbp'));
      if (price === null) { problems.push(where + 'the price "' + get('price_gbp') + '" isn\'t a valid amount.'); return; }
      var minRaw = get('minimum_charge_gbp'), minPence = null;
      if (minRaw !== '') {
        minPence = toPence(minRaw);
        if (minPence === null) { problems.push(where + 'the minimum charge "' + minRaw + '" isn\'t a valid amount.'); return; }
      }

      if (section === 'menu') {
        var min = toInt(get('min_guests')), maxRaw = get('max_guests'), max = maxRaw === '' ? null : toInt(maxRaw);
        if (!tier) { problems.push(where + 'no tier.'); return; }
        if (min === null || (maxRaw !== '' && max === null)) { problems.push(where + 'the guest numbers aren\'t whole numbers.'); return; }
        (bandsByTier[tier] = bandsByTier[tier] || []).push({ min: min, max: max, pricePence: price, notes: get('notes'), row: rowNo });
      } else if (section === 'food_cost') {
        if (!tier) { problems.push(where + 'no tier.'); return; }
        if (tier in data.foodCostPence) problems.push(where + 'food cost for "' + tier + '" appears twice.');
        data.foodCostPence[tier] = price;
      } else if (section === 'travel') {
        if (PARISHES.indexOf(item) === -1) { problems.push(where + '"' + item + '" isn\'t one of Jersey\'s 12 parishes.'); return; }
        if (item in data.travel) problems.push(where + 'parish appears twice.');
        data.travel[item] = price;
      } else {
        if (UNITS.indexOf(unit) === -1) { problems.push(where + 'unit "' + unit + '" should be one of: ' + UNITS.join(', ') + '.'); return; }
        var rec = { section: section, item: item, unit: unit, pricePence: price, minPence: minPence, notes: get('notes') };
        if (section === 'dietary') {
          if (data.dietary) problems.push(where + 'there should only be one dietary surcharge row.');
          if (unit !== 'per head') problems.push(where + 'the dietary surcharge should be per head.');
          data.dietary = rec;
        } else {
          var key = section + '|' + item;
          if (key in data.items) problems.push(where + 'appears twice.');
          rec.key = key;
          data.items[key] = rec; data.itemOrder.push(key);
        }
      }
    });

    Object.keys(bandsByTier).forEach(function (tier) {
      var bands = bandsByTier[tier].sort(function (a, b) { return a.min - b.min; });
      if (bands[0].min !== 1) problems.push('Menu "' + tier + '": the first price band should start at 1 guest, not ' + bands[0].min + '.');
      bands.forEach(function (b, i) {
        var next = bands[i + 1];
        if (b.max !== null && b.max < b.min) problems.push('Menu "' + tier + '": band starting at ' + b.min + ' ends before it starts.');
        if (next) {
          if (b.max === null) problems.push('Menu "' + tier + '": the open-ended band (' + b.min + '+) isn\'t the last one.');
          else if (next.min <= b.max) problems.push('Menu "' + tier + '": price bands overlap around ' + next.min + ' guests.');
          else if (next.min > b.max + 1) problems.push('Menu "' + tier + '": gap in price bands between ' + b.max + ' and ' + next.min + ' guests.');
        } else if (b.max !== null) {
          problems.push('Menu "' + tier + '": the last price band must have no top limit (e.g. 200+).');
        }
      });
      data.menu[tier] = bands;
      data.tiers.push(tier);
      if (!(tier in data.foodCostPence)) problems.push('Menu "' + tier + '" has no food cost row.');
    });
    Object.keys(data.foodCostPence).forEach(function (t) {
      if (!(t in data.menu)) problems.push('Food cost "' + t + '" has no menu prices.');
    });
    if (!data.tiers.length) problems.push('menu-prices.csv has no menu prices.');
    if (!data.dietary) problems.push('menu-prices.csv has no dietary surcharge row.');
    PARISHES.forEach(function (p) { if (!(p in data.travel)) problems.push('menu-prices.csv has no travel charge for ' + p + '.'); });
    return data;
  }

  function buildPublic(json, problems) {
    var pub = { unconfirmed: [], holidays: new Set(), holidayYears: new Set(), sources: [] };
    function section(name, label) {
      var s = json && json[name];
      if (!s || typeof s !== 'object') { problems.push('public-data.json has no "' + name + '" section.'); return null; }
      if (!s.source_url || typeof s.source_url !== 'string') problems.push('public-data.json: "' + name + '" has no source_url. Every public figure needs its source.');
      else pub.sources.push({ name: label, url: s.source_url, dateChecked: s.date_checked || json.retrieved_on || '' });
      if (String(s.status || '').toUpperCase() !== 'CONFIRMED') {
        pub.unconfirmed.push({ name: label, status: s.status || 'no status given', caveat: s.caveat || '', sourceUrl: s.source_url || '' });
      }
      return s;
    }
    var w = section('minimum_wage', 'Minimum wage');
    if (w) {
      if (!(typeof w.hourly_rate_gbp === 'number' && w.hourly_rate_gbp > 0)) problems.push('public-data.json: minimum wage hourly_rate_gbp isn\'t a number.');
      else pub.wagePence = Math.round(w.hourly_rate_gbp * 100);
      if (!validDate(w.applies_from)) problems.push('public-data.json: minimum wage applies_from isn\'t a date (YYYY-MM-DD).');
      else pub.wageFrom = w.applies_from;
      pub.wageGBP = w.hourly_rate_gbp;
    }
    var ss = section('employers_social_security', 'Employer\'s social security');
    if (ss) {
      var r = ss.class_1_secondary_rate_up_to_standard_earnings_limit;
      if (!(typeof r === 'number' && r >= 0 && r < 1)) problems.push('public-data.json: the employer\'s social security rate isn\'t a number between 0 and 1.');
      else pub.ssBp = Math.round(r * 10000);
    }
    var g = section('gst', 'GST');
    if (g) {
      if (!(typeof g.standard_rate === 'number' && g.standard_rate >= 0 && g.standard_rate < 1)) problems.push('public-data.json: the GST rate isn\'t a number between 0 and 1.');
      else pub.gstBp = Math.round(g.standard_rate * 10000);
    }
    var b = section('bank_holidays', 'Bank holidays');
    if (b) {
      Object.keys(b).filter(function (k) { return /^\d{4}$/.test(k); }).forEach(function (year) {
        if (!Array.isArray(b[year]) || !b[year].length) { problems.push('public-data.json: bank holidays for ' + year + ' is empty.'); return; }
        b[year].forEach(function (h) {
          if (!h || !validDate(h.date) || h.date.slice(0, 4) !== year) problems.push('public-data.json: bad bank holiday date in ' + year + ': ' + JSON.stringify(h));
          else pub.holidays.add(h.date);
        });
        pub.holidayYears.add(year);
      });
      if (!pub.holidayYears.size) problems.push('public-data.json has no bank holiday years.');
    }
    return pub;
  }

  // Returns { data, problems }. Only use `data` if `problems` is empty.
  function build(csvText, publicJson) {
    var problems = [];
    var data = buildPrices(csvText, problems);
    data.pub = buildPublic(publicJson, problems);
    return { data: data, problems: problems };
  }

  // ---------- quote-register.csv ----------
  var REGISTER_COLUMNS = ['quote_number', 'saved_at', 'issue_date', 'valid_until', 'customer', 'contact', 'event_date',
    'start_time', 'end_time', 'parish', 'guests', 'service', 'option', 'menu', 'dietary_guests', 'discount',
    'price_before_gst', 'gst', 'total_inc_gst', 'deposit_25pc', 'balance', 'public_figures', 'prices_file_modified', 'quote_file'];

  // One CSV cell. Text that starts with = + - @ could run as a formula when the register is opened
  // in Excel, so it gets a leading apostrophe. Anything with a comma, quote or line break is quoted.
  function csvCell(v) {
    var s = String(v == null ? '' : v);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    if (/[",\r\n]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
    return s;
  }
  function csvLine(fields) { return fields.map(csvCell).join(','); }

  var api = { parseCSV: parseCSV, build: build, PARISHES: PARISHES, REGISTER_COLUMNS: REGISTER_COLUMNS, csvCell: csvCell, csvLine: csvLine };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.LBData = api;
})(typeof window !== 'undefined' ? window : globalThis);
