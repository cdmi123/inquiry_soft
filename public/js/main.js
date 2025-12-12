// Handle call button: post to server to log the call and start tel:
document.addEventListener('click', function(e){
  const target = e.target.closest('.call-btn');
  if (!target) return;
  const id = target.dataset.id;
  const phone = target.dataset.phone;
  if (!id || !phone) return;
  // Send POST to log call. Use navigator.sendBeacon when available.
  try {
    const url = '/contacts/' + id + '/call';
    if (navigator.sendBeacon) {
      const formData = new FormData();
      formData.append('_method', 'POST');
      navigator.sendBeacon(url, formData);
    } else {
      fetch(url, { method: 'POST', headers: {'Content-Type':'application/json'}, keepalive: true, body: JSON.stringify({}) })
        .catch(err => console.warn('Call log failed', err));
    }
  } catch (err) {
    console.warn('Call log failed', err);
  }
  // Navigate to tel: to start the call
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

// Poll the server every 1 second to update the contacts list without full page refresh
(function startContactsPolling(){
  const POLL_MS = 1000;
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
          const bgColor = idx % 2 === 0 ? '#f8f9fc;' : '#ffffff;';
          const lastCallHtml = c.lastCallAt 
            ? `<span style="background: #d4edda; color: #155724; padding: 6px 12px; border-radius: 20px; font-weight: 600; font-size: 0.9rem; display: inline-block;">✓ ${new Date(c.lastCallAt).toLocaleString()}</span>`
            : `<span style="background: #fff3cd; color: #856404; padding: 6px 12px; border-radius: 20px; font-weight: 600; font-size: 0.9rem; display: inline-block;">⏳ No calls</span>`;
          
          tr.style.cssText = `border: none; padding: 0; transition: all 0.3s ease; background-color: ${bgColor}`;
          tr.className = 'table-row-hover';
          
          tr.innerHTML = `<td style="padding: 16px 15px; vertical-align: middle; border: none;">` +
            `<span class="badge" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); font-size: 0.85rem; padding: 6px 10px; font-weight: 700;">${startIndex + idx + 1}</span>` +
            `</td>` +
            `<td style="padding: 16px 15px; vertical-align: middle; border: none;">` +
              `<a href="/contacts/${c._id}" class="text-decoration-none" style="color: #2c3e50;">` +
                `<strong style="font-size: 1.05rem; display: block;">${escapeHtml(c.name)}</strong>` +
                `<small style="color: #95a5a6;">Contact ID: ${c._id.toString().substring(0, 8)}...</small>` +
              `</a>` +
            `</td>` +
            `<td style="padding: 16px 15px; vertical-align: middle; border: none;">` +
              `<a href="tel:${escapeHtml(c.phone||'')}" class="text-decoration-none" style="color: #667eea; font-weight: 600; font-size: 1rem;">${escapeHtml(c.phone||'')}</a>` +
            `</td>` +
            `<td style="padding: 16px 15px; vertical-align: middle; border: none;">${lastCallHtml}</td>` +
            `<td style="padding: 16px 15px; vertical-align: middle; border: none;">` +
              `<span class="badge" style="background: linear-gradient(135deg, #17a2b8 0%, #138496 100%); font-size: 0.9rem; padding: 8px 12px; font-weight: 700;">${c.notesCount||0}</span>` +
            `</td>` +
            `<td style="padding: 16px 15px; vertical-align: middle; border: none; text-center;">` +
              `<div class="btn-group" role="group" style="display: flex; gap: 6px; justify-content: center;">` +
                `<button class="btn btn-sm call-btn" data-id="${c._id}" data-phone="${escapeHtml(c.phone||'')}" title="Call" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border: none; color: white; border-radius: 8px; padding: 8px 12px; font-weight: 600; transition: all 0.2s ease;">\ud83d\udcde Call</button>` +
                `<a class="btn btn-sm view-btn" href="javascript:void(0)" data-contact-id="${c._id}" title="Details" style="background: #e8eef7; color: #667eea; border: none; border-radius: 8px; padding: 8px 12px; font-weight: 600; transition: all 0.2s ease; cursor: pointer;">👁️ View</a>` +
                `<a class="btn btn-sm" href="https://wa.me/${phoneLink}?text=${encodeURIComponent('Hi ' + (c.name || ''))}" target="_blank" rel="noopener" title="WhatsApp" style="background: #d4f1d4; color: #155724; border: none; border-radius: 8px; padding: 8px 12px; font-weight: 600; transition: all 0.2s ease;">\ud83d\udcac Chat</a>` +
              `</div>` +
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
          const li = document.createElement('div');
          li.className = 'list-group-item d-flex align-items-start';
          li.style.cssText = 'padding: 12px 10px; border-bottom: 1px solid #f0f2fb;';
          const phoneLink = (c.phone || '').toString().replace(/\D/g, '');
          const lastCallHtml = c.lastCallAt 
            ? `<span class="mobile-lastcall" style="background:#fff3cd; color:#856404; padding:6px 10px; border-radius:14px; font-weight:700; font-size:0.8rem;">⏳ ${new Date(c.lastCallAt).toLocaleDateString()}</span>`
            : `<span class="mobile-lastcall" style="background:#fff3cd; color:#856404; padding:6px 10px; border-radius:14px; font-weight:700; font-size:0.8rem;">⏳ No calls</span>`;
          li.innerHTML = `<div style="width:42px; flex:0 0 42px; display:flex; align-items:center; justify-content:center;">` +
            `<span class="mobile-index" style="background: linear-gradient(135deg, #6f59e6 0%, #a46de6 100%); color: white; width:34px; height:34px; display:inline-flex; align-items:center; justify-content:center; border-radius:8px; font-weight:700;">${startIndex + idx + 1}</span>` +
            `</div>` +
            `<div style="flex:1 1 auto; min-width:0; margin-left:10px;">` +
              `<a href="/contacts/${c._id}" class="text-decoration-none" style="color: #1f2d3d; font-weight:700; display:block; font-size:0.98rem;">${escapeHtml(c.name)}</a>` +
              `<div class="d-flex align-items-center justify-content-between" style="margin-top:6px; gap:10px;">` +
                `<a href="tel:${escapeHtml(c.phone||'')}" class="text-decoration-none" style="color: #2b7be4; font-weight:600; font-size:0.92rem;">${escapeHtml(c.phone||'')}</a>` +
                `<div style="display:flex; align-items:center; gap:8px;">` +
                  lastCallHtml +
                  `<span class="mobile-notes" style="background: linear-gradient(135deg, #17a2b8 0%, #138496 100%); color:white; padding:6px 8px; border-radius:8px; font-weight:700; font-size:0.82rem;">${c.notesCount||0}</span>` +
                `</div>` +
              `</div>` +
              `<small style="color:#95a5a6; display:block; margin-top:6px;">Contact ID: ${c._id.toString().substring(0,8)}...</small>` +
            `</div>` +
            `<div class="btn-actions-mobile" style="flex:0 0 auto; margin-left:12px; display:flex; flex-direction:column; gap:6px; min-width:fit-content;">` +
              `<button class="btn mobile-action call-btn" data-id="${c._id}" data-phone="${escapeHtml(c.phone||'')}" style="background: linear-gradient(135deg, #6f59e6 0%, #a46de6 100%); border:none; color:white; padding:6px 10px; border-radius:8px; font-weight:700; font-size:0.85rem; white-space:nowrap;">📞 Call</button>` +
              `<a class="btn mobile-action view-btn" href="javascript:void(0)" data-contact-id="${c._id}" style="background:#eef3ff; color:#3b3f56; padding:6px 10px; border-radius:8px; text-decoration:none; font-size:0.85rem; white-space:nowrap; text-align:center; cursor:pointer;">👁️ View</a>` +
              `<a class="btn mobile-action" href="https://wa.me/${phoneLink}?text=${encodeURIComponent('Hi ' + (c.name || ''))}" target="_blank" rel="noopener" style="background:#dff6e8; color:#155724; padding:6px 10px; border-radius:8px; text-decoration:none; font-size:0.85rem; white-space:nowrap; text-align:center;">💬 Chat</a>` +
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
