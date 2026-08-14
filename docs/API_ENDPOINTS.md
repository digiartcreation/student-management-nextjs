# API Endpoints

Base URL: `http://localhost:3000/api`

Every response uses the same envelope:

```json
{ "success": true, "message": "...", "data": { } }
```

`DELETE` returns `204 No Content` with no body.

Auth is a session cookie set by `POST /auth/login`. Send it on every other call
(the Angular client does this via `withCredentials`).

| Status | Meaning |
| --- | --- |
| `400` | Validation failed — `errors.fieldErrors` names the field |
| `401` | Not logged in |
| `404` | Record not found |
| `409` | Conflict — duplicate name/roll number, or the record is still referenced |
| `422` | Rule violation — e.g. attendance for a future date |

---

## Auth

### Login

- `POST /auth/login`

```json
{ "email": "admin@example.com", "password": "password123" }
```

Sets the session cookie. Returns the user without the password hash.

### Current user

- `GET /auth/me`

### Logout

- `POST /auth/logout`

---

## Sections

A section is a class-section like `10-A`. Students belong to exactly one.

### List

- `GET /sections`
- Each row carries `studentCount`.

### Get one

- `GET /sections/{id}`

### Create

- `POST /sections`

```json
{ "name": "10-A", "status": "ACTIVE" }
```

- `409` if the name is taken.

### Update

- `PUT /sections/{id}` — same body as create.

### Delete

- `DELETE /sections/{id}`
- `409` if any student still belongs to it. Move them first.

---

## Students

### List

- `GET /students`
- Paginated: `{ content, page, size, totalElements, totalPages }`.
- Query: `search` (name / roll no / mobile), `sectionId`, `status`, `page`, `size`.
- Each row includes its `section`.

### Get one

- `GET /students/{id}`

### Create

- `POST /students`

```json
{
  "rollNo": "R101",
  "name": "Rahul Kumar",
  "age": 15,
  "sectionId": 3,
  "parentMobile": "9876543210",
  "status": "ACTIVE"
}
```

- `age` must be 3–30; `parentMobile` 10–15 digits.
- `409` if the roll number is taken.

### Update

- `PUT /students/{id}` — same body as create.

### Change status

- `PATCH /students/{id}/status`

```json
{ "status": "INACTIVE" }
```

Inactive students drop out of the attendance roster and fee generation but keep
their history.

### Delete

- `DELETE /students/{id}`
- Their attendance and fee rows are removed with them. Use the status endpoint
  instead if you want to keep the history.

---

## Attendance

One row per student per day, with status `PRESENT`, `LATE`, or `ABSENT`.
Absent is stored explicitly, so "not filled yet" stays distinguishable from
"absent".

### Daily roster — what the fill screen loads

- `GET /attendance/roster`
- Query: `date` (`YYYY-MM-DD`, defaults to today), `sectionId` (optional).

```json
{
  "date": "2026-08-13",
  "records": [
    {
      "attendanceId": 12,
      "studentId": 3,
      "rollNo": "R101",
      "name": "Rahul Kumar",
      "sectionId": 3,
      "sectionName": "10-A",
      "status": "PRESENT",
      "remarks": null
    }
  ],
  "summary": {
    "total": 6, "marked": 6, "notMarked": 0,
    "present": 4, "late": 1, "absent": 1,
    "attendancePercentage": 83.3
  }
}
```

Every active student appears; unmarked ones come back as `NOT_MARKED` with
`attendanceId: null`. Late counts as attended in `attendancePercentage`.

### Save a day

- `POST /attendance/save`

```json
{
  "date": "2026-08-13",
  "records": [
    { "studentId": 3, "status": "PRESENT", "remarks": null },
    { "studentId": 4, "status": "LATE", "remarks": "Bus delay" }
  ]
}
```

Replaces that date's rows for the students sent, in one transaction — so the
screen can be edited and re-submitted freely. Returns the refreshed roster.

- `422` for a future date, a duplicated student, or an inactive/unknown student.

### List records

- `GET /attendance`
- Paginated. Query: `fromDate`, `toDate`, `studentId`, `sectionId`, `status`,
  `page`, `size`.

### Get / update / delete one

- `GET /attendance/{id}`
- `PUT /attendance/{id}` — `{ "status": "LATE", "remarks": "Traffic" }`
- `DELETE /attendance/{id}` — the student reverts to "not marked" for that date.

### Student history

