# Student Task and Deadline Manager
Plain HTML/CSS/JS. Bootstrap 5 (grid) and Chart.js load from CDN.

## Run locally
fetch() needs a server (not file://):
    python -m http.server 8000
Open http://localhost:8000

## Features
Validated task form, deadline status (overdue / today / soon), localStorage persistence, sample data via Fetch (data/tasks.json), debounced async search + filters, mark complete / edit / delete, Chart.js doughnut + bar charts.

## Deploy
Netlify: drag the task-manager folder onto app.netlify.com/drop.
GitHub Pages: push to a repo, then Settings > Pages > deploy from main branch.
Sample data loads only on first visit; clear localStorage to reload it.
