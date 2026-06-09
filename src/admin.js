// ============================
// Craig Grammar Studio — Admin Panel
// ============================

let content = null;
let originalContent = null;

// --- Load content ---
async function loadContent() {
  const res = await fetch('/content.json?_=' + Date.now());
  content = await res.json();
  originalContent = JSON.parse(JSON.stringify(content));
  return content;
}

// --- Save content ---
async function saveContent() {
  const status = document.getElementById('saveStatus');
  if (status) status.textContent = 'Saving...';

  try {
    // Collect all form values into the content object
    collectFormValues();

    const res = await fetch('/content.json', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(content, null, 2)
    });

    if (res.ok) {
      originalContent = JSON.parse(JSON.stringify(content));
      if (status) {
        status.textContent = '✓ All changes saved!';
        status.style.color = '#4CAF50';
      }
      setTimeout(() => {
        if (status) { status.textContent = ''; }
      }, 3000);
    } else {
      // Fallback: download as file
      downloadContent(content);
      if (status) {
        status.textContent = '⚠ Could not write to server. File downloaded instead.';
        status.style.color = '#FF9800';
      }
    }
  } catch (e) {
    // Download as file as fallback
    downloadContent(content);
    if (status) {
      status.textContent = '⚠ Saved as download (server write unavailable).';
      status.style.color = '#FF9800';
    }
  }
}

function downloadContent(data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'content.json';
  a.click();
  URL.revokeObjectURL(url);
}

// --- Collect values from form fields ---
function collectFormValues() {
  // Get all editable inputs
  const inputs = document.querySelectorAll('[data-path]');

  inputs.forEach(input => {
    const path = input.dataset.path;
    const value = input.value;
    setNestedValue(content, path, value);
  });

  // Collect painting data from painting editors
  document.querySelectorAll('.painting-edit-card').forEach(card => {
    const index = parseInt(card.dataset.index);
    if (isNaN(index) || !content.paintings[index]) return;

    card.querySelectorAll('[data-subpath]').forEach(input => {
      const subpath = input.dataset.subpath;
      const value = input.value;
      setNestedValue(content.paintings[index], subpath, value);
    });

    // Collect print prices
    card.querySelectorAll('[data-print-size]').forEach(input => {
      const size = input.dataset.printSize;
      const value = parseFloat(input.value) || 0;
      content.paintings[index].prints[size] = value;
    });
  });

  // Collect sizes
  document.querySelectorAll('[data-size-id]').forEach(input => {
    const sizeId = input.dataset.sizeId;
    const size = content.store.sizes.find(s => s.id === sizeId);
    if (size) {
      size.label = input.value;
    }
  });

  // Collect colors
  document.querySelectorAll('[data-color-key]').forEach(input => {
    const key = input.dataset.colorKey;
    content.design.colors[key] = input.value;
  });
}

function setNestedValue(obj, path, value) {
  const keys = path.split('.');
  let current = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (!current[keys[i]]) current[keys[i]] = {};
    current = current[keys[i]];
  }
  current[keys[keys.length - 1]] = value;
}

// --- Populate form fields ---
function populateForms() {
  // Populate basic fields
  document.querySelectorAll('[data-path]').forEach(input => {
    const path = input.dataset.path;
    const value = getNestedValue(content, path);
    if (value !== undefined) input.value = value;
  });

  // Populate paintings editor
  populatePaintingsEditor();

  // Populate size editor
  populateSizeEditor();

  // Populate color grid
  populateColorGrid();
}

function getNestedValue(obj, path) {
  const keys = path.split('.');
  let current = obj;
  for (let i = 0; i < keys.length; i++) {
    if (current === undefined || current === null) return undefined;
    current = current[keys[i]];
  }
  return current;
}