- `GET /attendance/student/{studentId}`
- Query: `fromDate`, `toDate`.
- Returns the student, a `summary` (same shape as the roster's), and their records.

---

## Fees

One row per charge. A charge is `MONTHLY`, `QUARTERLY`, `YEARLY`, or `OTHER` for
a one-off such as a bus or exam fee.

`period` is the key the charge is addressed by, and its shape follows the type:

| `feeType` | `period` | `title` | Bills in |
| --- | --- | --- | --- |
| `MONTHLY` | `2026-08` | — | `2026-08` |
| `QUARTERLY` | `2026-Q3` | — | `2026-07` |
| `YEARLY` | `2026` | — | `2026-01` |
| `OTHER` | `2026-08` | **required**, e.g. `Bus fee` | `2026-08` |

A period in the wrong shape for its type is a `400`.

`billedMonth` is `period` collapsed to the month the charge lands in — a quarter
bills at its first month, a year in January. Every list and dashboard that talks
about a "month" goes by `billedMonth`, so a fee is counted once over its life
rather than once per month it covers.

A student may hold one charge per `(feeType, period, title)`. Recurring types
force `title` to `""`, so a student gets one monthly fee per month; one-off
charges get one per name, so `Bus fee` and `Exam fee` can share a month.

### Bill everyone

- `POST /fees/generate`

```json
{
  "feeType": "QUARTERLY",
  "period": "2026-Q3",
  "amount": 900,
  "sectionId": null,
  "overwriteUnpaid": false
}
```

`feeType` defaults to `MONTHLY`. Creates a fee row for every **active** student
who is not billed for that type and period yet. Students already billed are
skipped, so re-running is safe. With `overwriteUnpaid: true`, existing **unpaid**
rows are also re-priced — paid rows are never touched.

Returns `{ feeType, period, title, label, created, repriced, skipped }`.

- `422` if the section has no active students.

### List

- `GET /fees`
- Query: `feeType`, `period`, `billedMonth`, `sectionId`, `studentId`, `paid`
  (`true`/`false`), `search`, `page`, `size`.
- `month` is still accepted as an alias for `billedMonth`.
- Returns the page plus money totals in one call:

```json
{
  "content": [ ],
  "page": 0, "size": 100, "totalElements": 6, "totalPages": 1,
  "totals": {
    "total": "9000.00", "collected": "6000.00", "pending": "3000.00",
    "paidCount": 4, "unpaidCount": 2,
    "byType": {
      "MONTHLY":   { "count": 6, "total": "9000.00" },
      "QUARTERLY": { "count": 0, "total": "0.00" },
      "YEARLY":    { "count": 0, "total": "0.00" },
      "OTHER":     { "count": 0, "total": "0.00" }
    }
  }
}
```

### Billed periods

- `GET /fees/periods` — every billed period with its type, newest first, ordered
  by the month it bills in. Optional `feeType` narrows it.
  Returns `[{ feeType, period, billedMonth }]`.
- `GET /fees/months` — distinct `billedMonth` values, newest first. Drives the
  month picker.

### Add one manually

- `POST /fees`

```json
{ "studentId": 3, "feeType": "OTHER", "period": "2026-08", "title": "Bus fee", "amount": 700 }
```

- `400` if the period does not match the type, or an `OTHER` charge has no title.
- `409` if that student already holds that charge.

### Update the amount

- `PUT /fees/{id}` — `{ "amount": 1800 }`

### Mark paid / unpaid

- `PATCH /fees/{id}/pay`

```json
{ "paid": true }
```

Marking paid stamps `paidDate` (today unless you pass one). Marking unpaid
clears it.

### Delete

- `DELETE /fees/{id}`

---

## Dashboards

### Fees dashboard

- `GET /dashboard/fees?month=2026-08` (defaults to the current month)

Returns the month's `total` / `collected` / `pending`, student counts,
`collectionPercentage`, a `byType` split, a six-month `trend`, and `topUnpaid`
(the ten largest outstanding fees).

Every fee type is included, counted in the month it bills in — so a quarterly
fee shows up in the quarter's first month, not in all three. Student counts are
of distinct students, since one student can hold several charges in a month;
`billedRecords` is the row count.

### Student dashboards

- `GET /dashboard/students?ids=1,2&month=2026-08` (month defaults to the current one)

One dashboard per id, returned in the order asked for so the screen can compare
students side by side without a request each. Duplicate ids collapse.

Each entry carries the student's details, then:

- `attendance.month` / `attendance.lifetime` — present / late / absent counts and
  the attended percentage.
- `attendance.trend` — the six months ending at `month`.
- `attendance.recentAbsences` — the last ten non-present days, with remarks.
- `fees.totals` — **lifetime**, so the card can say what a student owes overall
  rather than only inside the six-month window.
- `fees.byType`, `fees.trend` (six months, by `billedMonth`), and `fees.unpaid`.

- `422` with no usable ids, or with more than 8 — each dashboard costs a handful
  of queries, so the fan-out is bounded.
- `404` if any id is not a student.

### Attendance dashboard

- `GET /dashboard/attendance?date=2026-08-13&month=2026-08`

Returns `today` (present / late / absent / not marked / percentage), a
`monthSummary`, `daily` (one point per day that has records), `bySection`, and
`topAbsentees` (ten students with the most absences).

---

## Development users

Both created by `npm run prisma:seed`:

| Email | Password | Role |
| --- | --- | --- |
| `admin@example.com` | `password123` | ADMIN |
| `staff@example.com` | `password123` | STAFF |
