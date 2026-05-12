const app = document.getElementById('app');

let searchDebounceTimer;

const storageKey = 'bank-sampah-prototype';
const defaultState = {
  currentUser: null,
  roles: ['Admin'],
  customers: [],
  wasteTypes: [
    { id: 'plastik', name: 'Plastik', price: 2300 },
    { id: 'kertas', name: 'Kertas', price: 1800 },
    { id: 'logam', name: 'Logam', price: 5200 },
    { id: 'kaca', name: 'Kaca', price: 1600 },
  ],
  transactions: [],
};

const state = loadState();

function loadState() {
  const raw = localStorage.getItem(storageKey);
  if (!raw) {
    localStorage.setItem(storageKey, JSON.stringify(defaultState));
    return JSON.parse(JSON.stringify(defaultState));
  }
  try {
    const loaded = { ...defaultState, ...JSON.parse(raw) };
    // Migrate old transactions to have transactionType field
    if (loaded.transactions && Array.isArray(loaded.transactions)) {
      loaded.transactions = loaded.transactions.map(tx => ({
        ...tx,
        transactionType: tx.transactionType || 'setor',
      }));
    }
    return loaded;
  } catch (error) {
    console.warn('Load error, reset storage.', error);
    localStorage.setItem(storageKey, JSON.stringify(defaultState));
    return JSON.parse(JSON.stringify(defaultState));
  }
}

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify(state));
}

function escapeCSV(value) {
  const stringValue = value == null ? '' : String(value);
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

function buildTransactionsCSV(transactions) {
  const rows = [
    ['Customer ID', 'Customer Name', 'Date', 'Transaction Type', 'Waste Type', 'Weight (kg)', 'Price / kg', 'Total', 'Staff', 'Notes'],
  ];
  transactions.forEach(tx => {
    rows.push([
      tx.customerId,
      tx.customerName,
      formatDate(tx.date),
      tx.transactionType === 'cair' ? 'Cairkan Uang' : (tx.transactionType === 'setor_dan_cair' ? 'Setor Sampah + Cairkan Uang' : 'Setor Sampah'),
      tx.wasteTypeName,
      tx.weight.toFixed(2),
      tx.price,
      tx.total,
      tx.staff,
      tx.note || '',
    ]);
  });
  return rows.map(row => row.map(escapeCSV).join(',')).join('\n');
}

function getTransactionTypeLabel(tx) {
  if (tx.transactionType === 'cair') return 'Cairkan Uang';
  if (tx.transactionType === 'setor_dan_cair') return 'Setor Sampah + Cairkan Uang';
  return 'Setor sampah';
}

function downloadCSV(filename, csvContent) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function formatCurrency(value) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value);
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getTodayKey() {
  const today = new Date();
  return today.toISOString().slice(0, 10);
}

function parseHashRoute() {
  const hash = location.hash.slice(1) || 'login';
  const [path, queryString] = hash.split('?');
  return { path, params: new URLSearchParams(queryString || '') };
}

function route() {
  const { path } = parseHashRoute();
  if (!state.currentUser && path !== 'login') {
    location.hash = 'login';
    return;
  }
  switch (path) {
    case 'dashboard': renderDashboard(); break;
    case 'new-transaction': renderNewTransaction(); break;
    case 'customers': renderCustomers(); break;
    case 'history': renderHistory(); break;
    case 'prices': renderPrices(); break;
    case 'balances': renderBalances(); break;
    case 'reports': renderReports(); break;
    case 'settings': renderSettings(); break;
    case 'login': renderLogin(); break;
    default: renderDashboard(); break;
  }
}

