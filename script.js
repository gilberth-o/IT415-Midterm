"use strict";

const STORAGE_KEY = "campushub-event-manager-v1";
const EVENT_STATUSES = ["Draft", "Open for Registration", "Closed", "Completed"];
const DUPLICATE_ID_MESSAGE = "Already registered: this student ID is already registered for this event. Enter a different ID.";
const STATUS_CLASSES = {
  Draft: "draft",
  "Open for Registration": "open",
  Closed: "closed",
  Completed: "completed"
};

const elements = {
  todayLabel: document.querySelector("#today-label"),
  notice: document.querySelector("#app-notice"),
  eventCount: document.querySelector("#event-nav-count"),
  totalEvents: document.querySelector("#total-events"),
  totalRegistrations: document.querySelector("#total-registrations"),
  overallAttendance: document.querySelector("#overall-attendance"),
  openEvents: document.querySelector("#open-events"),
  eventStatusFilter: document.querySelector("#event-status-filter"),
  eventsBody: document.querySelector("#events-table-body"),
  registrationSearch: document.querySelector("#registration-search"),
  registrationEventFilter: document.querySelector("#registration-event-filter"),
  attendanceFilter: document.querySelector("#attendance-filter"),
  registrationsBody: document.querySelector("#registrations-table-body"),
  statusReport: document.querySelector("#status-report"),
  bestEvent: document.querySelector("#best-event"),
  eventDialog: document.querySelector("#event-dialog"),
  eventForm: document.querySelector("#event-form"),
  eventDialogTitle: document.querySelector("#event-dialog-title"),
  eventId: document.querySelector("#event-id"),
  eventName: document.querySelector("#event-name"),
  eventDate: document.querySelector("#event-date"),
  eventVenue: document.querySelector("#event-venue"),
  eventCapacity: document.querySelector("#event-capacity"),
  eventStatus: document.querySelector("#event-status"),
  eventFormError: document.querySelector("#event-form-error"),
  registrationDialog: document.querySelector("#registration-dialog"),
  registrationForm: document.querySelector("#registration-form"),
  registrationEvent: document.querySelector("#registration-event"),
  studentName: document.querySelector("#student-name"),
  studentId: document.querySelector("#student-id"),
  studentYear: document.querySelector("#student-year"),
  registrationFormError: document.querySelector("#registration-form-error")
};

function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function offsetDate(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return localDateString(date);
}

function makeInitialData() {
  const today = localDateString();
  const events = [
    {
      id: crypto.randomUUID(),
      name: "Fall Welcome Social",
      date: offsetDate(5),
      venue: "Student Union, Room 204",
      capacity: 60,
      status: "Open for Registration"
    },
    {
      id: crypto.randomUUID(),
      name: "Community Garden Day",
      date: offsetDate(11),
      venue: "East Campus Garden",
      capacity: 40,
      status: "Draft"
    },
    {
      id: crypto.randomUUID(),
      name: "Career Paths Panel",
      date: offsetDate(-5),
      venue: "Innovation Hall",
      capacity: 100,
      status: "Completed"
    }
  ];

  return {
    events,
    registrations: [
      {
        id: crypto.randomUUID(),
        eventId: events[0].id,
        studentName: "Alex Morgan",
        studentId: "S10248",
        yearLevel: "2nd Year",
        dateRegistered: today,
        present: false
      },
      {
        id: crypto.randomUUID(),
        eventId: events[2].id,
        studentName: "Sam Kim",
        studentId: "S10461",
        yearLevel: "3rd Year",
        dateRegistered: offsetDate(-12),
        present: true
      },
      {
        id: crypto.randomUUID(),
        eventId: events[2].id,
        studentName: "Riley Patel",
        studentId: "S10824",
        yearLevel: "1st Year",
        dateRegistered: offsetDate(-10),
        present: true
      },
      {
        id: crypto.randomUUID(),
        eventId: events[2].id,
        studentName: "Jordan Lee",
        studentId: "S10352",
        yearLevel: "4th Year",
        dateRegistered: offsetDate(-9),
        present: false
      }
    ]
  };
}

