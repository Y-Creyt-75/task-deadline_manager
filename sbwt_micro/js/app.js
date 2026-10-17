/* Task & Deadline Manager - plain JavaScript */
const KEY = "tasks";
const $ = s => document.querySelector(s);
let tasks = [], editId = null, charts = {};

/* ---------- storage ---------- */
const loadTasks = () => { try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; } };
const saveTasks = () => localStorage.setItem(KEY, JSON.stringify(tasks));

/* ---------- helpers ---------- */
const esc = s => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const todayStr = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
const daysLeft = t => Math.round((new Date(t.deadline) - new Date(todayStr())) / 864e5);
function getStatus(t) {
  if (t.done) return "DONE";
  const d = daysLeft(t);
  return d < 0 ? "OVERDUE" : d === 0 ? "DUE TODAY" : d <= 3 ? "DUE SOON" : "UPCOMING";
}
const ICON = {"DONE":"[x]","OVERDUE":"[!]","DUE TODAY":"[!]","DUE SOON":"[~]","UPCOMING":"[ ]"};

/* ---------- validation ---------- */
function validate(v) {
  const e = [];
  if (v.title.trim().length < 3) e.push("[ERR] TITLE MUST BE AT LEAST 3 CHARACTERS");
  if (!v.subject.trim()) e.push("[ERR] SUBJECT IS REQUIRED");
  if (!v.category) e.push("[ERR] SELECT A CATEGORY");
  if (!v.deadline) e.push("[ERR] DEADLINE IS REQUIRED");
  else if (v.deadline < todayStr()) e.push("[ERR] DEADLINE CANNOT BE IN THE PAST");
  if (!v.priority) e.push("[ERR] SELECT A PRIORITY");
  return e;
}

/* ---------- fetch sample data ---------- */
async function fetchSamples() {
  const res = await fetch("data/tasks.json");
  if (!res.ok) throw new Error("HTTP " + res.status);
  return res.json();
}

/* ---------- async filtering ---------- */
function filterTasks() {
  return new Promise(resolve => {
    setTimeout(() => {
      const q = $("#search").value.trim().toLowerCase();
      const st = $("#fStatus").value, cat = $("#fCat").value, pri = $("#fPri").value;
      resolve(tasks.filter(t =>
        (!q || (t.title + " " + t.subject).toLowerCase().includes(q)) &&
        (st === "all" || (st === "done") === t.done) &&
        (cat === "all" || t.category === cat) &&
        (pri === "all" || t.priority === pri)
      ).sort((a, b) => a.done - b.done || a.deadline.localeCompare(b.deadline)));
    }, 0);
  });
}
const debounce = (fn, ms) => { let id; return (...a) => { clearTimeout(id); id = setTimeout(() => fn(...a), ms); }; };

/* ---------- render ---------- */
async function render() {
  const list = await filterTasks();
  $("#list").innerHTML = list.map(t => {
    const s = getStatus(t);
    return `<li class="task ${t.done ? "done" : ""}">
      <div><span class="tag ${s}">${ICON[s]} ${s}</span> <strong class="t">${esc(t.title)}</strong>
      <div class="meta">${esc(t.subject)} | ${esc(t.category)} | ${esc(t.priority)} | due ${esc(t.deadline)}</div>
      ${t.notes ? `<div class="meta">${esc(t.notes)}</div>` : ""}</div>
      <div><button data-act="toggle" data-id="${t.id}">[ ${t.done ? "UNDO" : "DONE"} ]</button>
      <button data-act="edit" data-id="${t.id}">[ EDIT ]</button>
      <button data-act="del" data-id="${t.id}">[ DEL ]</button></div></li>`;
  }).join("");
  $("#message").textContent = list.length ? "" : "NO TASKS FOUND. ADD ONE TO BEGIN.";
  renderCounters();
  renderCharts();
}

