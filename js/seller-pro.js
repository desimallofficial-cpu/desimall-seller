
/* DesiMall Seller Center — Marketplace / Food / Services workspaces v0.35.0 */
(function(){
  const file=(location.pathname.split('/').pop()||'index.html').toLowerCase();
  const body=document.body;if(!body)return;

  const shared=new Set(['returns.html','hisab.html','support.html','profile.html']);
  const marketplace=new Set(['index.html','products.html','inventory.html','orders.html']);
  const food=new Set(['food-dashboard.html','food-menu.html','orders.html']);
  const services=new Set(['services-dashboard.html','service-catalog.html','service-bookings.html']);

  const readSession=()=>{try{return JSON.parse(localStorage.getItem('desimall_seller_session')||'{}')}catch{return{}}};
  const readSpaces=()=>{try{return JSON.parse(localStorage.getItem('desimall_seller_workspaces')||'[]')}catch{return[]}};
  const current=()=>localStorage.getItem('desimall_seller_workspace')||readSession()?.primaryWorkspace?.Type||'marketplace';
  const landing=t=>t==='food'?'food-dashboard.html':t==='services'?'services-dashboard.html':'index.html';
  const title=t=>t==='food'?'Food & Restaurant':t==='services'?'Services Business':'Marketplace Store';
  const icon=t=>t==='food'?'fa-utensils':t==='services'?'fa-screwdriver-wrench':'fa-store';

  function ensurePage(){
    const w=current();
    if(shared.has(file))return;
    if(w==='food'&&!food.has(file))location.replace(landing(w));
    if(w==='services'&&!services.has(file))location.replace(landing(w));
    if(w==='marketplace'&&!marketplace.has(file))location.replace(landing(w));
  }

  function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

  function openAddBusiness(){
    let modal=document.getElementById('workspaceAddModal');
    if(!modal){
      modal=document.createElement('div');
      modal.id='workspaceAddModal';
      modal.className='workspace-add-modal';
      modal.innerHTML=`<div class="workspace-add-box">
        <button class="workspace-modal-close" data-close><i class="fa-solid fa-xmark"></i></button>
        <span class="workspace-add-icon"><i class="fa-solid fa-layer-group"></i></span>
        <h2>Add another business</h2>
        <p>Each business gets a separate dashboard, catalog and operational flow. Nothing gets mixed.</p>
        <div class="workspace-add-options">
          <button data-create="marketplace"><i class="fa-solid fa-store"></i><span><b>Marketplace Store</b><em>Products, inventory and store orders</em></span></button>
          <button data-create="food"><i class="fa-solid fa-utensils"></i><span><b>Food & Restaurant</b><em>Restaurant menu and food orders</em></span></button>
          <button data-create="services"><i class="fa-solid fa-screwdriver-wrench"></i><span><b>Services Business</b><em>Bookings, slots and service packages</em></span></button>
        </div>
      </div>`;
      document.body.appendChild(modal);
    }
    modal.classList.add('open');
    modal.querySelector('[data-close]').onclick=()=>modal.classList.remove('open');
    modal.querySelectorAll('[data-create]').forEach(btn=>btn.onclick=async()=>{
      const type=btn.dataset.create;
      const spaces=readSpaces();
      if(spaces.some(x=>x.Type===type&&x.Status==='active')){
        localStorage.setItem('desimall_seller_workspace',type);
        location.href=landing(type);return;
      }
      btn.disabled=true;
      try{
        const r=await DesiMallAPI.activateSellerWorkspace(type,'',readSession().token);
        if(!r?.success)throw new Error(r?.message||'Could not activate workspace');
        const wr=await DesiMallAPI.getSellerWorkspaces(readSession().token);
        localStorage.setItem('desimall_seller_workspaces',JSON.stringify(wr.workspaces||[]));
        localStorage.setItem('desimall_seller_workspace',type);
        location.href=landing(type);
      }catch(e){alert(e.message||'Could not add business workspace');btn.disabled=false;}
    });
  }

  function nav(){
    const sidebar=document.querySelector('.panel-sidebar,.seller-sidebar');if(!sidebar)return;
    const session=readSession(), seller=session.seller||{}, spaces=readSpaces();
    const w=current();
    const active=h=>file===h?'active':'';
    const currentSpace=spaces.find(x=>x.Type===w)||{DisplayName:seller.ShopName||'Business',Type:w};

    sidebar.innerHTML=`
      <a class="seller-pro-brand" href="${landing(w)}"><span class="brand-mark"><i class="fa-solid fa-store"></i></span><span>Desi<em>Mall</em></span></a>
      <div class="seller-pro-workspace-label">Seller / Provider Center</div>
      <div class="seller-sidebar-profile">
        <div class="seller-avatar" data-seller-avatar><span>S</span></div>
        <div><strong data-seller-name>${escapeHtml(seller.SellerName||'Partner')}</strong><small>${escapeHtml(currentSpace.DisplayName||seller.ShopName||'Business')}</small></div>
      </div>
      <div class="seller-workspace-switch">
        <small>BUSINESS WORKSPACE</small>
        <button id="workspaceSwitchBtn" type="button">
          <i class="fa-solid ${icon(w)}"></i>
          <span><b>${escapeHtml(currentSpace.DisplayName||seller.ShopName||'Business')}</b><em>${title(w)}</em></span>
          <i class="fa-solid fa-chevron-down"></i>
        </button>
        <div class="workspace-menu" id="workspaceMenu">
          ${spaces.filter(x=>x.Status==='active').map(x=>`
            <button data-space="${x.Type}">
              <i class="fa-solid ${icon(x.Type)}"></i>
              <span><b>${escapeHtml(x.DisplayName||title(x.Type))}</b><em>${title(x.Type)}</em></span>
              ${x.Type===w?'<i class="fa-solid fa-check"></i>':''}
            </button>`).join('')}
          <button data-add-space="1"><i class="fa-solid fa-plus"></i><span><b>Add another business</b><em>Separate workspace</em></span></button>
        </div>
      </div>
      <nav class="panel-nav">
        <div class="seller-pro-nav-section">${title(w)}</div>
        ${w==='services'?`
          <a class="${active('services-dashboard.html')}" href="services-dashboard.html"><i class="fa-solid fa-chart-line"></i><span>Services Dashboard</span></a>
          <a class="${active('service-bookings.html')}" href="service-bookings.html"><i class="fa-solid fa-calendar-check"></i><span>Bookings</span></a>
          <a class="${active('service-catalog.html')}" href="service-catalog.html"><i class="fa-solid fa-list-check"></i><span>Services & Pricing</span></a>
        `:w==='food'?`
          <a class="${active('food-dashboard.html')}" href="food-dashboard.html"><i class="fa-solid fa-chart-line"></i><span>Food Dashboard</span></a>
          <a class="${active('orders.html')}" href="orders.html?workspace=food"><i class="fa-solid fa-bag-shopping"></i><span>Food Orders</span></a>
          <a class="${active('food-menu.html')}" href="food-menu.html"><i class="fa-solid fa-utensils"></i><span>Menu & Restaurant</span></a>
        `:`
          <a class="${active('index.html')}" href="index.html"><i class="fa-solid fa-table-cells-large"></i><span>Store Dashboard</span></a>
          <a class="${active('orders.html')}" href="orders.html?workspace=marketplace"><i class="fa-solid fa-bag-shopping"></i><span>Store Orders</span></a>
          <a class="${active('products.html')}" href="products.html"><i class="fa-solid fa-box"></i><span>Products</span></a>
          <a class="${active('inventory.html')}" href="inventory.html"><i class="fa-solid fa-warehouse"></i><span>Inventory</span></a>
        `}
        <div class="seller-pro-nav-section">Shared Account</div>
        ${w!=='services'?`<a class="${active('returns.html')}" href="returns.html"><i class="fa-solid fa-arrow-rotate-left"></i><span>${w==='food'?'Food Returns':'Store Returns'}</span></a>`:''}
        <a class="${active('hisab.html')}" href="hisab.html"><i class="fa-solid fa-wallet"></i><span>Shared Payouts & Account</span></a>
        <a class="${active('support.html')}" href="support.html"><i class="fa-solid fa-headset"></i><span>Account Support</span></a>
        <a class="${active('profile.html')}" href="profile.html"><i class="fa-solid fa-gear"></i><span>Account Settings</span></a>
      </nav>
      <div class="seller-pro-sidebar-bottom"><a class="seller-pro-store-link" href="${
        w==='food'?'https://desimall-customer.onrender.com/pages/food.html':
        w==='services'?'https://desimall-customer.onrender.com/pages/services.html':
        '../index.html'
      }"><i class="fa-solid fa-arrow-up-right-from-square"></i> View customer ${w==='food'?'food store':w==='services'?'services':'store'}</a></div>`;

    document.getElementById('workspaceSwitchBtn')?.addEventListener('click',()=>document.getElementById('workspaceMenu')?.classList.toggle('open'));
    document.querySelectorAll('[data-space]').forEach(b=>b.onclick=async()=>{
      const type=b.dataset.space;
      localStorage.setItem('desimall_seller_workspace',type);
      try{await DesiMallAPI.setPrimarySellerWorkspace(type,readSession().token)}catch(_){}
      location.href=landing(type);
    });
    document.querySelector('[data-add-space]')?.addEventListener('click',openAddBusiness);
  }

  body.classList.add('seller-pro-ui');
  window.SellerProWorkspace={refresh(){nav();ensurePage();},openAddBusiness};
  nav();ensurePage();

  const main=document.querySelector('.panel-main,.seller-main');
  if(main&&!main.querySelector('.seller-pro-contextbar')){
    const bar=document.createElement('div');bar.className='seller-pro-contextbar';
    bar.innerHTML=`<div class="crumb"><span>Partner Center</span><i class="fa-solid fa-chevron-right"></i><b>${title(current())}</b></div><div class="status">Workspace active</div>`;
    main.prepend(bar);
  }
})();
