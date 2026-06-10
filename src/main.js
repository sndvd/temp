// ============================
// Craig Grammer Studio — Main App
// ============================

let content = null;
let cart = JSON.parse(localStorage.getItem('cg_cart') || '[]');
let currentRoute = '';
let currentFilter = 'All';
let editMode = false;

// --- Load content ---
async function loadContent() {
  try {
    const res = await fetch('/content.json?_=' + Date.now());
    content = await res.json();
    applyDesignVariables(content.design);
    return content;
  } catch (e) {
    console.error('Failed to load content:', e);
    return null;
  }
}

// --- Apply CSS variables from design config ---
function applyDesignVariables(design) {
  const root = document.documentElement.style;
  if (!design) return;
  root.setProperty('--bg', design.colors.background);
  root.setProperty('--text', design.colors.text);
  root.setProperty('--accent', design.colors.accent);
  root.setProperty('--hover', design.colors.hover);
  root.setProperty('--light', design.colors.light);
  root.setProperty('--white', design.colors.white);
  root.setProperty('--heading-font', design.typography.headings);
  root.setProperty('--body-font', design.typography.body);
}

// --- Router (hash-based for static hosting) ---
function navigate(path) {
  path = path || '/';
  currentRoute = path;
  window.location.hash = '#' + path;
  renderPage(path);
}

function getRoute() {
  return window.location.hash.slice(1) || '/';
}

// --- Edit Mode ---
function toggleEditMode() {
  editMode = !editMode;
  const btn = document.getElementById('editToggleBtn');
  const bar = document.getElementById('editSaveBar');
  if (btn) {
    btn.classList.toggle('active', editMode);
    btn.textContent = editMode ? '✕ Exit Edit' : '✎ Edit';
  }
  if (bar) bar.classList.toggle('visible', editMode);
  document.body.classList.toggle('edit-mode', editMode);
  // Re-render current page to add edit data attributes
  renderPage(currentRoute);
}

function makeEditable(el, path, type) {
  if (!editMode) return;
  el.contentEditable = true;
  el.classList.add('is-editing');
  el.dataset.editPath = path;
  el.dataset.editType = type || 'text';

  el.addEventListener('blur', () => {
    el.contentEditable = false;
    el.classList.remove('is-editing');
  }, { once: true });

  el.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') el.blur();
    if (e.key === 'Enter' && !e.shiftKey) el.blur();
  });
}

function handleImageEdit(imgEl, paintingId) {
  if (!editMode) return;
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      imgEl.src = ev.target.result;
      // Store the new image data in content
      if (paintingId) {
        const painting = content.paintings.find(p => p.id === paintingId);
        if (painting) painting._tempImage = ev.target.result;
      }
      // Mark as changed
      markChanged();
    };
    reader.readAsDataURL(file);
  });
  input.click();
}

function markChanged() {
  const bar = document.getElementById('editSaveBar');
  if (bar) bar.classList.add('has-changes');
}

function collectEditedContent() {
  // Get all edited text
  document.querySelectorAll('[data-edit-path]').forEach(el => {
    const path = el.dataset.editPath;
    const value = el.textContent.trim();
    setNestedValue(content, path, value);
  });

  // Get uploaded image filenames
  document.querySelectorAll('[data-edit-img]').forEach(img => {
    const paintingId = img.dataset.editImg;
    const src = img.getAttribute('src');
    if (paintingId && src && !src.startsWith('data:')) {
      const painting = content.paintings.find(p => p.id === paintingId);
      if (painting) {
        // Extract just the filename
        const parts = src.split('/');
        painting.image = '/' + parts.slice(parts.indexOf('images')).join('/');
      }
    }
  });

  return content;
}

