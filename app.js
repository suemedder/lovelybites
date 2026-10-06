/* Lovely Bites quote tool: the screens.
   This file only reads the form, calls Pricing.calculate (pricing.js) and shows the answer.
   No prices or business rules live here. */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var state = { data: null, result: null, ack: false, quoteNo: null, tab: 'internal', handle: null, pending: null, mods: null };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function money(p) {
    var neg = p < 0; p = Math.abs(p);
    return (neg ? '-' : '') + '£' + (p / 100).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function longDate(iso) {
    return new Date(iso + 'T00:00:00Z').toLocaleDateString('en-GB', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }
  function clock(m) {
    var day = Math.floor(m / 1440), t = m - day * 1440;
    var s = ('0' + Math.floor(t / 60)).slice(-2) + ':' + ('0' + (t % 60)).slice(-2);
    return s + (day < 0 ? ' (day before)' : day > 0 ? ' (next day)' : '');
  }
  function hours(mins) {
    var h = Math.floor(mins / 60), m = mins % 60;
    return h + 'h' + (m ? ' ' + m + 'm' : '');
  }
  function pct(bp) { return (bp / 100) + '%'; }
  function today() {
    var d = new Date();
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  }
  function readText(file) {
    if (file.text) return file.text();
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () { resolve(r.result); };
      r.onerror = function () { reject(r.error); };
      r.readAsText(file);
    });
  }

  // ---------- loading the two files ----------
  function pick(files, name) {
    var found = files.filter(function (f) { return f.name === name; });
    found.sort(function (a, b) { return (a.webkitRelativePath || '').length - (b.webkitRelativePath || '').length; });
    return found[0] || null;
  }

  function stopWith(html) {
    $('formSection').hidden = true; $('resultSection').hidden = true; state.data = null;
    $('loadStatus').innerHTML = html;
  }

  // The plain folder picker (any browser). Files chosen this way can't be re-read later.
  function handleFiles(fileList) {
    var files = Array.prototype.slice.call(fileList);
    state.handle = null; $('forgetBtn').hidden = true;
    var csv = pick(files, 'menu-prices.csv'), json = pick(files, 'public-data.json');
    var missing = [];
    if (!csv) missing.push('menu-prices.csv');
    if (!json) missing.push('public-data.json');
    if (missing.length) {
      stopWith('<div class="msg bad">Couldn\'t find ' + esc(missing.join(' and ')) + ' in what you chose. Pick the lovelybites folder, or select both files.</div>');
      return;
    }
    loadFiles(csv, json, false, '');
  }

  // Reads, checks and shows the two files. keepForm = true keeps what's already typed in (used when
  // the files change while the page is open). A broken file always stops quoting.
  function loadFiles(csv, json, keepForm, note) {
    if (!keepForm) { $('formSection').hidden = true; $('resultSection').hidden = true; state.data = null; }
    return Promise.all([readText(csv), readText(json)]).then(function (texts) {
      var parsed;
      try { parsed = JSON.parse(texts[1].replace(/^﻿/, '')); }
      catch (e) { stopWith('<div class="msg bad">public-data.json isn\'t valid JSON: ' + esc(e.message) + '</div>'); return false; }
      var built = LBData.build(texts[0], parsed);
      if (built.problems.length) {
        stopWith('<div class="msg bad"><strong>Can\'t use these files yet.</strong> Fix these and load again:<ul>' +
          built.problems.map(function (p) { return '<li>' + esc(p) + '</li>'; }).join('') + '</ul></div>');
        return false;
      }
      var d = built.data, html = '';
      html += '<div class="msg ok">' + (note ? esc(note) + ' ' : '') + 'Loaded <strong>menu-prices.csv</strong> (last changed ' + esc(new Date(csv.lastModified).toLocaleString('en-GB')) +
        ') and <strong>public-data.json</strong> (last changed ' + esc(new Date(json.lastModified).toLocaleString('en-GB')) + '). ' +
        d.tiers.length + ' menus, ' + d.itemOrder.length + ' add-ons and hire items, 12 parishes.</div>';
      if (d.pub.unconfirmed.length) {
        html += '<div class="msg warn"><strong>Some public figures are not confirmed from the official page:</strong> ' +
          d.pub.unconfirmed.map(function (u) { return esc(u.name); }).join(', ') +
          '. Quotes can be worked out, but you\'ll need to tick that you\'ve checked them before a customer quote can be shown.</div>';
      }
      $('loadStatus').innerHTML = html;
      var savedExtras = keepForm ? captureExtras() : null;
      state.data = d; state.ack = false;           // new files, so the "I've checked these figures" tick starts again
      state.mods = { csv: csv.lastModified, json: json.lastModified };
      buildForm();
      if (savedExtras) restoreExtras(savedExtras);
      $('formSection').hidden = false; $('resultSection').hidden = false;
      refresh();
      return true;
    }).catch(function (e) {
      stopWith('<div class="msg bad">Couldn\'t read the files: ' + esc(e && e.message) + '</div>');
      return false;
    });
  }

  // ---------- remembering the folder (Chrome and Edge) ----------
  // A page opened by double-click can't read the CSV beside it on its own: browsers block that for
  // local files. What they do allow is remembering a folder you've chosen once. Only the folder is
  // remembered, never the prices: the files are read again every time.
  var DB_NAME = 'lovelybites', STORE = 'handles', KEY = 'folder';
  function idb(fn) {
    return new Promise(function (resolve, reject) {
      var open = indexedDB.open(DB_NAME, 1);
      open.onupgradeneeded = function () { open.result.createObjectStore(STORE); };
      open.onerror = function () { reject(open.error); };
      open.onsuccess = function () {
        var req;
        try { req = fn(open.result.transaction(STORE, 'readwrite').objectStore(STORE)); } catch (e) { reject(e); return; }
        req.onsuccess = function () { resolve(req.result); };
        req.onerror = function () { reject(req.error); };
      };
    });
  }

  function readFolder(handle) {
    function get(name) { return handle.getFileHandle(name).then(function (h) { return h.getFile(); }); }
    return Promise.all([get('menu-prices.csv'), get('public-data.json')]);
  }

  function loadFromHandle(handle, keepForm, note) {
    return readFolder(handle).then(function (f) {
      state.handle = handle; $('forgetBtn').hidden = false; $('reconnectBtn').hidden = true;
      return loadFiles(f[0], f[1], keepForm, note || 'From the remembered folder "' + handle.name + '".');
    }).catch(function (e) {
      stopWith('<div class="msg bad">Couldn\'t find menu-prices.csv and public-data.json in the folder "' + esc(handle.name) +
        '" (' + esc(e && e.message) + '). Choose the lovelybites folder again.</div>');
      return false;
    });
  }

  function pickFolder() {
    window.showDirectoryPicker({ id: 'lovelybites' }).then(function (h) {
      idb(function (st) { return st.put(h, KEY); }).catch(function () {});   // remembering is a bonus
      return loadFromHandle(h, false, 'Folder "' + h.name + '" chosen and remembered.');
    }).catch(function (e) {
      if (e && e.name !== 'AbortError') stopWith('<div class="msg bad">Couldn\'t open the folder picker: ' + esc(e.message) + '</div>');
    });
  }

  function reconnect() {
    var h = state.pending;
    h.requestPermission({ mode: 'read' }).then(function (p) {
      if (p === 'granted') return loadFromHandle(h, false);
      stopWith('<div class="msg warn">Permission wasn\'t given, so the prices can\'t be read. Choose the folder again or reconnect.</div>');
    }).catch(function () {});
  }

  function forget() {
    idb(function (st) { return st['delete'](KEY); }).catch(function () {});
    state.handle = null; state.pending = null;
    $('forgetBtn').hidden = true; $('reconnectBtn').hidden = true;
    stopWith('<div class="msg warn">Folder forgotten. Choose it again to load the prices.</div>');
  }

  // If menu-prices.csv or public-data.json is edited while the page is open, pick the change up
  // as soon as you come back to the page, so a quote is never worked out from old prices.
  var checking = false;
  function checkForChanges() {
    if (!state.handle || !state.data || checking) return;
    checking = true;
    readFolder(state.handle).then(function (f) {
      if (f[0].lastModified !== state.mods.csv || f[1].lastModified !== state.mods.json) {
        return loadFiles(f[0], f[1], true, 'The price files changed, so they were read again at ' +
          new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + '.');
      }
    }).catch(function () {
      $('loadStatus').insertAdjacentHTML('afterbegin', '<div class="msg warn">Couldn\'t re-check the price files. Use "Choose the folder" to load them again.</div>');
    }).then(function () { checking = false; });
  }

  function startUp() {
    if (!window.showDirectoryPicker) {
      $('plainPicker').open = true;
      $('whyText').textContent += ' This browser can\'t remember the folder, so you\'ll need to choose it each time you open the tool. Chrome or Edge can remember it.';
      return;
    }
    $('rememberBox').hidden = false;
    idb(function (st) { return st.get(KEY); }).then(function (h) {
      if (!h) return;
      return h.queryPermission({ mode: 'read' }).then(function (p) {
        if (p === 'granted') return loadFromHandle(h, false);
        state.pending = h;
        $('reconnectBtn').textContent = 'Reconnect to "' + h.name + '"';
        $('reconnectBtn').hidden = false; $('forgetBtn').hidden = false;
      });
    }).catch(function () {});
  }

  function captureExtras() {
    var saved = {};
    Array.prototype.forEach.call(document.querySelectorAll('.extra-input'), function (el) {
      saved[el.dataset.key] = el.type === 'checkbox' ? el.checked : el.value;
    });
    return saved;
  }
  function restoreExtras(saved) {
    Array.prototype.forEach.call(document.querySelectorAll('.extra-input'), function (el) {
      if (!(el.dataset.key in saved)) return;
      if (el.type === 'checkbox') el.checked = saved[el.dataset.key]; else el.value = saved[el.dataset.key];
    });
  }

  // ---------- the form ----------
  var SECTION_TITLES = { canapes: 'Canapés', drinks: 'Drinks', equipment: 'Equipment hire' };

  function buildForm() {
    var d = state.data;
    var keep = { parish: $('parish').value, tier: $('tier').value };
    $('parish').innerHTML = '<option value="">Choose…</option>' + Object.keys(d.travel).sort().map(function (p) {
      return '<option>' + esc(p) + '</option>'; }).join('');
    $('tier').innerHTML = d.tiers.map(function (t) { return '<option>' + esc(t) + '</option>'; }).join('');
    if (keep.parish && d.travel[keep.parish] != null) $('parish').value = keep.parish;
    if (keep.tier && d.menu[keep.tier]) $('tier').value = keep.tier;
    if (!$('issueDate').value) $('issueDate').value = today();
    if ($('setupMinutes').value === '') $('setupMinutes').value = Pricing.RULES.setupMinutes;
    if ($('clearMinutes').value === '') $('clearMinutes').value = Pricing.RULES.clearMinutes;

    var box = $('extras'); box.innerHTML = '';
    ['canapes', 'drinks', 'equipment'].forEach(function (section) {
      var keys = d.itemOrder.filter(function (k) { return d.items[k].section === section; });
      if (!keys.length) return;
      var group = document.createElement('div'); group.className = 'extra-group';
      var h = document.createElement('h4'); h.textContent = SECTION_TITLES[section]; group.appendChild(h);
      keys.forEach(function (k) {
        var it = d.items[k];
        var row = document.createElement('div'); row.className = 'extra-row';
        var name = document.createElement('span'); name.className = 'name'; name.textContent = it.item;
        var price = document.createElement('span'); price.className = 'price';
        price.textContent = money(it.pricePence) + ' ' + it.unit + (it.minPence ? ', min ' + money(it.minPence) : '');
        var input = document.createElement('input');
        input.dataset.key = k; input.dataset.unit = it.unit; input.className = 'extra-input';
        if (it.unit === 'per head' || it.unit === 'per event') {
          input.type = 'checkbox';
          input.setAttribute('aria-label', it.item);
          row.appendChild(input); row.appendChild(name); row.appendChild(price);
          var note = document.createElement('span'); note.className = 'price';
          note.textContent = it.unit === 'per head' ? '× all guests' : '× 1';
          row.appendChild(note);
        } else {
          input.type = 'number'; input.min = '0'; input.step = '1'; input.value = '0';
          input.setAttribute('aria-label', 'Quantity of ' + it.item);
          row.appendChild(name); row.appendChild(price); row.appendChild(input);
        }
        group.appendChild(row);
      });
      box.appendChild(group);
    });
  }

  function readInput() {
    var extras = [];
    Array.prototype.forEach.call(document.querySelectorAll('.extra-input'), function (el) {
      var qty;
      if (el.type === 'checkbox') qty = el.checked ? (el.dataset.unit === 'per head' ? $('guests').value : 1) : 0;
      else qty = el.value;
      if (qty !== 0 && qty !== '0' && qty !== '') extras.push({ key: el.dataset.key, qty: qty });
    });
    var discType = document.querySelector('input[name=discType]:checked').value;
    var setup = $('setupMinutes').value, clear = $('clearMinutes').value;
    return {
      guests: $('guests').value, style: document.querySelector('input[name=style]:checked').value,
      tier: $('tier').value, parish: $('parish').value, eventDate: $('eventDate').value,
      startTime: $('startTime').value, endTime: $('endTime').value, issueDate: $('issueDate').value,
      dietaryGuests: $('dietaryGuests').value, extras: extras,
      discount: { type: discType, value: $('discValue').value },
      setupMinutes: setup === '' ? null : Number(setup), clearMinutes: clear === '' ? null : Number(clear)
    };
  }

  // ---------- showing the answer ----------
  function refresh() {
    if (!state.data) return;
    var input = readInput();
    var r = Pricing.calculate(input, state.data);
    state.result = r; state.quoteNo = null;
    var customerOk = r.status === 'ok' && (!r.unconfirmed.length || state.ack);
    $('tabCustomer').disabled = !customerOk;
    if (!customerOk && state.tab === 'customer') state.tab = 'internal';
    renderInternal(r);
    renderCustomer(r);
    showTab();
  }

  function showTab() {
    var cust = state.tab === 'customer';
    $('internal').hidden = cust; $('customer').hidden = !cust;
    $('tabInternal').setAttribute('aria-selected', String(!cust));
    $('tabCustomer').setAttribute('aria-selected', String(cust));
  }

  function list(items) { return '<ul>' + items.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul>'; }

  function renderInternal(r) {
    var h = '';
    if (r.status === 'invalid') {
      h += '<div class="msg warn"><strong>Still to sort out:</strong>' + list(r.errors.map(esc)) + '</div>';
      if (r.warnings.length) h += '<div class="msg warn">' + list(r.warnings.map(esc)) + '</div>';
      $('internal').innerHTML = h; return;
    }
    if (r.status === 'refused') {
      h += '<div class="msg bad"><strong class="big">Refused: this would be below cost plus 25%.</strong><p>' + esc(r.refusal.message) + '</p>';
      if (r.refusal.alternatives.length) {
        h += '<p>These would work with the same discount:</p>' + list(r.refusal.alternatives.map(function (a) {
          return esc(a.label) + ': ' + money(a.priceExGstPence) + ' before GST (' + money(a.totalPence) + ' with GST)';
        }));
      } else if (r.refusal.reason === 'discount' && r.maxDiscountPence > 0) {
        h += '<p>Try a discount of ' + money(r.maxDiscountPence) + ' or less.</p>';
      }
      h += '</div>';
    } else {
      h += '<div class="msg ok"><strong>OK to quote:</strong> ' + money(r.priceExGstPence) + ' before GST, ' + money(r.totalPence) + ' with GST.</div>';
    }
    if (r.warnings.length) h += '<div class="msg warn">' + list(r.warnings.map(esc)) + '</div>';
    if (r.unconfirmed.length) {
      h += '<div class="msg warn"><strong>Not confirmed from the official source yet:</strong>' + list(r.unconfirmed.map(function (u) {
        return '<strong>' + esc(u.name) + '</strong> (' + esc(u.status) + '). ' + esc(u.caveat) + ' ' +
          (u.sourceUrl ? 'Check it at <a href="' + esc(u.sourceUrl) + '" target="_blank" rel="noopener">' + esc(u.sourceUrl) + '</a>.' : '');
      })) + (r.status === 'ok'
        ? '<label class="inline"><input type="checkbox" id="ack"' + (state.ack ? ' checked' : '') + '> I\'ve checked these figures against their source. Allow the customer quote.</label>' : '') + '</div>';
    }

    // Price
    h += '<h3>Price</h3><table><thead><tr><th>Item</th><th class="num">Quantity</th><th class="num">Each</th><th class="num">Amount</th></tr></thead><tbody>';
    r.lines.forEach(function (l) {
      h += '<tr><td>' + esc(l.label) + (l.bandText ? ' <span class="hint">(' + esc(l.bandText) + ' price)</span>' : '') +
        (l.minApplied ? ' <span class="hint">(minimum charge ' + money(l.minPence) + ' applies)</span>' : '') + '</td>' +
        '<td class="num">' + l.qty + '</td><td class="num">' + money(l.unitPence) + ' ' + esc(l.unit) + '</td><td class="num">' + money(l.totalPence) + '</td></tr>';
    });
    if (r.discountPence) h += '<tr><td>Discount (' + (r.discount.type === 'percent' ? esc(r.discount.value) + '% of the menu price' : 'off the menu price') + ')</td><td></td><td></td><td class="num">' + money(-r.discountPence) + '</td></tr>';
    h += '<tr class="total"><td>Price before GST</td><td></td><td></td><td class="num">' + money(r.priceExGstPence) + '</td></tr>' +
      '<tr class="sub"><td>GST at ' + pct(r.gstBp) + '</td><td></td><td></td><td class="num">' + money(r.gstPence) + '</td></tr>' +
      '<tr class="total"><td>Total including GST</td><td></td><td></td><td class="num">' + money(r.totalPence) + '</td></tr>' +
      '<tr class="sub"><td>Deposit (25%)</td><td></td><td></td><td class="num">' + money(r.depositPence) + '</td></tr>' +
      '<tr class="sub"><td>Balance</td><td></td><td></td><td class="num">' + money(r.balancePence) + '</td></tr></tbody></table>';

    // Cost and floor
    h += '<h3>Cost and floor</h3><table><tbody>' +
      '<tr><td>Food (' + r.guests + ' guests)</td><td class="num">' + money(r.foodCostPence) + '</td></tr>' +
      '<tr><td>Staff (' + r.staff.headcount + ' people)</td><td class="num">' + money(r.staff.costPence) + '</td></tr>' +
      '<tr><td>Dietary, add-ons, hire and travel <span class="hint">(counted at the price we charge, as we don\'t have our own cost for them)</span></td><td class="num">' + money(r.otherCostPence) + '</td></tr>' +
      '<tr class="total"><td>Total cost</td><td class="num">' + money(r.costPence) + '</td></tr>' +
      '<tr><td>Floor: cost plus 25%</td><td class="num">' + money(r.floorPence) + '</td></tr>' +
      '<tr><td>Price before GST</td><td class="num">' + money(r.priceExGstPence) + '</td></tr>' +
      '<tr class="total"><td>' + (r.roomPence >= 0 ? 'Room above the floor' : 'Short of the floor by') + '</td><td class="num">' + money(Math.abs(r.roomPence)) + '</td></tr>' +
      '<tr class="sub"><td>Most we could take off the menu price</td><td class="num">' + money(r.maxDiscountPence) + '</td></tr></tbody></table>';

    // Staff
    var s = r.staff, sh = s.shift, rate = s.wagePence * (10000 + s.ssBp) / 10000;
    h += '<h3>Staff</h3><table><tbody>' +
      '<tr><td>Servers (' + (r.input.style === 'buffet' ? '1 per 25 guests' : '1 per 15 guests') + ', rounded up)</td><td class="num">' + s.servers + '</td></tr>' +
      '<tr><td>Chefs (1 per 40 guests, rounded up)</td><td class="num">' + s.chefs + '</td></tr>' +
      '<tr><td>Shift for each person (setup ' + s.setupMinutes + ' min, clear-down ' + s.clearMinutes + ' min)</td><td class="num">' + clock(sh.fromMinute) + ' to ' + clock(sh.toMinute) + '</td></tr>' +
      '<tr><td>Normal-rate time</td><td class="num">' + hours(sh.normalMinutes) + '</td></tr>' +
      '<tr><td>Time and a half (bank holiday, or after 23:00)</td><td class="num">' + hours(sh.premiumMinutes) + '</td></tr>' +
      (sh.minimumApplied ? '<tr><td>4-hour minimum applied</td><td class="num">+' + hours(sh.paddedMinutes) + ' at normal rate</td></tr>' : '') +
      '<tr><td>Hourly cost: minimum wage ' + money(s.wagePence) + ' + ' + pct(s.ssBp) + ' employer\'s social security</td><td class="num">' + money(rate) + ' <span class="hint">(worked out in full, shown rounded)</span></td></tr>' +
      '<tr class="total"><td>Staff cost</td><td class="num">' + money(s.costPence) + '</td></tr></tbody></table>';

    h += '<h3>Where the public figures come from</h3>' + list(state.data.pub.sources.map(function (src) {
      return esc(src.name) + ': <a href="' + esc(src.url) + '" target="_blank" rel="noopener">' + esc(src.url) + '</a>' + (src.dateChecked ? ' (checked ' + esc(src.dateChecked) + ')' : '');
    }));
    $('internal').innerHTML = h;
    var ack = $('ack');
    if (ack) ack.addEventListener('change', function () { state.ack = ack.checked; refresh(); });
  }

  function quoteNumber() {
    if (!state.quoteNo) {
      var n = new Date(), p = function (x) { return ('0' + x).slice(-2); };
      state.quoteNo = 'LB-' + n.getFullYear() + p(n.getMonth() + 1) + p(n.getDate()) + '-' + p(n.getHours()) + p(n.getMinutes());
    }
    return state.quoteNo;
  }

  // The customer quote shows prices only: no costs, margins, floor, staff numbers or wages.
  function renderCustomer(r) {
    if (r.status !== 'ok' || (r.unconfirmed.length && !state.ack)) { $('customer').innerHTML = ''; return; }
    var i = r.input, name = $('customerName').value.trim(), contact = $('customerContact').value.trim();
    var h = '<div class="paper"><h2>Lovely Bites</h2><p class="sub">Event catering, Jersey</p>' +
      '<div class="meta">' +
      '<div><b>Quote number</b>' + esc(quoteNumber()) + '</div>' +
      '<div><b>Issued</b>' + esc(longDate(r.issueDate)) + '</div>' +
      '<div><b>Valid until</b>' + esc(longDate(r.validUntil)) + '</div>' +
      '<div><b>Prepared for</b>' + esc(name || '—') + (contact ? '<br>' + esc(contact) : '') + '</div>' +
      '<div><b>Event</b>' + esc(longDate(i.eventDate)) + '<br>' + esc(i.startTime) + ' to ' + esc(i.endTime) + '</div>' +
      '<div><b>Where</b>' + esc(i.parish) + '</div>' +
      '<div><b>Guests</b>' + r.guests + ', ' + (i.style === 'buffet' ? 'buffet' : 'seated') + '</div>' +
      '</div>' +
      '<table><thead><tr><th>Description</th><th class="num">Amount</th></tr></thead><tbody>';
    r.lines.forEach(function (l) {
      var qtyText = l.kind === 'travel' ? '' : ' — ' + l.qty + (l.unit === 'per head' ? ' guests' : '') + ' × ' + money(l.unitPence);
      h += '<tr><td>' + esc(l.label) + esc(qtyText) + (l.minApplied ? ' (minimum charge)' : '') + '</td><td class="num">' + money(l.totalPence) + '</td></tr>';
    });
    if (r.discountPence) h += '<tr><td>Discount</td><td class="num">' + money(-r.discountPence) + '</td></tr>';
    h += '<tr class="total"><td>Subtotal</td><td class="num">' + money(r.priceExGstPence) + '</td></tr>' +
      '<tr class="sub"><td>GST at ' + pct(r.gstBp) + '</td><td class="num">' + money(r.gstPence) + '</td></tr>' +
      '<tr class="total"><td>Total</td><td class="num">' + money(r.totalPence) + '</td></tr>' +
      '<tr><td>Deposit to confirm your booking (25%)</td><td class="num">' + money(r.depositPence) + '</td></tr>' +
      '<tr><td>Balance</td><td class="num">' + money(r.balancePence) + '</td></tr></tbody></table>' +
      '<ul><li>This quote is valid for 30 days, until ' + esc(longDate(r.validUntil)) + '.</li>' +
      '<li>A 25% deposit confirms your booking.</li></ul>' +
      '<p class="no-print"><button class="action" id="printBtn">Print or save as PDF</button></p></div>';
    $('customer').innerHTML = h;
    var pb = $('printBtn'); if (pb) pb.addEventListener('click', function () { window.print(); });
  }

  // ---------- wiring ----------
  $('pickFolderBtn').addEventListener('click', pickFolder);
  $('reconnectBtn').addEventListener('click', reconnect);
  $('forgetBtn').addEventListener('click', forget);
  window.addEventListener('focus', checkForChanges);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) checkForChanges(); });
  $('folderInput').addEventListener('change', function (e) { handleFiles(e.target.files); });
  $('fileInput').addEventListener('change', function (e) { handleFiles(e.target.files); });
  $('quoteForm').addEventListener('input', refresh);
  $('quoteForm').addEventListener('change', refresh);
  Array.prototype.forEach.call(document.querySelectorAll('input[name=discType]'), function (el) {
    el.addEventListener('change', function () {
      var none = document.querySelector('input[name=discType]:checked').value === 'none';
      $('discValue').disabled = none; if (none) $('discValue').value = '';
      $('discValue').max = document.querySelector('input[name=discType]:checked').value === 'percent' ? '100' : '';
      refresh();
    });
  });
  $('tabInternal').addEventListener('click', function () { state.tab = 'internal'; showTab(); });
  $('tabCustomer').addEventListener('click', function () { if (!$('tabCustomer').disabled) { state.tab = 'customer'; showTab(); } });
  startUp();
})();
