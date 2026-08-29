
/* DesiMall Seller Center — vertical workspace shell v0.34.0 */
(function(){
  const file=(location.pathname.split('/').pop()||'index.html').toLowerCase();
  const body=document.body;if(!body)return;

  const shared=new Set(['orders.html','returns.html','hisab.html','support.html','profile.html']);
  const marketplace=new Set(['index.html','products.html','inventory.html']);
  const food=new Set(['food-dashboard.html','food-menu.html']);

  const readSession=()=>{try{return JSON.parse(localStorage.getItem('desimall_seller_session')||'{}')}catch{return{}}};
  const readSpaces=()=>{try{return JSON.parse(localStorage.getItem('desimall_seller_workspaces')||'[]')}catch{return[]}};
  const current=()=>localStorage.getItem('desimall_seller_workspace')||readSession()?.primaryWorkspace?.Type||'marketplace';
  const landing=t=>t==='food'?'food-dashboard.html':'index.html';

  function allowed(type){
    return readSpaces().some(w=>w.Type===type&&w.Status==='active');
  }
  function ensurePage(){
    const w=current();
    if(shared.has(file))return;
    if(w==='food'&&!food.has(file))location.replace(landing('food'));
    if(w==='marketplace'&&!marketplace.has(file))location.replace(landing('marketplace'));
  }

  function nav(){
    const sidebar=document.querySelector('.panel-sidebar,.seller-sidebar');if(!sidebar)return;
    const session=readSession(), seller=session.seller||{}, spaces=readSpaces();
    const w=current();
    const active=h=>file===h?'active':'';
    const currentSpace=spaces.find(x=>x.Type===w)||{DisplayName:seller.ShopName||'Seller',Type:w};
    const multi=spaces.filter(x=>x.Status==='active').length>1;

    const workspaceSwitch=`
      <div class="seller-workspace-switch">
        <small>BUSINESS WORKSPACE</small>
        <button id="workspaceSwitchBtn" type="button">
          <i class="fa-solid ${w==='food'?'fa-utensils':'fa-store'}"></i>
          <span><b>${currentSpace.DisplayName||seller.ShopName||'Business'}</b><em>${w==='food'?'Food & Restaurant':'Marketplace Store'}</em></span>
          <i class="fa-solid fa-chevron-down"></i>
        </button>
        <div class="workspace-menu" id="workspaceMenu">
          ${spaces.filter(x=>x.Status==='active').map(x=>`
            <button data-space="${x.Type}">
              <i class="fa-solid ${x.Type==='food'?'fa-utensils':'fa-store'}"></i>
              <span><b>${x.DisplayName||x.Type}</b><em>${x.Type==='food'?'Food & Restaurant':'Marketplace Store'}</em></span>
              ${x.Type===w?'<i class="fa-solid fa-check"></i>':''}
            </button>`).join('')}
          <button data-add-space="1"><i class="fa-solid fa-plus"></i><span><b>Add another business</b><em>Create a separate workspace</em></span></button>
        </div>
      </div>`;

    sidebar.innerHTML=`
      <a class="seller-pro-brand" href="${landing(w)}"><span class="brand-mark"><i class="fa-solid fa-store"></i></span><span>Desi<em>Mall</em></span></a>
      <div class="seller-pro-workspace-label">Seller Center</div>
      <div class="seller-sidebar-profile">
        <div class="seller-avatar" data-seller-avatar><span>S</span></div>
        <div><strong data-seller-name>${seller.SellerName||'Seller'}</strong><small>${currentSpace.DisplayName||seller.ShopName||'Business'}</small></div>
      </div>
      ${workspaceSwitch}
      <nav class="panel-nav">
        <div class="seller-pro-nav-section">${w==='food'?'Food Business':'Marketplace Business'}</div>
        ${w==='food'?`
          <a class="${active('food-dashboard.html')}" href="food-dashboard.html"><i class="fa-solid fa-chart-line"></i><span>Food Dashboard</span></a>
          <a class="${active('orders.html')}" href="orders.html?workspace=food"><i class="fa-solid fa-bag-shopping"></i><span>Food Orders</span></a>
          <a class="${active('food-menu.html')}" href="food-menu.html"><i class="fa-solid fa-utensils"></i><span>Menu & Restaurant</span></a>
        `:`
          <a class="${active('index.html')}" href="index.html"><i class="fa-solid fa-table-cells-large"></i><span>Store Dashboard</span></a>
          <a class="${active('orders.html')}" href="orders.html?workspace=marketplace"><i class="fa-solid fa-bag-shopping"></i><span>Store Orders</span></a>
          <a class="${active('products.html')}" href="products.html"><i class="fa-solid fa-box"></i><span>Products</span></a>
          <a class="${active('inventory.html')}" href="inventory.html"><i class="fa-solid fa-warehouse"></i><span>Inventory</span></a>
        `}
        <div class="seller-pro-nav-section">Business</div>
        <a class="${active('returns.html')}" href="returns.html"><i class="fa-solid fa-arrow-rotate-left"></i><span>Returns</span></a>
        <a class="${active('hisab.html')}" href="hisab.html"><i class="fa-solid fa-wallet"></i><span>Shared Payouts & Account</span></a>
        <a class="${active('support.html')}" href="support.html"><i class="fa-solid fa-headset"></i><span>Account Support</span></a>
        <a class="${active('profile.html')}" href="profile.html"><i class="fa-solid fa-gear"></i><span>Account Settings</span></a>
      </nav>
      <div class="seller-pro-sidebar-bottom"><a class="seller-pro-store-link" href="${w==='food'?'https://desimall-customer.onrender.com/pages/food.html':'../index.html'}"><i class="fa-solid fa-arrow-up-right-from-square"></i> View customer ${w==='food'?'food store':'store'}</a></div>`;

    const switchBtn=document.getElementById('workspaceSwitchBtn');
    switchBtn?.addEventListener('click',()=>document.getElementById('workspaceMenu')?.classList.toggle('open'));
    document.querySelectorAll('[data-space]').forEach(b=>b.onclick=async()=>{
      const type=b.dataset.space;
      localStorage.setItem('desimall_seller_workspace',type);
      try{await DesiMallAPI.setPrimarySellerWorkspace(type,readSession().token)}catch(_){}
      location.href=landing(type);
    });
    document.querySelector('[data-add-space]')?.addEventListener('click',async()=>{
      const type=w==='food'?'marketplace':'food';
      if(!confirm(`Create a separate ${type==='food'?'Food & Restaurant':'Marketplace Store'} workspace for this seller account?`))return;
      try{
        const r=await DesiMallAPI.activateSellerWorkspace(type,'',readSession().token);
        if(!r?.success)throw new Error(r?.message||'Could not activate workspace');
        const wr=await DesiMallAPI.getSellerWorkspaces(readSession().token);
        localStorage.setItem('desimall_seller_workspaces',JSON.stringify(wr.workspaces||[]));
        localStorage.setItem('desimall_seller_workspace',type);
        location.href=landing(type);
      }catch(e){alert(e.message||'Could not add business workspace');}
    });
  }

  body.classList.add('seller-pro-ui');
  window.SellerProWorkspace={refresh(){nav();ensurePage();}};
  nav();ensurePage();

  const main=document.querySelector('.panel-main,.seller-main');
  if(main&&!main.querySelector('.seller-pro-contextbar')){
    const bar=document.createElement('div');bar.className='seller-pro-contextbar';
    bar.innerHTML=`<div class="crumb"><span>Seller Center</span><i class="fa-solid fa-chevron-right"></i><b>${current()==='food'?'Food Business':'Marketplace Store'}</b></div><div class="status">Workspace active</div>`;
    main.prepend(bar);
  }
})();