function saveEditedContent() {
  const data = collectEditedContent();
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'content.json';
  a.click();
  URL.revokeObjectURL(url);
  const bar = document.getElementById('editSaveBar');
  if (bar) bar.classList.remove('has-changes');
  const status = document.getElementById('editSaveStatus');
  if (status) {
    status.textContent = '✓ content.json downloaded — replace it in your project folder';
    status.style.color = '#4CAF50';
    setTimeout(() => { status.textContent = ''; }, 5000);
  }
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

// --- Render page based on route ---
function renderPage(path) {
  const app = document.getElementById('app');
  if (!app) return;

  // Update active nav
  document.querySelectorAll('[data-nav]').forEach(a => {
    a.classList.toggle('active', a.dataset.nav === path);
  });

  switch (path) {
    case '/': app.innerHTML = renderHome(); break;
    case '/gallery': app.innerHTML = renderGallery(); break;
    case '/store': app.innerHTML = renderStore(); break;
    case '/about': app.innerHTML = renderAbout(); break;
    case '/contact': app.innerHTML = renderContact(); break;
    default: app.innerHTML = renderHome(); break;
  }

  // Attach event listeners for the new page
  attachPageListeners(path);
  // Attach edit mode listeners if active
  if (editMode) attachEditListeners();
}

// ============================
// PAGE RENDERERS
// ============================

function renderHome() {
  const c = content;
  const featured = c.paintings.filter(p => (c.home.featured_ids || []).includes(p.id));

  return `
    <div class="page">
      <section class="hero">
        <h1 ${editMode ? `data-edit-path="home.hero_title"` : ''}>${escapeHtml(c.home.hero_title)}</h1>
        <p class="subtitle" ${editMode ? `data-edit-path="home.hero_subtitle"` : ''}>${escapeHtml(c.home.hero_subtitle)}</p>
        <p class="bio" ${editMode ? `data-edit-path="home.bio"` : ''}>${escapeHtml(c.home.bio)}</p>
        <a href="/gallery" data-nav="/gallery" class="btn">View Gallery</a>
        <a href="/store" data-nav="/store" class="btn" style="margin-left:0.75rem;">Shop Prints</a>
      </section>

      <section class="page-section featured-section">
        <div class="container">
          <div class="section-header">
            <h2>Recent Work</h2>
            <a href="/gallery" data-nav="/gallery" class="btn" style="font-size:0.75rem;">View All</a>
          </div>
          <div class="featured-grid">
            ${featured.map(p => renderPaintingCard(p)).join('')}
          </div>
        </div>
      </section>
    </div>
  `;
}

function renderGallery() {
  const c = content;
  const collections = c.collections || ['All'];
  let paintings = [...c.paintings];
  if (currentFilter !== 'All') {
    paintings = paintings.filter(p => p.collection === currentFilter);
  }

  return `
    <div class="page">
      <div class="page-title">
        <h1 ${editMode ? `data-edit-path="site.title"` : ''}>Gallery</h1>
        <p ${editMode ? `data-edit-path="site.description"` : ''}>Explore the complete collection</p>
      </div>
      <div class="container">
        <div class="filter-bar">
          ${collections.map(col => `
            <button class="filter-btn ${col === currentFilter ? 'active' : ''}" data-filter="${col}">${col}</button>
          `).join('')}
        </div>
        <div class="painting-grid">
          ${paintings.map(p => renderPaintingCard(p)).join('')}
        </div>
      </div>
    </div>
  `;
}

function renderStore() {
  const c = content;

  return `
    <div class="page">
      <div class="page-title">
        <h1>Print Store</h1>
        <p ${editMode ? `data-edit-path="store.shipping_note"` : ''}>${escapeHtml(c.store.shipping_note)}</p>
      </div>
      <div class="container">
        <div class="store-grid">
          ${c.paintings.map(p => renderStoreItem(p)).join('')}
        </div>
      </div>
    </div>
  `;
}

function renderAbout() {
  const c = content;

  return `
    <div class="page">
      <div class="page-title">
        <h1>About</h1>
        <p>The artist and his practice</p>
      </div>
      <div class="container">
        <div class="about-content">
          <div class="about-image ${editMode ? 'edit-img-target' : ''}">
            <img src="${escapeHtml(c.about.photo)}" alt="Craig Grammer in his studio" ${editMode ? `data-edit-img="about.photo"` : ''} onerror="this.closest('.about-image').classList.add('placeholder-img'); this.outerHTML='<div style=\\'height:100%;display:flex;align-items:center;justify-content:center;color:#8B7355;padding:2rem;text-align:center;\\'>Artist photo coming soon</div>'">
            ${editMode ? '<div class="edit-overlay"><span>Click to replace photo</span></div>' : ''}
          </div>
          <div class="about-text">
            ${c.about.bio_paragraphs.map((p, i) => 
              `<p class="bio-paragraph" ${editMode ? `data-edit-path="about.bio_paragraphs.${i}"` : ''}>${escapeHtml(p)}</p>`
            ).join('')}
            <div class="statement-block">
              <p ${editMode ? `data-edit-path="about.statement"` : ''}>${escapeHtml(c.about.statement)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderContact() {
  const c = content;

  return `
    <div class="page">
      <div class="page-title">
        <h1>Contact</h1>
        <p>Get in touch</p>
      </div>
      <div class="container">
        <div class="contact-grid">
          <div class="contact-info">
            <p class="contact-intro" ${editMode ? `data-edit-path="contact.form_intro"` : ''}>${escapeHtml(c.contact.form_intro)}</p>
            <div class="contact-detail">
              <p class="label">Email</p>
              <p class="value" ${editMode ? `data-edit-path="contact.email"` : ''}><a href="mailto:${escapeHtml(c.contact.email)}">${escapeHtml(c.contact.email)}</a></p>
            </div>
            <div class="contact-detail">
              <p class="label">Location</p>
              <p class="value" ${editMode ? `data-edit-path="contact.location"` : ''}>${escapeHtml(c.contact.location)}</p>
            </div>
            <div class="contact-detail">
              <p class="label">Studio</p>
              <p class="value" ${editMode ? `data-edit-path="contact.studio_hours"` : ''}>${escapeHtml(c.contact.studio_hours)}</p>
            </div>
            <div class="contact-detail">
              <p class="label">Social</p>
              <p class="value">
                <a href="${escapeHtml(c.site.social.instagram)}" target="_blank" rel="noopener">Instagram</a> &middot;
                <a href="${escapeHtml(c.site.social.facebook)}" target="_blank" rel="noopener">Facebook</a>
              </p>
            </div>
          </div>
          <form class="contact-form" id="contactForm">
            <div class="form-group">
              <label for="contactName">Name</label>
              <input type="text" id="contactName" name="name" required />
            </div>
            <div class="form-group">
              <label for="contactEmail">Email</label>
              <input type="email" id="contactEmail" name="email" required />
            </div>
            <div class="form-group">
              <label for="contactMessage">Message</label>
              <textarea id="contactMessage" name="message" required></textarea>
            </div>
            <button type="submit" class="btn btn-primary">Send Message</button>
            <p id="contactFormStatus" style="margin-top:0.75rem;font-size:0.85rem;"></p>
          </form>
        </div>
      </div>
    </div>
  `;
}

// --- Shared render helpers ---

function renderPaintingCard(painting) {
  return `
    <div class="painting-card" data-painting-id="${escapeHtml(painting.id)}">
      <div class="image-wrapper ${editMode ? 'edit-img-target' : ''}">
        <img src="${escapeHtml(painting.image)}" alt="${escapeHtml(painting.title)}" loading="lazy" ${editMode ? `data-edit-img="${painting.id}"` : ''} onerror="this.outerHTML='<div class=\\'placeholder-img\\' style=\\'height:100%;width:100%;display:flex;align-items:center;justify-content:center;color:#8B7355;font-size:0.85rem;text-align:center;\\'>${escapeHtml(painting.title)}<br><span style=\\'opacity:0.5;font-size:0.7rem;\\'>Image coming soon</span></div>'">
        ${editMode ? '<div class="edit-overlay"><span>Click to replace image</span></div>' : ''}
      </div>
      <div class="card-info">
        <h3 class="card-title" ${editMode ? `data-edit-path="paintings.${getPaintingIndex(painting.id)}.title"` : ''}>${escapeHtml(painting.title)}</h3>
        <p class="card-meta">
          <span ${editMode ? `data-edit-path="paintings.${getPaintingIndex(painting.id)}.medium"` : ''}>${escapeHtml(painting.medium)}</span> &middot;
          <span ${editMode ? `data-edit-path="paintings.${getPaintingIndex(painting.id)}.dimensions"` : ''}>${escapeHtml(painting.dimensions)}</span> &middot;
          <span ${editMode ? `data-edit-path="paintings.${getPaintingIndex(painting.id)}.year"` : ''}>${painting.year}</span>
        </p>
      </div>
    </div>
  `;
}

function renderStoreItem(painting) {
  const sizes = painting.prints || {};
  const sizeKeys = Object.keys(sizes);
  const pidx = getPaintingIndex(painting.id);

  return `
    <div class="store-item" data-painting-id="${escapeHtml(painting.id)}">
      <div class="image-wrapper ${editMode ? 'edit-img-target' : ''}">
        <img src="${escapeHtml(painting.image)}" alt="${escapeHtml(painting.title)}" loading="lazy" ${editMode ? `data-edit-img="${painting.id}"` : ''} onerror="this.outerHTML='<div class=\\'placeholder-img\\' style=\\'height:100%;width:100%;display:flex;align-items:center;justify-content:center;color:#8B7355;font-size:0.85rem;text-align:center;padding:2rem;\\'>${escapeHtml(painting.title)}<br><span style=\\'opacity:0.5;font-size:0.7rem;\\'>Image coming soon</span></div>'">
        ${editMode ? '<div class="edit-overlay"><span>Click to replace</span></div>' : ''}
      </div>
      <div class="store-info">
        <h3 class="store-title" ${editMode ? `data-edit-path="paintings.${pidx}.title"` : ''}>${escapeHtml(painting.title)}</h3>
        <p class="card-meta" style="margin-bottom:0.75rem;">
          <span ${editMode ? `data-edit-path="paintings.${pidx}.medium"` : ''}>${escapeHtml(painting.medium)}</span> &middot;
          <span ${editMode ? `data-edit-path="paintings.${pidx}.dimensions"` : ''}>${escapeHtml(painting.dimensions)}</span>
        </p>
        <div class="size-selector" data-painting-id="${escapeHtml(painting.id)}">
          ${sizeKeys.map((size, idx) => `
            <button class="size-option ${idx === 0 ? 'selected' : ''}" data-size="${size}" data-price="${sizes[size]}">
              ${size}
            </button>
          `).join('')}
        </div>
        <p class="store-price" data-painting-id="${escapeHtml(painting.id)}">
          ${content.store.currency}${sizes[sizeKeys[0]]}
        </p>
        ${editMode ? `
          <div style="display:flex;gap:0.5rem;margin-bottom:0.5rem;">
            ${sizeKeys.map(s => `
              <label style="font-size:0.75rem;display:flex;align-items:center;gap:0.25rem;">
                ${s}: <input type="number" step="1" value="${sizes[s]}" style="width:50px;padding:0.2rem;border:1px solid #ddd;font-size:0.75rem;" data-edit-price="${painting.id}" data-edit-size="${s}" />
              </label>
            `).join('')}
          </div>
        ` : ''}
        <button class="add-to-cart-btn" data-painting-id="${escapeHtml(painting.id)}" data-size="${sizeKeys[0]}" data-price="${sizes[sizeKeys[0]]}">
          ${editMode ? 'Update Price → Save' : 'Add to Cart'}
        </button>
      </div>
    </div>
  `;
}

function getPaintingIndex(id) {
  return content.paintings.findIndex(p => p.id === id);
}

// ============================
// EVENT LISTENERS
// ============================

function attachPageListeners(path) {
  // --- Lightbox / detail click ---
  document.querySelectorAll('.painting-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (editMode) return; // Don't open lightbox in edit mode
      const id = card.dataset.paintingId;
      openLightbox(id);
    });
  });

  // --- Store: size selector ---
  document.querySelectorAll('.size-selector').forEach(selector => {
    selector.querySelectorAll('.size-option').forEach(btn => {
      btn.addEventListener('click', () => {
        const paintingId = selector.dataset.paintingId;
        selector.querySelectorAll('.size-option').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        const priceEl = document.querySelector(`.store-price[data-painting-id="${paintingId}"]`);
        if (priceEl) priceEl.textContent = `${content.store.currency}${btn.dataset.price}`;
        const cartBtn = document.querySelector(`.add-to-cart-btn[data-painting-id="${paintingId}"]`);
        if (cartBtn) {
          cartBtn.dataset.size = btn.dataset.size;
          cartBtn.dataset.price = btn.dataset.price;
        }
      });
    });
  });

  // --- Store: add to cart / save price ---
  document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (editMode) return; // Don't add to cart in edit mode
      const paintingId = btn.dataset.paintingId;
      const size = btn.dataset.size;
      const price = parseFloat(btn.dataset.price);
      const painting = content.paintings.find(p => p.id === paintingId);
      if (!painting) return;
      addToCart(painting, size, price);
    });
  });

  // --- Gallery: filter buttons ---
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentFilter = btn.dataset.filter;
      renderPage(currentRoute);
    });
  });

  // --- Contact form ---
  const form = document.getElementById('contactForm');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const status = document.getElementById('contactFormStatus');
      status.textContent = 'Thank you! Your message has been sent. I will respond soon.';
      status.style.color = '#8B7355';
      form.reset();
    });
  }
}

function attachEditListeners() {
  // Make text editable on click
  document.querySelectorAll('[data-edit-path]').forEach(el => {
    el.addEventListener('click', (e) => {
      if (!editMode) return;
      e.stopPropagation();
      el.contentEditable = true;
      el.classList.add('is-editing');
      el.focus();
      // Select all text for easy replacement
      const range = document.createRange();
      range.selectNodeContents(el);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    });
  });

  // Blur on pressing Enter (non-Shift)
  document.querySelectorAll('[data-edit-path]').forEach(el => {
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { el.blur(); return; }
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        el.blur();
      }
    });
    el.addEventListener('blur', () => {
      el.contentEditable = false;
      el.classList.remove('is-editing');
      markChanged();
    });
  });

  // Image click to replace
  document.querySelectorAll('[data-edit-img]').forEach(img => {
    img.style.cursor = 'pointer';
    img.addEventListener('click', (e) => {
      if (!editMode) return;
      e.stopPropagation();
      const paintingId = img.dataset.editImg;
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.addEventListener('change', (ev) => {
        const file = ev.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (re) => {
          img.src = re.target.result;
          markChanged();
        };
        reader.readAsDataURL(file);
      });
      input.click();
    });
  });

  // Price inputs in edit mode
  document.querySelectorAll('[data-edit-price]').forEach(input => {
    input.addEventListener('change', () => {
      const paintingId = input.dataset.editPrice;
      const size = input.dataset.editSize;
      const val = parseFloat(input.value) || 0;
      const painting = content.paintings.find(p => p.id === paintingId);
      if (painting) {
        painting.prints[size] = val;
        markChanged();
      }
    });
  });
}

// ============================
// LIGHTBOX
// ============================

let lightboxEl = null;

function openLightbox(paintingId) {
  const painting = content.paintings.find(p => p.id === paintingId);
  if (!painting) return;

  closeLightbox();

  const overlay = document.createElement('div');
  overlay.className = 'lightbox-overlay';
  overlay.innerHTML = `
    <div class="lightbox-content">
      <button class="lightbox-close" id="lightboxClose">&times;</button>
      <div class="lightbox-image">
        <img src="${escapeHtml(painting.image)}" alt="${escapeHtml(painting.title)}" onerror="this.outerHTML='<div style=\\'height:100%;display:flex;align-items:center;justify-content:center;color:#8B7355;padding:2rem;text-align:center;font-size:0.85rem;\\'>${escapeHtml(painting.title)}<br><span style=\\'opacity:0.5;font-size:0.7rem;\\'>Image coming soon</span></div>'">
      </div>
      <div class="lightbox-details">
        <h2>${escapeHtml(painting.title)}</h2>
        <div class="detail-meta">
          <p>${escapeHtml(painting.medium)}</p>
          <p>${escapeHtml(painting.dimensions)}</p>
          <p>${painting.year}</p>
          ${painting.collection ? `<p>Collection: ${escapeHtml(painting.collection)}</p>` : ''}
        </div>
        ${painting.description ? `<p class="detail-description">${escapeHtml(painting.description)}</p>` : ''}
        <a href="/store" data-nav="/store" class="btn" style="font-size:0.8rem;">Purchase Print</a>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  requestAnimationFrame(() => { overlay.classList.add('active'); });

  const closeBtn = overlay.querySelector('#lightboxClose');
  closeBtn.addEventListener('click', closeLightbox);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeLightbox(); });
  document.addEventListener('keydown', lightboxKeyHandler);
  lightboxEl = overlay;
}

