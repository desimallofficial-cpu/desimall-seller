
document.addEventListener('DOMContentLoaded',async()=>{
  let s={};try{s=JSON.parse(localStorage.getItem('desimall_seller_session')||'{}')}catch{}
  if(!s.token)return location.replace('login.html');
  try{
    const [profile,menu,orders]=await Promise.all([
      DesiMallAPI.getSellerFoodRestaurant(s.token),
      DesiMallAPI.getSellerFoodMenu(s.token),
      DesiMallAPI.getSellerOrders(s.token)
    ]);
    const r=profile.restaurant||{};
    const items=menu.items||[];
    const foodOrders=(orders.orders||[]).filter(o=>String(o.FulfillmentMode||'').toLowerCase()==='food');
    fdItems.textContent=items.length;
    fdAvailable.textContent=items.filter(i=>i.IsAvailable).length;
    fdOrders.textContent=foodOrders.length;
    fdLive.textContent=foodOrders.filter(o=>['Accepted','Preparing','Ready for Pickup'].includes(o.SellerStatus)).length;
    fdName.textContent=r.name||r.Name||'Food Business';
    fdOpen.textContent=r.is_open===false?'Closed':'Open';
    fdProfile.textContent=`${(r.cuisine_tags||[]).join(' • ')||'Restaurant'} · ₹${Number(r.min_order||0)} minimum · ₹${Number(r.delivery_fee||0)} delivery · ${Number(r.prep_min_minutes||20)}-${Number(r.prep_max_minutes||40)} min prep`;
  }catch(e){fdProfile.textContent=e.message||'Could not load Food dashboard';}
});
