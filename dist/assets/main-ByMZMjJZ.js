import"./modulepreload-polyfill-Dezn_h7o.js";var e=null,t=JSON.parse(localStorage.getItem(`cg_cart`)||`[]`),n=``,r=`All`,i=!1;async function a(){try{return e=await(await fetch(`/content.json?_=`+Date.now())).json(),o(e.design),e}catch(e){return console.error(`Failed to load content:`,e),null}}function o(e){let t=document.documentElement.style;e&&(t.setProperty(`--bg`,e.colors.background),t.setProperty(`--text`,e.colors.text),t.setProperty(`--accent`,e.colors.accent),t.setProperty(`--hover`,e.colors.hover),t.setProperty(`--light`,e.colors.light),t.setProperty(`--white`,e.colors.white),t.setProperty(`--heading-font`,e.typography.headings),t.setProperty(`--body-font`,e.typography.body))}function s(e){e||=`/`,n=e,window.location.hash=`#`+e,m(e)}function c(){return window.location.hash.slice(1)||`/`}function l(){i=!i;let e=document.getElementById(`editToggleBtn`),t=document.getElementById(`editSaveBar`);e&&(e.classList.toggle(`active`,i),e.textContent=i?`✕ Exit Edit`:`✎ Edit`),t&&t.classList.toggle(`visible`,i),document.body.classList.toggle(`edit-mode`,i),m(n)}function u(){let e=document.getElementById(`editSaveBar`);e&&e.classList.add(`has-changes`)}function d(){return document.querySelectorAll(`[data-edit-path]`).forEach(t=>{let n=t.dataset.editPath,r=t.textContent.trim();p(e,n,r)}),document.querySelectorAll(`[data-edit-img]`).forEach(t=>{let n=t.dataset.editImg,r=t.getAttribute(`src`);if(n&&r&&!r.startsWith(`data:`)){let t=e.paintings.find(e=>e.id===n);if(t){let e=r.split(`/`);t.image=`/`+e.slice(e.indexOf(`images`)).join(`/`)}}}),e}function f(){let e=d(),t=JSON.stringify(e,null,2),n=new Blob([t],{type:`application/json`}),r=URL.createObjectURL(n),i=document.createElement(`a`);i.href=r,i.download=`content.json`,i.click(),URL.revokeObjectURL(r);let a=document.getElementById(`editSaveBar`);a&&a.classList.remove(`has-changes`);let o=document.getElementById(`editSaveStatus`);o&&(o.textContent=`✓ content.json downloaded — replace it in your project folder`,o.style.color=`#4CAF50`,setTimeout(()=>{o.textContent=``},5e3))}function p(e,t,n){let r=t.split(`.`),i=e;for(let e=0;e<r.length-1;e++)i[r[e]]||(i[r[e]]={}),i=i[r[e]];i[r[r.length-1]]=n}function m(e){let t=document.getElementById(`app`);if(t){switch(document.querySelectorAll(`[data-nav]`).forEach(t=>{t.classList.toggle(`active`,t.dataset.nav===e)}),e){case`/`:t.innerHTML=h();break;case`/gallery`:t.innerHTML=g();break;case`/store`:t.innerHTML=_();break;case`/about`:t.innerHTML=v();break;case`/contact`:t.innerHTML=y();break;default:t.innerHTML=h();break}C(e),i&&w()}}function h(){let t=e,n=t.paintings.filter(e=>(t.home.featured_ids||[]).includes(e.id));return`
    <div class="page">
      <section class="hero">
        <h1 ${i?`data-edit-path="home.hero_title"`:``}>${R(t.home.hero_title)}</h1>
        <p class="subtitle" ${i?`data-edit-path="home.hero_subtitle"`:``}>${R(t.home.hero_subtitle)}</p>
        <p class="bio" ${i?`data-edit-path="home.bio"`:``}>${R(t.home.bio)}</p>
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
            ${n.map(e=>b(e)).join(``)}
          </div>
        </div>
      </section>
    </div>
  `}function g(){let t=e,n=t.collections||[`All`],a=[...t.paintings];return r!==`All`&&(a=a.filter(e=>e.collection===r)),`
    <div class="page">
      <div class="page-title">
        <h1 ${i?`data-edit-path="site.title"`:``}>Gallery</h1>
        <p ${i?`data-edit-path="site.description"`:``}>Explore the complete collection</p>
      </div>
      <div class="container">
        <div class="filter-bar">
          ${n.map(e=>`
            <button class="filter-btn ${e===r?`active`:``}" data-filter="${e}">${e}</button>
          `).join(``)}
        </div>
        <div class="painting-grid">
          ${a.map(e=>b(e)).join(``)}
        </div>
      </div>
    </div>
  `}function _(){let t=e;return`
    <div class="page">
      <div class="page-title">
        <h1>Print Store</h1>
        <p ${i?`data-edit-path="store.shipping_note"`:``}>${R(t.store.shipping_note)}</p>
      </div>
      <div class="container">
        <div class="store-grid">
          ${t.paintings.map(e=>x(e)).join(``)}
        </div>
      </div>
    </div>
  `}function v(){let t=e;return`
    <div class="page">
      <div class="page-title">
        <h1>About</h1>
        <p>The artist and his practice</p>
      </div>
      <div class="container">
        <div class="about-content">
          <div class="about-image ${i?`edit-img-target`:``}">
            <img src="${R(t.about.photo)}" alt="Craig Grammer in his studio" ${i?`data-edit-img="about.photo"`:``} onerror="this.closest('.about-image').classList.add('placeholder-img'); this.outerHTML='<div style=\\'height:100%;display:flex;align-items:center;justify-content:center;color:#8B7355;padding:2rem;text-align:center;\\'>Artist photo coming soon</div>'">
            ${i?`<div class="edit-overlay"><span>Click to replace photo</span></div>`:``}
          </div>
          <div class="about-text">
            ${t.about.bio_paragraphs.map((e,t)=>`<p class="bio-paragraph" ${i?`data-edit-path="about.bio_paragraphs.${t}"`:``}>${R(e)}</p>`).join(``)}
            <div class="statement-block">
              <p ${i?`data-edit-path="about.statement"`:``}>${R(t.about.statement)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `}function y(){let t=e;return`
    <div class="page">
      <div class="page-title">
        <h1>Contact</h1>
        <p>Get in touch</p>
      </div>
      <div class="container">
        <div class="contact-grid">
          <div class="contact-info">
            <p class="contact-intro" ${i?`data-edit-path="contact.form_intro"`:``}>${R(t.contact.form_intro)}</p>
            <div class="contact-detail">
              <p class="label">Email</p>
              <p class="value" ${i?`data-edit-path="contact.email"`:``}><a href="mailto:${R(t.contact.email)}">${R(t.contact.email)}</a></p>
            </div>
            <div class="contact-detail">
              <p class="label">Location</p>
              <p class="value" ${i?`data-edit-path="contact.location"`:``}>${R(t.contact.location)}</p>
            </div>
            <div class="contact-detail">
              <p class="label">Studio</p>
              <p class="value" ${i?`data-edit-path="contact.studio_hours"`:``}>${R(t.contact.studio_hours)}</p>
            </div>
            <div class="contact-detail">
              <p class="label">Social</p>
              <p class="value">
                <a href="${R(t.site.social.instagram)}" target="_blank" rel="noopener">Instagram</a> &middot;
                <a href="${R(t.site.social.facebook)}" target="_blank" rel="noopener">Facebook</a>
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
  `}function b(e){return`
    <div class="painting-card" data-painting-id="${R(e.id)}">
      <div class="image-wrapper ${i?`edit-img-target`:``}">
        <img src="${R(e.image)}" alt="${R(e.title)}" loading="lazy" ${i?`data-edit-img="${e.id}"`:``} onerror="this.outerHTML='<div class=\\'placeholder-img\\' style=\\'height:100%;width:100%;display:flex;align-items:center;justify-content:center;color:#8B7355;font-size:0.85rem;text-align:center;\\'>${R(e.title)}<br><span style=\\'opacity:0.5;font-size:0.7rem;\\'>Image coming soon</span></div>'">
        ${i?`<div class="edit-overlay"><span>Click to replace image</span></div>`:``}
      </div>
      <div class="card-info">
        <h3 class="card-title" ${i?`data-edit-path="paintings.${S(e.id)}.title"`:``}>${R(e.title)}</h3>
        <p class="card-meta">
          <span ${i?`data-edit-path="paintings.${S(e.id)}.medium"`:``}>${R(e.medium)}</span> &middot;
          <span ${i?`data-edit-path="paintings.${S(e.id)}.dimensions"`:``}>${R(e.dimensions)}</span> &middot;
          <span ${i?`data-edit-path="paintings.${S(e.id)}.year"`:``}>${e.year}</span>
        </p>
      </div>
    </div>
  `}function x(t){let n=t.prints||{},r=Object.keys(n),a=S(t.id);return`
    <div class="store-item" data-painting-id="${R(t.id)}">
      <div class="image-wrapper ${i?`edit-img-target`:``}">
        <img src="${R(t.image)}" alt="${R(t.title)}" loading="lazy" ${i?`data-edit-img="${t.id}"`:``} onerror="this.outerHTML='<div class=\\'placeholder-img\\' style=\\'height:100%;width:100%;display:flex;align-items:center;justify-content:center;color:#8B7355;font-size:0.85rem;text-align:center;padding:2rem;\\'>${R(t.title)}<br><span style=\\'opacity:0.5;font-size:0.7rem;\\'>Image coming soon</span></div>'">
        ${i?`<div class="edit-overlay"><span>Click to replace</span></div>`:``}
      </div>
      <div class="store-info">
        <h3 class="store-title" ${i?`data-edit-path="paintings.${a}.title"`:``}>${R(t.title)}</h3>
        <p class="card-meta" style="margin-bottom:0.75rem;">
          <span ${i?`data-edit-path="paintings.${a}.medium"`:``}>${R(t.medium)}</span> &middot;
          <span ${i?`data-edit-path="paintings.${a}.dimensions"`:``}>${R(t.dimensions)}</span>
        </p>
        <div class="size-selector" data-painting-id="${R(t.id)}">
          ${r.map((e,t)=>`
            <button class="size-option ${t===0?`selected`:``}" data-size="${e}" data-price="${n[e]}">
              ${e}
            </button>
          `).join(``)}
        </div>
        <p class="store-price" data-painting-id="${R(t.id)}">
          ${e.store.currency}${n[r[0]]}
        </p>
        ${i?`
          <div style="display:flex;gap:0.5rem;margin-bottom:0.5rem;">
            ${r.map(e=>`
              <label style="font-size:0.75rem;display:flex;align-items:center;gap:0.25rem;">
                ${e}: <input type="number" step="1" value="${n[e]}" style="width:50px;padding:0.2rem;border:1px solid #ddd;font-size:0.75rem;" data-edit-price="${t.id}" data-edit-size="${e}" />
              </label>
            `).join(``)}
          </div>
        `:``}
        <button class="add-to-cart-btn" data-painting-id="${R(t.id)}" data-size="${r[0]}" data-price="${n[r[0]]}">
          ${i?`Update Price → Save`:`Add to Cart`}
        </button>
      </div>
    </div>
  `}function S(t){return e.paintings.findIndex(e=>e.id===t)}function C(t){document.querySelectorAll(`.painting-card`).forEach(e=>{e.addEventListener(`click`,t=>{if(i)return;let n=e.dataset.paintingId;E(n)})}),document.querySelectorAll(`.size-selector`).forEach(t=>{t.querySelectorAll(`.size-option`).forEach(n=>{n.addEventListener(`click`,()=>{let r=t.dataset.paintingId;t.querySelectorAll(`.size-option`).forEach(e=>e.classList.remove(`selected`)),n.classList.add(`selected`);let i=document.querySelector(`.store-price[data-painting-id="${r}"]`);i&&(i.textContent=`${e.store.currency}${n.dataset.price}`);let a=document.querySelector(`.add-to-cart-btn[data-painting-id="${r}"]`);a&&(a.dataset.size=n.dataset.size,a.dataset.price=n.dataset.price)})})}),document.querySelectorAll(`.add-to-cart-btn`).forEach(t=>{t.addEventListener(`click`,()=>{if(i)return;let n=t.dataset.paintingId,r=t.dataset.size,a=parseFloat(t.dataset.price),o=e.paintings.find(e=>e.id===n);o&&k(o,r,a)})}),document.querySelectorAll(`.filter-btn`).forEach(e=>{e.addEventListener(`click`,()=>{r=e.dataset.filter,m(n)})});let a=document.getElementById(`contactForm`);a&&a.addEventListener(`submit`,e=>{e.preventDefault();let t=document.getElementById(`contactFormStatus`);t.textContent=`Thank you! Your message has been sent. I will respond soon.`,t.style.color=`#8B7355`,a.reset()})}function w(){document.querySelectorAll(`[data-edit-path]`).forEach(e=>{e.addEventListener(`click`,t=>{if(!i)return;t.stopPropagation(),e.contentEditable=!0,e.classList.add(`is-editing`),e.focus();let n=document.createRange();n.selectNodeContents(e);let r=window.getSelection();r.removeAllRanges(),r.addRange(n)})}),document.querySelectorAll(`[data-edit-path]`).forEach(e=>{e.addEventListener(`keydown`,t=>{if(t.key===`Escape`){e.blur();return}t.key===`Enter`&&!t.shiftKey&&(t.preventDefault(),e.blur())}),e.addEventListener(`blur`,()=>{e.contentEditable=!1,e.classList.remove(`is-editing`),u()})}),document.querySelectorAll(`[data-edit-img]`).forEach(e=>{e.style.cursor=`pointer`,e.addEventListener(`click`,t=>{if(!i)return;t.stopPropagation(),e.dataset.editImg;let n=document.createElement(`input`);n.type=`file`,n.accept=`image/*`,n.addEventListener(`change`,t=>{let n=t.target.files[0];if(!n)return;let r=new FileReader;r.onload=t=>{e.src=t.target.result,u()},r.readAsDataURL(n)}),n.click()})}),document.querySelectorAll(`[data-edit-price]`).forEach(t=>{t.addEventListener(`change`,()=>{let n=t.dataset.editPrice,r=t.dataset.editSize,i=parseFloat(t.value)||0,a=e.paintings.find(e=>e.id===n);a&&(a.prints[r]=i,u())})})}var T=null;function E(t){let n=e.paintings.find(e=>e.id===t);if(!n)return;D();let r=document.createElement(`div`);r.className=`lightbox-overlay`,r.innerHTML=`
    <div class="lightbox-content">
      <button class="lightbox-close" id="lightboxClose">&times;</button>
      <div class="lightbox-image">
        <img src="${R(n.image)}" alt="${R(n.title)}" onerror="this.outerHTML='<div style=\\'height:100%;display:flex;align-items:center;justify-content:center;color:#8B7355;padding:2rem;text-align:center;font-size:0.85rem;\\'>${R(n.title)}<br><span style=\\'opacity:0.5;font-size:0.7rem;\\'>Image coming soon</span></div>'">
      </div>
      <div class="lightbox-details">
        <h2>${R(n.title)}</h2>
        <div class="detail-meta">
          <p>${R(n.medium)}</p>
          <p>${R(n.dimensions)}</p>
          <p>${n.year}</p>
          ${n.collection?`<p>Collection: ${R(n.collection)}</p>`:``}
        </div>
        ${n.description?`<p class="detail-description">${R(n.description)}</p>`:``}
        <a href="/store" data-nav="/store" class="btn" style="font-size:0.8rem;">Purchase Print</a>
      </div>
    </div>
  `,document.body.appendChild(r),requestAnimationFrame(()=>{r.classList.add(`active`)}),r.querySelector(`#lightboxClose`).addEventListener(`click`,D),r.addEventListener(`click`,e=>{e.target===r&&D()}),document.addEventListener(`keydown`,O),T=r}function D(){T&&(T.classList.remove(`active`),setTimeout(()=>{T&&T.parentNode&&T.parentNode.removeChild(T),T=null},400)),document.removeEventListener(`keydown`,O)}function O(e){e.key===`Escape`&&D()}function k(e,n,r){let i=t.find(t=>t.paintingId===e.id&&t.size===n);i?i.qty=(i.qty||1)+1:t.push({paintingId:e.id,title:e.title,image:e.image,size:n,price:r,qty:1}),j(),N(),P()}function A(e){t.splice(e,1),j(),N()}function j(){localStorage.setItem(`cg_cart`,JSON.stringify(t))}function M(){return t.reduce((e,t)=>e+t.price*(t.qty||1),0)}function N(){let e=t.reduce((e,t)=>e+(t.qty||1),0),n=document.querySelector(`.cart-count`);n||(n=document.createElement(`div`),n.className=`cart-count`,document.body.appendChild(n)),e>0?(n.textContent=e,n.classList.add(`visible`)):n.classList.remove(`visible`)}function P(){let e=document.getElementById(`cartDrawer`),t=document.getElementById(`cartOverlay`);e&&(I(),e.classList.add(`open`),t.classList.add(`active`),document.body.style.overflow=`hidden`)}function F(){let e=document.getElementById(`cartDrawer`),t=document.getElementById(`cartOverlay`);e&&(e.classList.remove(`open`),t.classList.remove(`active`),document.body.style.overflow=``)}function I(){let e=document.getElementById(`cartItems`),n=document.getElementById(`cartTotal`),r=document.getElementById(`cartCheckout`);if(e){if(t.length===0){e.innerHTML=`<p class="cart-empty">Your cart is empty.</p>`,n&&(n.textContent=`€0.00`),r&&(r.disabled=!0);return}e.innerHTML=t.map((e,t)=>`
    <div class="cart-item">
      <img class="cart-item-image" src="${R(e.image)}" alt="${R(e.title)}" onerror="this.style.background='#E8E4DE'">
      <div class="cart-item-info">
        <div class="cart-item-title">${R(e.title)}</div>
        <div class="cart-item-size">${e.size} Print</div>
        <div class="cart-item-price">€${e.price} ${e.qty>1?`× ${e.qty}`:``}</div>
        <button class="cart-item-remove" data-index="${t}">Remove</button>
      </div>
    </div>
  `).join(``),n&&(n.textContent=`€${M().toFixed(2)}`),r&&(r.disabled=!1),e.querySelectorAll(`.cart-item-remove`).forEach(e=>{e.addEventListener(`click`,()=>A(parseInt(e.dataset.index)))})}}async function L(){await a(),document.addEventListener(`click`,e=>{let t=e.target.closest(`[data-nav]`);t&&(e.preventDefault(),s(t.dataset.nav))}),window.addEventListener(`popstate`,()=>{m(c())});let n=document.querySelector(`.menu-toggle`),r=document.querySelector(`.main-nav`);n&&(n.addEventListener(`click`,()=>r.classList.toggle(`open`)),r.querySelectorAll(`a`).forEach(e=>e.addEventListener(`click`,()=>r.classList.remove(`open`)))),document.querySelectorAll(`.cart-toggle`).forEach(e=>{e.addEventListener(`click`,e=>{e.preventDefault(),document.getElementById(`cartDrawer`).classList.contains(`open`)?F():P()})});let i=document.getElementById(`cartClose`),o=document.getElementById(`cartOverlay`);i&&i.addEventListener(`click`,F),o&&o.addEventListener(`click`,F);let u=document.getElementById(`cartCheckout`);if(u&&u.addEventListener(`click`,()=>{if(t.length===0)return;let n=M().toFixed(2),r=encodeURIComponent(`Hi Craig,

I'd like to order the following prints:

`+t.map(e=>`- ${e.title} (${e.size}) × ${e.qty||1} — €${(e.price*(e.qty||1)).toFixed(2)}`).join(`
`)+`\n\nTotal: €${n}\n\nPlease let me know the next steps for payment and shipping.\n\nBest regards`);window.location.href=`mailto:${e.contact.email}?subject=Print%20Order%20Inquiry&body=${r}`,F()}),r){let e=document.createElement(`a`);e.href=`#`,e.className=`cart-toggle`,e.style.cssText=`display:flex;align-items:center;gap:4px;`,e.innerHTML=`Cart <span style="font-size:0.75rem;background:#8B7355;color:white;padding:1px 6px;border-radius:8px;" id="cartCountBadge">${t.reduce((e,t)=>e+(t.qty||1),0)}</span>`,r.appendChild(e),e.addEventListener(`click`,e=>{e.preventDefault(),P()})}let d=document.querySelector(`.site-header .container`);if(d){let e=document.createElement(`button`);e.id=`editToggleBtn`,e.className=`edit-toggle-btn`,e.textContent=`✎ Edit`,e.addEventListener(`click`,l),d.appendChild(e)}let p=document.createElement(`div`);p.id=`editSaveBar`,p.className=`edit-save-bar`,p.innerHTML=`
    <span>Editing content — click any text to edit, click images to replace</span>
    <div>
      <span id="editSaveStatus" style="font-size:0.8rem;margin-right:0.5rem;"></span>
      <button id="editSaveBtn" class="btn btn-primary" style="padding:0.4rem 1rem;font-size:0.8rem;">💾 Download Updated content.json</button>
    </div>
  `,document.body.appendChild(p),document.getElementById(`editSaveBtn`).addEventListener(`click`,f),m(c()),N()}function R(e){if(!e)return``;let t=document.createElement(`div`);return t.textContent=e,t.innerHTML}document.addEventListener(`DOMContentLoaded`,L);