function closeLightbox() {
  if (lightboxEl) {
    lightboxEl.classList.remove('active');
    setTimeout(() => {
      if (lightboxEl && lightboxEl.parentNode) lightboxEl.parentNode.removeChild(lightboxEl);
      lightboxEl = null;
    }, 400);
  }
  document.removeEventListener('keydown', lightboxKeyHandler);
}

function lightboxKeyHandler(e) { if (e.key === 'Escape') closeLightbox(); }

// ============================
// CART
// ============================

function addToCart(painting, size, price) {
  const existing = cart.find(item => item.paintingId === painting.id && item.size === size);
  if (existing) { existing.qty = (existing.qty || 1) + 1; }
  else {
    cart.push({ paintingId: painting.id, title: painting.title, image: painting.image, size, price, qty: 1 });
  }
  saveCart();
  updateCartUI();
  openCart();
}

function removeFromCart(index) { cart.splice(index, 1); saveCart(); updateCartUI(); }
function saveCart() { localStorage.setItem('cg_cart', JSON.stringify(cart)); }
function getCartTotal() { return cart.reduce((sum, item) => sum + item.price * (item.qty || 1), 0); }

function updateCartUI() {
  const count = cart.reduce((sum, item) => sum + (item.qty || 1), 0);
  let badge = document.querySelector('.cart-count');
  if (!badge) { badge = document.createElement('div'); badge.className = 'cart-count'; document.body.appendChild(badge); }
  if (count > 0) { badge.textContent = count; badge.classList.add('visible'); }
  else { badge.classList.remove('visible'); }
}

