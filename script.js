const KEY = "move-fitness-v1",
  colors = [
    "#739b7d",
    "#b5cbb9",
    "#365f47",
    "#d3dfd4",
    "#95b6a0",
    "#8b9f8e",
    "#d5cbb7",
  ];
let data = [];
let charts = {};
let addedIndex = null;
const $ = (s) => document.querySelector(s),
  fmt = (n) => Math.round(n).toLocaleString(),
  escapeHTML = (s) =>
    String(s).replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
function localDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function sample() {
  let a = [];
  let types = ["Walking", "Running", "Cycling", "Gym", "Yoga"];
  for (let i = 0; i < 120; i++) {
    let d = new Date();
    d.setDate(d.getDate() - Math.floor(i / 2));
    let t = i % 5;
    a.push({
      date: localDate(d),
      activity: types[t],
      duration: 20 + ((i * 7) % 46),
      steps:
        t === 0
          ? 3500 + ((i * 71) % 4500)
          : t === 1
            ? 2500 + ((i * 53) % 3000)
            : 0,
      calories: 90 + ((i * 17) % 260),
      heartRate: 90 + ((i * 11) % 60),
      distance: t < 3 ? +(1 + ((i * 13) % 70) / 10).toFixed(1) : null,
      sample: true,
    });
  }
  return a;
}
try {
  let v = localStorage.getItem(KEY);
  data = v ? JSON.parse(v) : sample();
  if (!Array.isArray(data)) data = sample();
} catch (e) {
  data = sample();
}
function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch (e) {
    alert(
      "Your browser could not save the data. Export your records to keep a copy.",
    );
  }
  render();
}
function render() {
  let sessions = data.length,
    total = data.reduce((s, x) => s + x.duration, 0),
    cal = data.reduce((s, x) => s + x.calories, 0),
    dates = [...new Set(data.map((x) => x.date))],
    steps = data.reduce((s, x) => s + x.steps, 0);
  $("#snapshotCount").textContent = fmt(sessions);
  $("#snapshotText").textContent = sessions
    ? `${fmt(total)} minutes of movement across ${fmt(sessions)} recorded sessions. Every one counts.`
    : "Your first session is a great place to start.";
  $("#stats").innerHTML = [
    ["Total sessions", fmt(sessions), "Recorded workouts"],
    [
      "Workout time",
      fmt(total) + " min",
      sessions ? `${fmt(total / sessions)} min per session` : "No sessions yet",
    ],
    [
      "Average daily steps",
      fmt(dates.length ? steps / dates.length : 0),
      "Across dates with records",
    ],
    ["Calories burned", fmt(cal) + " kcal", "Estimated total"],
  ]
    .map(
      (x) =>
        `<div class="card stat"><div class="label">${x[0]}</div><div class="value">${x[1]}</div><div class="sub">${x[2]}</div></div>`,
    )
    .join("");
  let groups = {};
  data.forEach((x) => {
    let g =
      groups[x.activity] ||
      (groups[x.activity] = { count: 0, duration: 0, calories: 0 });
    g.count++;
    g.duration += x.duration;
    g.calories += x.calories;
  });
  let entries = Object.entries(groups).sort((a, b) => b[1].count - a[1].count);
  $("#noticeText").textContent = data.some((x) => x.sample)
    ? `✳  Sample data is included (${data.filter((x) => x.sample).length} sample records). Add your own or import a CSV.`
    : "✳  Your records are stored in this browser on this device.";
  let filt = $("#filter"),
    old = filt.value;
  filt.innerHTML =
    '<option value="">All activities</option>' +
    entries
      .map(
        ([k]) => `<option value="${escapeHTML(k)}">${escapeHTML(k)}</option>`,
      )
      .join("");
  filt.value = old;
  let rows = data
    .map((x, i) => ({ ...x, i }))
    .filter((x) => !filt.value || x.activity === filt.value)
    .sort((a, b) => b.date.localeCompare(a.date));
  $("#rows").innerHTML = rows
    .map(
      (x) =>
        `<tr${x.i === addedIndex ? ' class="new-record"' : ""}><td>${escapeHTML(x.date)}</td><td class="activity"><span class="tag">${escapeHTML(x.activity)}</span></td><td>${fmt(x.duration)} min</td><td>${fmt(x.steps)}</td><td>${fmt(x.calories)} kcal</td><td>${x.heartRate == null ? "—" : fmt(x.heartRate) + " bpm"}</td><td>${x.distance == null ? "—" : x.distance + " km"}</td><td><button class="delete" aria-label="Delete activity" data-i="${x.i}">×</button></td></tr>`,
    )
    .join("");
  $("#empty").hidden = rows.length > 0;
  let daily = {};
  data.forEach((x) => (daily[x.date] = (daily[x.date] || 0) + x.steps));
  let ds = Object.keys(daily).sort().slice(-14);
  if (typeof Chart !== "undefined") {
    const defaults = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      animation: { duration: 250 },
    };
    const plot = (id, config) => {
      if (charts[id]) charts[id].destroy();
      charts[id] = new Chart(document.getElementById(id), config);
    };
    plot("line", {
      type: "line",
      data: {
        labels: ds,
        datasets: [
          {
            label: "Steps",
            data: ds.map((d) => daily[d]),
            borderColor: "#719d7d",
            backgroundColor: "rgba(113,157,125,.1)",
            fill: true,
            tension: 0.3,
            pointRadius: 3,
            pointBackgroundColor: "#719d7d",
            borderWidth: 2,
          },
        ],
      },
      options: {
        ...defaults,
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: "#91a095", maxTicksLimit: 5 },
          },
          y: {
            beginAtZero: true,
            grid: { color: "#edf1ed" },
            ticks: { color: "#91a095", maxTicksLimit: 4 },
          },
        },
      },
    });
    plot("bars", {
      type: "bar",
      data: {
        labels: entries.map((e) => e[0]),
        datasets: [
          {
            label: "Average duration (minutes)",
            data: entries.map((e) => e[1].duration / e[1].count),
            backgroundColor: entries.map((_, i) => colors[i % colors.length]),
            borderRadius: 4,
          },
        ],
      },
      options: {
        ...defaults,
        indexAxis: "y",
        scales: {
          x: {
            beginAtZero: true,
            grid: { color: "#edf1ed" },
            ticks: { color: "#91a095" },
          },
          y: { grid: { display: false }, ticks: { color: "#68766b" } },
        },
      },
    });
    plot("donut", {
      type: "doughnut",
      data: {
        labels: entries.map((e) => e[0]),
        datasets: [
          {
            data: entries.map((e) => e[1].count),
            backgroundColor: entries.map((_, i) => colors[i % colors.length]),
            borderWidth: 2,
            borderColor: "#fff",
          },
        ],
      },
      options: { ...defaults, cutout: "70%" },
    });
  } else {
    document
      .querySelectorAll(".chart")
      .forEach(
        (el) =>
          (el.textContent =
            "Charts could not load. Check your internet connection and refresh."),
      );
  }
  $("#donutcenter").innerHTML = fmt(sessions) + "<small>sessions</small>";
  $("#legend").innerHTML = entries
    .map(
      ([n, g], i) =>
        `<div><span><i class="dot" style="background:${colors[i % colors.length]}"></i>${escapeHTML(n)}</span><strong>${Math.round((g.count / sessions) * 100)}%</strong></div>`,
    )
    .join("");
  let recent = ds.length ? ds.at(-1) : null;
  $("#insights").innerHTML = entries.length
    ? `<div class="insight"><strong>Most frequent activity</strong>${escapeHTML(entries[0][0])} accounts for ${entries[0][1].count} of your ${sessions} recorded sessions.</div><div class="insight"><strong>Average session</strong>Your workouts last ${fmt(total / sessions)} minutes on average.</div><div class="insight"><strong>Latest recorded day</strong>${fmt(daily[recent])} steps were recorded on ${recent}.</div>`
    : '<div class="insight">Add a session to see your activity insights.</div>';
}
$("#snapshotAdd").onclick = () => $("#addBtn").click();
$("#addBtn").onclick = () => {
  $("#modal").classList.add("open");
  $("#form").elements.date.value = localDate(new Date());
  $("#form").elements.date.focus();
};
function close() {
  $("#modal").classList.remove("open");
  $("#form").reset();
  $("#error").textContent = "";
}
$("#cancel").onclick = close;
$("#modal").onclick = (e) => {
  if (e.target.id === "modal") close();
};
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") close();
});
$("#form").onsubmit = (e) => {
  e.preventDefault();
  let f = new FormData(e.target);
  data.push({
    date: f.get("date"),
    activity: f.get("activity").trim(),
    duration: +f.get("duration"),
    steps: +f.get("steps"),
    calories: +f.get("calories"),
    heartRate: f.get("heartRate") ? +f.get("heartRate") : null,
    distance: f.get("distance") ? +f.get("distance") : null,
  });
  addedIndex = data.length - 1;
  $("#filter").value = "";
  save();
  close();
  document.querySelector(".history").open = true;
  const added = document.querySelector(".new-record");
  if (added) {
    added.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
      block: "center",
    });
    setTimeout(() => {
      added.classList.remove("new-record");
      addedIndex = null;
    }, 2200);
  }
};
$("#filter").onchange = render;
$("#rows").onclick = (e) => {
  let i = e.target.dataset.i;
  if (i !== undefined && confirm("Delete this activity?")) {
    data.splice(+i, 1);
    save();
  }
};
$("#clearBtn").onclick = () => {
  if (
    confirm(
      "Delete all records from this browser? Export a CSV first if you want a backup.",
    )
  ) {
    data = [];
    save();
  }
};
function csvCell(v) {
  return '"' + String(v ?? "").replaceAll('"', '""') + '"';
}
$("#exportBtn").onclick = () => {
  let keys = [
    "date",
    "activity",
    "duration",
    "steps",
    "calories",
    "heartRate",
    "distance",
  ];
  let csv = [
    keys.join(","),
    ...data.map((x) => keys.map((k) => csvCell(x[k])).join(",")),
  ].join("\n");
  let a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = "fitness-activities.csv";
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
};
$("#importBtn").onclick = () => $("#file").click();
function parseCSV(t) {
  let rows = [],
    row = [],
    v = "",
    q = false;
  for (let i = 0; i < t.length; i++) {
    let c = t[i];
    if (c === '"') {
      if (q && t[i + 1] === '"') {
        v += '"';
        i++;
      } else q = !q;
    } else if (c === "," && !q) {
      row.push(v);
      v = "";
    } else if ((c === "\n" || c === "\r") && !q) {
      if (c === "\r" && t[i + 1] === "\n") i++;
      row.push(v);
      if (row.some((x) => x.trim())) rows.push(row);
      row = [];
      v = "";
    } else v += c;
  }
  if (q) throw Error("Unclosed quote in CSV");
  row.push(v);
  if (row.some((x) => x.trim())) rows.push(row);
  return rows;
}
$("#file").onchange = async (e) => {
  let file = e.target.files[0];
  if (!file) return;
  try {
    let rows = parseCSV(await file.text()),
      h = rows.shift().map((x) =>
        x
          .trim()
          .toLowerCase()
          .replace(/[^a-z]/g, ""),
      );
    let get = (r, ...names) => {
      let i = h.findIndex((x) => names.includes(x));
      return i < 0 ? "" : (r[i] || "").trim();
    };
    let added = [],
      bad = 0;
    for (let r of rows) {
      let date = get(r, "date"),
        activity = get(r, "activity", "activitytype"),
        duration = get(r, "duration", "durationminutes"),
        steps = get(r, "steps"),
        calories = get(r, "calories", "caloriesburned"),
        hr = get(r, "heartrate"),
        dist = get(r, "distance");
      let valid =
        /^\d{4}-\d{2}-\d{2}$/.test(date) &&
        !isNaN(Date.parse(date + "T00:00:00")) &&
        activity &&
        activity.length <= 40 &&
        duration !== "" &&
        steps !== "" &&
        calories !== "" &&
        [duration, steps, calories].every(
          (v) => Number.isFinite(+v) && +v >= 0,
        ) &&
        +duration > 0 &&
        (!hr || (Number.isFinite(+hr) && +hr > 0)) &&
        (!dist || (Number.isFinite(+dist) && +dist >= 0));
      if (!valid) {
        bad++;
        continue;
      }
      added.push({
        date,
        activity,
        duration: +duration,
        steps: +steps,
        calories: +calories,
        heartRate: hr ? +hr : null,
        distance: dist ? +dist : null,
      });
    }
    if (!added.length)
      throw Error(
        "No valid rows found. Use date (YYYY-MM-DD), activity, duration, steps and calories columns.",
      );
    data.push(...added);
    save();
    alert(
      `Imported ${added.length} records.${bad ? " Skipped " + bad + " invalid rows." : ""}`,
    );
  } catch (err) {
    alert("Could not import CSV: " + err.message);
  }
  e.target.value = "";
};
render();
