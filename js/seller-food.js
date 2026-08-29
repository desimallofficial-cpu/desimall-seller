
const SellerFood = {
  session:null, restaurant:null, items:[], selectedFile:null,

  esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));},
  money(v){return `₹${Number(v||0).toLocaleString('en-IN',{maximumFractionDigits:2})}`;},
  toast(m){const e=document.getElementById('panelToast');e.textContent=m;e.classList.add('show');clearTimeout(this.tt);this.tt=setTimeout(()=>e.classList.remove('show'),3000);},

  async init(){
    try{this.session=JSON.parse(localStorage.getItem('desimall_seller_session')||'{}');}catch{this.session={};}
    if(!this.session?.token){location.href='login.html';return;}

    document.getElementById('restaurantForm').onsubmit=e=>{e.preventDefault();this.saveRestaurant();};
    document.getElementById('openFoodItem').onclick=()=>this.openItem();
    document.getElementById('closeFoodItem').onclick=()=>this.closeItem();
    document.getElementById('foodItemForm').onsubmit=e=>{e.preventDefault();this.saveItem();};
    document.getElementById('foodMenuSearch').oninput=()=>this.render();
    document.getElementById('foodTypeFilter').onchange=()=>this.render();
    document.getElementById('fiImageFile').onchange=e=>this.pickImage(e.target.files?.[0]);

    await this.load();
  },

  async load(){
    try{
      const [profile,menu]=await Promise.all([
        DesiMallAPI.getSellerFoodRestaurant(this.session.token),
        DesiMallAPI.getSellerFoodMenu(this.session.token)
      ]);
      this.restaurant=profile.restaurant||null;
      this.items=Array.isArray(menu.items)?menu.items:[];
      this.fillRestaurant();
      this.render();
    }catch(error){console.error(error);this.toast(error.message||'Could not load Food menu');}
  },

  fillRestaurant(){
    const r=this.restaurant||{};
    const seller=this.session.seller||{};
    frName.value=r.name||r.Name||seller.ShopName||'';
    frCuisine.value=(r.cuisine_tags||r.CuisineTags||[]).join(', ');
    frPincodes.value=(r.service_pincodes||r.ServicePincodes||[]).join(', ');
    frMinOrder.value=Number(r.min_order??r.MinOrder??99);
    frDeliveryFee.value=Number(r.delivery_fee??r.DeliveryFee??30);
    frPrepMin.value=Number(r.prep_min_minutes??r.PrepMinMinutes??20);
    frPrepMax.value=Number(r.prep_max_minutes??r.PrepMaxMinutes??40);
    frOpen.checked=r.is_open!==false;
    frCOD.checked=r.accepts_cod!==false;
    frOnline.checked=r.accepts_online!==false;
  },

  async saveRestaurant(){
    const pins=frPincodes.value.split(/[,\s]+/).map(x=>x.replace(/\D/g,'')).filter(x=>x.length===6);
    if(!frName.value.trim())return this.toast('Restaurant name is required.');
    if(!pins.length)return this.toast('At least one 6-digit delivery pincode is required.');
    const result=await DesiMallAPI.saveSellerFoodRestaurant({
      Token:this.session.token,
      Name:frName.value.trim(),
      CuisineTags:frCuisine.value.split(',').map(x=>x.trim()).filter(Boolean),
      ServicePincodes:pins,
      MinOrder:Number(frMinOrder.value||0),
      DeliveryFee:Number(frDeliveryFee.value||0),
      PrepMinMinutes:Number(frPrepMin.value||20),
      PrepMaxMinutes:Number(frPrepMax.value||40),
      IsOpen:frOpen.checked,
      AcceptsCOD:frCOD.checked,
      AcceptsOnline:frOnline.checked
    });
    if(!result.success)return this.toast(result.message||'Save failed');
    this.restaurant=result.restaurant;
    this.toast('Restaurant profile saved.');
  },

  render(){
    const q=foodMenuSearch.value.trim().toLowerCase();
    const type=foodTypeFilter.value;
    const rows=this.items.filter(i=>{
      if(type&&i.FoodType!==type)return false;
      if(q&&!`${i.ProductName} ${i.MenuCategory}`.toLowerCase().includes(q))return false;
      return true;
    });
    foodMenuList.innerHTML=rows.length?rows.map(i=>`
      <article class="seller-food-item">
        <img src="${this.esc(i.ImageURL||'../assets/products/noimage.jpg')}" onerror="this.src='../assets/products/noimage.jpg'">
        <div>
          <h3>${this.esc(i.ProductName)}</h3>
          <p>${this.esc(i.Description||'No description')}</p>
          <div class="food-chip-row">
            <span class="food-chip ${this.esc(i.FoodType)}">${this.label(i.FoodType)}</span>
            <span class="food-chip">${this.esc(i.MenuCategory)}</span>
            <span class="food-chip">${this.money(i.FinalPrice)}</span>
            <span class="food-chip">Stock ${Number(i.Stock||0)}</span>
            <span class="food-chip">${Number(i.PrepMinutes||0)} min</span>
          </div>
        </div>
        <div class="food-item-actions">
          <button onclick="SellerFood.edit('${this.esc(i.MenuItemID)}')"><i class="fa-solid fa-pen"></i> Edit</button>
          <button class="toggle ${i.IsAvailable?'on':'off'}" onclick="SellerFood.toggle('${this.esc(i.MenuItemID)}',${!i.IsAvailable})"><i class="fa-solid ${i.IsAvailable?'fa-eye':'fa-eye-slash'}"></i> ${i.IsAvailable?'Available':'Unavailable'}</button>
        </div>
      </article>
    `).join(''):`<div class="food-empty-seller"><i class="fa-solid fa-utensils"></i><h3>No food items yet</h3><p>Add your first dish after saving Restaurant Profile.</p></div>`;
  },

  label(t){return ({veg:'🟢 Veg',nonveg:'🔴 Non-Veg',egg:'🟡 Egg',vegan:'🌿 Vegan'})[t]||t;},

  openItem(item=null){
    if(!this.restaurant)return this.toast('Save Restaurant Profile first.');
    this.selectedFile=null;
    foodItemForm.reset();
    fiMenuId.value=item?.MenuItemID||'';
    fiProductId.value=item?.ProductID||'';
    fiName.value=item?.ProductName||'';
    fiType.value=item?.FoodType||'veg';
    fiCategory.value=item?.MenuCategory||'Main Course';
    fiSpice.value=item?.SpiceLevel||'medium';
    fiDescription.value=item?.Description||'';
    fiMRP.value=item?.MRP||item?.FinalPrice||'';
    fiPrice.value=item?.FinalPrice||'';
    fiSettlement.value=item?.FinalPrice||'';
    fiStock.value=Number(item?.Stock??20);
    fiPrep.value=Number(item?.PrepMinutes??20);
    fiServes.value=item?.Serves||'';
    fiAvailable.checked=item?.IsAvailable!==false;
    fiBestseller.checked=Boolean(item?.IsBestseller);
    fiImage.value=item?.ImageURL||'';
    fiImagePreview.src=item?.ImageURL||'';
    fiImagePreview.classList.toggle('show',Boolean(item?.ImageURL));
    fiImageState.textContent=item?.ImageURL?'Current dish photo':'Real dish photo required.';
    foodItemTitle.textContent=item?'Edit Food Item':'Add Food Item';
    foodItemModal.classList.add('open');
  },
  closeItem(){foodItemModal.classList.remove('open');this.selectedFile=null;},
  edit(id){const i=this.items.find(x=>String(x.MenuItemID)===String(id));if(i)this.openItem(i);},

  pickImage(file){
    if(!file)return;
    if(!['image/jpeg','image/png','image/webp'].includes(file.type))return this.toast('Use JPG, PNG or WEBP image.');
    this.selectedFile=file;
    const reader=new FileReader();
    reader.onload=()=>{fiImagePreview.src=reader.result;fiImagePreview.classList.add('show');fiImageState.textContent=file.name;};
    reader.readAsDataURL(file);
  },

  async saveItem(){
    const editId=fiMenuId.value.trim();
    if(!fiName.value.trim())return this.toast('Dish name is required.');
    const mrp=Number(fiMRP.value),price=Number(fiPrice.value),settlement=Number(fiSettlement.value);
    if(!(mrp>0)||!(price>0)||price>mrp)return this.toast('Selling price must be valid and not exceed MRP.');
    if(!(settlement>0)||settlement>price)return this.toast('Settlement must be positive and not exceed selling price.');

    saveFoodItem.disabled=true;
    try{
      let image=fiImage.value.trim();
      if(this.selectedFile){
        const upload=await DesiMallUpload.uploadProductImage(this.selectedFile);
        image=String(upload?.imageUrl||upload?.ImageURL||'').trim();
      }
      if(!image)throw new Error('Dish photo is required.');

      const payload={
        Token:this.session.token,
        ProductName:fiName.value.trim(),
        Description:fiDescription.value.trim(),
        FoodType:fiType.value,
        MenuCategory:fiCategory.value,
        SpiceLevel:fiSpice.value,
        MRP:mrp,
        FinalPrice:price,
        BankSettlement:settlement,
        Stock:Number(fiStock.value||0),
        PrepMinutes:Number(fiPrep.value||20),
        Serves:fiServes.value.trim(),
        ImageURL:image,
        IsAvailable:fiAvailable.checked,
        IsBestseller:fiBestseller.checked
      };
      const result=editId
        ? await DesiMallAPI.updateSellerFoodItem(editId,payload)
        : await DesiMallAPI.addSellerFoodItem(payload);
      if(!result.success)throw new Error(result.message||'Could not save Food item.');
      this.closeItem();
      await this.load();
      this.toast(result.message||'Food item saved.');
    }catch(error){console.error(error);this.toast(error.message||'Save failed.');}
    finally{saveFoodItem.disabled=false;}
  },

  async toggle(id,value){
    const result=await DesiMallAPI.updateSellerFoodItem(id,{Token:this.session.token,IsAvailable:value});
    if(!result.success)return this.toast(result.message||'Could not update availability.');
    await this.load();
  }
};
document.addEventListener('DOMContentLoaded',()=>SellerFood.init());