function loadData() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === null) {
    return { data: makeInitialData(), warning: "" };
  }

  try {
    const parsed = JSON.parse(stored);
    if (!parsed || !Array.isArray(parsed.events) || !Array.isArray(parsed.registrations)) {
      throw new TypeError("Saved event data has an invalid structure.");
    }
    return { data: parsed, warning: "" };
  } catch (error) {
    console.error("Could not load saved event data.", error);
    return {
      data: makeInitialData(),
      warning: "Saved data could not be read. Sample data is shown; changes may replace the unread saved data."
    };
  }
}

const loaded = loadData();
let data = loaded.data;
let noticeTimeout;

function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error("Could not save event data.", error);
    showNotice("Your changes could not be saved in this browser. Check its storage settings and try again.", "error");
    return false;
  }
}

function showNotice(message, type = "success") {
  window.clearTimeout(noticeTimeout);
  elements.notice.textContent = message;
  elements.notice.className = `notice ${type}`;
  elements.notice.hidden = false;
  noticeTimeout = window.setTimeout(() => {
    elements.notice.hidden = true;
  }, 6000);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function formatDate(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(year, month - 1, day));
}

function eventRegistrations(eventId) {
  return data.registrations.filter((registration) => registration.eventId === eventId);
}

function eventMetrics(event) {
  const registrations = eventRegistrations(event.id);
  const present = registrations.filter((registration) => registration.present).length;
  return {
    registered: registrations.length,
    slotsLeft: Math.max(0, event.capacity - registrations.length),
    present,
    attendanceRate: registrations.length === 0 ? 0 : Math.round((present / registrations.length) * 100)
  };
}

function isStudentAlreadyRegistered(eventId, studentId) {
  const normalizedId = studentId.trim().toLocaleLowerCase();
  return normalizedId !== "" && data.registrations.some((registration) =>
    registration.eventId === eventId
    && registration.studentId.trim().toLocaleLowerCase() === normalizedId
  );
}

function registrationEventName(registration) {
  return data.events.find((event) => event.id === registration.eventId)?.name ?? "Event unavailable";
}

function renderEventRows() {
  const selectedStatus = elements.eventStatusFilter.value;
  const events = data.events
    .filter((event) => selectedStatus === "all" || event.status === selectedStatus)
    .slice()
    .sort((left, right) => left.date.localeCompare(right.date) || left.name.localeCompare(right.name));

  if (events.length === 0) {
    elements.eventsBody.innerHTML = '<tr><td class="empty-cell" colspan="9">No events match this status filter.</td></tr>';
    return;
  }

  elements.eventsBody.innerHTML = events.map((event) => {
    const metrics = eventMetrics(event);
    const registrationAction = event.status === "Open for Registration"
      ? `<button class="table-action primary-action" type="button" data-action="register" data-event-id="${escapeHtml(event.id)}">Register</button>`
      : "";
    const lifecycleAction = metrics.registered > 0
      ? event.status === "Completed"
        ? '<button class="table-action disabled-action" type="button" disabled>Completed</button>'
        : `<button class="table-action" type="button" data-action="complete-event" data-event-id="${escapeHtml(event.id)}">Complete</button>`
      : `<button class="table-action delete-action" type="button" data-action="delete-event" data-event-id="${escapeHtml(event.id)}">Delete</button>`;

    return `<tr>
      <td><div class="event-name"><span class="event-color lavender"></span><span><strong>${escapeHtml(event.name)}</strong><small>${metrics.registered} registered</small></span></div></td>
      <td>${escapeHtml(formatDate(event.date))}</td>
      <td>${escapeHtml(event.venue)}</td>
      <td><div class="registration-count"><strong>${metrics.registered}</strong><span> / ${event.capacity}</span><div class="progress-track"><span style="width: ${Math.min(100, Math.round(metrics.registered / event.capacity * 100))}%"></span></div></div></td>
      <td>${metrics.slotsLeft}</td>
      <td>${metrics.present}</td>
      <td>${metrics.attendanceRate}%</td>
      <td><span class="status-badge ${STATUS_CLASSES[event.status]}">${escapeHtml(event.status)}</span></td>
      <td><div class="row-actions">
        <button class="table-action" type="button" data-action="view-registrations" data-event-id="${escapeHtml(event.id)}">View registrations</button>
        ${registrationAction}
        <button class="table-action" type="button" data-action="edit-event" data-event-id="${escapeHtml(event.id)}">Edit</button>
        ${lifecycleAction}
      </div></td>
    </tr>`;
  }).join("");
}