function renderCounters() {
  const done = tasks.filter(t => t.done).length;
  const over = tasks.filter(t => getStatus(t) === "OVERDUE").length;
  const items = [["TOTAL", tasks.length], ["PENDING", tasks.length - done], ["COMPLETED", done], ["OVERDUE", over]];
  $("#counters").innerHTML = items.map(([l, n]) => `<div class="col-6 col-md-3"><div class="counter"><b>${n}</b>${l}</div></div>`).join("");
}

/* ---------- charts ---------- */
function renderCharts() {
  const done = tasks.filter(t => t.done).length;
  const cats = ["Assignment", "Lab Work", "Exam Prep"];
  const opts = { plugins: { legend: { labels: { color: "#000", font: { family: "Courier New" } } } } };
  charts.d?.destroy(); charts.b?.destroy();
  charts.d = new Chart($("#doughnut"), { type: "doughnut",
    data: { labels: ["Completed", "Pending"], datasets: [{ data: [done, tasks.length - done], backgroundColor: ["#000", "#fff"], borderColor: "#000", borderWidth: 1 }] },
    options: { ...opts, plugins: { ...opts.plugins, title: { display: true, text: "COMPLETED VS PENDING", color: "#000" } } } });
  charts.b = new Chart($("#bar"), { type: "bar",
    data: { labels: cats, datasets: [{ label: "Tasks", data: cats.map(c => tasks.filter(t => t.category === c).length), backgroundColor: "#000" }] },
    options: { ...opts, scales: { y: { beginAtZero: true, ticks: { stepSize: 1, color: "#000" } }, x: { ticks: { color: "#000" } } },
      plugins: { ...opts.plugins, title: { display: true, text: "TASKS PER CATEGORY", color: "#000" } } } });
}

/* ---------- form ---------- */
const fields = ["title", "subject", "category", "deadline", "priority", "notes"];
function resetForm() {
  $("#taskForm").reset(); editId = null; $("#errors").textContent = "";
  $("#formTitle").textContent = "ADD TASK"; $("#submitBtn").textContent = "[ ADD TASK ]"; $("#cancelBtn").hidden = true;
}
$("#taskForm").addEventListener("submit", e => {
  e.preventDefault();
  const v = Object.fromEntries(fields.map(f => [f, $("#" + f).value]));
  const errs = validate(v);
  $("#errors").textContent = errs.join("\n");
  if (errs.length) return;
  v.title = v.title.trim(); v.subject = v.subject.trim(); v.notes = v.notes.trim();
  if (editId) tasks = tasks.map(t => t.id === editId ? { ...t, ...v } : t);
  else tasks.push({ id: "t" + Date.now(), ...v, done: false });
  saveTasks(); resetForm(); render();
});
$("#cancelBtn").addEventListener("click", resetForm);

$("#list").addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b) return;
  const t = tasks.find(x => x.id === b.dataset.id); if (!t) return;
  if (b.dataset.act === "toggle") t.done = !t.done;
  if (b.dataset.act === "del" && confirm("Delete this task?")) tasks = tasks.filter(x => x !== t);
  if (b.dataset.act === "edit") {
    fields.forEach(f => $("#" + f).value = t[f] || "");
    editId = t.id; $("#formTitle").textContent = "EDIT TASK"; $("#submitBtn").textContent = "[ SAVE ]"; $("#cancelBtn").hidden = false;
    $("#title").focus(); return;
  }
  saveTasks(); render();
});

$("#search").addEventListener("input", debounce(render, 300));
["#fStatus", "#fCat", "#fPri"].forEach(s => $(s).addEventListener("change", render));

/* ---------- init ---------- */
(async function init() {
  tasks = loadTasks();
  if (!tasks) {
    $("#message").textContent = "LOADING DATA...";
    try { tasks = await fetchSamples(); saveTasks(); }
    catch (err) { tasks = []; $("#message").textContent = "[ERR] COULD NOT LOAD SAMPLE TASKS (" + err.message + "). USE A LOCAL SERVER."; return render().then(() => $("#message").textContent = "[ERR] COULD NOT LOAD SAMPLE TASKS. USE A LOCAL SERVER."); }
  }
  render();
})();
