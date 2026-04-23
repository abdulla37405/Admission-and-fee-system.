require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("Warning: MONGODB_URI not found in .env");
} else {
  mongoose.connect(MONGODB_URI)
    .then(() => console.log('Connected to MongoDB!'))
    .catch(err => console.error('MongoDB connection error:', err));
}

// ================= SCHEMAS =================

// Each payment is stored as a sub-document — old records are never overwritten
const PaymentSchema = new mongoose.Schema({
  fee: { type: Number, default: 0 },
  feeDate: { type: String, default: '' },
  month: { type: String, default: '' },
  status: { type: String, default: 'PAID' },
  method: { type: String, default: 'Cash' },
  notes: { type: String, default: '' },
  recordedAt: { type: Date, default: Date.now }
});

const Student = mongoose.model('Student', new mongoose.Schema({
  name: String,
  guardian: String,
  ageGroup: String,
  session: String,
  contact: String,
  // Current/latest status snapshot (for quick filtering)
  status: { type: String, default: 'UNPAID' },
  fee: { type: Number, default: 0 },
  feeDate: { type: String, default: '' },
  month: { type: String, default: '' },
  // Full payment history — every payment is pushed here
  payments: [PaymentSchema]
}));

const Expense = mongoose.model('Expense', new mongoose.Schema({
  title: String, amount: Number, category: String,
  date: String, month: String, description: String
}));

const Stock = mongoose.model('Stock', new mongoose.Schema({
  item: String, category: String, quantity: Number,
  qty: Number, unitCost: Number, condition: String, lastUpdated: String
}));

// ================= ROUTES =================

// GET all data
app.get('/api/data', async (req, res) => {
  try {
    const students = await Student.find({});
    const expenses = await Expense.find({});
    const stock = await Stock.find({});
    res.json({ students, expenses, stock });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// -- STUDENTS --

// Add new student
app.post('/api/students', async (req, res) => {
  try {
    const student = new Student(req.body);
    await student.save();
    res.json(student);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Edit student info (name, guardian, contact, ageGroup, session, month)
app.put('/api/students/:id', async (req, res) => {
  try {
    const student = await Student.findByIdAndUpdate(
      req.params.id, req.body, { new: true }
    );
    res.json(student);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Delete student
app.delete('/api/students/:id', async (req, res) => {
  try {
    await Student.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── PAYMENTS ──────────────────────────────────────────────────────────────────
// Record a new payment — pushes to payments[] and updates the latest snapshot.
// Old payment records are NEVER deleted or overwritten.
app.post('/api/students/:id/payments', async (req, res) => {
  try {
    const { fee, feeDate, month, status, method, notes } = req.body;

    const newPayment = { fee, feeDate, month, status: status || 'PAID', method, notes };

    const student = await Student.findByIdAndUpdate(
      req.params.id,
      {
        // Push this payment into the history array
        $push: { payments: newPayment },
        // Also update the top-level snapshot fields for quick filtering
        $set: { fee, feeDate, month, status: status || 'PAID' }
      },
      { new: true }
    );

    res.json(student);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Edit an existing payment in the payments[] array
app.put('/api/students/:id/payments/:paymentId', async (req, res) => {
  try {
    const { fee, feeDate, month, status, method, notes } = req.body;

    const student = await Student.findOneAndUpdate(
      { _id: req.params.id, 'payments._id': req.params.paymentId },
      {
        $set: {
          'payments.$.fee': fee,
          'payments.$.feeDate': feeDate,
          'payments.$.month': month,
          'payments.$.status': status,
          'payments.$.method': method,
          'payments.$.notes': notes,
        }
      },
      { new: true }
    );

    // Recalculate latest snapshot from most recent payment
    if (student && student.payments.length > 0) {
      const latest = student.payments[student.payments.length - 1];
      student.fee = latest.fee;
      student.feeDate = latest.feeDate;
      student.month = latest.month;
      student.status = latest.status;
      await student.save();
    }

    res.json(student);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Delete a payment from the payments[] array
app.delete('/api/students/:id/payments/:paymentId', async (req, res) => {
  try {
    const student = await Student.findByIdAndUpdate(
      req.params.id,
      { $pull: { payments: { _id: req.params.paymentId } } },
      { new: true }
    );

    // Recalculate latest snapshot after deletion
    if (student) {
      if (student.payments.length > 0) {
        const latest = student.payments[student.payments.length - 1];
        student.fee = latest.fee;
        student.feeDate = latest.feeDate;
        student.month = latest.month;
        student.status = latest.status;
      } else {
        // No payments left — reset to UNPAID
        student.fee = 0;
        student.feeDate = '';
        student.month = '';
        student.status = 'UNPAID';
      }
      await student.save();
    }

    res.json(student);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// -- EXPENSES --
app.post('/api/expenses', async (req, res) => {
  try {
    const expense = new Expense(req.body);
    await expense.save();
    res.json(expense);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/expenses/:id', async (req, res) => {
  try {
    await Expense.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// -- STOCK --
app.post('/api/stock', async (req, res) => {
  try {
    const stock = new Stock(req.body);
    await stock.save();
    res.json(stock);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/stock/:id', async (req, res) => {
  try {
    const stock = await Stock.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(stock);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/stock/:id', async (req, res) => {
  try {
    await Stock.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Backend server running on http://localhost:${PORT}`));