function renderRegistrationEventOptions() {
  const previousFilter = elements.registrationEventFilter.value || "all";
  const previousSelection = elements.registrationEvent.value;
  const sortedEvents = data.events.slice().sort((left, right) => left.name.localeCompare(right.name));
  elements.registrationEventFilter.innerHTML = '<option value="all">All events</option>' + sortedEvents.map((event) =>
    `<option value="${escapeHtml(event.id)}">${escapeHtml(event.name)}</option>`
  ).join("");

  if (data.events.some((event) => event.id === previousFilter)) {
    elements.registrationEventFilter.value = previousFilter;
  }

  const openEvents = sortedEvents.filter((event) => event.status === "Open for Registration");
  elements.registrationEvent.innerHTML = openEvents.length
    ? openEvents.map((event) => {
      const full = eventMetrics(event).slotsLeft === 0;
      return `<option value="${escapeHtml(event.id)}">${escapeHtml(event.name)}${full ? " (Full)" : ""}</option>`;
    }).join("")
    : '<option value="">No events are open for registration</option>';

  if (openEvents.some((event) => event.id === previousSelection)) {
    elements.registrationEvent.value = previousSelection;
  }
}

function renderRegistrations() {
  const query = elements.registrationSearch.value.trim().toLocaleLowerCase();
  const eventId = elements.registrationEventFilter.value;
  const attendance = elements.attendanceFilter.value;
  const registrations = data.registrations.filter((registration) => {
    const matchesQuery = !query
      || registration.studentName.toLocaleLowerCase().includes(query)
      || registration.studentId.toLocaleLowerCase().includes(query);
    const matchesEvent = eventId === "all" || registration.eventId === eventId;
    const matchesAttendance = attendance === "all"
      || (attendance === "Present" && registration.present)
      || (attendance === "Not present" && !registration.present);
    return matchesQuery && matchesEvent && matchesAttendance;
  }).sort((left, right) => right.dateRegistered.localeCompare(left.dateRegistered));

  if (registrations.length === 0) {
    elements.registrationsBody.innerHTML = '<tr><td class="empty-cell" colspan="7">No registrations match your search or filters.</td></tr>';
    return;
  }

  elements.registrationsBody.innerHTML = registrations.map((registration) => {
    const event = data.events.find((item) => item.id === registration.eventId);
    const canCheckIn = event && event.date === localDateString();
    const attendanceCell = registration.present
      ? '<span class="attendance-badge present">Present</span>'
      : '<span class="attendance-badge absent">Not present</span>';
    const attendanceAction = registration.present
      ? `<button class="table-action" type="button" data-action="toggle-attendance" data-registration-id="${escapeHtml(registration.id)}">Undo present</button>`
      : `<button class="table-action ${canCheckIn ? "" : "disabled-action"}" type="button" data-action="toggle-attendance" data-registration-id="${escapeHtml(registration.id)}" ${canCheckIn ? "" : 'disabled title="Check-in is available on the event date."'}>Check in</button>`;

    return `<tr>
      <td><strong>${escapeHtml(registration.studentName)}</strong></td>
      <td>${escapeHtml(registration.studentId)}</td>
      <td>${escapeHtml(registration.yearLevel)}</td>
      <td>${escapeHtml(registrationEventName(registration))}</td>
      <td>${escapeHtml(formatDate(registration.dateRegistered))}</td>
      <td>${attendanceCell}</td>
      <td><div class="row-actions">${attendanceAction}<button class="table-action delete-action" type="button" data-action="cancel-registration" data-registration-id="${escapeHtml(registration.id)}">Cancel</button></div></td>
    </tr>`;
  }).join("");
}

