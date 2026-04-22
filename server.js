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
const Student = mongoose.model('Student', new mongoose.Schema({
  name: String, guardian: String, ageGroup: String,
  session: String, status: String, fee: Number,
  feeDate: String, contact: String, month: String
}));

const Expense = mongoose.model('Expense', new mongoose.Schema({
  title: String, amount: Number, category: String, date: String, month: String, description: String
}));

const Stock = mongoose.model('Stock', new mongoose.Schema({
  item: String, category: String, quantity: Number, qty: Number, unitCost: Number, condition: String, lastUpdated: String
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
app.post('/api/students', async (req, res) => {
  try {
    const student = new Student(req.body);
    await student.save();
    res.json(student);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/students/:id', async (req, res) => {
  try {
    const student = await Student.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(student);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/students/:id', async (req, res) => {
  try {
    await Student.findByIdAndDelete(req.params.id);
    res.json({ success: true });
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
