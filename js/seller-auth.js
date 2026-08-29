const SellerAuth = {
  key: 'desimall_seller_session',

  sellerGps: null,

  init() {
    this.bindTabs();
    this.bindSellerGps();

    document
      .getElementById('sellerLoginForm')
      ?.addEventListener('submit', event => {
        event.preventDefault();
        this.login();
      });

    document
      .getElementById('sellerRegisterForm')
      ?.addEventListener('submit', event => {
        event.preventDefault();
        this.register();
      });

    this.checkExistingSession();
  },

  bindSellerGps() {
    const button = document.getElementById('btnCaptureSellerGps');
    if (!button) return;
    button.onclick = () => this.captureSellerGps();
  },

  captureSellerGps() {
    const status = document.getElementById('sellerGpsStatus');

    if (!navigator.geolocation) {
      if (status) {
        status.textContent = 'Location is not supported on this device/browser.';
        status.className = 'seller-gps-status bad';
      }
      return;
    }

    if (status) {
      status.textContent = 'Getting precise shop location…';
      status.className = 'seller-gps-status';
    }

    navigator.geolocation.getCurrentPosition(
      position => {
        const lat = Number(position.coords.latitude);
        const lon = Number(position.coords.longitude);
        const accuracy = Number(position.coords.accuracy || 0);

        if (!Number.isFinite(lat) || !Number.isFinite(lon) ||
            (Math.abs(lat) < 0.0001 && Math.abs(lon) < 0.0001)) {
          if (status) {
            status.textContent = 'Invalid GPS received. Please try again.';
            status.className = 'seller-gps-status bad';
          }
          return;
        }

        this.sellerGps = { latitude: lat, longitude: lon, accuracy };

        const latEl = document.getElementById('regLatitude');
        const lonEl = document.getElementById('regLongitude');
        const accEl = document.getElementById('regGpsAccuracy');
        if (latEl) latEl.value = lat.toFixed(7);
        if (lonEl) lonEl.value = lon.toFixed(7);
        if (accEl) accEl.value = String(Math.round(accuracy));

        if (status) {
          status.textContent = `GPS captured: ${lat.toFixed(6)}, ${lon.toFixed(6)} · ±${Math.round(accuracy)}m`;
          status.className = accuracy <= 500
            ? 'seller-gps-status good'
            : 'seller-gps-status bad';
        }
      },
      error => {
        if (status) {
          status.textContent =
            error.code === 1
              ? 'Location permission denied. Allow Precise Location to register.'
              : 'Could not get precise location. Turn on GPS and try again.';
          status.className = 'seller-gps-status bad';
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 20000
      }
    );
  },

  bindTabs() {
    const loginTab = document.getElementById('loginTab');
    const registerTab = document.getElementById('registerTab');
    const loginForm = document.getElementById('sellerLoginForm');
    const registerForm = document.getElementById('sellerRegisterForm');

    if (loginTab) {
      loginTab.onclick = () => {
        loginTab.classList.add('active');
        registerTab?.classList.remove('active');
        loginForm?.classList.remove('hidden');
        registerForm?.classList.add('hidden');
        this.message('');
      };
    }

    if (registerTab) {
      registerTab.onclick = () => {
        registerTab.classList.add('active');
        loginTab?.classList.remove('active');
        registerForm?.classList.remove('hidden');
        loginForm?.classList.add('hidden');
        this.message('');
      };
    }
  },

  read() {
    try {
      return JSON.parse(localStorage.getItem(this.key)) || {};
    } catch (_) {
      return {};
    }
  },

  destination(seller) {
    const active =
      String(seller?.Status || '').toLowerCase() === 'active';

    const approved =
      String(seller?.KYCStatus || '').toLowerCase() === 'approved';

    return active && approved
      ? 'orders.html'
      : 'profile.html';
  },

  async checkExistingSession() {
    const session = this.read();

    if (!session.token) return;

    try {
      const result = await DesiMallAPI.sellerSession(session.token);

      if (!result?.success) return;

      const latest = (() => {
        try {
          return JSON.parse(
            localStorage.getItem(this.key) || '{}'
          ) || {};
        } catch (_) {
          return {};
        }
      })();

      const updated = {
        ...session,
        ...latest,
        seller: result.seller || latest.seller || session.seller,
        expiresAt: result.expiresAt || latest.expiresAt || session.expiresAt,
        verifiedAt: Date.now()
      };

      localStorage.setItem(this.key, JSON.stringify(updated));
      window.location.replace(this.destination(updated.seller));
    } catch (error) {
      if (
        error?.status === 401 ||
        error?.code === 'INVALID_SESSION' ||
        error?.code === 'AUTH_REQUIRED'
      ) {
        localStorage.removeItem(this.key);
      }
    }
  },

  async login() {
    const form = document.getElementById('sellerLoginForm');
    const button = form?.querySelector('button[type="submit"]');
    const identifier =
      document.getElementById('sellerIdentifier')?.value.trim() || '';
    const password =
      document.getElementById('sellerPassword')?.value || '';

    if (!identifier) {
      return this.message('Mobile number ya email enter karein.');
    }

    if (password.length < 6) {
      return this.message('Password kam se kam 6 characters ka hona chahiye.');
    }

    this.busy(button, true, 'Logging in...');

    try {
      const result = await DesiMallAPI.sellerLogin({
        Identifier: identifier,
        Password: password
      });

      if (!result?.success || !result?.token || !result?.seller) {
        throw new Error(result?.message || 'Seller login failed.');
      }

      localStorage.setItem(
        this.key,
        JSON.stringify({
          token: result.token,
          refreshToken: result.refreshToken || '',
          expiresAt: result.expiresAt || null,
          verifiedAt: Date.now(),
          seller: result.seller
        })
      );

      this.message(
        'Login successful. Seller orders khul rahe hain...',
        true
      );

      setTimeout(() => {
        window.location.replace(this.destination(result.seller));
      }, 350);
    } catch (error) {
      const rawMessage = String(error?.message || '').trim().toLowerCase();
      const status = Number(error?.status || 0);

      const invalidCredentials =
        status === 400 ||
        status === 401 ||
        rawMessage.includes('invalid login credentials') ||
        rawMessage.includes('invalid credentials') ||
        rawMessage.includes('wrong password') ||
        rawMessage.includes('incorrect password') ||
        rawMessage.includes('email or password');

      this.message(
        invalidCredentials
          ? 'Wrong / invalid password. Please enter a valid password.'
          : (error?.message || 'Seller login nahi ho saka.')
      );
    } finally {
      this.busy(button, false);
    }
  },

  async register() {
    const mobile =
      document.getElementById('regMobile')?.value.trim() || '';
    const email =
      document.getElementById('regEmail')?.value.trim().toLowerCase() || '';
    const password =
      document.getElementById('regPassword')?.value || '';

    if (!/^[6-9]\d{9}$/.test(mobile)) {
      return this.message('Valid 10-digit Indian mobile number enter karein.');
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return this.message('Valid email address enter karein.');
    }

    if (password.length < 6) {
      return this.message('Password kam se kam 6 characters ka hona chahiye.');
    }

    const shopAddress =
      document.getElementById('regAddress')?.value.trim() || '';
    const latitude = Number(document.getElementById('regLatitude')?.value);
    const longitude = Number(document.getElementById('regLongitude')?.value);
    const accuracyM = Number(document.getElementById('regGpsAccuracy')?.value);

    if (!shopAddress) {
      return this.message('Exact shop/pickup address enter karein.');
    }

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) ||
        (Math.abs(latitude) < 0.0001 && Math.abs(longitude) < 0.0001)) {
      return this.message('Registration se pahle Use Current Location se exact shop GPS capture karein.');
    }

    if (Number.isFinite(accuracyM) && accuracyM > 500) {
      return this.message('GPS accuracy weak hai. Precise Location ON karke location dubara capture karein.');
    }

    const button =
      document.querySelector('#sellerRegisterForm button[type="submit"]');

    this.busy(button, true, 'Submitting...');

    try {
      const result = await DesiMallAPI.sellerRegister({
        ShopName:
          document.getElementById('regShopName')?.value.trim() || '',
        SellerName:
          document.getElementById('regSellerName')?.value.trim() || '',
        Mobile: mobile,
        Email: email,
        Address: shopAddress,
        Latitude: latitude,
        Longitude: longitude,
        AccuracyM: Number.isFinite(accuracyM) ? accuracyM : null,
        Password: password
      });

      this.message(
        result?.message ||
          (result?.success
            ? 'Registration submitted. Admin approval ke baad login karein.'
            : 'Registration failed.'),
        Boolean(result?.success)
      );

      if (result?.success) {
        document.getElementById('sellerRegisterForm')?.reset();
        this.sellerGps = null;
        const gpsStatus = document.getElementById('sellerGpsStatus');
        if (gpsStatus) {
          gpsStatus.textContent = 'Location not captured';
          gpsStatus.className = 'seller-gps-status';
        }
      }
    } catch (error) {
      this.message(
        error?.message || 'Seller registration failed.'
      );
    } finally {
      this.busy(button, false);
    }
  },

  message(text, good = false) {
    const el = document.getElementById('sellerAuthMessage');
    if (!el) return;

    el.textContent = text;
    el.classList.toggle('good', good);
  },

  busy(button, state, text = '') {
    if (!button) return;

    if (!button.dataset.label) {
      button.dataset.label = button.innerHTML;
    }

    button.disabled = state;
    button.innerHTML = state
      ? `<i class="fa-solid fa-spinner fa-spin"></i> ${text}`
      : button.dataset.label;
  }
};

document.addEventListener(
  'DOMContentLoaded',
  () => SellerAuth.init()
);
