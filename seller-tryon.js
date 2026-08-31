
const SellerTryOn={
  session:null,data:null,
  esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));},
  toast(m){panelToast.textContent=m;panelToast.classList.add('show');clearTimeout(this.tt);this.tt=setTimeout(()=>panelToast.classList.remove('show'),2600)},
  async init(){
    try{this.session=JSON.parse(localStorage.getItem('desimall_seller_session')||'null')}catch{}
    if(!this.session?.token)return location.replace('login.html');
    const w=localStorage.getItem('desimall_seller_workspace')||'marketplace';
    if(w!=='marketplace'){localStorage.setItem('desimall_seller_workspace','marketplace');}
    tryOnProfileForm.onsubmit=e=>{e.preventDefault();this.saveProfile()};
    toSearch.oninput=()=>this.renderProducts();toFilter.onchange=()=>this.renderProducts();
    await this.load();
  },
  async load(){
    try{
      const r=await DesiMallAPI.getSellerTryOn(this.session.token);
      if(!r.success)throw new Error(r.message||'Could not load Try-On');
      this.data=r;this.fillProfile(r.profile);this.renderProducts();
    }catch(e){this.toast(e.message||'Could not load Try-On settings')}
  },
  fillProfile(p){
    p=p||{};
    toEnabled.checked=Boolean(p.IsEnabled);
    toPincodes.value=(p.ServicePincodes||[]).join(', ');
    toVisitFee.value=Number(p.VisitFee??49);toMaxItems.value=String(p.MaxItems||4);
    toStart.value=p.StartTime||'10:00';toEnd.value=p.EndTime||'19:00';
    toAdvance.value=String(p.MaxAdvanceDays||7);toInterval.value=String(p.SlotIntervalMinutes||60);toTrial.value=String(p.TrialMinutes||15);
  },
  async saveProfile(){
    const pins=toPincodes.value.split(/[,\s]+/).map(x=>x.replace(/\D/g,'')).filter(x=>x.length===6);
    if(toEnabled.checked&&!pins.length)return this.toast('Add at least one 6-digit service pincode.');
    try{
      const r=await DesiMallAPI.saveSellerTryOnProfile({
        IsEnabled:toEnabled.checked,ServicePincodes:pins,VisitFee:Number(toVisitFee.value||0),
        MaxItems:Number(toMaxItems.value||4),StartTime:toStart.value,EndTime:toEnd.value,
        MaxAdvanceDays:Number(toAdvance.value||7),SlotIntervalMinutes:Number(toInterval.value||60),TrialMinutes:Number(toTrial.value||15)
      },this.session.token);
      if(!r.success)throw new Error(r.message||'Save failed');
      this.fillProfile(r.profile);this.toast('Try-On settings saved.');
    }catch(e){this.toast(e.message||'Could not save Try-On settings')}
  },
  rows(){
    const q=toSearch.value.trim().toLowerCase(),f=toFilter.value;
    return (this.data?.products||[]).filter(p=>{
      if(q&&!`${p.ProductName} ${p.Category||''} ${p.Size||''}`.toLowerCase().includes(q))return false;
      if(f==='live'&&!p.TryOnEligible)return false;
      if(f==='off'&&p.TryOnEligible)return false;
      return true;
    });
  },
  renderProducts(){
    const all=this.data?.products||[];
    toTotal.textContent=all.length;toLive.textContent=all.filter(x=>x.TryOnEligible).length;
    toVisible.textContent=(this.data?.profile?.IsEnabled)?all.filter(x=>x.TryOnEligible&&String(x.Status).toLowerCase()==='active').length:0;
    const rows=this.rows();
    toProducts.innerHTML=rows.length?rows.map(p=>`<article class="to-product"><img src="${this.esc(p.ImageURL||'../assets/products/noimage.jpg')}" onerror="this.src='../assets/products/noimage.jpg'"><div><h3>${this.esc(p.ProductName)}</h3><p>₹${Number(p.FinalPrice||0).toLocaleString('en-IN')} · ${this.esc(p.Category||'Marketplace')} ${p.Size?`· Size ${this.esc(p.Size)}`:''}</p><p>${String(p.Status).toLowerCase()==='active'?'Active listing':'Listing not active'}</p></div><button class="to-toggle ${p.TryOnEligible?'on':''}" onclick="SellerTryOn.toggle('${this.esc(p.ProductID)}',${!p.TryOnEligible})">${p.TryOnEligible?'✓ Try-On Live':'Enable Try-On'}</button></article>`).join(''):'<div style="padding:35px;text-align:center;color:#64748b">No matching products.</div>';
  },
  async toggle(id,value){
    try{
      const r=await DesiMallAPI.setSellerTryOnProduct(id,value,this.session.token);
      if(!r.success)throw new Error(r.message||'Update failed');
      const p=this.data.products.find(x=>String(x.ProductID)===String(id));if(p)p.TryOnEligible=value;
      this.renderProducts();this.toast(value?'Product enabled for Try-On':'Try-On disabled for product');
    }catch(e){this.toast(e.message||'Could not update product')}
  }
};
document.addEventListener('DOMContentLoaded',()=>SellerTryOn.init());