function renderReports() {
  elements.statusReport.innerHTML = EVENT_STATUSES.map((status) => {
    const count = data.events.filter((event) => event.status === status).length;
    return `<div class="report-status"><span class="status-badge ${STATUS_CLASSES[status]}">${escapeHtml(status)}</span><strong>${count}</strong></div>`;
  }).join("");

  const completed = data.events.filter((event) => event.status === "Completed");
  if (completed.length === 0) {
    elements.bestEvent.innerHTML = '<span class="report-kicker">TOP COMPLETED EVENT</span><strong>No completed events yet</strong><span>Complete an event to see its attendance rate here.</span>';
    return;
  }

  const best = completed
    .map((event) => ({ event, metrics: eventMetrics(event) }))
    .sort((left, right) => right.metrics.attendanceRate - left.metrics.attendanceRate
      || right.metrics.present - left.metrics.present
      || left.event.name.localeCompare(right.event.name))[0];
  elements.bestEvent.innerHTML = `<span class="report-kicker">TOP COMPLETED EVENT</span><strong>${escapeHtml(best.event.name)}</strong><span>${best.metrics.attendanceRate}% attendance · ${best.metrics.present} present of ${best.metrics.registered} registered</span>`;
}

function renderOverview() {
  const totalRegistered = data.registrations.length;
  const totalPresent = data.registrations.filter((registration) => registration.present).length;
  elements.eventCount.textContent = String(data.events.length);
  elements.totalEvents.textContent = String(data.events.length);
  elements.totalRegistrations.textContent = String(totalRegistered);
  elements.overallAttendance.innerHTML = `${totalRegistered === 0 ? 0 : Math.round(totalPresent / totalRegistered * 100)}<span class="stat-unit">%</span>`;
  elements.openEvents.textContent = String(data.events.filter((event) => event.status === "Open for Registration").length);
  elements.todayLabel.textContent = new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric"
  }).format(new Date()).toLocaleUpperCase();
}

function render() {
  renderOverview();
  renderRegistrationEventOptions();
  renderEventRows();
  renderRegistrations();
  renderReports();
}

function openEventDialog(event) {
  elements.eventForm.reset();
  elements.eventFormError.hidden = true;
  elements.eventId.value = event?.id ?? "";
  elements.eventDialogTitle.textContent = event ? "Edit event" : "Create event";
  elements.eventName.value = event?.name ?? "";
  elements.eventDate.value = event?.date ?? "";
  elements.eventVenue.value = event?.venue ?? "";
  elements.eventCapacity.value = event?.capacity ?? "";
  elements.eventStatus.innerHTML = EVENT_STATUSES.map((status) => {
    const selected = (event?.status ?? "Draft") === status ? " selected" : "";
    return `<option value="${escapeHtml(status)}"${selected}>${escapeHtml(status)}</option>`;
  }).join("");
  elements.eventDialog.showModal();
  elements.eventName.focus();
}

function openRegistrationDialog(eventId = "") {
  renderRegistrationEventOptions();
  if (!data.events.some((event) => event.status === "Open for Registration")) {
    showNotice("There are no events currently open for registration.", "error");
    return;
  }
  elements.registrationForm.reset();
  elements.registrationFormError.hidden = true;
  if (data.events.some((event) => event.id === eventId && event.status === "Open for Registration")) {
    elements.registrationEvent.value = eventId;
  }
  elements.registrationDialog.showModal();
  elements.studentName.focus();
}

function setFormError(element, message) {
  element.textContent = message;
  element.hidden = false;
}

