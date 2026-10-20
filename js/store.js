/*
 * store.js — البيانات والحسابات
 * الفكرة العامة (إضافة/حذف عمليات دخل ومصروف + localStorage + تصنيفات + تصدير)
 * مستوحاة من مشاريع Expense Tracker مفتوحة المصدر برخصة MIT مثل:
 *   - mrnavsingh/offlineexpensetracker
 *   - Devsethi3/Expense-Tracker
 * الكود هنا مكتوب من جديد، مع إضافات سعودية: ريال، ضريبة ١٥٪، تصنيفات محلية.
 */
const VAT_RATE = 0.15;

const CATEGORIES = {
  expense: [
    { id: "food", label: "مطاعم وكوفيهات", color: "#c9a24b" },
    { id: "grocery", label: "بقالة وسوبرماركت", color: "#2e7d32" },
    { id: "fuel", label: "بنزين ومواصلات", color: "#00796b" },
    { id: "rent", label: "إيجار وصيانة", color: "#6d4c41" },
    { id: "bills", label: "فواتير (كهرباء، ماء، جوال)", color: "#3949ab" },
    { id: "shopping", label: "تسوق وملابس", color: "#ad1457" },
    { id: "fun", label: "ترفيه وطلعات", color: "#ef6c00" },
    { id: "family", label: "عايلة وهدايا", color: "#8e24aa" },
    { id: "charity", label: "صدقة وزكاة", color: "#558b2f" },
    { id: "other", label: "أخرى", color: "#78909c" },
  ],
  income: [
    { id: "salary", label: "راتب" },
    { id: "bonus", label: "مكافأة أو حافز" },
    { id: "side", label: "دخل إضافي" },
    { id: "other_in", label: "أخرى" },
  ],
};

const catLabel = (type, id) =>
  (CATEGORIES[type].find((c) => c.id === id) || {}).label || id;

class ExpenseStore {
  constructor(key = "masrofi.v1") {
    this.key = key;
    const data = this.#read();
    this.txs = Array.isArray(data.txs) ? data.txs : [];
    this.budgets = data.budgets && typeof data.budgets === "object" ? data.budgets : {};
  }

  #read() {
    try {
      return JSON.parse(localStorage.getItem(this.key)) || {};
    } catch {
      return {};
    }
  }

  #write() {
    try {
      localStorage.setItem(this.key, JSON.stringify({ txs: this.txs, budgets: this.budgets }));
    } catch {
      /* نتجاهل لو التخزين غير متاح */
    }
  }

  add({ type, title, amount, category, date, withVat }) {
    const value = Number(amount);
    if (!title.trim() || !(value > 0) || !date) return null;
    const tx = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
      type,
      title: title.trim(),
      amount: Math.round(value * 100) / 100,
      category,
      date, // YYYY-MM-DD
      vat: withVat ? Math.round((value - value / (1 + VAT_RATE)) * 100) / 100 : 0,
    };
    this.txs.unshift(tx);
    this.#write();
    return tx;
  }

  remove(id) {
    this.txs = this.txs.filter((t) => t.id !== id);
    this.#write();
  }

  byMonth(month) {
    return this.txs
      .filter((t) => t.date.startsWith(month))
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  }

  summary(month) {
    const list = this.byMonth(month);
    const sum = (type) =>
      list.filter((t) => t.type === type).reduce((s, t) => s + t.amount, 0);
    const income = sum("income");
    const expense = sum("expense");
    return { income, expense, balance: income - expense };
  }

  expenseByCategory(month) {
    const totals = {};
    this.byMonth(month)
      .filter((t) => t.type === "expense")
      .forEach((t) => (totals[t.category] = (totals[t.category] || 0) + t.amount));
    return CATEGORIES.expense
      .filter((c) => totals[c.id])
      .map((c) => ({ ...c, total: totals[c.id] }))
      .sort((a, b) => b.total - a.total);
  }

  getBudget(month) {
    return this.budgets[month] || 0;
  }

  setBudget(month, value) {
    const n = Number(value);
    if (n > 0) this.budgets[month] = n;
    else delete this.budgets[month];
    this.#write();
  }

  toCsv(month) {
    const esc = (v) => `"${String(v).replace(/"/g, '""')}"`;
    const rows = [["التاريخ", "النوع", "الوصف", "التصنيف", "المبلغ (ر.س)", "الضريبة (ر.س)"]];
    this.byMonth(month).forEach((t) =>
      rows.push([
        t.date,
        t.type === "income" ? "دخل" : "مصروف",
        t.title,
        catLabel(t.type, t.category),
        t.amount.toFixed(2),
        t.vat.toFixed(2),
      ])
    );
    // BOM عشان إكسل يقرأ العربي صح
    return "﻿" + rows.map((r) => r.map(esc).join(",")).join("\r\n");
  }
}
