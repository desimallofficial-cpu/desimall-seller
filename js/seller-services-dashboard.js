
const SellerServicesDashboard={
  session:{},verticals:[],profile:null,team:[],
  esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));},
  async init(){
    try{this.session=JSON.parse(localStorage.getItem('desimall_seller_session')||'{}')}catch{}
    if(!this.session.token)return location.replace('login.html');
    servicesProfileForm.onsubmit=e=>{e.preventDefault();this.saveProfile()};
    submitCustomVertical.onclick=()=>this.submitCustom();
    addTeam.onclick=()=>this.addTeam();
    await this.load();
  },
  async load(){
    try{
      const [v,p,pk,b]=await Promise.all([
        DesiMallAPI.getServiceVerticals(),
        DesiMallAPI.getSellerServicesProfile(this.session.token),
        DesiMallAPI.getSellerServicePackages(this.session.token),
        DesiMallAPI.getSellerServiceBookings(this.session.token)
      ]);
      this.verticals=v.verticals||[];
      this.profile=p.provider||null;this.team=p.team||[];
      this.renderVerticals(p.verticals||[]);
      this.fillProfile(p);
      this.renderTeam();
      const packages=pk.packages||[], bookings=b.bookings||[];
      sdPackages.textContent=packages.length;
      sdBookings.textContent=bookings.filter(x=>!['completed','cancelled','rejected','no_show'].includes(x.Status)).length;
      sdLive.textContent=bookings.filter(x=>['provider_on_way','arrived','in_progress'].includes(x.Status)).length;
      sdDone.textContent=bookings.filter(x=>x.Status==='completed').length;
    }catch(e){console.error(e);alert(e.message||'Could not load Services dashboard');}
  },
  renderVerticals(selected){
    const picked=new Set((selected||[]).map(x=>String(x.VerticalID)));
    verticalGrid.innerHTML=this.verticals.filter(v=>v.Code!=='custom').map(v=>`
      <label class="vertical-choice"><input type="checkbox" value="${this.esc(v.VerticalID)}" ${picked.has(String(v.VerticalID))?'checked':''}><span><i class="fa-solid ${this.esc(v.Icon||'fa-screwdriver-wrench')}"></i><b>${this.esc(v.Name)}</b></span></label>
    `).join('');
  },
  fillProfile(data){
    const p=data.provider||{};
    spName.value=p.BusinessName||this.session.seller?.ShopName||'';
    spTagline.value=p.Tagline||'';spAbout.value=p.About||'';
    spPincodes.value=(p.ServicePincodes||[]).join(', ');
    spVisit.value=Number(p.BaseVisitCharge||0);spLead.value=Number(p.MinLeadMinutes||60);
    spAdvance.value=Number(p.MaxAdvanceDays||30);spInterval.value=String(p.SlotIntervalMinutes||60);
    modeHome.checked=(p.ServiceModes||['home']).includes('home');modeShop.checked=(p.ServiceModes||[]).includes('shop');modeOnline.checked=(p.ServiceModes||[]).includes('online');
    spOpen.checked=p.IsOpen!==false;spSameDay.checked=p.SameDayAvailable!==false;spEmergency.checked=Boolean(p.EmergencyAvailable);spCOD.checked=p.AcceptsCOD!==false;spOnline.checked=p.AcceptsOnline!==false;
    const by=new Map((data.hours||[]).map(x=>[Number(x.Weekday),x]));
    document.querySelectorAll('.hours-row').forEach(row=>{
      const h=by.get(Number(row.dataset.day));if(!h)return;
      row.querySelector('.hrClosed').checked=Boolean(h.IsClosed);
      if(h.StartTime)row.querySelector('.hrStart').value=String(h.StartTime).slice(0,5);
      if(h.EndTime)row.querySelector('.hrEnd').value=String(h.EndTime).slice(0,5);
    });
  },
  hours(){return [...document.querySelectorAll('.hours-row')].map(row=>({Weekday:Number(row.dataset.day),IsClosed:row.querySelector('.hrClosed').checked,StartTime:row.querySelector('.hrStart').value,EndTime:row.querySelector('.hrEnd').value}))},
  async saveProfile(){
    const ids=[...verticalGrid.querySelectorAll('input:checked')].map(x=>x.value);
    if(!ids.length)return alert('Choose at least one service vertical.');
    const pins=spPincodes.value.split(/[,\s]+/).map(x=>x.replace(/\D/g,'')).filter(x=>x.length===6);
    if((modeHome.checked||spSameDay.checked)&&!pins.length)return alert('Enter at least one 6-digit service pincode.');
    const result=await DesiMallAPI.saveSellerServicesProfile({
      BusinessName:spName.value.trim(),Tagline:spTagline.value.trim(),About:spAbout.value.trim(),
      VerticalIDs:ids,ServicePincodes:pins,BaseVisitCharge:Number(spVisit.value||0),
      MinLeadMinutes:Number(spLead.value||60),MaxAdvanceDays:Number(spAdvance.value||30),SlotIntervalMinutes:Number(spInterval.value||60),
      ServiceModes:[modeHome.checked?'home':null,modeShop.checked?'shop':null,modeOnline.checked?'online':null].filter(Boolean),
      IsOpen:spOpen.checked,SameDayAvailable:spSameDay.checked,EmergencyAvailable:spEmergency.checked,AcceptsCOD:spCOD.checked,AcceptsOnline:spOnline.checked,Hours:this.hours()
    },this.session.token);
    if(!result.success)return alert(result.message||'Save failed');
    alert('Services profile saved.');
    await this.load();
  },
  async submitCustom(){
    const name=customVerticalName.value.trim(),desc=customVerticalDesc.value.trim();
    if(name.length<3)return alert('Enter a custom service name.');
    const r=await DesiMallAPI.submitCustomServiceVertical({Name:name,Description:desc},this.session.token);
    if(!r.success)return alert(r.message||'Could not submit custom vertical');
    customVerticalName.value='';customVerticalDesc.value='';
    alert('Custom vertical submitted for review. Once approved, you can select it and create packages.');
  },
  renderTeam(){
    teamList.innerHTML=this.team.length?this.team.map(x=>`<div class="team-row"><div><b>${this.esc(x.Name)}</b><div style="color:#94a3b8;font-size:8px">${this.esc(x.Phone||'')} · ${this.esc((x.Skills||[]).join(', '))}</div></div><span>${x.IsActive?'Active':'Inactive'}</span></div>`).join(''):'<div style="color:#64748b;font-size:9px">No team members yet. Solo providers can leave this empty.</div>';
  },
  async addTeam(){
    if(!tmName.value.trim())return alert('Team member name is required.');
    const r=await DesiMallAPI.addSellerServiceTeamMember({Name:tmName.value.trim(),Phone:tmPhone.value.trim(),Skills:tmSkills.value.split(',').map(x=>x.trim()).filter(Boolean)},this.session.token);
    if(!r.success)return alert(r.message||'Could not add team member');
    tmName.value='';tmPhone.value='';tmSkills.value='';await this.load();
  }
};
document.addEventListener('DOMContentLoaded',()=>SellerServicesDashboard.init());