function renderLogin() {
  app.innerHTML = `
    <div class="login-stage">
      <div class="card login-card">
        <div class="login-brand">
          <div class="brand-tag">Bank Sampah</div>
          <h1>Sadang Serang</h1>
        </div>
        <div class="form-card login-form-card">
          <label><strong>Nama petugas</strong><input id="username" type="text" placeholder="Masukkan nama petugas" autocomplete="username" /></label>
          <label><strong>Password</strong><input id="password" type="password" placeholder="Masukkan password" autocomplete="current-password" /></label>
          <button id="loginButton">Masuk</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('loginButton').addEventListener('click', () => {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    if (!username) {
      alert('Masukkan nama petugas.');
      return;
    }
    if (!password) {
      alert('Masukkan password.');
      return;
    }
    if (password !== '12345') {
      alert('Password salah.');
      return;
    }
    state.currentUser = { name: username, role: 'Admin' };
    saveState();
    location.hash = 'dashboard';
  });
}

function renderHeader(title, subtitle) {
  return `<div class="page-title"><div><h1>${title}</h1>${subtitle ? `<p>${subtitle}</p>` : ''}</div></div>`;
}

function renderNavigation(active) {
  return `
    <div class="bottom-nav">
      ${navItem('dashboard', 'Dashboard', active)}
      ${navItem('new-transaction', 'Transaksi', active)}
      ${navItem('customers', 'Pelanggan', active)}
      ${navItem('history', 'Riwayat', active)}
      ${navItem('reports', 'Rekap', active)}
    </div>
  `;
}

function navItem(routeName, label, active) {
  return `<button class="nav-button ${active === routeName ? 'active' : ''}" onclick="location.hash='${routeName}'">${label}</button>`;
}

function getOverview() {
  const todayKey = getTodayKey();
  const todayTransactions = state.transactions.filter(tx => tx.date.startsWith(todayKey));
  const totalWeight = todayTransactions.reduce((sum, tx) => sum + tx.weight, 0);
  const totalValue = todayTransactions.reduce((sum, tx) => sum + tx.total, 0);
  const activeCustomers = new Set(todayTransactions.map(tx => tx.customerId)).size;
  const topCustomers = [...state.customers].sort((a,b) => b.balance - a.balance).slice(0,3);
  return { totalWeight, totalValue, activeCustomers, count: todayTransactions.length, topCustomers };
}

function renderDashboard() {
  const overview = getOverview();
  app.innerHTML = `
    <div class="card">
      ${renderHeader('Ringkasan Harian', '')}
      <div class="dashboard-grid">
        <div class="metric-card"><strong>${overview.count}</strong><span>Transaksi hari ini</span></div>
        <div class="metric-card"><strong>${overview.totalWeight.toFixed(2)} kg</strong><span>Total berat</span></div>
        <div class="metric-card"><strong>${formatCurrency(overview.totalValue)}</strong><span>Total nilai</span></div>
        <div class="metric-card"><strong>${overview.activeCustomers}</strong><span>Pelanggan aktif</span></div>
      </div>
    </div>
    <div class="card">
      <div class="page-title"><div><h2>Aksi cepat</h2></div></div>
      <div class="big-card">
        <button onclick="location.hash='new-transaction'">Tambah transaksi baru</button>
        <button onclick="location.hash='new-transaction?mode=cair'">Cairkan dana</button>
        <button class="secondary" onclick="location.hash='customers'">Cari pelanggan</button>
        <button class="secondary" onclick="location.hash='balances'">Saldo pelanggan</button>
        <button class="secondary" onclick="location.hash='prices'">Kelola harga sampah</button>
        <button class="secondary" onclick="location.hash='settings'">Pengaturan</button>
      </div>
    </div>
    ${renderNavigation('dashboard')}
  `;
}

function renderNewTransaction() {
  const params = parseHashRoute().params;
  const mode = params.get('mode') || 'setor';
  const customerId = params.get('customerId') || '';
  renderTransactionForm(null, mode, customerId);
}

function renderTransactionForm(transaction = null, mode = 'setor', prefillCustomerId = '') {
  const isEdit = Boolean(transaction);
  const selectedMode = transaction ? transaction.transactionType : mode;
  const customerNameValue = transaction ? transaction.customerName : (prefillCustomerId ? (state.customers.find(c => c.id === prefillCustomerId)?.name || '') : '');
  const noteValue = transaction ? transaction.note : '';
  const wasteTypeValue = transaction ? transaction.wasteTypeId : state.wasteTypes[0].id;
  const weightValue = transaction ? transaction.weight.toFixed(2) : '';
  const priceValue = transaction ? transaction.price : state.wasteTypes.find(type => type.id === wasteTypeValue).price;
  const withdrawAmountValue = transaction && transaction.transactionType === 'cair' ? Math.abs(transaction.total) : '';

  const recentCustomerOptions = state.customers.map(c => `<option value="${c.name}"></option>`).join('');
  app.innerHTML = `
    <div class="card">
      ${renderHeader(isEdit ? 'Edit Transaksi' : 'Transaksi Baru', '')}
      <div class="form-card">
        <div class="form-row">
          <label>
            Pelanggan
            <input id="customerName" list="customerList" type="text" placeholder="Cari / tulis nama pelanggan" autocomplete="off" value="${customerNameValue}" />
            <datalist id="customerList">${recentCustomerOptions}</datalist>
          </label>
          <label>
            Tipe transaksi
            <select id="transactionMode">
              <option value="setor" ${selectedMode === 'setor' ? 'selected' : ''}>Setor sampah</option>
              <option value="cair" ${selectedMode === 'cair' ? 'selected' : ''}>Cairkan uang</option>
              <option value="setor_dan_cair" ${selectedMode === 'setor_dan_cair' ? 'selected' : ''}>Setor sampah + Cairkan uang</option>
            </select>
          </label>
          <div id="standardFields">
            <label>
              Jenis sampah
              <select id="wasteTypeSelect">${state.wasteTypes.map(type => `<option value="${type.id}" ${type.id === wasteTypeValue ? 'selected' : ''}>${type.name}</option>`).join('')}</select>
            </label>
            <label>
              Berat (kg)
              <input id="weightInput" type="number" min="0" step="0.1" placeholder="0.0" value="${weightValue}" />
            </label>
            <label>
              Harga per kg
              <input id="priceInput" type="number" min="0" step="100" value="${priceValue}" />
            </label>
          </div>
          <div id="withdrawFields" class="${selectedMode === 'cair' ? '' : 'hidden'}">
            <label>
              Jumlah pencairan
              <input id="withdrawAmount" type="number" min="0" step="100" placeholder="0" value="${withdrawAmountValue}" />
            </label>
          </div>
          <label>
            Catatan (opsional)
            <textarea id="noteInput" rows="3" placeholder="Contoh: dompet, keperluan keluarga">${noteValue}</textarea>
          </label>
        </div>
      </div>
      <div class="list-card summary-card">
        <div class="summary-item"><div><span>Total otomatis</span><h3 id="totalValue">Rp 0</h3></div></div>
        <div class="summary-item"><div><span>Tanggal</span><h3>${formatDate(new Date().toISOString())}</h3></div></div>
        <div class="summary-item"><div><span>Petugas</span><h3>${state.currentUser.name}</h3></div></div>
      </div>
      <button id="saveTransactionButton">${isEdit ? 'Simpan perubahan' : 'Simpan transaksi'}</button>
    </div>
    ${renderNavigation('new-transaction')}
  `;

  const customerName = document.getElementById('customerName');
  const transactionMode = document.getElementById('transactionMode');
  const wasteTypeSelect = document.getElementById('wasteTypeSelect');
  const weightInput = document.getElementById('weightInput');
  const priceInput = document.getElementById('priceInput');
  const withdrawAmountInput = document.getElementById('withdrawAmount');
  const totalValueEl = document.getElementById('totalValue');
  const standardFields = document.getElementById('standardFields');
  const withdrawFields = document.getElementById('withdrawFields');

  const updatePrice = () => {
    const type = state.wasteTypes.find(item => item.id === wasteTypeSelect.value);
    if (type) {
      priceInput.value = type.price;
      calculateTotal();
    }
  };

  const updateTransactionMode = () => {
    const modeValue = transactionMode.value;
    standardFields.style.display = (modeValue === 'setor' || modeValue === 'setor_dan_cair') ? 'grid' : 'none';
    withdrawFields.style.display = modeValue === 'cair' ? 'block' : 'none';
    calculateTotal();
  };

  const calculateTotal = () => {
    const modeValue = transactionMode.value;
    if (modeValue === 'cair') {
      const amount = parseInt(withdrawAmountInput.value, 10) || 0;
      totalValueEl.textContent = formatCurrency(-Math.abs(amount));
      return;
    }
    if (modeValue === 'setor_dan_cair') {
      const weight = parseFloat(weightInput.value) || 0;
      const price = parseInt(priceInput.value, 10) || 0;
      const depositValue = Math.max(0, weight * price);
      totalValueEl.textContent = formatCurrency(0) + ' (Sampah masuk, uang keluar langsung)';
      return;
    }
    const weight = parseFloat(weightInput.value) || 0;
    const price = parseInt(priceInput.value, 10) || 0;
    const total = Math.max(0, weight * price);
    totalValueEl.textContent = formatCurrency(total);
  };

  transactionMode.addEventListener('change', updateTransactionMode);
  wasteTypeSelect.addEventListener('change', updatePrice);
  weightInput.addEventListener('input', calculateTotal);
  priceInput.addEventListener('input', calculateTotal);
  withdrawAmountInput.addEventListener('input', calculateTotal);

  updateTransactionMode();

  document.getElementById('saveTransactionButton').addEventListener('click', () => {
    const customerNameValue = customerName.value.trim();
    const transactionType = transactionMode.value;
    const note = document.getElementById('noteInput').value.trim();
    const customer = state.customers.find(c => c.name.toLowerCase() === customerNameValue.toLowerCase()) || { id: `C${Date.now()}`, name: customerNameValue, balance: 0, visits: 0 };

    if (!customerNameValue) return alert('Isi nama pelanggan.');
    if (transactionType === 'setor' || transactionType === 'setor_dan_cair') {
      const wasteTypeId = wasteTypeSelect.value;
      const weight = parseFloat(weightInput.value);
      const price = parseInt(priceInput.value, 10);
      if (!wasteTypeId) return alert('Pilih jenis sampah.');
      if (!weight || weight <= 0) return alert('Berat harus lebih dari 0 kg.');
      if (!price || price <= 0) return alert('Harga per kg harus valid.');
      
      let total = Math.round(weight * price);
      let wasteTypeName = state.wasteTypes.find(t => t.id === wasteTypeId).name;
      let finalNote = note;
      
      if (transactionType === 'setor_dan_cair') {
        // Setor sampah + langsung cairkan uang (tidak menyimpan di saldo)
        // Total = 0 (sampah masuk, uang keluar)
        finalNote = `${note ? note + ' | ' : ''}Setor ${weight.toFixed(2)} kg, Cairkan: Rp ${formatCurrency(total).replace('Rp ', '')}`;
        total = 0;
      }
      
      const typeData = state.wasteTypes.find(t => t.id === wasteTypeId);
      const transactionData = {
        id: transaction ? transaction.id : `TX${Date.now()}`,
        customerId: customer.id,
        customerName: customer.name,
        date: new Date().toISOString(),
        transactionType,
        wasteTypeId,
        wasteTypeName,
        weight,
        price,
        total,
        staff: state.currentUser.name,
        note: finalNote,
      };
      if (transaction) {
        Object.assign(transaction, transactionData);
      } else {
        state.transactions.unshift(transactionData);
      }
    } else {
      const amount = parseInt(withdrawAmountInput.value, 10);
      if (!amount || amount <= 0) return alert('Jumlah pencairan harus lebih dari 0.');
      if (!customer.balance || customer.balance < amount) return alert('Saldo nasabah tidak mencukupi.');
      const transactionData = {
        id: transaction ? transaction.id : `TX${Date.now()}`,
        customerId: customer.id,
        customerName: customer.name,
        date: new Date().toISOString(),
        transactionType,
        wasteTypeId: 'cair',
        wasteTypeName: 'Pencairan Uang',
        weight: 0,
        price: 0,
        total: -Math.abs(amount),
        staff: state.currentUser.name,
        note,
      };
      if (transaction) {
        Object.assign(transaction, transactionData);
      } else {
        state.transactions.unshift(transactionData);
      }
    }

    if (!state.customers.some(c => c.id === customer.id)) {
      state.customers.push(customer);
    }

    recalculateCustomerBalances();
    saveState();
    showToast(`${transaction ? 'Perubahan transaksi' : 'Transaksi'} berhasil disimpan untuk ${customer.name}`);
    renderTransactionDetail(transaction || state.transactions[0]);
  });
}

function recalculateCustomerBalances() {
  state.customers.forEach(customer => {
    customer.balance = 0;
    customer.visits = 0;
  });
  state.transactions.forEach(tx => {
    const customer = state.customers.find(c => c.id === tx.customerId);
    if (customer) {
      customer.balance = (customer.balance || 0) + tx.total;
      customer.visits = (customer.visits || 0) + 1;
    }
  });
}

function renderTransactionDetail(transaction) {
  app.innerHTML = `
    <div class="card">
      ${renderHeader('Rinci Transaksi', 'Detail tercatat dan siap dicetak/tampil ulang')}
      <div class="list-card">
        <div class="list-item"><div class="meta"><span>Transaksi</span><h3>${transaction.id}</h3></div></div>
        <div class="list-item"><div class="meta"><span>Pelanggan</span><h3>${transaction.customerName}</h3></div></div>
        <div class="list-item"><div class="meta"><span>Tipe transaksi</span><h3>${getTransactionTypeLabel(transaction)}</h3></div></div>
        <div class="list-item"><div class="meta"><span>Sampah</span><h3>${transaction.wasteTypeName}</h3></div></div>
        <div class="list-item"><div class="meta"><span>Berat</span><h3>${transaction.weight.toFixed(2)} kg</h3></div></div>
        <div class="list-item"><div class="meta"><span>Harga / kg</span><h3>${formatCurrency(transaction.price)}</h3></div></div>
        <div class="list-item"><div class="meta"><span>Total nilai</span><h3>${formatCurrency(transaction.total)}</h3></div></div>
        <div class="list-item"><div class="meta"><span>Tanggal</span><h3>${formatDate(transaction.date)}</h3></div></div>
        <div class="list-item"><div class="meta"><span>Petugas</span><h3>${transaction.staff}</h3></div></div>
        ${transaction.note ? `<div class="list-item"><div class="meta"><span>Catatan</span><h3>${transaction.note}</h3></div></div>` : ''}
      </div>
      <div class="form-row">
        <button onclick="window.editTransaction('${transaction.id}')">Edit transaksi</button>
        <button class="secondary" onclick="window.deleteTransaction('${transaction.id}')">Hapus transaksi</button>
      </div>
      <div class="form-row">
        <button class="secondary" style="background: #f0f0f0; color: #666;" onclick="location.hash='history'">Lihat riwayat</button>
      </div>
    </div>
    ${renderNavigation('history')}
  `;
}

function renderCustomers() {
  const params = parseHashRoute().params;
  const search = params.get('q') || '';
  const filtered = state.customers
    .filter(customer => customer.name.toLowerCase().includes(search.toLowerCase()) || customer.id.includes(search))
    .sort((a, b) => b.balance - a.balance);

  app.innerHTML = `
    <div class="card">
      ${renderHeader('Daftar Pelanggan', 'Cari dan pilih pelanggan untuk transaksi cepat')}
      <div class="form-row">
        <input id="customerSearch" type="search" placeholder="Cari nama atau ID" value="${search || ''}" />
      </div>
      ${filtered.length ? filtered.map(customer => `
        <div class="list-item">
          <div class="meta"><h3>${customer.name}</h3><span>ID ${customer.id} • ${customer.visits} kunjungan</span></div>
          <div class="customer-actions">
            <button class="secondary" onclick="location.hash='new-transaction?mode=cair&customerId=${customer.id}'">Cairkan uang</button>
            <strong>${formatCurrency(customer.balance)}</strong>
          </div>
        </div>
      `).join('') : `<div class="empty-state"><p>Tidak ada pelanggan yang cocok.</p></div>`}
      <button class="secondary" onclick="location.hash='new-transaction'">Tambah pelanggan atau transaksi</button>
    </div>
    ${renderNavigation('customers')}
  `;

  document.getElementById('customerSearch').addEventListener('input', e => {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
      location.hash = `customers?q=${encodeURIComponent(e.target.value)}`;
    }, 800);
  });
}

function renderHistory() {
  const params = parseHashRoute().params;
  const query = params.get('q') || '';
  const type = params.get('type') || '';
  const filtered = state.transactions.filter(tx => {
    const matchesText = [tx.customerName, tx.wasteTypeName, tx.id].some(text => text.toLowerCase().includes(query.toLowerCase()));
    const matchesType = type ? tx.wasteTypeId === type : true;
    return matchesText && matchesType;
  });

  app.innerHTML = `
    <div class="card">
      ${renderHeader('Riwayat Transaksi', 'Filter berdasarkan pelanggan, jenis sampah, atau tanggal')}
      <div class="form-row">
        <input id="historySearch" type="search" placeholder="Cari pelanggan, sampah, atau ID" value="${query}" />
        <select id="historyType">
          <option value="">Semua jenis</option>
          ${state.wasteTypes.map(typeItem => `<option value="${typeItem.id}" ${typeItem.id === type ? 'selected' : ''}>${typeItem.name}</option>`).join('')}
        </select>
      </div>
      <div class="form-row">
        <button class="outline" id="exportHistoryButton">Unduh CSV transaksi</button>
      </div>
      ${filtered.length ? filtered.slice(0, 40).map(tx => `
        <div class="list-item outline history-row" onclick="showTransactionDetail('${tx.id}')">
          <div class="meta"><h3>${tx.customerName}</h3><span class="transaction-type">${getTransactionTypeLabel(tx)}</span><span>${formatDate(tx.date)}</span></div>
          <div class="history-row-actions">
            <button class="secondary" type="button" onclick="event.stopPropagation(); window.editTransaction('${tx.id}')">Edit</button>
            <strong>${formatCurrency(tx.total)}</strong>
          </div>
        </div>
      `).join('') : `<div class="empty-state"><p>Riwayat kosong atau tidak ditemukan.</p></div>`}
    </div>
    ${renderNavigation('history')}
  `;

  document.getElementById('historySearch').addEventListener('input', e => {
    clearTimeout(searchDebounceTimer);
    const queryValue = e.target.value;
    searchDebounceTimer = setTimeout(() => {
      params.set('q', queryValue);
      location.hash = `history?${params.toString()}`;
    }, 800);
  });
  document.getElementById('historyType').addEventListener('change', e => {
    if (e.target.value) params.set('type', e.target.value); else params.delete('type');
    location.hash = `history?${params.toString()}`;
  });
  document.getElementById('exportHistoryButton').addEventListener('click', () => {
    const csvContent = buildTransactionsCSV(filtered);
    downloadCSV(`riwayat-transaksi-${new Date().toISOString().slice(0,10)}.csv`, csvContent);
  });
}

window.showTransactionDetail = function(transactionId) {
  const transaction = state.transactions.find(tx => tx.id === transactionId);
  if (!transaction) return alert('Transaksi tidak ditemukan.');
  renderTransactionDetail(transaction);
};

window.editTransaction = function(transactionId) {
  const transaction = state.transactions.find(tx => tx.id === transactionId);
  if (!transaction) return alert('Transaksi tidak ditemukan.');
  renderTransactionForm(transaction, transaction.transactionType || 'setor');
};

window.deleteTransaction = function(transactionId) {
  const transaction = state.transactions.find(tx => tx.id === transactionId);
  if (!transaction) return alert('Transaksi tidak ditemukan.');
  if (!confirm(`Yakin ingin menghapus transaksi ${transaction.id} untuk ${transaction.customerName}? Saldo pelanggan akan diperbaharui.`)) return;
  state.transactions = state.transactions.filter(tx => tx.id !== transactionId);
  recalculateCustomerBalances();
  saveState();
  showToast(`Transaksi ${transaction.id} berhasil dihapus`);
  location.hash = 'history';
};

window.logout = function() {
  const staffName = state.currentUser.name;
  if (!confirm(`Logout dari petugas ${staffName}? Anda dapat login dengan petugas lain.`)) return;
  state.currentUser = null;
  saveState();
  showToast(`${staffName} berhasil logout. Selamat datang kembali!`);
  location.hash = 'login';
};

function renderPrices() {
  app.innerHTML = `
    <div class="card">
      ${renderHeader('Kelola Harga Sampah', 'Perbarui harga per kg sesuai pasar dan laporan')}
      ${state.wasteTypes.map(type => `
        <div class="list-item">
          <div class="meta"><h3>${type.name}</h3><span>Harga hari ini</span></div>
          <div><strong>${formatCurrency(type.price)}</strong></div>
        </div>
      `).join('')}
      <div class="form-card">
        <div class="form-row">
          <label>Jenis sampah
            <select id="wastePriceSelect">${state.wasteTypes.map(type => `<option value="${type.id}">${type.name}</option>`).join('')}</select>
          </label>
          <label>Harga baru per kg
            <input id="wastePriceInput" type="number" min="0" step="100" />
          </label>
        </div>
        <button id="updatePriceButton">Perbarui harga</button>
      </div>
      ${renderNavigation('prices')}
    </div>
  `;

  const priceSelect = document.getElementById('wastePriceSelect');
  const priceInput = document.getElementById('wastePriceInput');
  const updatePriceInput = () => {
    const selected = state.wasteTypes.find(type => type.id === priceSelect.value);
    priceInput.value = selected.price;
  };
  priceSelect.addEventListener('change', updatePriceInput);
  updatePriceInput();

  document.getElementById('updatePriceButton').addEventListener('click', () => {
    const typeId = priceSelect.value;
    const newPrice = parseInt(priceInput.value, 10);
    if (!newPrice || newPrice <= 0) return alert('Masukkan harga valid.');
    const type = state.wasteTypes.find(item => item.id === typeId);
    type.price = newPrice;
    saveState();
    showToast(`Harga ${type.name} diperbarui menjadi ${formatCurrency(newPrice)}`);
    renderPrices();
  });
}

function renderBalances() {
  const sortedCustomers = [...state.customers].sort((a,b) => b.balance - a.balance);
  app.innerHTML = `
    <div class="card">
      ${renderHeader('Saldo Tabungan', 'Lihat saldo pelanggan dan kunjungan secara cepat')}
      ${sortedCustomers.map(customer => `
        <div class="list-item">
          <div class="meta"><h3>${customer.name}</h3><span>ID ${customer.id} • ${customer.visits} kali</span></div>
          <div><strong>${formatCurrency(customer.balance)}</strong></div>
        </div>
      `).join('')}
    </div>
    ${renderNavigation('balances')}
  `;
}

function renderReports() {
  const monthlyTotals = {};
  state.transactions.forEach(tx => {
    const key = tx.date.slice(0, 7);
    monthlyTotals[key] = (monthlyTotals[key] || 0) + tx.total;
  });
  const reportRows = Object.keys(monthlyTotals).sort((a,b) => b.localeCompare(a)).slice(0, 6).map(month => `
    <div class="list-item"><div class="meta"><h3>${month}</h3><span>Total nilai</span></div><strong>${formatCurrency(monthlyTotals[month])}</strong></div>
  `).join('');
  const reportSection = reportRows ? `<div class="report-grid">${reportRows}</div>` : `<div class="empty-state"><p>Belum ada transaksi untuk laporan.</p></div>`;

  app.innerHTML = `
    <div class="card">
      ${renderHeader('Rekap & Laporan', 'Lihat ringkasan bulanan dan 6 bulan terakhir')}
      <div class="metric-card"><strong>${formatCurrency(state.transactions.reduce((sum, tx) => sum + tx.total, 0))}</strong><span>Total nilai semua transaksi</span></div>
      <div class="metric-card"><strong>${state.transactions.length}</strong><span>Jumlah transaksi</span></div>
      <div class="metric-card"><strong>${state.customers.length}</strong><span>Pelanggan terdaftar</span></div>
      <div class="form-row">
        <button class="outline" id="exportReportButton">Unduh CSV semua transaksi</button>
      </div>
      <div class="page-title"><div><h2>Ringkasan 6 bulan</h2></div></div>
      ${reportSection}
    </div>
    ${renderNavigation('reports')}
  `;
  document.getElementById('exportReportButton').addEventListener('click', () => {
    const csvContent = buildTransactionsCSV([...state.transactions]);
    downloadCSV(`laporan-transaksi-${new Date().toISOString().slice(0,10)}.csv`, csvContent);
  });
}

function renderSettings() {
  app.innerHTML = `
    <div class="card">
      ${renderHeader('Pengaturan', 'Atur aplikasi untuk operasi harian dan offline-friendly')}
      <div class="alert">Data disimpan secara lokal pada perangkat. Aplikasi tetap dapat digunakan tanpa koneksi internet.</div>
      <div class="form-card">
        <div class="form-row">
          <button class="outline" onclick="window.logout()">Ganti petugas (Logout)</button>
        </div>
        <div class="form-row">
          <button class="outline" id="resetDataButton">Reset data & mulai ulang</button>
        </div>
        <div class="form-row">
          <button class="secondary" onclick="location.hash='dashboard'">Kembali ke dashboard</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('resetDataButton').addEventListener('click', () => {
    if (confirm('Reset semua data lokal dan mulai ulang aplikasi?')) {
      state.currentUser = null;
      localStorage.removeItem(storageKey);
      location.reload();
    }
  });
}

function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'alert';
  toast.textContent = message;
  toast.style.position = 'fixed';
  toast.style.left = '16px';
  toast.style.right = '16px';
  toast.style.bottom = '24px';
  toast.style.zIndex = 1000;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2200);
}

window.addEventListener('hashchange', route);
window.addEventListener('load', route);
