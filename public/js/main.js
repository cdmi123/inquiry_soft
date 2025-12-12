// Handle call button: post to server to log then navigate to tel:
document.addEventListener('click', function(e){
  const target = e.target.closest('.call-btn');
  if (!target) return;
  const id = target.dataset.id;
  const phone = target.dataset.phone;
  if (!id || !phone) return;
  // Send POST to log call. Use navigator.sendBeacon when available so it survives navigation.
  try {
    const url = '/contacts/' + id + '/call';
    if (navigator.sendBeacon) {
      const payload = new Blob([JSON.stringify({})], { type: 'application/json' });
      navigator.sendBeacon(url, payload);
    } else {
      fetch(url, { method: 'POST', headers: {'Content-Type':'application/json'}, keepalive: true })
        .catch(err => console.warn('Call log failed', err));
    }
  } catch (err) {
    console.warn('Call log failed', err);
  }
  // navigate to tel (after tiny delay to allow request to start)
  setTimeout(()=> { window.location.href = 'tel:' + phone; }, 150);
});

// Handle note submit
document.addEventListener('submit', async function(e){
  if (e.target && e.target.id === 'noteForm') {
    e.preventDefault();
    const form = e.target;
    const data = new FormData(form);
    const noteText = data.get('noteText');
    const contactId = window.currentContactId;
    if (!noteText || !contactId) return alert('Missing data');
    const resp = await fetch('/contacts/' + contactId + '/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ noteText })
    });
    const json = await resp.json();
    if (json.ok) {
      // reload page to show note (simple approach)
      window.location.reload();
    } else {
      alert('Failed to save note');
    }
  }
});

document.addEventListener("click", async function (e) {
  if (e.target.id === "syncBtn") {
    e.target.disabled = true;
    e.target.innerText = "Syncing...";
    const res = await fetch("/sync-sheet");
    const json = await res.json();
    alert("Added: " + json.added + "\nUpdated: " + json.updated);
    window.location.reload();
  }
});

// Poll the server every 10 seconds to update the contacts list without full page refresh
(function startContactsPolling(){
  const POLL_MS = 10000;
  if (!window.contactPagination) return;

  function escapeHtml(str){ return String(str||'').replace(/[&<>"']/g, function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];}); }

  async function fetchAndUpdate(){
    try{
      const page = window.contactPagination.currentPage || 1;
      const res = await fetch('/api/contacts?page=' + page, { cache: 'no-store' });
      if (!res.ok) return;
      const json = await res.json();
      if (!json.ok) return;
      const contacts = json.contacts || [];
      const currentPage = json.currentPage || page;
      const perPage = json.perPage || window.contactPagination.perPage || 70;

      // Update table body
      const tbody = document.querySelector('table.table tbody');
      if (tbody) {
        tbody.innerHTML = '';
        const startIndex = ((currentPage - 1) * perPage);
        contacts.forEach((c, idx) => {
          const tr = document.createElement('tr');
          const phoneLink = (c.phone || '').toString().replace(/\D/g, '');
          tr.innerHTML = `<td>${startIndex + idx + 1}</td>` +
            `<td><a href="/contacts/${c._id}" class="text-decoration-none"><strong>${escapeHtml(c.name)}</strong></a></td>` +
            `<td><a href="tel:${escapeHtml(c.phone||'')}" class="text-decoration-none">${escapeHtml(c.phone||'')}</a></td>` +
            `<td><small>${c.lastCallAt ? new Date(c.lastCallAt).toLocaleString() : '-'}</small></td>` +
            `<td><span class="badge bg-info">${c.notesCount||0}</span></td>` +
            `<td class="text-center">` +
              `<button class="btn btn-sm btn-primary call-btn" data-id="${c._id}" data-phone="${escapeHtml(c.phone||'')}" title="Call">📞</button>` +
              `<a class="btn btn-sm btn-outline-secondary" href="/contacts/${c._id}" title="Details">View</a>` +
              `<a class="btn btn-sm btn-success ms-1" href="https://wa.me/${phoneLink}?text=${encodeURIComponent('Hi ' + (c.name || ''))}" target="_blank" rel="noopener" title="WhatsApp">💬</a>` +
            `</td>`;
          tbody.appendChild(tr);
        });
      }

      // Update mobile list
      const mobileList = document.getElementById('contactsMobileList');
      if (mobileList) {
        mobileList.innerHTML = '';
        const startIndex = ((currentPage - 1) * perPage);
        contacts.forEach((c, idx) => {
          const li = document.createElement('li');
          li.className = 'list-group-item';
          const phoneLink = (c.phone || '').toString().replace(/\D/g, '');
          li.innerHTML = `<div class="d-flex justify-content-between align-items-start">` +
            `<div class="flex-grow-1">` +
              `<h6 class="mb-1">` +
                `<span class="badge bg-secondary me-2">${startIndex + idx + 1}</span>` +
                `<a href="/contacts/${c._id}" class="text-decoration-none">${escapeHtml(c.name)}</a>` +
              `</h6>` +
              `<p class="mb-1"><small class="text-muted">📞</small> <a href="tel:${escapeHtml(c.phone||'')}" class="text-decoration-none"><small>${escapeHtml(c.phone||'')}</small></a></p>` +
              `${c.lastCallAt ? `<p class="mb-1"><small class="text-muted">Last: ${new Date(c.lastCallAt).toLocaleDateString()}</small></p>` : ''}` +
              `<span class="badge bg-info">${c.notesCount||0} notes</span>` +
            `</div>` +
            `<div class="ms-2 d-flex flex-column gap-2">` +
              `<a class="btn btn-sm btn-primary" href="tel:${escapeHtml(c.phone||'')}">📞</a>` +
              `<a class="btn btn-sm btn-success" href="https://wa.me/${phoneLink}?text=${encodeURIComponent('Hi ' + (c.name || ''))}" target="_blank" rel="noopener">💬</a>` +
              `<a class="btn btn-sm btn-outline-secondary" href="/contacts/${c._id}">→</a>` +
            `</div>` +
          `</div>`;
          mobileList.appendChild(li);
        });
      }

      // Update mobile page indicator text
      const mobilePageIndicator = document.getElementById('mobilePageIndicator');
      if (mobilePageIndicator) mobilePageIndicator.textContent = `Page ${currentPage} of ${json.totalPages || window.contactPagination.totalPages || ''}`;

      // update cached pagination info
      window.contactPagination.currentPage = currentPage;
      window.contactPagination.totalPages = json.totalPages || window.contactPagination.totalPages;
      window.contactPagination.perPage = perPage;
    } catch (err) {
      console.warn('Contacts poll error', err);
    }
  }

  // initial fetch and periodic polling
  fetchAndUpdate();
  setInterval(fetchAndUpdate, POLL_MS);
})();
