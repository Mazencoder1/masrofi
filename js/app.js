/* app.js — ربط الواجهة بالبيانات */
(() => {
  const store = new ExpenseStore();
  const $ = (s) => document.querySelector(s);

  const nf = new Intl.NumberFormat("ar-SA", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  const money = (n) => `${nf.format(n)} ر.س`;
  const dateFmt = new Intl.DateTimeFormat("ar-SA", { day: "numeric", month: "long" });

  const todayISO = () => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 10);
  };

  const monthPicker = $("#monthPicker");
  const typeRadios = document.querySelectorAll('input[name="type"]');
  const catSelect = $("#txCategory");

  monthPicker.value = todayISO().slice(0, 7);
  $("#txDate").value = todayISO();

  const currentType = () => document.querySelector('input[name="type"]:checked').value;

  function fillCategories() {
    const type = currentType();
    catSelect.replaceChildren(
      ...CATEGORIES[type].map((c) => new Option(c.label, c.id))
    );
    $("#txVat").parentElement.hidden = type === "income";
    $("#txTitle").placeholder =
      type === "income" ? "من وين الدخل؟ (مثال: راتب الشهر)" : "وش صرفت عليه؟ (مثال: قهوة، بنزين)";
  }

  function budgetMessage(spent, budget) {
    if (!budget) return null;
    const ratio = spent / budget;
    if (ratio >= 1) return { cls: "bad", text: `انتبه! تجاوزت ميزانيتك بـ ${money(spent - budget)} 😅` };
    if (ratio >= 0.8) return { cls: "warn", text: `قربت تخلص ميزانيتك، باقي ${money(budget - spent)} بس. شد على الحزام!` };
    return { cls: "good", text: `ماشي حالك زين، باقي ${money(budget - spent)} من ميزانيتك 👍` };
  }

  function render() {
    const month = monthPicker.value;
    const { income, expense, balance } = store.summary(month);

    $("#sumIncome").textContent = money(income);
    $("#sumExpense").textContent = money(expense);
    const balEl = $("#sumBalance");
    balEl.textContent = money(balance);
    balEl.className = balance < 0 ? "neg" : "";

    // الميزانية
    const budget = store.getBudget(month);
    $("#budgetInput").value = budget || "";
    const fill = $("#budgetFill");
    const pct = budget ? Math.min(100, (expense / budget) * 100) : 0;
    fill.style.width = pct + "%";
    const msg = budgetMessage(expense, budget);
    const msgEl = $("#budgetMsg");
    msgEl.hidden = !msg;
    if (msg) {
      msgEl.className = "budget-msg " + msg.cls;
      msgEl.textContent = msg.text;
      fill.className = msg.cls;
    }

    // الرسم الدائري
    const slices = store.expenseByCategory(month);
    drawDonut($("#donut"), slices);
    $("#chartEmpty").hidden = slices.length > 0;
    $("#donut").hidden = slices.length === 0;
    $("#legend").replaceChildren(
      ...slices.map((s) => {
        const li = document.createElement("li");
        const dot = document.createElement("i");
        dot.style.background = s.color;
        const name = document.createElement("span");
        name.textContent = s.label;
        const val = document.createElement("b");
        val.textContent = money(s.total);
        li.append(dot, name, val);
        return li;
      })
    );

    // قائمة العمليات
    const list = store.byMonth(month);
    $("#listEmpty").hidden = list.length > 0;
    $("#txList").replaceChildren(
      ...list.map((t) => {
        const li = document.createElement("li");
        li.className = "tx " + t.type;
        li.dataset.id = t.id;

        const info = document.createElement("div");
        const title = document.createElement("strong");
        title.textContent = t.title;
        const meta = document.createElement("small");
        const vat = t.vat ? ` · ضريبة ${money(t.vat)}` : "";
        meta.textContent = `${catLabel(t.type, t.category)} · ${dateFmt.format(new Date(t.date + "T00:00:00"))}${vat}`;
        info.append(title, meta);

        const amt = document.createElement("span");
        amt.className = "amt";
        amt.textContent = (t.type === "income" ? "+" : "−") + money(t.amount);

        const del = document.createElement("button");
        del.type = "button";
        del.className = "del";
        del.dataset.action = "delete";
        del.setAttribute("aria-label", "احذف العملية");
        del.textContent = "✕";

        li.append(info, amt, del);
        return li;
      })
    );
  }

  // ---- الأحداث ----
  typeRadios.forEach((r) => r.addEventListener("change", fillCategories));
  monthPicker.addEventListener("change", render);

  $("#txForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const date = $("#txDate").value;
    const ok = store.add({
      type: currentType(),
      title: $("#txTitle").value,
      amount: $("#txAmount").value,
      category: catSelect.value,
      date,
      withVat: currentType() === "expense" && $("#txVat").checked,
    });
    if (!ok) return;
    $("#txTitle").value = "";
    $("#txAmount").value = "";
    $("#txVat").checked = false;
    monthPicker.value = date.slice(0, 7); // نعرض الشهر اللي سجلت فيه
    render();
  });

  $("#txList").addEventListener("click", (e) => {
    if (e.target.dataset.action !== "delete") return;
    const li = e.target.closest(".tx");
    if (li && confirm("متأكد تبي تحذف هالعملية؟")) {
      store.remove(li.dataset.id);
      render();
    }
  });

  $("#saveBudget").addEventListener("click", () => {
    store.setBudget(monthPicker.value, $("#budgetInput").value);
    render();
  });

  $("#exportCsv").addEventListener("click", () => {
    const blob = new Blob([store.toCsv(monthPicker.value)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `masrofi-${monthPicker.value}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  });

  fillCategories();
  render();
})();