function handleEventSubmit(formEvent) {
  formEvent.preventDefault();
  elements.eventFormError.hidden = true;
  const id = elements.eventId.value;
  const current = data.events.find((event) => event.id === id);
  const capacity = Number(elements.eventCapacity.value);

  if (!Number.isSafeInteger(capacity) || capacity < 1) {
    setFormError(elements.eventFormError, "Capacity must be a whole number greater than zero.");
    return;
  }
  if (current && capacity < eventMetrics(current).registered) {
    setFormError(elements.eventFormError, "Capacity cannot be lower than the number of students already registered.");
    return;
  }

  const event = {
    id: current?.id ?? crypto.randomUUID(),
    name: elements.eventName.value.trim(),
    date: elements.eventDate.value,
    venue: elements.eventVenue.value.trim(),
    capacity,
    status: elements.eventStatus.value
  };

  if (!event.name || !event.date || !event.venue || !EVENT_STATUSES.includes(event.status)) {
    setFormError(elements.eventFormError, "Complete all event fields with valid values.");
    return;
  }

  if (current) {
    data.events = data.events.map((item) => item.id === current.id ? event : item);
  } else {
    data.events.push(event);
  }
  if (!saveData()) {
    data.events = current
      ? data.events.map((item) => item.id === current.id ? current : item)
      : data.events.filter((item) => item.id !== event.id);
    return;
  }

  elements.eventDialog.close();
  render();
  showNotice(current ? "Event updated." : "Event created.");
}

function handleRegistrationSubmit(formEvent) {
  formEvent.preventDefault();
  elements.registrationFormError.hidden = true;
  const event = data.events.find((item) => item.id === elements.registrationEvent.value);
  if (!event || event.status !== "Open for Registration") {
    setFormError(elements.registrationFormError, "Choose an event that is open for registration.");
    return;
  }

  const metrics = eventMetrics(event);
  if (metrics.slotsLeft === 0) {
    setFormError(elements.registrationFormError, "This event is full. No registration was added.");
    return;
  }

  const studentId = elements.studentId.value.trim();
  if (isStudentAlreadyRegistered(event.id, studentId)) {
    setFormError(elements.registrationFormError, DUPLICATE_ID_MESSAGE);
    elements.studentId.focus();
    return;
  }

  const registration = {
    id: crypto.randomUUID(),
    eventId: event.id,
    studentName: elements.studentName.value.trim(),
    studentId,
    yearLevel: elements.studentYear.value,
    dateRegistered: localDateString(),
    present: false
  };
  if (!registration.studentName || !studentId || !registration.yearLevel) {
    setFormError(elements.registrationFormError, "Complete all student fields.");
    return;
  }

  data.registrations.push(registration);
  if (!saveData()) {
    data.registrations = data.registrations.filter((item) => item.id !== registration.id);
    return;
  }

  elements.registrationDialog.close();
  render();
  showNotice(`${registration.studentName} registered for ${event.name}.`);
}

function updateDuplicateIdMessage() {
  const selectedEventId = elements.registrationEvent.value;
  const duplicate = isStudentAlreadyRegistered(selectedEventId, elements.studentId.value);
  if (duplicate) {
    setFormError(elements.registrationFormError, DUPLICATE_ID_MESSAGE);
  } else if (elements.registrationFormError.textContent === DUPLICATE_ID_MESSAGE) {
    elements.registrationFormError.hidden = true;
  }
}

function deleteEvent(eventId) {
  const event = data.events.find((item) => item.id === eventId);
  if (!event) {
    showNotice("That event could not be found.", "error");
    return;
  }
  if (eventRegistrations(eventId).length > 0) {
    completeEvent(eventId);
    return;
  }
  if (!window.confirm(`Delete "${event.name}"? This cannot be undone.`)) {
    return;
  }
  data.events = data.events.filter((item) => item.id !== eventId);
  if (!saveData()) {
    data.events.push(event);
    return;
  }
  render();
  showNotice("Event deleted.");
}

