import"./modulepreload-polyfill-Dezn_h7o.js";var e=null;async function t(){return e=await(await fetch(`/content.json?_=`+Date.now())).json(),JSON.parse(JSON.stringify(e)),e}async function n(){let t=document.getElementById(`saveStatus`);t&&(t.textContent=`Saving...`);try{i(),(await fetch(`/content.json`,{method:`PUT`,headers:{"Content-Type":`application/json`},body:JSON.stringify(e,null,2)})).ok?(JSON.parse(JSON.stringify(e)),t&&(t.textContent=`✓ All changes saved!`,t.style.color=`#4CAF50`),setTimeout(()=>{t&&(t.textContent=``)},3e3)):(r(e),t&&(t.textContent=`⚠ Could not write to server. File downloaded instead.`,t.style.color=`#FF9800`))}catch{r(e),t&&(t.textContent=`⚠ Saved as download (server write unavailable).`,t.style.color=`#FF9800`)}}function r(e){let t=new Blob([JSON.stringify(e,null,2)],{type:`application/json`}),n=URL.createObjectURL(t),r=document.createElement(`a`);r.href=n,r.download=`content.json`,r.click(),URL.revokeObjectURL(n)}function i(){document.querySelectorAll(`[data-path]`).forEach(t=>{let n=t.dataset.path,r=t.value;a(e,n,r)}),document.querySelectorAll(`.painting-edit-card`).forEach(t=>{let n=parseInt(t.dataset.index);isNaN(n)||!e.paintings[n]||(t.querySelectorAll(`[data-subpath]`).forEach(t=>{let r=t.dataset.subpath,i=t.value;a(e.paintings[n],r,i)}),t.querySelectorAll(`[data-print-size]`).forEach(t=>{let r=t.dataset.printSize,i=parseFloat(t.value)||0;e.paintings[n].prints[r]=i}))}),document.querySelectorAll(`[data-size-id]`).forEach(t=>{let n=t.dataset.sizeId,r=e.store.sizes.find(e=>e.id===n);r&&(r.label=t.value)}),document.querySelectorAll(`[data-color-key]`).forEach(t=>{let n=t.dataset.colorKey;e.design.colors[n]=t.value})}function a(e,t,n){let r=t.split(`.`),i=e;for(let e=0;e<r.length-1;e++)i[r[e]]||(i[r[e]]={}),i=i[r[e]];i[r[r.length-1]]=n}function o(){document.querySelectorAll(`[data-path]`).forEach(t=>{let n=t.dataset.path,r=s(e,n);r!==void 0&&(t.value=r)}),c(),l(),u()}function s(e,t){let n=t.split(`.`),r=e;for(let e=0;e<n.length;e++){if(r==null)return;r=r[n[e]]}return r}function c(){let t=document.getElementById(`paintings-editor`);t&&(t.innerHTML=e.paintings.map((e,t)=>`
    <div class="painting-edit-card" data-index="${t}">
      <h3>${d(e.title)||`Painting ${t+1}`}</h3>
      <div class="painting-edit-grid">
        <div class="form-group">
          <label>Title</label>
          <input type="text" data-subpath="title" value="${d(e.title)}" />
        </div>
        <div class="form-group">
          <label>Image Path</label>
          <input type="text" data-subpath="image" value="${d(e.image)}" placeholder="/images/painting-1.jpg" />
        </div>
        <div class="form-group">
          <label>Medium</label>
          <input type="text" data-subpath="medium" value="${d(e.medium)}" />
        </div>
        <div class="form-group">
          <label>Dimensions</label>
          <input type="text" data-subpath="dimensions" value="${d(e.dimensions)}" />
        </div>
        <div class="form-group">
          <label>Year</label>
          <input type="number" data-subpath="year" value="${e.year}" />
        </div>
        <div class="form-group">
          <label>Collection</label>
          <input type="text" data-subpath="collection" value="${e.collection||``}" />
        </div>
        <div class="form-group full-width">
          <label>Description</label>
          <textarea data-subpath="description" rows="2">${d(e.description||``)}</textarea>
        </div>
        <div class="form-group full-width">
          <label>Print Prices (€)</label>
          <div style="display:flex;gap:1rem;">
            ${Object.entries(e.prints||{}).map(([e,t])=>`
              <div>
                <label style="font-size:0.75rem;opacity:0.7;">${e}</label>
                <input type="number" step="0.01" data-print-size="${e}" value="${t}" style="width:80px;" />
              </div>
            `).join(``)}
          </div>
        </div>
      </div>
    </div>
  `).join(``))}function l(){let t=document.getElementById(`sizeEditor`);t&&(t.innerHTML=e.store.sizes.map(e=>`
    <div class="size-edit-row">
      <label>${e.id}</label>
      <input type="text" data-size-id="${e.id}" value="${d(e.label)}" />
    </div>
  `).join(``))}function u(){let t=document.getElementById(`colorGrid`);if(!t)return;let n={background:`Background`,text:`Text Color`,accent:`Accent`,hover:`Hover / Link`,light:`Light Border`,white:`White`};t.innerHTML=Object.entries(e.design.colors).map(([e,t])=>`
    <div class="color-item">
      <input type="color" data-color-key="${e}" value="${t}" />
      <div>
        <div class="color-label">${n[e]||e}</div>
        <div class="color-value">${t}</div>
      </div>
    </div>
  `).join(``),t.querySelectorAll(`input[type="color"]`).forEach(e=>{e.addEventListener(`input`,()=>{let t=e.closest(`.color-item`).querySelector(`.color-value`);t&&(t.textContent=e.value)})})}function d(e){if(!e)return``;let t=document.createElement(`div`);return t.textContent=e,t.innerHTML}async function f(){await t(),o(),document.querySelectorAll(`.admin-tabs button`).forEach(e=>{e.addEventListener(`click`,()=>{document.querySelectorAll(`.admin-tabs button`).forEach(e=>e.classList.remove(`active`)),document.querySelectorAll(`.admin-tab-content`).forEach(e=>e.classList.remove(`active`)),e.classList.add(`active`);let t=document.getElementById(`tab-`+e.dataset.tab);t&&t.classList.add(`active`)})}),document.querySelectorAll(`#saveAllBtn, #saveAllBtnBottom`).forEach(e=>{e.addEventListener(`click`,n)}),document.querySelectorAll(`input[type="color"][data-color-key]`).forEach(e=>{e.addEventListener(`change`,()=>{})}),document.addEventListener(`keydown`,e=>{(e.ctrlKey||e.metaKey)&&e.key===`s`&&(e.preventDefault(),n())})}document.addEventListener(`DOMContentLoaded`,f);