function openCart() {
  const drawer = document.getElementById('cartDrawer');
  const overlay = document.getElementById('cartOverlay');
  if (!drawer) return;
  renderCartItems();
  drawer.classList.add('open'); overlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeCart() {
  const drawer = document.getElementById('cartDrawer');
  const overlay = document.getElementById('cartOverlay');
  if (!drawer) return;
  drawer.classList.remove('open'); overlay.classList.remove('active');
  document.body.style.overflow = '';
}

function renderCartItems() {
  const container = document.getElementById('cartItems');
  const totalEl = document.getElementById('cartTotal');
  const checkoutBtn = document.getElementById('cartCheckout');
  if (!container) return;
  if (cart.length === 0) {
    container.innerHTML = '<p class="cart-empty">Your cart is empty.</p>';
    if (totalEl) totalEl.textContent = '€0.00';
    if (checkoutBtn) checkoutBtn.disabled = true;
    return;
  }
  container.innerHTML = cart.map((item, idx) => `
    <div class="cart-item">
      <img class="cart-item-image" src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title)}" onerror="this.style.background='#E8E4DE'">
      <div class="cart-item-info">
        <div class="cart-item-title">${escapeHtml(item.title)}</div>
        <div class="cart-item-size">${item.size} Print</div>
        <div class="cart-item-price">€${item.price} ${item.qty > 1 ? `× ${item.qty}` : ''}</div>
        <button class="cart-item-remove" data-index="${idx}">Remove</button>
      </div>
    </div>
  `).join('');
  if (totalEl) totalEl.textContent = `€${getCartTotal().toFixed(2)}`;
  if (checkoutBtn) checkoutBtn.disabled = false;
  container.querySelectorAll('.cart-item-remove').forEach(btn => {
    btn.addEventListener('click', () => removeFromCart(parseInt(btn.dataset.index)));
  });
}

// ============================
// INIT
// ============================

async function init() {
  await loadContent();

  // Handle navigation clicks
  document.addEventListener('click', (e) => {
    const navLink = e.target.closest('[data-nav]');
    if (navLink) { e.preventDefault(); navigate(navLink.dataset.nav); }
  });

  window.addEventListener('popstate', () => { renderPage(getRoute()); });

  // Mobile menu
  const menuToggle = document.querySelector('.menu-toggle');
  const mainNav = document.querySelector('.main-nav');
  if (menuToggle) {
    menuToggle.addEventListener('click', () => mainNav.classList.toggle('open'));
    mainNav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => mainNav.classList.remove('open')));
  }

  // Cart toggle
  document.querySelectorAll('.cart-toggle').forEach(btn => {
    btn.addEventListener('click', (e) => { e.preventDefault();
      if (document.getElementById('cartDrawer').classList.contains('open')) closeCart(); else openCart();
    });
  });

  const cartClose = document.getElementById('cartClose');
  const cartOverlay = document.getElementById('cartOverlay');
  if (cartClose) cartClose.addEventListener('click', closeCart);
  if (cartOverlay) cartOverlay.addEventListener('click', closeCart);

  // Checkout
  const checkoutBtn = document.getElementById('cartCheckout');
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', () => {
      if (cart.length === 0) return;
      const total = getCartTotal().toFixed(2);
      const subject = encodeURIComponent('Print Order Inquiry');
      const body = encodeURIComponent(
        `Hi Craig,\n\nI'd like to order the following prints:\n\n` +
        cart.map(item => `- ${item.title} (${item.size}) × ${item.qty || 1} — €${(item.price * (item.qty || 1)).toFixed(2)}`).join('\n') +
        `\n\nTotal: €${total}\n\nPlease let me know the next steps for payment and shipping.\n\nBest regards`
      );
      window.location.href = `mailto:${content.contact.email}?subject=${subject}&body=${body}`;
      closeCart();
    });
  }

  // Cart badge in nav
  if (mainNav) {
    const cartLink = document.createElement('a');
    cartLink.href = '#';
    cartLink.className = 'cart-toggle';
    cartLink.style.cssText = 'display:flex;align-items:center;gap:4px;';
    cartLink.innerHTML = `Cart <span style="font-size:0.75rem;background:#8B7355;color:white;padding:1px 6px;border-radius:8px;" id="cartCountBadge">${cart.reduce((s,i) => s + (i.qty||1), 0)}</span>`;
    mainNav.appendChild(cartLink);
    cartLink.addEventListener('click', (e) => { e.preventDefault(); openCart(); });
  }

  // Add Edit Mode toggle to header
  const header = document.querySelector('.site-header .container');
  if (header) {
    const editBtn = document.createElement('button');
    editBtn.id = 'editToggleBtn';
    editBtn.className = 'edit-toggle-btn';
    editBtn.textContent = '✎ Edit';
    editBtn.addEventListener('click', toggleEditMode);
    header.appendChild(editBtn);
  }

  // Add Edit Save Bar
  const saveBar = document.createElement('div');
  saveBar.id = 'editSaveBar';
  saveBar.className = 'edit-save-bar';
  saveBar.innerHTML = `
    <span>Editing content — click any text to edit, click images to replace</span>
    <div>
      <span id="editSaveStatus" style="font-size:0.8rem;margin-right:0.5rem;"></span>
      <button id="editSaveBtn" class="btn btn-primary" style="padding:0.4rem 1rem;font-size:0.8rem;">💾 Download Updated content.json</button>
    </div>
  `;
  document.body.appendChild(saveBar);
  document.getElementById('editSaveBtn').addEventListener('click', saveEditedContent);

  // Render initial page
  const initialPath = getRoute();
  renderPage(initialPath);
  updateCartUI();
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

document.addEventListener('DOMContentLoaded', init);