function completeEvent(eventId) {
  const event = data.events.find((item) => item.id === eventId);
  if (!event) {
    showNotice("That event could not be found.", "error");
    return;
  }
  if (event.status === "Completed") {
    showNotice("This event is already Completed.");
    return;
  }

  const previousStatus = event.status;
  event.status = "Completed";
  if (!saveData()) {
    event.status = previousStatus;
    return;
  }

  render();
  showNotice(`"${event.name}" moved to Completed. Its registrations and attendance records were kept.`);
}

function cancelRegistration(registrationId) {
  const registration = data.registrations.find((item) => item.id === registrationId);
  if (!registration) {
    showNotice("That registration could not be found.", "error");
    return;
  }
  if (!window.confirm(`Cancel ${registration.studentName}'s registration for ${registrationEventName(registration)}?`)) {
    return;
  }
  data.registrations = data.registrations.filter((item) => item.id !== registrationId);
  if (!saveData()) {
    data.registrations.push(registration);
    return;
  }
  render();
  showNotice("Registration cancelled. The event slot is available again.");
}

function toggleAttendance(registrationId) {
  const registration = data.registrations.find((item) => item.id === registrationId);
  if (!registration) {
    showNotice("That registration could not be found.", "error");
    return;
  }
  const event = data.events.find((item) => item.id === registration.eventId);
  if (!registration.present && (!event || event.date !== localDateString())) {
    showNotice("Students can only be checked in on the event date.", "error");
    return;
  }
  registration.present = !registration.present;
  if (!saveData()) {
    registration.present = !registration.present;
    return;
  }
  render();
  showNotice(registration.present ? `${registration.studentName} marked Present.` : `${registration.studentName}'s attendance was undone.`);
}

elements.eventStatusFilter.addEventListener("change", renderEventRows);
elements.registrationSearch.addEventListener("input", renderRegistrations);
elements.registrationEventFilter.addEventListener("change", renderRegistrations);
elements.attendanceFilter.addEventListener("change", renderRegistrations);
elements.eventForm.addEventListener("submit", handleEventSubmit);
elements.registrationForm.addEventListener("submit", handleRegistrationSubmit);
elements.registrationEvent.addEventListener("change", updateDuplicateIdMessage);
elements.studentId.addEventListener("input", updateDuplicateIdMessage);
document.querySelector("#create-event-button").addEventListener("click", () => openEventDialog());
document.querySelector("#register-student-button").addEventListener("click", () => openRegistrationDialog());
document.querySelectorAll("[data-close-dialog]").forEach((button) => {
  button.addEventListener("click", () => button.closest("dialog").close());
});
elements.eventsBody.addEventListener("click", (clickEvent) => {
  const button = clickEvent.target.closest("button[data-action]");
  if (!button) {
    return;
  }
  const event = data.events.find((item) => item.id === button.dataset.eventId);
  if (button.dataset.action === "register") {
    openRegistrationDialog(button.dataset.eventId);
  } else if (button.dataset.action === "view-registrations" && event) {
    elements.registrationEventFilter.value = event.id;
    renderRegistrations();
    document.querySelector("#registrations").scrollIntoView({ behavior: "smooth", block: "start" });
  } else if (button.dataset.action === "edit-event" && event) {
    openEventDialog(event);
  } else if (button.dataset.action === "complete-event") {
    completeEvent(button.dataset.eventId);
  } else if (button.dataset.action === "delete-event") {
    deleteEvent(button.dataset.eventId);
  }
});
elements.registrationsBody.addEventListener("click", (clickEvent) => {
  const button = clickEvent.target.closest("button[data-action]");
  if (!button || button.disabled) {
    return;
  }
  if (button.dataset.action === "toggle-attendance") {
    toggleAttendance(button.dataset.registrationId);
  } else if (button.dataset.action === "cancel-registration") {
    cancelRegistration(button.dataset.registrationId);
  }
});

render();
if (loaded.warning) {
  showNotice(loaded.warning, "error");
}
