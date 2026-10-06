/* Lovely Bites quote tool: the screens.
   This file only reads the form, calls Pricing.calculate (pricing.js) and shows the answer.
   No prices or business rules live here. */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };

  // The look of the customer quote. Used on screen, when printing (one A4 page) and inside saved files.
  var SAVED_BASE_CSS = ':root{--ink:#1f2933;--muted:#5f6b76;--line:#d9dee3;--brand:#1f4e5a}' +
    'body{font-family:Arial,Helvetica,sans-serif;color:var(--ink);background:#f5f3ef;margin:0;padding:16px;line-height:1.4}' +
    '.paper{max-width:800px;margin:0 auto}';
  var PAPER_CSS =
    '.paper{background:#fff;border:1px solid var(--line);border-radius:8px;padding:28px 32px;color:var(--ink);font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.4}' +
    '.paper h2{margin:0 0 2px;font-size:24px;color:var(--brand)}' +
    '.paper h3{margin:14px 0 4px;font-size:13px;color:var(--brand)}' +
    '.paper .sub{color:var(--muted);margin:0 0 12px}' +
    '.paper .meta{display:grid;grid-template-columns:repeat(4,1fr);gap:8px 16px;margin:12px 0;font-size:13px}' +
    '.paper .meta b{display:block;font-size:11px;font-weight:normal;color:var(--muted)}' +
    '.paper .hint{font-size:11px;color:var(--muted);font-weight:normal}' +
    '.paper table{width:100%;border-collapse:collapse;font-size:13px;margin:4px 0 8px}' +
    '.paper th,.paper td{text-align:left;padding:5px 8px;border-bottom:1px solid var(--line);vertical-align:top}' +
    '.paper th{color:var(--muted);font-weight:normal;font-size:11px}' +
    '.paper td.num,.paper th.num{text-align:right}' +
    '.paper tr.total td{font-weight:bold;border-top:2px solid var(--ink)}' +
    '.paper tr.sub td{color:var(--muted)}' +
    '.paper .pick{background:#eef5f6}' +
    '.paper ul.terms{font-size:12px;color:var(--muted);margin:8px 0 0;padding-left:18px}' +
    '@media (max-width:600px){.paper{padding:16px}.paper .meta{grid-template-columns:repeat(2,1fr)}}' +
    '@page{size:A4;margin:12mm}' +
    '@media print{body{background:#fff;padding:0}.paper{border:0;border-radius:0;padding:0;font-size:11px;max-width:none}' +
    '.paper h2{font-size:20px}.paper .meta{gap:5px 12px;margin:8px 0;font-size:11px}.paper table{font-size:11px;margin:3px 0 6px}' +
    '.paper th,.paper td{padding:3px 6px}.paper h3{margin:10px 0 3px}.paper ul.terms{font-size:10px}' +
    '.paper,.paper table{break-inside:avoid;page-break-inside:avoid}}';
  var state = { data: null, result: null, ack: false, quoteNo: null, tab: 'internal', handle: null, pending: null, mods: null,
                options: null, sig: null, customerOk: false, qHandle: null, saved: null, prevTitle: null };

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
    var style = document.createElement('style'); style.textContent = PAPER_CSS; document.head.appendChild(style);
    if (window.showDirectoryPicker) {
      idb(function (st) { return st.get(KEY_QUOTES); }).then(function (h) {
        if (h) { state.qHandle = h; $('folderName').textContent = h.name; }
      }).catch(noop);
    } else {
      $('folderLine').textContent = 'This browser can\'t save into a folder, so Save will download the quote and a register line instead. Chrome or Edge can do it properly.';
    }
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
    state.result = r;
    state.options = r.status === 'invalid' ? null : Pricing.compareTiers(input, state.data);
    // A new quote number is only made when something about the quote has changed.
    var sig = JSON.stringify([input, $('customerName').value, $('customerContact').value, state.ack, state.mods, $('showOptions').checked]);
    if (sig !== state.sig) { state.sig = sig; state.quoteNo = null; }
    var customerOk = r.status === 'ok' && (!r.unconfirmed.length || state.ack);
    state.customerOk = customerOk;
    $('tabCustomer').disabled = !customerOk; $('printBtn').disabled = !customerOk; $('saveBtn').disabled = !customerOk;
    $('actionHint').textContent = customerOk ? '' : r.status === 'ok'
      ? 'Tick that you\'ve checked the public figures (in the Internal breakdown) to unlock Print and Save.'
      : 'Print and Save unlock once the quote is OK to send.';
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

  // Only touch the page when the content really changed. A field losing focus fires a "change" event
  // that re-runs everything; redrawing identical content would swallow the click on a button.
  function setHtml(el, html) { if (el.lbHtml !== html) { el.innerHTML = html; el.lbHtml = html; } }

  function list(items) { return '<ul>' + items.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul>'; }

  function renderInternal(r) {
    var h = '';
    if (r.status === 'invalid') {
      h += '<div class="msg warn"><strong>Still to sort out:</strong>' + list(r.errors.map(esc)) + '</div>';
      if (r.warnings.length) h += '<div class="msg warn">' + list(r.warnings.map(esc)) + '</div>';
      setHtml($('internal'), h); return;
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

    h += optionsInternal(r);

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
    setHtml($('internal'), h);
  }

  function pad(n, w) { return ('000' + n).slice(-(w || 2)); }
  function stamp(d) {
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
  }
  function quoteNumber() {
    if (!state.quoteNo) {
      var n = new Date();
      state.quoteNo = 'LB-' + n.getFullYear() + pad(n.getMonth() + 1) + pad(n.getDate()) + '-' + pad(n.getHours()) + pad(n.getMinutes());
    }
    return state.quoteNo;
  }
  function bump(no) {   // LB-20261006-0920 -> ...-B -> ...-C
    var m = /-([A-Y])$/.exec(no);
    return m ? no.slice(0, -1) + String.fromCharCode(m[1].charCodeAt(0) + 1) : no + '-B';
  }

  // ---------- Good / Better / Best ----------
  var LABELS = ['Good', 'Better', 'Best'];
  function tierLabel(i) { return state.data.tiers.length === 3 ? LABELS[i] : ''; }
  function tierHeading(o, i) { var l = tierLabel(i); return l ? l + ' · ' + o.tier : o.tier; }
  function perHead(res) { return res.lines[0].unitPence; }

  // Staff view: all three, with the floor check for each, so you can see why one is unavailable.
  function optionsInternal(r) {
    var opts = state.options;
    if (!opts) return '';
    var cols = opts.map(function (o, i) {
      var res = o.result, sel = o.tier === r.input.tier;
      return { o: o, i: i, res: res, sel: sel, cls: sel ? ' class="pick"' : '' };
    });
    function row(label, fn, cls) {
      return '<tr' + (cls ? ' class="' + cls + '"' : '') + '><td>' + label + '</td>' + cols.map(function (c) {
        return '<td class="num' + (c.sel ? ' pick' : '') + '">' + (c.res.status === 'invalid' ? '—' : fn(c.res)) + '</td>'; }).join('') + '</tr>';
    }
    var h = '<h3>Good, Better, Best</h3><p class="hint">The same event on each menu, with the same discount. Each menu has its own floor check.</p>' +
      '<table class="options"><thead><tr><th></th>' + cols.map(function (c) {
        return '<th class="num' + (c.sel ? ' pick' : '') + '">' + esc(tierHeading(c.o, c.i)) + (c.sel ? '<br><span class="hint">quoted</span>' : '') + '</th>'; }).join('') + '</tr></thead><tbody>' +
      row('What\'s included', function (x) { return '<span class="hint">' + esc(x.band.notes || '') + '</span>'; }) +
      row('Menu price per head', function (x) { return money(perHead(x)); }) +
      row('Price before GST', function (x) { return money(x.priceExGstPence); }) +
      row('GST', function (x) { return money(x.gstPence); }) +
      row('Total including GST', function (x) { return money(x.totalPence); }, 'total') +
      row('Deposit (25%)', function (x) { return money(x.depositPence); }) +
      row('Total cost', function (x) { return money(x.costPence); }, 'sub') +
      row('Floor (cost plus 25%)', function (x) { return money(x.floorPence); }, 'sub') +
      row('Room above the floor', function (x) { return money(x.roomPence); }, 'sub') +
      '<tr><td>Can we quote it?</td>' + cols.map(function (c) {
        var res = c.res, t;
        if (res.status === 'ok') t = '<strong style="color:var(--good)">Yes</strong>';
        else if (res.status === 'refused') t = '<strong style="color:var(--bad)">No: below the floor</strong>';
        else t = '<span class="hint">' + esc(res.errors.join(' ')) + '</span>';
        if (!c.sel && res.status === 'ok') t += '<br><button type="button" class="link" data-pick-tier="' + esc(c.o.tier) + '">Quote this one</button>';
        return '<td class="num' + (c.sel ? ' pick' : '') + '">' + t + '</td>'; }).join('') + '</tr></tbody></table>';
    return h;
  }

  // Customer view: prices only, and only the options we can actually offer.
  function optionsCustomer(r) {
    if (!$('showOptions').checked || !state.options) return '';
    var ok = state.options.map(function (o, i) { return { o: o, i: i }; }).filter(function (c) { return c.o.result.status === 'ok'; });
    if (ok.length < 2) return '';
    var anyDiscount = ok.some(function (c) { return c.o.result.discountPence > 0; });
    function row(label, fn, cls) {
      return '<tr' + (cls ? ' class="' + cls + '"' : '') + '><td>' + label + '</td>' + ok.map(function (c) {
        return '<td class="num' + (c.o.tier === r.input.tier ? ' pick' : '') + '">' + fn(c.o.result) + '</td>'; }).join('') + '</tr>';
    }
    return '<h3>Your options</h3><table class="options"><thead><tr><th></th>' + ok.map(function (c) {
      var sel = c.o.tier === r.input.tier;
      return '<th class="num' + (sel ? ' pick' : '') + '">' + esc(tierHeading(c.o, c.i)) + '<br><span class="hint">' + esc(c.o.result.band.notes || '') + '</span>' +
        (sel ? '<br><strong>This quote</strong>' : '') + '</th>'; }).join('') + '</tr></thead><tbody>' +
      row('Menu price per head', function (x) { return money(perHead(x)); }) +
      (anyDiscount ? row('Discount', function (x) { return x.discountPence ? money(-x.discountPence) : '—'; }) : '') +
      row('Price before GST', function (x) { return money(x.priceExGstPence); }) +
      row('Total including GST', function (x) { return money(x.totalPence); }, 'total') +
      row('Deposit (25%)', function (x) { return money(x.depositPence); }) + '</tbody></table>';
  }

  // ---------- the customer quote (also what gets printed and saved) ----------
  // Shows prices only: no costs, margins, floor, staff numbers or wages.
  function paperHtml(r) {
    var i = r.input, name = $('customerName').value.trim(), contact = $('customerContact').value.trim();
    var h = '<div class="paper"><h2>Lovely Bites</h2><p class="sub">Event catering, Jersey</p>' +
      '<div class="meta">' +
      '<div><b>Quote number</b>' + esc(quoteNumber()) + '</div>' +
      '<div><b>Date issued</b>' + esc(longDate(r.issueDate)) + '</div>' +
      '<div><b>Valid for 30 days, until</b>' + esc(longDate(r.validUntil)) + '</div>' +
      '<div><b>Deposit to confirm (25%)</b>' + money(r.depositPence) + '</div>' +
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
      optionsCustomer(r) +
      '<ul class="terms"><li>This quote is valid for 30 days from the date of issue, until ' + esc(longDate(r.validUntil)) + '.</li>' +
      '<li>A 25% deposit (' + money(r.depositPence) + ') confirms your booking.</li></ul></div>';
    return h;
  }

  function renderCustomer(r) {
    if (r.status !== 'ok' || (r.unconfirmed.length && !state.ack)) { setHtml($('customer'), ''); return; }
    setHtml($('customer'), paperHtml(r));
  }

  // Everything the customer quote needs, in one file that opens by double-click and prints on one page.
  function standaloneHtml(r) {
    return '<!DOCTYPE html>\n<html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">' +
      '<title>' + esc(quoteNumber()) + '</title><style>' + SAVED_BASE_CSS + PAPER_CSS + '</style></head><body>' + paperHtml(r) + '</body></html>\n';
  }

  // ---------- Print ----------
  function setPrintTitle() {   // browsers use the page title as the suggested PDF file name
    if (state.prevTitle === null) state.prevTitle = document.title;
    document.title = quoteNumber();
  }
  function afterPrint() { if (state.prevTitle !== null) { document.title = state.prevTitle; state.prevTitle = null; } }

  function doPrint() {
    if (!state.customerOk) return;
    uniqueNumberFromRegister().then(function () {
      renderCustomer(state.result); state.tab = 'customer'; showTab(); setPrintTitle(); window.print();
    });
  }

  // ---------- Save into a folder, and add a line to quote-register.csv ----------
  var REGISTER_FILE = 'quote-register.csv', KEY_QUOTES = 'quotesFolder';
  var noop = function () {};

  function say(kind, html) { $('saveStatus').innerHTML = '<div class="msg ' + kind + '">' + html + '</div>'; }

  function ensureWrite(h) {
    return h.queryPermission({ mode: 'readwrite' }).then(function (p) {
      if (p === 'granted') return true;
      return h.requestPermission({ mode: 'readwrite' }).then(function (p2) { return p2 === 'granted'; });
    });
  }
  function pickQuotesFolder() {
    return window.showDirectoryPicker({ id: 'lovelybites-quotes', mode: 'readwrite' }).then(function (h) {
      state.qHandle = h; $('folderName').textContent = h.name;
      idb(function (st) { return st.put(h, KEY_QUOTES); }).catch(noop);
      return h;
    });
  }
  function getQuotesFolder() {
    if (!state.qHandle) return pickQuotesFolder();
    return ensureWrite(state.qHandle).then(function (ok) { return ok ? state.qHandle : pickQuotesFolder(); });
  }

  // Reads the register (if there is one). Rejects with .stage = 'layout' if it isn't ours.
  function readRegister(dir) {
    return dir.getFileHandle(REGISTER_FILE).then(function (fh) { return fh.getFile().then(readText); }, function (e) {
      if (e && e.name === 'NotFoundError') return null;
      throw e;
    }).then(function (text) {
      if (text === null) return { exists: false, text: '', numbers: [] };
      text = text.replace(/^﻿/, '');
      if (text.trim() === '') return { exists: false, text: '', numbers: [] };
      var rows = LBData.parseCSV(text);
      if ((rows[0][0] || '').trim() !== 'quote_number') {
        var err = new Error('layout'); err.stage = 'layout'; throw err;
      }
      return { exists: true, text: text, numbers: rows.slice(1).map(function (r) { return (r[0] || '').trim(); }) };
    });
  }

  // If this number is already in the register (e.g. two quotes in the same minute), move to the next one.
  function makeUnique(numbers) {
    if (state.saved && state.saved.sig === state.sig) return;   // already saved once: keep its number
    var no = quoteNumber();
    while (numbers.indexOf(no) !== -1) no = bump(no);
    state.quoteNo = no;
  }
  function uniqueNumberFromRegister() {
    if (!state.qHandle) return Promise.resolve();
    return state.qHandle.queryPermission({ mode: 'readwrite' }).then(function (p) {
      if (p !== 'granted') return;
      return readRegister(state.qHandle).then(function (reg) { makeUnique(reg.numbers); });
    }).catch(noop);
  }

  function money2(p) { return (p / 100).toFixed(2); }
  function registerRow(r, no, file) {
    var i = r.input, idx = state.data.tiers.indexOf(i.tier);
    var disc = !r.discountPence ? '' : (r.discount.type === 'percent' ? r.discount.value + '%' : '£' + Number(r.discount.value).toFixed(2));
    return [no, stamp(new Date()), r.issueDate, r.validUntil, $('customerName').value.trim(), $('customerContact').value.trim(),
      i.eventDate, i.startTime, i.endTime, i.parish, r.guests, i.style, tierLabel(idx), i.tier, i.dietaryGuests || 0, disc,
      money2(r.priceExGstPence), money2(r.gstPence), money2(r.totalPence), money2(r.depositPence), money2(r.balancePence),
      r.unconfirmed.length ? 'UNCONFIRMED figures, ticked as checked by staff' : 'confirmed',
      state.mods ? stamp(new Date(state.mods.csv)) : '', file];
  }

  function writeFile(dir, name, text) {
    return dir.getFileHandle(name, { create: true }).then(function (fh) { return fh.createWritable(); }).then(function (w) {
      return w.write(text).then(function () { return w.close(); });
    });
  }

  function appendRegister(dir, reg, row) {
    var line = LBData.csvLine(row);
    var out;
    if (!reg.exists) out = LBData.csvLine(LBData.REGISTER_COLUMNS) + '\r\n' + line + '\r\n';
    else {
      var eol = reg.text.indexOf('\r\n') !== -1 ? '\r\n' : '\n';
      out = reg.text + (/\n$/.test(reg.text) ? '' : eol) + line + eol;
    }
    return writeFile(dir, REGISTER_FILE, '﻿' + out);   // BOM so Excel reads accents properly
  }

  function stageError(stage, e) { var err = e instanceof Error ? e : new Error(String(e)); if (!err.stage) err.stage = stage; return err; }

  function onSave() {
    if (!state.customerOk) return;
    var r = state.result, sig = state.sig;
    if (state.saved && state.saved.sig === sig && state.saved.regDone) {
      say('ok', 'This quote is already saved as <strong>' + esc(state.saved.no) + '</strong>. Change something to save a new one.'); return;
    }
    if (!window.showDirectoryPicker) { saveByDownload(); return; }
    $('saveBtn').disabled = true; say('warn', 'Saving…');
    var dir;
    getQuotesFolder().then(function (d) {
      dir = d;
      return readRegister(dir).catch(function (e) { throw stageError('read', e); });
    }).then(function (reg) {
      makeUnique(reg.numbers);
      renderCustomer(r);                                // so the saved page carries this exact number
      var no = quoteNumber(), file = no + '.html';
      var rec = (state.saved && state.saved.sig === sig) ? state.saved : (state.saved = { sig: sig, no: no, fileDone: false, regDone: false });
      var step1 = rec.fileDone ? Promise.resolve() : writeFile(dir, file, standaloneHtml(r)).then(function () { rec.fileDone = true; }, function (e) { throw stageError('file', e); });
      return step1.then(function () {
        return appendRegister(dir, reg, registerRow(r, no, file)).then(function () { rec.regDone = true; }, function (e) { throw stageError('register', e); });
      }).then(function () {
        say('ok', 'Saved <strong>' + esc(file) + '</strong> in the folder "' + esc(dir.name) + '" and added a line to <strong>' + REGISTER_FILE + '</strong>.');
      });
    }).catch(function (e) {
      if (e && e.name === 'AbortError') { say('warn', 'No folder chosen, so nothing was saved.'); return; }
      var why = esc((e && e.message) || e);
      if (e && e.stage === 'layout') say('bad', REGISTER_FILE + ' in that folder doesn\'t start with the usual column headings (quote_number, saved_at, …), so I haven\'t touched it and nothing was saved. Choose a different folder, or rename that file.');
      else if (e && e.stage === 'register') say('bad', 'The quote file was saved, but <strong>' + REGISTER_FILE + '</strong> couldn\'t be updated (' + why + '). If it\'s open in Excel, close it and press Save again: the line will be added then.');
      else if (e && e.stage === 'file') say('bad', 'Couldn\'t save the quote file (' + why + '). Nothing was added to the register.');
      else say('bad', 'Couldn\'t save (' + why + '). Try "Choose a different folder".');
    }).then(function () { $('saveBtn').disabled = !state.customerOk; });
  }

  // Firefox and Safari can't write into a chosen folder, so Save downloads the files instead.
  function download(name, text, type) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: type })); a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }
  function saveByDownload() {
    var r = state.result, no = quoteNumber(), file = no + '.html';
    state.saved = { sig: state.sig, no: no, fileDone: true, regDone: true };
    download(file, standaloneHtml(r), 'text/html');
    download('quote-register-line-' + no + '.csv', '﻿' + LBData.csvLine(LBData.REGISTER_COLUMNS) + '\r\n' + LBData.csvLine(registerRow(r, no, file)) + '\r\n', 'text/csv');
    say('warn', 'This browser can\'t save into a folder, so I\'ve downloaded <strong>' + esc(file) + '</strong> and a one-line CSV. Copy that line (not the heading) into <strong>' + REGISTER_FILE + '</strong>. Chrome or Edge can do all of this for you.');
  }

  // ---------- wiring ----------
  $('printBtn').addEventListener('click', doPrint);
  $('saveBtn').addEventListener('click', onSave);
  $('showOptions').addEventListener('change', refresh);
  $('changeFolderBtn').addEventListener('click', function () {
    if (!window.showDirectoryPicker) return;
    pickQuotesFolder().then(function (h) { say('ok', 'Quotes will be saved in "' + esc(h.name) + '".'); }, function (e) { if (e && e.name !== 'AbortError') say('bad', esc(e.message)); });
  });
  $('internal').addEventListener('change', function (e) {
    if (e.target && e.target.id === 'ack') { state.ack = e.target.checked; refresh(); }
  });
  $('internal').addEventListener('click', function (e) {
    var t = e.target && e.target.getAttribute && e.target.getAttribute('data-pick-tier');
    if (t) { $('tier').value = t; refresh(); }
  });
  window.addEventListener('beforeprint', function () {   // Ctrl+P prints the customer quote, not the staff screen
    if (state.customerOk) { state.tab = 'customer'; renderCustomer(state.result); showTab(); setPrintTitle(); }
  });
  window.addEventListener('afterprint', afterPrint);
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
