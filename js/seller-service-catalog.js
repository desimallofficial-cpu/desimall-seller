
const SellerServiceCatalog={
  session:{},verticals:[],packages:[],
  esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));},
  money(v){return `₹${Number(v||0).toLocaleString('en-IN',{maximumFractionDigits:2})}`;},
  async init(){
    try{this.session=JSON.parse(localStorage.getItem('desimall_seller_session')||'{}')}catch{}
    if(!this.session.token)return location.replace('login.html');
    openPackage.onclick=()=>this.open();
    closePackage.onclick=()=>packageModal.classList.remove('open');
    packageForm.onsubmit=e=>{e.preventDefault();this.save()};
    packageSearch.oninput=()=>this.render();packageVertical.onchange=()=>this.render();
    await this.load();
  },
  async load(){
    const [v,p,profile]=await Promise.all([DesiMallAPI.getServiceVerticals(),DesiMallAPI.getSellerServicePackages(this.session.token),DesiMallAPI.getSellerServicesProfile(this.session.token)]);
    const selected=new Set((profile.verticals||[]).map(x=>String(x.VerticalID)));
    this.verticals=(v.verticals||[]).filter(x=>selected.has(String(x.VerticalID)));
    this.packages=p.packages||[];
    const opts=this.verticals.map(x=>`<option value="${this.esc(x.VerticalID)}">${this.esc(x.Name)}</option>`).join('');
    pkgVertical.innerHTML=opts||'<option value="">Save Services Profile first</option>';
    packageVertical.innerHTML='<option value="">All Verticals</option>'+opts;
    this.render();
  },
  render(){
    const q=packageSearch.value.trim().toLowerCase(),v=packageVertical.value;
    const rows=this.packages.filter(x=>(!q||`${x.Name} ${x.Description||''} ${x.Vertical?.Name||''}`.toLowerCase().includes(q))&&(!v||String(x.VerticalID)===v));
    packageList.innerHTML=rows.length?rows.map(x=>`<article class="svc-package"><img src="${this.esc(x.ImageURL||'../assets/products/noimage.jpg')}" onerror="this.src='../assets/products/noimage.jpg'"><div><h3>${this.esc(x.Name)}</h3><p>${this.esc(x.Description||'')}</p><div class="svc-chips"><span class="svc-chip">${this.esc(x.Vertical?.Name||'Service')}</span><span class="svc-chip">${this.esc(x.PricingType.replaceAll('_',' '))} ${this.money(x.BasePrice)}</span><span class="svc-chip">${x.DurationMinutes} min</span><span class="svc-chip">${this.esc(x.ServiceMode)}</span>${x.VisitCharge?`<span class="svc-chip">Visit ${this.money(x.VisitCharge)}</span>`:''}</div></div><div class="svc-package-actions"><button onclick="SellerServiceCatalog.edit('${this.esc(x.PackageID)}')"><i class="fa-solid fa-pen"></i> Edit</button><button onclick="SellerServiceCatalog.toggle('${this.esc(x.PackageID)}',${!x.IsActive})">${x.IsActive?'Disable':'Enable'}</button></div></article>`).join(''):'<div style="grid-column:1/-1;padding:45px;text-align:center;color:#64748b"><i class="fa-solid fa-list-check" style="font-size:36px"></i><h3>No services yet</h3><p>Create your first customer-bookable service package.</p></div>';
  },
  open(x=null){
    packageForm.reset();pkgId.value=x?.PackageID||'';pkgName.value=x?.Name||'';pkgDesc.value=x?.Description||'';pkgPricing.value=x?.PricingType||'fixed';pkgPrice.value=Number(x?.BasePrice||0);pkgVisit.value=Number(x?.VisitCharge||0);pkgDuration.value=Number(x?.DurationMinutes||60);pkgWarranty.value=Number(x?.WarrantyDays||0);pkgMode.value=x?.ServiceMode||'home';pkgImage.value=x?.ImageURL||'';pkgEmergency.checked=Boolean(x?.EmergencyEligible);pkgMaterials.checked=Boolean(x?.MaterialsIncluded);pkgActive.checked=x?.IsActive!==false;if(x?.VerticalID)pkgVertical.value=x.VerticalID;packageTitle.textContent=x?'Edit Service':'Add Service';packageModal.classList.add('open');
  },
  edit(id){this.open(this.packages.find(x=>String(x.PackageID)===String(id)))},
  async save(){
    if(!pkgVertical.value)return alert('Choose a service vertical.');
    const data={VerticalID:pkgVertical.value,Name:pkgName.value.trim(),Description:pkgDesc.value.trim(),PricingType:pkgPricing.value,BasePrice:Number(pkgPrice.value||0),VisitCharge:Number(pkgVisit.value||0),DurationMinutes:Number(pkgDuration.value||60),WarrantyDays:Number(pkgWarranty.value||0),ServiceMode:pkgMode.value,ImageURL:pkgImage.value.trim(),EmergencyEligible:pkgEmergency.checked,MaterialsIncluded:pkgMaterials.checked,IsActive:pkgActive.checked};
    const r=pkgId.value?await DesiMallAPI.updateSellerServicePackage(pkgId.value,data,this.session.token):await DesiMallAPI.addSellerServicePackage(data,this.session.token);
    if(!r.success)return alert(r.message||'Could not save service');
    packageModal.classList.remove('open');await this.load();
  },
  async toggle(id,value){const r=await DesiMallAPI.updateSellerServicePackage(id,{IsActive:value},this.session.token);if(!r.success)return alert(r.message||'Update failed');await this.load()}
};
document.addEventListener('DOMContentLoaded',()=>SellerServiceCatalog.init());