function populatePaintingsEditor() {
  const container = document.getElementById('paintings-editor');
  if (!container) return;

  container.innerHTML = content.paintings.map((painting, idx) => `
    <div class="painting-edit-card" data-index="${idx}">
      <h3>${escapeHtml(painting.title) || `Painting ${idx + 1}`}</h3>
      <div class="painting-edit-grid">
        <div class="form-group">
          <label>Title</label>
          <input type="text" data-subpath="title" value="${escapeHtml(painting.title)}" />
        </div>
        <div class="form-group">
          <label>Image Path</label>
          <input type="text" data-subpath="image" value="${escapeHtml(painting.image)}" placeholder="/images/painting-1.jpg" />
        </div>
        <div class="form-group">
          <label>Medium</label>
          <input type="text" data-subpath="medium" value="${escapeHtml(painting.medium)}" />
        </div>
        <div class="form-group">
          <label>Dimensions</label>
          <input type="text" data-subpath="dimensions" value="${escapeHtml(painting.dimensions)}" />
        </div>
        <div class="form-group">
          <label>Year</label>
          <input type="number" data-subpath="year" value="${painting.year}" />
        </div>
        <div class="form-group">
          <label>Collection</label>
          <input type="text" data-subpath="collection" value="${painting.collection || ''}" />
        </div>
        <div class="form-group full-width">
          <label>Description</label>
          <textarea data-subpath="description" rows="2">${escapeHtml(painting.description || '')}</textarea>
        </div>
        <div class="form-group full-width">
          <label>Print Prices (€)</label>
          <div style="display:flex;gap:1rem;">
            ${Object.entries(painting.prints || {}).map(([size, price]) => `
              <div>
                <label style="font-size:0.75rem;opacity:0.7;">${size}</label>
                <input type="number" step="0.01" data-print-size="${size}" value="${price}" style="width:80px;" />
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </div>
  `).join('');
}

function populateSizeEditor() {
  const container = document.getElementById('sizeEditor');
  if (!container) return;

  container.innerHTML = content.store.sizes.map(size => `
    <div class="size-edit-row">
      <label>${size.id}</label>
      <input type="text" data-size-id="${size.id}" value="${escapeHtml(size.label)}" />
    </div>
  `).join('');
}

function populateColorGrid() {
  const container = document.getElementById('colorGrid');
  if (!container) return;

  const colorLabels = {
    background: 'Background',
    text: 'Text Color',
    accent: 'Accent',
    hover: 'Hover / Link',
    light: 'Light Border',
    white: 'White'
  };

  container.innerHTML = Object.entries(content.design.colors).map(([key, value]) => `
    <div class="color-item">
      <input type="color" data-color-key="${key}" value="${value}" />
      <div>
        <div class="color-label">${colorLabels[key] || key}</div>
        <div class="color-value">${value}</div>
      </div>
    </div>
  `).join('');

  // Update displayed hex values when color changes
  container.querySelectorAll('input[type="color"]').forEach(input => {
    input.addEventListener('input', () => {
      const label = input.closest('.color-item').querySelector('.color-value');
      if (label) label.textContent = input.value;
    });
  });
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// --- Initialize ---
async function init() {
  await loadContent();
  populateForms();

  // Tab switching
  document.querySelectorAll('.admin-tabs button').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.admin-tabs button').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.admin-tab-content').forEach(t => t.classList.remove('active'));
      btn.classList.add('active');
      const tab = document.getElementById('tab-' + btn.dataset.tab);
      if (tab) tab.classList.add('active');
    });
  });

  // Save buttons
  const saveButtons = document.querySelectorAll('#saveAllBtn, #saveAllBtnBottom');
  saveButtons.forEach(btn => {
    btn.addEventListener('click', saveContent);
  });

  // Preview updates on input for color pickers
  document.querySelectorAll('input[type="color"][data-color-key]').forEach(input => {
    input.addEventListener('change', () => {
      // Don't auto-save, just update the display
    });
  });

  // Keyboard shortcut: Ctrl+S to save
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      saveContent();
    }
  });
}

document.addEventListener('DOMContentLoaded', init);