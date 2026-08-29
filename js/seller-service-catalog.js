const SellerServiceCatalog={
  session:{},verticals:[],packages:[],selectedImageFile:null,
  esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));},
  money(v){return `₹${Number(v||0).toLocaleString('en-IN',{maximumFractionDigits:2})}`;},
  toast(message){alert(message);},
  async init(){
    try{this.session=JSON.parse(localStorage.getItem('desimall_seller_session')||'{}')}catch{}
    if(!this.session.token)return location.replace('login.html');
    openPackage.onclick=()=>this.open();
    closePackage.onclick=()=>this.close();
    packageModal.addEventListener('click',e=>{if(e.target===packageModal)this.close()});
    packageForm.onsubmit=e=>{e.preventDefault();this.save()};
    packageSearch.oninput=()=>this.render();packageVertical.onchange=()=>this.render();
    pkgImageFile.onchange=e=>this.pickImage(e.target.files?.[0]||null);
    await this.load();
  },
  async load(){
    try{
      const [v,p,profile]=await Promise.all([
        DesiMallAPI.getServiceVerticals(),
        DesiMallAPI.getSellerServicePackages(this.session.token),
        DesiMallAPI.getSellerServicesProfile(this.session.token)
      ]);

      // Catalog should never become unusable just because the provider profile
      // has no selected vertical yet. Every active + admin-approved vertical is
      // offered here. Profile-selected verticals are only sorted to the top.
      const all=(v.verticals||[]).filter(x=>x.ApprovalStatus==='approved' || !x.ApprovalStatus);
      const selected=new Set((profile.verticals||[]).map(x=>String(x.VerticalID)));
      this.verticals=[...all].sort((a,b)=>{
        const sa=selected.has(String(a.VerticalID))?0:1;
        const sb=selected.has(String(b.VerticalID))?0:1;
        return sa-sb || String(a.Name||'').localeCompare(String(b.Name||''));
      });
      this.packages=p.packages||[];
      this.fillVerticalOptions();
      this.render();
    }catch(error){
      console.error(error);
      pkgVertical.innerHTML='<option value="">Could not load service verticals</option>';
      packageVertical.innerHTML='<option value="">All Verticals</option>';
      this.toast(error?.message||'Could not load service verticals.');
    }
  },
  fillVerticalOptions(){
    const opts=this.verticals.map(x=>`<option value="${this.esc(x.VerticalID)}">${this.esc(x.Name)}</option>`).join('');
    pkgVertical.innerHTML=opts||'<option value="">No approved service vertical available</option>';
    packageVertical.innerHTML='<option value="">All Verticals</option>'+opts;
  },
  render(){
    const q=packageSearch.value.trim().toLowerCase(),v=packageVertical.value;
    const rows=this.packages.filter(x=>(!q||`${x.Name} ${x.Description||''} ${x.Vertical?.Name||''}`.toLowerCase().includes(q))&&(!v||String(x.VerticalID)===v));
    packageList.innerHTML=rows.length?rows.map(x=>`<article class="svc-package"><img src="${this.esc(x.ImageURL||'../assets/products/noimage.jpg')}" onerror="this.src='../assets/products/noimage.jpg'"><div><h3>${this.esc(x.Name)}</h3><p>${this.esc(x.Description||'')}</p><div class="svc-chips"><span class="svc-chip">${this.esc(x.Vertical?.Name||'Service')}</span><span class="svc-chip">${this.esc(String(x.PricingType||'fixed').replaceAll('_',' '))} ${this.money(x.BasePrice)}</span><span class="svc-chip">${this.esc(x.ServiceMode)}</span>${x.VisitCharge?`<span class="svc-chip">Visit ${this.money(x.VisitCharge)}</span>`:''}${x.WarrantyDays?`<span class="svc-chip">${Number(x.WarrantyDays)} day warranty</span>`:''}</div></div><div class="svc-package-actions"><button onclick="SellerServiceCatalog.edit('${this.esc(x.PackageID)}')"><i class="fa-solid fa-pen"></i> Edit</button><button onclick="SellerServiceCatalog.toggle('${this.esc(x.PackageID)}',${!x.IsActive})">${x.IsActive?'Disable':'Enable'}</button></div></article>`).join(''):'<div style="grid-column:1/-1;padding:45px;text-align:center;color:#64748b"><i class="fa-solid fa-list-check" style="font-size:36px"></i><h3>No services yet</h3><p>Create your first customer-bookable service.</p></div>';
  },
  open(x=null){
    packageForm.reset();
    this.selectedImageFile=null;
    pkgId.value=x?.PackageID||'';
    pkgName.value=x?.Name||'';
    pkgDesc.value=x?.Description||'';
    pkgPricing.value=x?.PricingType||'fixed';
    pkgPrice.value=Number(x?.BasePrice||0);
    pkgVisit.value=Number(x?.VisitCharge||0);
    pkgWarranty.value=Number(x?.WarrantyDays||0);
    pkgMode.value=x?.ServiceMode||'home';
    pkgImageExisting.value=x?.ImageURL||'';
    pkgEmergency.checked=Boolean(x?.EmergencyEligible);
    pkgMaterials.checked=Boolean(x?.MaterialsIncluded);
    pkgActive.checked=x?.IsActive!==false;
    if(x?.VerticalID)pkgVertical.value=x.VerticalID;
    else if(this.verticals.length)pkgVertical.value=String(this.verticals[0].VerticalID||'');
    this.showImage(x?.ImageURL||'',x?.ImageURL?'Current uploaded image':'No image selected');
    packageTitle.textContent=x?'Edit Service':'Add Service';
    packageModal.classList.add('open');
  },
  close(){packageModal.classList.remove('open');this.selectedImageFile=null;pkgImageFile.value='';},
  edit(id){this.open(this.packages.find(x=>String(x.PackageID)===String(id)))},
  pickImage(file){
    if(!file){this.selectedImageFile=null;return;}
    try{
      DesiMallUpload.validate(file);
      this.selectedImageFile=file;
      DesiMallUpload.preview(file,pkgImagePreview);
      pkgImagePreview.classList.add('show');
      pkgImageState.textContent=`${file.name} · upload on Save`;
    }catch(error){
      this.selectedImageFile=null;pkgImageFile.value='';this.toast(error.message||'Invalid image.');
    }
  },
  showImage(url,state){
    if(url){pkgImagePreview.src=url;pkgImagePreview.hidden=false;pkgImagePreview.classList.add('show');}
    else{pkgImagePreview.removeAttribute('src');pkgImagePreview.hidden=true;pkgImagePreview.classList.remove('show');}
    pkgImageState.textContent=state||'No image selected';
  },
  async save(){
    if(!pkgVertical.value)return this.toast('Choose a service vertical.');
    if(!pkgName.value.trim())return this.toast('Service name is required.');
    if(!pkgDesc.value.trim())return this.toast('Description is required.');

    savePackage.disabled=true;
    const oldText=savePackage.textContent;
    try{
      let imageUrl=String(pkgImageExisting.value||'').trim();
      if(this.selectedImageFile){
        savePackage.textContent='Uploading image…';
        const uploaded=await DesiMallUpload.uploadProductImage(this.selectedImageFile);
        imageUrl=String(uploaded?.imageUrl||uploaded?.ImageURL||'').trim();
      }
      if(!imageUrl)throw new Error('Service Man / Professional image is required.');

      savePackage.textContent='Saving service…';
      const data={
        VerticalID:pkgVertical.value,
        Name:pkgName.value.trim(),
        Description:pkgDesc.value.trim(),
        PricingType:pkgPricing.value,
        BasePrice:Number(pkgPrice.value||0),
        VisitCharge:Number(pkgVisit.value||0),
        WarrantyDays:Number(pkgWarranty.value||0),
        ServiceMode:pkgMode.value,
        ImageURL:imageUrl,
        EmergencyEligible:pkgEmergency.checked,
        MaterialsIncluded:pkgMaterials.checked,
        IsActive:pkgActive.checked
      };
      // Duration is intentionally not seller-configurable anymore. Backend keeps
      // its internal default for scheduling/conflict protection.
      const r=pkgId.value
        ? await DesiMallAPI.updateSellerServicePackage(pkgId.value,data,this.session.token)
        : await DesiMallAPI.addSellerServicePackage(data,this.session.token);
      if(!r.success)throw new Error(r.message||'Could not save service');
      this.close();await this.load();
    }catch(error){console.error(error);this.toast(error.message||'Could not save service');}
    finally{savePackage.disabled=false;savePackage.textContent=oldText;}
  },
  async toggle(id,value){const r=await DesiMallAPI.updateSellerServicePackage(id,{IsActive:value},this.session.token);if(!r.success)return this.toast(r.message||'Update failed');await this.load()}
};
document.addEventListener('DOMContentLoaded',()=>SellerServiceCatalog.init());
