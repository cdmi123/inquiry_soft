// Handle call button: post to server to log then navigate to tel:
document.addEventListener('click', function(e){
  const target = e.target.closest('.call-btn');
  if (!target) return;
  const id = target.dataset.id;
  const phone = target.dataset.phone;
  if (!id || !phone) return;
  // Send POST to log call, but don't block navigation
  fetch('/contacts/' + id + '/call', { method: 'POST', headers: {'Content-Type':'application/json'} })
    .catch(err => console.warn('Call log failed', err));
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
