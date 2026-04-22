const fs = require('fs');
let code = fs.readFileSync('academy_management (2).html', 'utf8');

const regex = /<script>([\s\S]*?)<\/script>/;
const newScript = `
      // =================== DATA STORE ===================
      const API_BASE = 'http://localhost:3001';

      let DB = { students: [], expenses: [], stock: [] };

      let editingStudentId = null;
      let studentPage = 1; const SPER = 20;
      let feePage = 1; const FPER = 25;

      // =================== INITIAL DATA FETCH ===================
      async function fetchData() {
        try {
          const res = await fetch(API_BASE + '/api/data');
          const data = await res.json();
          DB.students = data.students || [];
          DB.expenses = data.expenses || [];
          DB.stock = data.stock || [];
          
          buildYearOptions();
          populateMonthFilters();
          
          const activeId = document.querySelector('.page.active')?.id || 'page-dashboard';
          if (activeId === 'page-dashboard') renderDashboard();
          else if (activeId === 'page-students') renderStudents();
          else if (activeId === 'page-fees') renderFees();
          else if (activeId === 'page-expenses') renderExpenses();
          else if (activeId === 'page-stock') renderStock();
        } catch (err) {
          console.error(err);
          toast('Failed to load data from server. Ensure backend is running.', '#ff3b5c');
        }
      }

      // =================== MONTH OPTIONS HELPER ===================
      function buildYearOptions() {
        const currentYear = new Date().getFullYear();
        const yearSet = new Set(DB.students.map(s => s.month).filter(Boolean).map(m => m.split(' ')[1]).filter(Boolean));
        yearSet.add(String(currentYear));
        const sorted = Array.from(yearSet).sort();
        const sel = document.getElementById('dash-year-select');
        if (!sel) return;
        sel.innerHTML = sorted.map(y =>
          \`<option value="\${y}"\${y === String(currentYear) ? ' selected' : ''}>\${y}</option>\`
        ).join('');
        populateDashMonthSelect();
      }

      function populateDashMonthSelect() {
        const sel = document.getElementById('dash-month-select');
        if (!sel) return;
        const year = document.getElementById('dash-year-select')?.value || String(new Date().getFullYear());
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const present = new Set(DB.students.filter(s => s.month && s.month.endsWith(year)).map(s => s.month.split(' ')[0]));
        const opts = ['<option value="">All Months</option>'];
        monthNames.forEach(m => {
          if (present.has(m)) opts.push(\`<option value="\${m}">\${m}</option>\`);
        });
        sel.innerHTML = opts.join('');
      }

      function onDashYearChange() { populateDashMonthSelect(); renderDashboard(); }

      function getCurrentMonthLabel() {
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const now = new Date();
        return months[now.getMonth()] + ' ' + now.getFullYear();
      }

      function getCurrentMonthInput() {
        const now = new Date();
        return \`\${now.getFullYear()}-\${String(now.getMonth() + 1).padStart(2, '0')}\`;
      }

      function monthInputToLabel(val) {
        if (!val) return '';
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const [y, m] = val.split('-');
        return months[parseInt(m, 10) - 1] + ' ' + y;
      }

      function monthLabelToInput(label) {
        if (!label) return '';
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const parts = label.split(' ');
        if (parts.length < 2) return '';
        const mIdx = months.indexOf(parts[0]);
        if (mIdx === -1) return '';
        return \`\${parts[1]}-\${String(mIdx + 1).padStart(2, '0')}\`;
      }

      function navigate(page) {
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        document.getElementById('page-' + page).classList.add('active');
        event.currentTarget.classList.add('active');
        if (page === 'dashboard') renderDashboard();
        if (page === 'students') renderStudents();
        if (page === 'fees') renderFees();
        if (page === 'expenses') renderExpenses();
        if (page === 'stock') renderStock();
      }

      // =================== DASHBOARD ===================
      function renderDashboard() {
        const selectedYear = document.getElementById('dash-year-select')?.value || String(new Date().getFullYear());
        const selectedMonth = document.getElementById('dash-month-select')?.value || '';

        const subEl = document.getElementById('dash-month-sub');
        if (subEl) subEl.textContent = 'Academy overview — ' + (selectedMonth ? selectedMonth + ' ' + selectedYear : selectedYear);

        const s = DB.students.filter(x => {
          if (!x.month) return false;
          if (!x.month.endsWith(selectedYear)) return false;
          if (selectedMonth && !x.month.startsWith(selectedMonth)) return false;
          return true;
        });

        const counts = { PAID: 0, FREEZE: 0, UNPAID: 0, DEFAULTER: 0, LEFT: 0, SPONSORED: 0 };
        s.forEach(x => counts[x.status] = (counts[x.status] || 0) + 1);
        const totalFees = s.filter(x => x.status === 'PAID').reduce((a, x) => a + (x.fee || 0), 0);
        const stockVal = DB.stock.reduce((a, x) => a + (x.qty || 0) * (x.unitCost || 0), 0);

        document.getElementById('dash-stats').innerHTML = [
          ['Total Students', s.length, 'blue'],
          ['Paid', counts.PAID, 'green'],
          ['Freeze', counts.FREEZE, 'blue'],
          ['Unpaid', counts.UNPAID + counts.DEFAULTER, 'red'],
          ['Left', counts.LEFT, 'gray'],
        ].map(([l, v, c]) => \`<div class="stat-card \${c}"><div class="stat-num">\${v}</div><div class="stat-label">\${l}</div></div>\`).join('');

        document.getElementById('dash-total-fees').textContent = 'Rs ' + totalFees.toLocaleString();
        document.getElementById('dash-fee-sub').textContent = counts.PAID + ' students paid';
        document.getElementById('dash-stock-count').textContent = DB.stock.length + ' items';
        document.getElementById('dash-stock-sub').textContent = 'Rs ' + stockVal.toLocaleString() + ' total value';

        const netEl = document.getElementById('dash-net');
        netEl.textContent = 'Rs ' + totalFees.toLocaleString() + ' collected';
        netEl.style.color = 'var(--paid)';

        const total = s.length || 1;
        document.getElementById('status-breakdown').innerHTML = Object.entries(counts).map(([k, v]) => {
          const colors = { PAID: 'var(--paid)', FREEZE: 'var(--freeze)', UNPAID: 'var(--unpaid)', DEFAULTER: 'var(--defaulter)', LEFT: 'var(--left)', SPONSORED: 'var(--sponsored)' };
          const pct = Math.round(v / total * 100);
          return \`<div style="margin-bottom:12px;">
      <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px;">
        <span>\${k}</span><span style="color:var(--muted)">\${v} (\${pct}%)</span>
      </div>
      <div class="prog-bar"><div class="prog-fill" style="width:\${pct}%;background:\${colors[k] || 'var(--accent)'}"></div></div>
    </div>\`;
        }).join('');

        const ageCounts = {};
        s.forEach(x => { ageCounts[x.ageGroup] = (ageCounts[x.ageGroup] || 0) + 1; });
        document.getElementById('age-breakdown').innerHTML = Object.entries(ageCounts).sort((a, b) => b[1] - a[1]).map(([k, v]) => {
          const pct = Math.round(v / total * 100);
          return \`<div style="margin-bottom:10px;">
      <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px;">
        <span>\${k}</span><span style="color:var(--muted)">\${v}</span>
      </div>
      <div class="prog-bar"><div class="prog-fill" style="width:\${pct}%;background:var(--accent2)"></div></div>
    </div>\`;
        }).join('');
      }

      // =================== STUDENTS ===================
      function populateMonthFilters() {
        const months = Array.from(new Set(DB.students.map(s => s.month).filter(Boolean))).sort((a, b) => {
          return new Date(a.replace(' ', '-') + '-01') - new Date(b.replace(' ', '-') + '-01');
        });
        ['filter-month', 'fee-month-filter'].forEach(id => {
          const sel = document.getElementById(id);
          if (!sel) return;
          const cur = sel.value;
          sel.innerHTML = '<option value="">All Months</option>' +
            months.map(m => \`<option value="\${m}"\${m === cur ? ' selected' : ''}>\${m}</option>\`).join('');
        });
      }

      function getFilteredStudents() {
        const search = document.getElementById('student-search').value.toLowerCase();
        const st = document.getElementById('filter-status').value;
        const ag = document.getElementById('filter-age').value;
        const se = document.getElementById('filter-session').value;
        const mo = document.getElementById('filter-month').value;
        return DB.students.filter(s => {
          if (st && s.status !== st) return false;
          if (ag && s.ageGroup !== ag) return false;
          if (se && s.session && s.session.trim() !== se) return false;
          if (mo && s.month !== mo) return false;
          if (search && !s.name.toLowerCase().includes(search) && !(s.guardian && s.guardian.toLowerCase().includes(search)) && !(s.contact && s.contact.includes(search))) return false;
          return true;
        });
      }

      function renderStudents() {
        const all = getFilteredStudents();
        const total = all.length;
        const maxPage = Math.ceil(total / SPER) || 1;
        if (studentPage > maxPage) studentPage = maxPage;
        const paged = all.slice((studentPage - 1) * SPER, studentPage * SPER);

        document.getElementById('student-count-sub').textContent = \`\${total} student\${total !== 1 ? 's' : ''} found\`;

        const tbody = document.getElementById('students-tbody');
        if (!paged.length) { tbody.innerHTML = '<tr><td colspan="9"><div class="empty"><div class="empty-icon">🏏</div>No students found</div></td></tr>'; }
        else {
          tbody.innerHTML = paged.map((s, i) => \`
      <tr>
        <td style="color:var(--muted)">\${(studentPage - 1) * SPER + i + 1}</td>
        <td><strong>\${s.name}</strong></td>
        <td style="color:var(--muted)">\${s.guardian || '—'}</td>
        <td><span class="tag">\${s.ageGroup || '—'}</span></td>
        <td><span class="tag">\${s.session || '—'}</span></td>
        <td><span class="badge badge-\${s.status}">\${s.status}</span></td>
        <td>\${s.fee ? 'Rs ' + s.fee.toLocaleString() : '—'}</td>
        <td style="font-size:12px;color:var(--muted)">\${s.contact || '—'}</td>
        <td>
          <button class="btn btn-secondary btn-sm" onclick="editStudent('\${s._id}')">✏️</button>
          <button class="btn btn-danger btn-sm" onclick="deleteStudent('\${s._id}')">🗑️</button>
        </td>
      </tr>
    \`).join('');
        }

        renderPagination('student-pagination', studentPage, maxPage, p => { studentPage = p; renderStudents(); });
      }

      function openAddStudent() {
        editingStudentId = null;
        document.getElementById('modal-student-title').textContent = 'Add Student';
        ['name', 'guardian', 'contact', 'fee', 'feedate'].forEach(f => document.getElementById('s-' + f).value = '');
        document.getElementById('s-month').value = getCurrentMonthInput();
        document.getElementById('modal-student').classList.add('open');
      }

      function editStudent(id) {
        const s = DB.students.find(x => x._id === id);
        if (!s) return;
        editingStudentId = id;
        document.getElementById('modal-student-title').textContent = 'Edit Student';
        document.getElementById('s-name').value = s.name || '';
        document.getElementById('s-guardian').value = s.guardian || '';
        document.getElementById('s-contact').value = s.contact || '';
        if(s.ageGroup) document.getElementById('s-age').value = s.ageGroup;
        if(s.session) document.getElementById('s-session').value = s.session.trim();
        if(s.status) document.getElementById('s-status').value = s.status;
        document.getElementById('s-fee').value = s.fee || '';
        document.getElementById('s-feedate').value = s.feeDate || '';
        document.getElementById('s-month').value = monthLabelToInput(s.month || getCurrentMonthLabel());
        document.getElementById('modal-student').classList.add('open');
      }

      async function saveStudent() {
        const data = {
          name: document.getElementById('s-name').value.trim(),
          guardian: document.getElementById('s-guardian').value.trim(),
          contact: document.getElementById('s-contact').value.trim(),
          ageGroup: document.getElementById('s-age').value,
          session: document.getElementById('s-session').value,
          status: document.getElementById('s-status').value,
          fee: parseFloat(document.getElementById('s-fee').value) || 0,
          feeDate: document.getElementById('s-feedate').value.trim(),
          month: monthInputToLabel(document.getElementById('s-month').value) || getCurrentMonthLabel(),
        };
        if (!data.name) { toast('Please enter student name', '#ff3b5c'); return; }
        
        try {
          if (editingStudentId) {
            await fetch(\`\${API_BASE}/api/students/\${editingStudentId}\`, {
              method: 'PUT', headers: {'Content-Type': 'application/json'},
              body: JSON.stringify(data)
            });
            toast('Student updated!');
          } else {
            await fetch(\`\${API_BASE}/api/students\`, {
              method: 'POST', headers: {'Content-Type': 'application/json'},
              body: JSON.stringify(data)
            });
            toast('Student added!');
          }
          closeModal('modal-student');
          fetchData();
        } catch(e) { toast('Error saving student', '#ff3b5c'); }
      }

      async function deleteStudent(id) {
        if (!confirm('Delete this student?')) return;
        try {
          await fetch(\`\${API_BASE}/api/students/\${id}\`, { method: 'DELETE' });
          toast('Student removed');
          fetchData();
        } catch(e) { toast('Error deleting', '#ff3b5c'); }
      }

      // =================== FEES ===================
      function renderFees() {
        const search = document.getElementById('fee-search').value.toLowerCase();
        const sf = document.getElementById('fee-status-filter').value;
        const mf = document.getElementById('fee-month-filter').value;
        let s = DB.students.filter(x => {
          if (sf) { if (sf === 'UNPAID' && x.status !== 'UNPAID' && x.status !== 'DEFAULTER') return false; if (sf !== 'UNPAID' && x.status !== sf) return false; }
          if (mf && x.month !== mf) return false;
          if (search && !x.name.toLowerCase().includes(search)) return false;
          return true;
        });

        const base = mf ? DB.students.filter(x => x.month === mf) : DB.students;
        const totalCollected = base.filter(x => x.status === 'PAID').reduce((a, x) => a + (x.fee || 0), 0);
        const paidCount = base.filter(x => x.status === 'PAID').length;
        const unpaidCount = base.filter(x => x.status === 'UNPAID' || x.status === 'DEFAULTER').length;
        const freezeCount = base.filter(x => x.status === 'FREEZE').length;

        document.getElementById('fee-stats').innerHTML = [
          ['Collected (PKR)', 'Rs ' + totalCollected.toLocaleString(), 'green'],
          ['Paid Students', paidCount, 'green'],
          ['Pending', unpaidCount, 'orange'],
          ['On Hold (Freeze)', freezeCount, 'blue'],
        ].map(([l, v, c]) => \`<div class="stat-card \${c}"><div class="stat-num" style="font-size:22px;">\${v}</div><div class="stat-label">\${l}</div></div>\`).join('');

        const maxPage = Math.ceil(s.length / FPER) || 1;
        if (feePage > maxPage) feePage = maxPage;
        const paged = s.slice((feePage - 1) * FPER, feePage * FPER);

        document.getElementById('fees-tbody').innerHTML = paged.map(x => \`
    <tr>
      <td><strong>\${x.name}</strong></td>
      <td style="color:var(--muted)">\${x.guardian || '—'}</td>
      <td><span class="tag">\${x.ageGroup || '—'}</span></td>
      <td><span class="tag">\${x.session || '—'}</span></td>
      <td>\${x.fee ? 'Rs ' + x.fee.toLocaleString() : '—'}</td>
      <td style="color:var(--muted)">\${x.feeDate || '—'}</td>
      <td><span class="badge badge-\${x.status}">\${x.status}</span></td>
      <td>
        <select style="background:var(--surface2);border:1px solid var(--border);border-radius:6px;padding:4px 8px;color:var(--text);font-size:12px;" onchange="changeStatus('\${x._id}',this.value)">
          <option value="">Change...</option>
          <option>PAID</option><option>UNPAID</option><option>FREEZE</option><option>DEFAULTER</option><option>LEFT</option>
        </select>
      </td>
    </tr>
  \`).join('') || '<tr><td colspan="8"><div class="empty"><div>No records found</div></div></td></tr>';

        renderPagination('fee-pagination', feePage, maxPage, p => { feePage = p; renderFees(); });
      }

      async function changeStatus(id, status) {
        if (!status) return;
        try {
          await fetch(\`\${API_BASE}/api/students/\${id}\`, {
            method: 'PUT', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ status })
          });
          toast('Status updated to ' + status); 
          fetchData(); 
        } catch(e) { toast('Error updating', '#ff3b5c'); }
      }

      function openAddPayment() {
        const dl = document.getElementById('student-list-dl');
        dl.innerHTML = DB.students.map(s => \`<option value="\${s.name}">\`).join('');
        document.getElementById('p-date').value = new Date().toISOString().slice(0, 10);
        document.getElementById('modal-payment').classList.add('open');
      }

      async function savePayment() {
        const name = document.getElementById('p-student').value.trim();
        const amount = parseFloat(document.getElementById('p-amount').value) || 0;
        const date = document.getElementById('p-date').value;
        if (!name) { toast('Enter student name', '#ff3b5c'); return; }
        const s = DB.students.find(x => x.name.toLowerCase() === name.toLowerCase());
        if (!s) { toast('Student not found!', '#ff3b5c'); return; }

        try {
          await fetch(\`\${API_BASE}/api/students/\${s._id}\`, {
            method: 'PUT', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ status: 'PAID', fee: amount || s.fee, feeDate: date })
          });
          toast('Payment recorded!');
          closeModal('modal-payment');
          fetchData();
        } catch(e) { toast('Error recording payment', '#ff3b5c'); }
      }

      // =================== EXPENSES ===================
      function renderExpenses() {
        const total = DB.expenses.reduce((a, x) => a + (x.amount || 0), 0);
        const cats = {};
        DB.expenses.forEach(x => { cats[x.category] = (cats[x.category] || 0) + (x.amount || 0); });
        const topCat = Object.entries(cats).sort((a, b) => b[1] - a[1])[0];

        document.getElementById('exp-stats').innerHTML = \`
    <div class="stat-card orange"><div class="stat-num" style="font-size:20px;">Rs \${total.toLocaleString()}</div><div class="stat-label">Total Expenses</div></div>
    <div class="stat-card blue"><div class="stat-num">\${DB.expenses.length}</div><div class="stat-label">Entries</div></div>
    \${topCat ? \`<div class="stat-card gray"><div class="stat-num" style="font-size:18px;">\${topCat[0]}</div><div class="stat-label">Top Category</div></div>\` : ''}
  \`;

        if (!DB.expenses.length) {
          document.getElementById('expenses-grid').innerHTML = '<div class="empty"><div class="empty-icon">📊</div><div>No expenses recorded yet</div></div>';
          return;
        }

        const catColors = { Salaries: 'var(--accent3)', Equipment: 'var(--accent2)', Maintenance: 'var(--paid)', Transport: 'var(--sponsored)', Utilities: 'var(--muted)', Marketing: '#fbbf24', Other: 'var(--muted)' };

        document.getElementById('expenses-grid').innerHTML = DB.expenses.map(e => \`
    <div class="card">
      <div class="card-header">
        <div>
          <div class="card-title">\${e.title}</div>
          <div class="card-meta">\${e.date || ''} • <span style="color:\${catColors[e.category] || 'var(--accent)'}">\${e.category}</span></div>
        </div>
        <div class="card-amount">Rs \${(e.amount || 0).toLocaleString()}</div>
      </div>
      \${e.description ? \`<div style="font-size:13px;color:var(--muted)">\${e.description}</div>\` : ''}
      <div class="card-actions">
        <button class="btn btn-danger btn-sm" onclick="deleteExpense('\${e._id}')">🗑️ Remove</button>
      </div>
    </div>
  \`).join('');
      }

      function openAddExpense() {
        document.getElementById('e-date').value = new Date().toISOString().slice(0, 10);
        document.getElementById('modal-expense').classList.add('open');
      }

      async function saveExpense() {
        const title = document.getElementById('e-title').value.trim();
        const amount = parseFloat(document.getElementById('e-amount').value) || 0;
        if (!title) { toast('Enter expense title', '#ff3b5c'); return; }
        
        try {
          await fetch(\`\${API_BASE}/api/expenses\`, {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
              title, amount, 
              category: document.getElementById('e-cat').value,
              date: document.getElementById('e-date').value,
              description: document.getElementById('e-desc').value.trim()
            })
          });
          toast('Expense added!');
          closeModal('modal-expense');
          fetchData();
        } catch(e) { toast('Error saving expense', '#ff3b5c'); }
      }

      async function deleteExpense(id) {
        if (!confirm('Delete this expense?')) return;
        try {
          await fetch(\`\${API_BASE}/api/expenses/\${id}\`, { method: 'DELETE' });
          toast('Expense deleted');
          fetchData();
        } catch(e) { toast('Error deleting', '#ff3b5c'); }
      }

      // =================== STOCK ===================
      function renderStock() {
        const totalVal = DB.stock.reduce((a, x) => a + (x.qty || 0) * (x.unitCost || 0), 0);
        const totalQty = DB.stock.reduce((a, x) => a + (x.qty || 0), 0);

        document.getElementById('stock-stats').innerHTML = \`
    <div class="stat-card blue"><div class="stat-num" style="font-size:20px;">Rs \${totalVal.toLocaleString()}</div><div class="stat-label">Total Value</div></div>
    <div class="stat-card green"><div class="stat-num">\${DB.stock.length}</div><div class="stat-label">Item Types</div></div>
    <div class="stat-card gray"><div class="stat-num">\${totalQty}</div><div class="stat-label">Total Units</div></div>
  \`;

        const condColor = { New: 'var(--paid)', Good: 'var(--freeze)', Fair: 'var(--unpaid)', Poor: 'var(--defaulter)' };

        document.getElementById('stock-tbody').innerHTML = DB.stock.map(s => \`
    <tr>
      <td><strong>\${s.item}</strong></td>
      <td><span class="tag">\${s.category}</span></td>
      <td style="font-family:'Bebas Neue',sans-serif;font-size:22px;">\${s.qty}</td>
      <td>Rs \${(s.unitCost || 0).toLocaleString()}</td>
      <td>Rs \${((s.qty || 0) * (s.unitCost || 0)).toLocaleString()}</td>
      <td><span style="color:\${condColor[s.condition] || 'var(--muted)'}">\${s.condition}</span></td>
      <td style="display:flex;gap:6px;align-items:center;">
        <button class="btn btn-secondary btn-sm" onclick="adjustQty('\${s._id}',-1)">−</button>
        <button class="btn btn-secondary btn-sm" onclick="adjustQty('\${s._id}',1)">+</button>
        <button class="btn btn-danger btn-sm" onclick="deleteStock('\${s._id}')">🗑️</button>
      </td>
    </tr>
  \`).join('') || '<tr><td colspan="7"><div class="empty">No stock items</div></td></tr>';
      }

      function openAddStock() { document.getElementById('modal-stock').classList.add('open'); }

      async function saveStock() {
        const item = document.getElementById('st-name').value.trim();
        if (!item) { toast('Enter item name', '#ff3b5c'); return; }
        
        try {
          await fetch(\`\${API_BASE}/api/stock\`, {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
              item,
              category: document.getElementById('st-cat').value,
              qty: parseInt(document.getElementById('st-qty').value) || 0,
              unitCost: parseInt(document.getElementById('st-cost').value) || 0,
              condition: document.getElementById('st-cond').value
            })
          });
          toast('Stock item added!');
          closeModal('modal-stock');
          fetchData();
        } catch(e) { toast('Error saving stock', '#ff3b5c'); }
      }

      async function adjustQty(id, delta) {
        const s = DB.stock.find(x => x._id === id);
        if (s) { 
          const newQty = Math.max(0, (s.qty || 0) + delta);
          try {
            await fetch(\`\${API_BASE}/api/stock/\${id}\`, {
              method: 'PUT', headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({ qty: newQty })
            });
            fetchData();
          } catch(e) { toast('Error adjusting stock qty', '#ff3b5c'); }
        }
      }

      async function deleteStock(id) {
        if (!confirm('Remove this item?')) return;
        try {
          await fetch(\`\${API_BASE}/api/stock/\${id}\`, { method: 'DELETE' });
          toast('Item removed');
          fetchData();
        } catch(e) { toast('Error removing stock', '#ff3b5c'); }
      }

      // =================== UTILITIES ===================
      function renderPagination(containerId, current, max, cb) {
        const el = document.getElementById(containerId);
        if (max <= 1) { el.innerHTML = ''; return; }
        let pages = [];
        for (let i = 1; i <= max; i++) {
          if (i === 1 || i === max || Math.abs(i - current) <= 2) pages.push(i);
          else if (pages[pages.length - 1] !== '...') pages.push('...');
        }
        el.innerHTML = \`<span class="page-info">\${current} of \${max}</span>\` +
          \`<button class="page-btn" onclick="(\${cb})(\${current - 1})" \${current === 1 ? 'disabled' : ''}>‹</button>\` +
          pages.map(p => p === '...' ? \`<span style="color:var(--muted);line-height:36px;">…</span>\` :
            \`<button class="page-btn\${p === current ? ' active' : ''}" onclick="(\${cb})(\${p})">\${p}</button>\`
          ).join('') +
          \`<button class="page-btn" onclick="(\${cb})(\${current + 1})" \${current === max ? 'disabled' : ''}>›</button>\`;
      }

      function closeModal(id) { document.getElementById(id).classList.remove('open'); }
      document.querySelectorAll('.modal-overlay').forEach(m => m.addEventListener('click', e => { if (e.target === m) m.classList.remove('open'); }));

      function toast(msg, bg = 'var(--accent)') {
        const t = document.getElementById('toast');
        t.textContent = msg; t.style.background = bg;
        t.classList.add('show');
        setTimeout(() => t.classList.remove('show'), 2500);
      }

      function downloadJSON() {
        const blob = new Blob([JSON.stringify(DB.students, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'students_clean.json';
        a.click();
      }

      // Init
      fetchData(); // Kick off fetch!
`;

code = code.replace(regex, '<script>\n' + newScript + '\n    </script>');
fs.writeFileSync('academy_management (2).html', code, 'utf8');
console.log('Done replacement!');
