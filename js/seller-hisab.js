
const SellerHisab={
  version:'0.35.2',
  session:null,
  workspace:'marketplace',

  money(v){
    return `₹${Number(v||0).toLocaleString('en-IN',{maximumFractionDigits:2})}`;
  },

  esc(v){
    return String(v??'').replace(/[&<>'"]/g,c=>({
      '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'
    }[c]));
  },

  date(v){
    if(!v)return '—';
    const d=new Date(v);
    if(Number.isNaN(d.getTime()))return this.esc(v);
    return d.toLocaleString('en-IN',{
      day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'
    });
  },

  toast(m){
    sellerHisabToast.textContent=m;
    sellerHisabToast.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer=setTimeout(()=>sellerHisabToast.classList.remove('show'),2300);
  },

  setText(id,text){
    const el=document.getElementById(id);
    if(el)el.textContent=text;
  },

  async init(){
    try{
      this.session=JSON.parse(localStorage.getItem('desimall_seller_session')||'null');
    }catch(_){this.session=null}

    if(!this.session?.token){
      location.href='login.html';
      return;
    }

    this.workspace=localStorage.getItem('desimall_seller_workspace')
      ||this.session?.primaryWorkspace?.Type
      ||'marketplace';

    refreshHisab.onclick=()=>this.load();
    await this.load();
  },

  async load(){
    if(this.workspace==='services'){
      return this.loadServicesAccount();
    }
    if(this.workspace==='food'){
      return this.loadFoodAccount();
    }
    return this.loadMarketplaceAccount();
  },


  applyFoodLabels(){
    document.title='Food Earnings & Payouts - DesiMall Partner Center';
    this.setText('walletPageTitle','Food Earnings & Payouts');
    this.setText('walletPageSubtitle','Only Food & Restaurant orders, food returns, COD/payment status and Food payouts are shown here.');

    this.setText('walletKpiAvailableLabel','Available for Food Payout');
    this.setText('walletKpiAvailableHelp','Food earnings ready for settlement');
    this.setText('walletKpiEarningsLabel','Net Food Earnings');
    this.setText('walletKpiEarningsHelp','Eligible Food sales after Food return adjustments');
    this.setText('walletKpiPaidLabel','Food Payouts Paid');
    this.setText('walletKpiPaidHelp','Food settlements already recorded');
    this.setText('walletKpiHoldLabel','Food COD On Hold');
    this.setText('walletKpiHoldHelp','Food COD cash awaiting rider deposit/reconciliation');

    this.setText('walletStripEligibleLabel','Eligible Food Sales');
    this.setText('walletStripAdjustLabel','Food Return Adjustments');
    this.setText('walletStripFeeLabel','Food Platform Fees');
    this.setText('walletStripOrdersLabel','Eligible Food Orders');

    this.setText('walletBreakdownTitle','Food Wallet Breakdown');
    this.setText('walletBreakdownHelp','Only Food orders from this Food & Restaurant workspace affect these numbers.');
    this.setText('walletBreakdownGrossLabel','Food Delivered Gross');
    this.setText('walletBreakdownPendingLabel','Food Payment Pending');
    this.setText('walletBreakdownHoldLabel','Food COD Hold Orders');
    this.setText('walletBreakdownReviewLabel','Food COD Review / Blocked');
    this.setText('walletBreakdownRecoveryLabel','Food Adjustment Due');

    this.setText('walletActivityTitle','Food Earnings Activity');
    this.setText('walletActivityHelp','Food order earnings, Food returns and Food payout activity only.');
    this.setText('walletReferenceHeading','Food Order / Reference');
    this.setText('walletStatusHeading','Status');
    this.setText('walletFeeHeading','Food Fee');
    this.setText('walletAmountHeading','Restaurant Amount');
    this.setText('walletPayoutTitle','Food Payout History');
    this.setText('walletPayoutHelp','Only payouts recorded for the Food workspace are listed here.');

    const how=document.getElementById('walletHowItWorks');
    if(how){
      how.innerHTML=`
        <strong>How Food payout works:</strong>
        Prepaid Food orders become eligible after successful payment confirmation.
        Food COD becomes eligible only after delivery and rider cash reconciliation.
        Food returns/closed refunds are deducted from Food entitlement.
        Marketplace product sales and Services bookings are completely excluded from this Food wallet.
      `;
    }
  },

  async loadFoodAccount(){
    this.applyFoodLabels();

    try{
      const r=await DesiMallAPI.getSellerHisab(this.session.token,'food');
      if(!r.success){
        this.toast(r.message||'Could not load Food earnings.');
        return;
      }

      const st=r.stats||{};

      sellerTotalEarning.textContent=this.money(st.netEntitlement);
      sellerPendingPayout.textContent=this.money(st.pendingPayout);
      sellerPaidPayout.textContent=this.money(st.paidPayout);
      sellerCODHold.textContent=this.money(st.codOnHold);
      sellerEligibleSales.textContent=this.money(st.eligibleSales);
      sellerReturnAdjustments.textContent=this.money(st.returnAdjustments);
      sellerMarketplaceFees.textContent=this.money(st.marketplaceFees);
      sellerPaidOrders.textContent=Number(st.eligibleOrders||0);
      sellerDeliveredGross.textContent=this.money(st.deliveredGross);
      sellerPaymentPending.textContent=this.money(st.paymentPending);
      sellerCODHoldOrders.textContent=Number(st.codHoldOrders||0);
      sellerCODReview.textContent=this.money(st.codReviewAmount);
      sellerCODReviewOrders.textContent=
        `${Number(st.codReviewOrders||0)} food order${Number(st.codReviewOrders||0)===1?'':'s'}`;
      sellerRecoveryDue.textContent=this.money(st.recoveryDue);

      const codReview=Number(st.codReviewAmount||0);
      sellerCODReviewAlert.style.display=codReview>0?'block':'none';
      sellerCODReviewAlert.innerHTML=codReview>0
        ? `<strong>Food COD blocked: ${this.money(codReview)}</strong><br>
           These Food COD records need reconciliation before they can become payable.`
        : '';

      const recovery=Number(st.recoveryDue||0);
      sellerRecoveryAlert.style.display=recovery>0?'block':'none';
      sellerRecoveryAlert.innerHTML=recovery>0
        ? `<strong>Food adjustment due: ${this.money(recovery)}</strong><br>
           This adjustment applies only to the Food workspace.`
        : '';

      this.renderActivity(r.history||[]);
      this.renderPayouts(r.payouts||[]);
    }catch(error){
      this.toast(error?.message||'Could not load Food earnings.');
    }
  },

  applyServiceLabels(){
    document.title='Services Earnings & Payouts - DesiMall Partner Center';
    this.setText('walletPageTitle','Services Earnings & Payouts');
    this.setText('walletPageSubtitle','Only Services bookings, customer payments, platform fees and Services payouts are shown here.');

    this.setText('walletKpiAvailableLabel','Available for Services Payout');
    this.setText('walletKpiAvailableHelp','Completed + paid service earnings ready for settlement');
    this.setText('walletKpiEarningsLabel','Net Service Earnings');
    this.setText('walletKpiEarningsHelp','Provider receivable after DesiMall Services platform fee');
    this.setText('walletKpiPaidLabel','Services Payouts Paid');
    this.setText('walletKpiPaidHelp','Services settlements already recorded');
    this.setText('walletKpiHoldLabel','Customer Payment Pending');
    this.setText('walletKpiHoldHelp','Completed services where customer payment is not yet marked paid');

    this.setText('walletStripEligibleLabel','Paid Service Value');
    this.setText('walletStripAdjustLabel','Cancelled / Reversed Value');
    this.setText('walletStripFeeLabel','Services Platform Fees');
    this.setText('walletStripOrdersLabel','Payout Eligible Bookings');

    this.setText('walletBreakdownTitle','Services Wallet Breakdown');
    this.setText('walletBreakdownHelp','Completed service payments → platform fee deduction → provider payout eligibility.');
    this.setText('walletBreakdownGrossLabel','Completed Service Gross');
    this.setText('walletBreakdownPendingLabel','Online Paid Value');
    this.setText('walletBreakdownHoldLabel','Collected at Service');
    this.setText('walletBreakdownReviewLabel','Payment Pending');
    this.setText('walletBreakdownRecoveryLabel','Services Fee Rate');

    this.setText('walletActivityTitle','Services Earnings Activity');
    this.setText('walletActivityHelp','Only Services bookings from the active Services Business workspace appear here.');
    this.setText('walletReferenceHeading','Booking / Service');
    this.setText('walletStatusHeading','Payment / Status');
    this.setText('walletFeeHeading','Platform Fee');
    this.setText('walletAmountHeading','Provider Amount');
    this.setText('walletPayoutTitle','Services Payout History');
    this.setText('walletPayoutHelp','Only payouts created from eligible Services bookings are shown.');

    const how=document.getElementById('walletHowItWorks');
    if(how){
      how.innerHTML=`
        <strong>How Services payout works:</strong>
        A service becomes payout-eligible only after the booking is <b>Completed</b> and its customer payment is <b>Paid</b>.
        DesiMall Services platform fee is deducted from the customer-paid value and the remaining provider receivable moves to
        <b>Available for Services Payout</b>. Cancelled, rejected, no-show or refunded bookings never increase this wallet.
        Marketplace product sales and Food orders are intentionally excluded from this Services ledger.
      `;
    }

    // Service view does not use legacy COD review/recovery warnings.
    if(window.sellerCODReviewAlert)sellerCODReviewAlert.style.display='none';
    if(window.sellerRecoveryAlert)sellerRecoveryAlert.style.display='none';
  },

  async loadServicesAccount(){
    this.applyServiceLabels();

    try{
      const r=await DesiMallAPI.getSellerServiceAccount(this.session.token);
      if(!r.success){
        this.toast(r.message||'Could not load Services earnings.');
        return;
      }

      const st=r.stats||{};

      sellerPendingPayout.textContent=this.money(st.pendingPayout);
      sellerTotalEarning.textContent=this.money(st.netProviderEarnings);
      sellerPaidPayout.textContent=this.money(st.paidPayout);
      sellerCODHold.textContent=this.money(st.paymentPending);

      sellerEligibleSales.textContent=this.money(st.eligibleGross);
      sellerReturnAdjustments.textContent=this.money(st.cancelledValue);
      sellerMarketplaceFees.textContent=this.money(st.platformFees);
      sellerPaidOrders.textContent=Number(st.eligibleBookings||0);

      sellerDeliveredGross.textContent=this.money(st.grossCompleted);
      sellerPaymentPending.textContent=this.money(st.onlinePaid);
      sellerCODHoldOrders.textContent=this.money(st.collectedAtService);
      sellerCODReview.textContent=this.money(st.paymentPending);
      sellerCODReviewOrders.textContent=
        `${Number(st.paymentPendingBookings||0)} booking${Number(st.paymentPendingBookings||0)===1?'':'s'}`;
      sellerRecoveryDue.textContent=`${Number(st.platformFeePct??10).toFixed(2).replace(/\.00$/,'')}%`;

      this.renderServiceActivity(r.history||[]);
      this.renderPayouts(r.payouts||[]);

      if(!r.provider){
        this.toast('Complete your Services profile to start receiving service bookings.');
      }
    }catch(error){
      this.toast(error?.message||'Could not load Services earnings.');
    }
  },

  renderServiceActivity(rows){
    sellerHisabBody.innerHTML=rows.length
      ? rows.map(x=>{
          const amount=Number(x.Amount||0);
          const reversed=String(x.Status||'').toLowerCase().includes('reversed');
          const pending=String(x.Status||'').toLowerCase().includes('pending');
          const paid=String(x.Status||'').toLowerCase().includes('settled');
          const cls=reversed?'negative':pending?'hold':paid?'paid':'positive';

          return `
            <tr>
              <td>${this.date(x.Date)}</td>
              <td>
                <strong>${this.esc(x.Type||'Service Activity')}</strong>
                <div style="color:#93a4b8;margin-top:3px">${this.esc(x.ServiceName||'Service')}</div>
              </td>
              <td>
                <strong>${this.esc(x.BookingID||'—')}</strong>
                <div style="color:#93a4b8;margin-top:3px">${this.esc(x.ServiceName||'')}</div>
              </td>
              <td>
                <strong>${this.esc(x.Status||'')}</strong>
                <div style="color:#93a4b8;margin-top:3px">
                  ${this.esc(x.PaymentMethod||'')} · ${this.esc(x.PaymentStatus||'')}
                </div>
              </td>
              <td>${Number(x.PlatformFee||0)>0?this.money(x.PlatformFee):'—'}</td>
              <td class="${cls}">
                ${reversed?'—':`${amount>0?'+':''}${this.money(amount)}`}
              </td>
            </tr>
          `;
        }).join('')
      : `
        <tr>
          <td colspan="6" class="account-empty">
            No Services earning activity yet. Completed service bookings will appear here.
          </td>
        </tr>
      `;
  },

  async loadMarketplaceAccount(){
    try{
      const r=await DesiMallAPI.getSellerHisab(this.session.token,'marketplace');

      if(!r.success){
        this.toast(r.message||'Could not load seller account.');
        return;
      }

      const s=r.seller||{};
      const st=r.stats||{};

      if(window.sideSellerName)sideSellerName.textContent=s.SellerName||s.Name||'Seller';
      if(window.sideShopName)sideShopName.textContent=s.ShopName||'Seller Store';

      sellerTotalEarning.textContent=this.money(st.netEntitlement);
      sellerPendingPayout.textContent=this.money(st.pendingPayout);
      sellerPaidPayout.textContent=this.money(st.paidPayout);
      sellerCODHold.textContent=this.money(st.codOnHold);
      sellerEligibleSales.textContent=this.money(st.eligibleSales);
      sellerReturnAdjustments.textContent=this.money(st.returnAdjustments);
      sellerMarketplaceFees.textContent=this.money(st.marketplaceFees);
      sellerPaidOrders.textContent=Number(st.eligibleOrders||0);
      sellerDeliveredGross.textContent=this.money(st.deliveredGross);
      sellerPaymentPending.textContent=this.money(st.paymentPending);
      sellerCODHoldOrders.textContent=Number(st.codHoldOrders||0);
      sellerCODReview.textContent=this.money(st.codReviewAmount);
      sellerCODReviewOrders.textContent=
        `${Number(st.codReviewOrders||0)} order${Number(st.codReviewOrders||0)===1?'':'s'}`;

      const codReview=Number(st.codReviewAmount||0);
      sellerCODReviewAlert.style.display=codReview>0?'block':'none';
      sellerCODReviewAlert.innerHTML=codReview>0
        ? `<strong>Blocked COD settlement: ${this.money(codReview)}</strong><br>
           These older/inconsistent COD records are excluded from payout and from live COD hold.
           DesiMall admin will reconcile them separately.`
        : '';

      sellerRecoveryDue.textContent=this.money(st.recoveryDue);

      const recovery=Number(st.recoveryDue||0);
      sellerRecoveryAlert.style.display=recovery>0?'block':'none';
      sellerRecoveryAlert.innerHTML=recovery>0
        ? `<strong>Adjustment due: ${this.money(recovery)}</strong><br>
           A return/refund was finalized after earlier seller entitlement/payout.
           This amount will be recovered from future eligible earnings.`
        : '';

      this.renderActivity(r.history||[]);
      this.renderPayouts(r.payouts||[]);
    }catch(error){
      this.toast(error?.message||'Could not load seller account.');
    }
  },

  renderActivity(rows){
    sellerHisabBody.innerHTML=rows.length
      ? rows.map(x=>{
          const amount=Number(x.Amount||0);
          const cls=x.Status==='Paid'?'paid':amount<0?'negative':x.Status==='COD Hold'?'hold':'positive';
          const reference=x.OrderID||x.Reference||'—';

          return `
            <tr>
              <td>${this.date(x.Date)}</td>
              <td>
                <strong>${this.esc(x.Type||'Activity')}</strong>
                ${x.ProductName?`<div style="color:#93a4b8;margin-top:3px">${this.esc(x.ProductName)}</div>`:''}
              </td>
              <td>
                <strong>${this.esc(reference)}</strong>
                ${x.Reference&&x.OrderID?`<div style="color:#93a4b8;margin-top:3px">${this.esc(x.Reference)}</div>`:''}
              </td>
              <td>${this.esc(x.Status||'')}</td>
              <td>${Number(x.MarketplaceFee||0)>0?this.money(x.MarketplaceFee):'—'}</td>
              <td class="${cls}">${amount>0?'+':''}${this.money(amount)}</td>
            </tr>
          `;
        }).join('')
      : `<tr><td colspan="6" class="account-empty">No seller account activity yet.</td></tr>`;
  },

  renderPayouts(rows){
    sellerPayoutHistory.innerHTML=rows.length
      ? rows.map(x=>`
          <div class="payout-item">
            <div>
              <strong>${this.esc(x.PaymentMode||'Payout')}</strong>
              <span>${this.esc(x.Reference||'—')}</span>
              ${x.AdminNote?`<span>${this.esc(x.AdminNote)}</span>`:''}
              <span>${this.date(x.PaidAt)}</span>
            </div>
            <div class="amount">${this.money(x.Amount)}</div>
          </div>
        `).join('')
      : `<div class="account-empty">${
          this.workspace==='services'?'No Services payout history yet.':
          this.workspace==='food'?'No Food payout history yet.':
          'No Marketplace payout history yet.'
        }</div>`;
  }
};

document.addEventListener('DOMContentLoaded',()=>SellerHisab.init());
