
const SellerServiceBookings={
  session:{},bookings:[],team:[],selected:null,
  esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));},
  money(v){return `₹${Number(v||0).toLocaleString('en-IN',{maximumFractionDigits:2})}`;},
  fmt(v){return v?new Date(v).toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}):'—';},
  async init(){
    try{this.session=JSON.parse(localStorage.getItem('desimall_seller_session')||'{}')}catch{}
    if(!this.session.token)return location.replace('login.html');
    refreshBookings.onclick=()=>this.load();bookingFilter.onchange=()=>this.renderList();
    await this.load();
  },
  async load(){
    const [b,p]=await Promise.all([DesiMallAPI.getSellerServiceBookings(this.session.token),DesiMallAPI.getSellerServicesProfile(this.session.token)]);
    this.bookings=b.bookings||[];this.team=p.team||[];
    bkRequested.textContent=this.bookings.filter(x=>x.Status==='requested').length;
    bkAccepted.textContent=this.bookings.filter(x=>x.Status==='accepted').length;
    bkLive.textContent=this.bookings.filter(x=>['provider_on_way','arrived','in_progress'].includes(x.Status)).length;
    bkCompleted.textContent=this.bookings.filter(x=>x.Status==='completed').length;
    this.renderList();if(this.selected){this.selected=this.bookings.find(x=>x.BookingID===this.selected.BookingID)||null;this.renderDetail()}
  },
  renderList(){
    const f=bookingFilter.value,rows=this.bookings.filter(x=>!f||x.Status===f);
    bookingList.innerHTML=rows.length?rows.map(x=>`<div class="booking-row ${this.selected?.BookingID===x.BookingID?'active':''}" onclick="SellerServiceBookings.select('${this.esc(x.BookingID)}')"><div class="booking-row-top"><h3>${this.esc(x.Package?.Name||'Service')}</h3><span class="booking-status ${this.esc(x.Status)}">${this.esc(x.Status.replaceAll('_',' '))}</span></div><p>${this.esc(x.BookingCode)} · ${this.fmt(x.ScheduledStart)}</p><p>${this.money(x.TotalAmount)} · ${this.esc(x.PaymentMethod)}</p></div>`).join(''):'<div style="padding:30px;text-align:center;color:#64748b">No bookings in this status.</div>';
  },
  select(id){this.selected=this.bookings.find(x=>String(x.BookingID)===String(id));this.renderList();this.renderDetail()},
  nextActions(b){
    const map={requested:[['accepted','Accept','primary'],['rejected','Reject','danger']],accepted:[['provider_on_way','On the way','primary'],['arrived','Arrived','primary'],['cancelled','Cancel','danger']],provider_on_way:[['arrived','Arrived','primary']],arrived:[['in_progress','Start Service','primary'],['no_show','Customer No-show','danger']],in_progress:[['completed','Complete Service','success']]};
    return map[b.Status]||[];
  },
  renderDetail(){
    const b=this.selected;if(!b)return;
    const addr=b.Address?`${b.Address.line1||''} ${b.Address.line2||''}, ${b.Address.city||''}, ${b.Address.state||''} ${b.Address.pincode||''}`:'Shop / Online service';
    const teamOpts='<option value="">Unassigned / Self</option>'+this.team.filter(x=>x.IsActive).map(x=>`<option value="${this.esc(x.TeamMemberID)}" ${x.TeamMemberID===b.AssignedTeamMemberID?'selected':''}>${this.esc(x.Name)}</option>`).join('');
    const actions=this.nextActions(b).map(([st,label,cls])=>`<button class="${cls}" onclick="SellerServiceBookings.updateStatus('${st}')">${label}</button>`).join('');
    const collect=b.Status==='completed'&&['cod','pay_after_service'].includes(b.PaymentMethod)&&b.PaymentStatus!=='paid'?`<button class="success" onclick="SellerServiceBookings.collect()">Mark Payment Collected</button>`:'';
    bookingDetail.innerHTML=`<div><span class="booking-status ${this.esc(b.Status)}">${this.esc(b.Status.replaceAll('_',' '))}</span><h2>${this.esc(b.Package?.Name||'Service')}</h2><div style="color:#94a3b8;font-size:9px">${this.esc(b.BookingCode)} · ${this.fmt(b.ScheduledStart)}</div></div><div class="booking-detail-grid"><div><small>Service mode</small><strong>${this.esc(b.ServiceMode)}</strong></div><div><small>Total</small><strong>${this.money(b.TotalAmount)}</strong></div><div><small>Payment</small><strong>${this.esc(b.PaymentMethod)} · ${this.esc(b.PaymentStatus)}</strong></div><div><small>Duration</small><strong>${b.Package?.DurationMinutes||0} min</strong></div><div style="grid-column:1/-1"><small>Service address / mode</small><strong>${this.esc(addr)}</strong></div><div style="grid-column:1/-1"><small>Customer note</small><strong>${this.esc(b.CustomerNote||'No note')}</strong></div></div><label style="display:grid;gap:6px;margin:10px 0"><span style="font-size:9px;color:#94a3b8">Assign technician / professional</span><select id="bookingTeam" style="border:1px solid #334155;background:#0d1725;color:#fff;border-radius:8px;padding:9px">${teamOpts}</select></label><div class="booking-actions">${actions}${collect}</div>`;
  },
  async updateStatus(status){
    const team=document.getElementById('bookingTeam')?.value||null;
    let reason='';if(['rejected','cancelled','no_show'].includes(status))reason=prompt('Reason / note:')||status;
    const r=await DesiMallAPI.updateSellerServiceBooking(this.selected.BookingID,{Status:status,TeamMemberID:team,Reason:reason},this.session.token);
    if(!r.success)return alert(r.message||'Could not update booking');await this.load();
  },
  async collect(){const r=await DesiMallAPI.collectSellerServicePayment(this.selected.BookingID,this.session.token);if(!r.success)return alert(r.message||'Could not record payment');await this.load()}
};
document.addEventListener('DOMContentLoaded',()=>SellerServiceBookings.init());
