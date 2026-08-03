<div align="center">

# Master Timetable Generator

**Clean, conflict-free school & college timetable builder**  
Runs fully in the browser — no backend, no install.

[![License](https://img.shields.io/badge/License-MIT-green.svg?style=flat-square)](LICENSE)
[![Vanilla JS](https://img.shields.io/badge/JavaScript-Vanilla-F7DF1E?style=flat-square&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)

</div>

---

## Quick start

1. Open [`index.html`](./index.html) in any modern browser  
   **or** serve the folder with any static server.
2. Click **Sample** (or add your own teachers, subjects and classes).
3. Click **Generate Timetable**.
4. Switch views (by class / by teacher), export **CSV**, or **Print**.

Data is saved automatically in `localStorage`.

---

## Features

| Feature | Detail |
|---------|--------|
| **Conflict-free scheduling** | Teachers never double-booked; subjects spread across the week |
| **Load balancing** | Even distribution of periods |
| **Time labels** | Period times from start time + duration |
| **Duplicate checks** | Prevents duplicate teacher/subject/class codes |
| **Views** | By class or by teacher |
| **Export** | CSV download + print-friendly layout |
| **Keyboard** | Enter to save, Escape to close modals |
| **Mobile** | Responsive layout |
| **Persistence** | Autosave to localStorage |

---

## How it works

1. **Setup tab** — define teachers, subjects, classes, working days, periods/day, start time and duration.
2. **Generate** — algorithm assigns periods without conflicts and balances load.
3. **Timetable tab** — filter by class or teacher, export or print.

---

## Files

```text
.
├── index.html      # App shell + UI
├── styles.css      # Clean, modern styles
├── app.js          # Scheduling logic + UI handlers
├── favicon.svg     # SR logo favicon
└── README.md
```

No build step. No dependencies.

---

## Use cases

- Schools and colleges building weekly master timetables
- Quick what-if experiments (change periods, days, teachers)
- Export for further editing in Excel / Google Sheets

---

## License

MIT — free to use and modify.

Built by [@sairambn](https://github.com/sairambn)
