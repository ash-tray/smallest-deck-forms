// ============================================================
// Wizard mechanics. The data/logic you'd want to tweak lives in
// config.js instead.
// ============================================================

const state = {
  requesterEmail: "",
  customerName: "",
  customerLogo: "",
  delivery: "",
  pitches: [],
  slides: [],
  customSlidesText: ""
};

let slideView = "list"; // "list" | "gallery"

// ---------- Step navigation ----------

function goToStep(n) {
  document.querySelectorAll(".step").forEach((el) => {
    el.classList.toggle("active", Number(el.dataset.step) === n);
  });
  document.querySelectorAll(".step-dot").forEach((el) => {
    const isActive = Number(el.dataset.step) === n;
    el.classList.toggle("active", isActive);
    if (isActive) {
      el.setAttribute("aria-current", "step");
    } else {
      el.removeAttribute("aria-current");
    }
  });
  if (n === 3) renderSlideOptions();
  if (n === 4) renderReview();
}

document.querySelectorAll("[data-next]").forEach((btn) => {
  btn.addEventListener("click", () => {
    if (!validateCurrentStep(currentStepNumber(btn))) return;
    goToStep(Number(btn.dataset.next));
  });
});

document.querySelectorAll("[data-back]").forEach((btn) => {
  btn.addEventListener("click", () => goToStep(Number(btn.dataset.back)));
});

function currentStepNumber(fromButton) {
  return Number(fromButton.closest(".step").dataset.step);
}

function getMinFirstReviewDate() {
  const min = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const y = min.getFullYear();
  const m = String(min.getMonth() + 1).padStart(2, "0");
  const d = String(min.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function initFirstReviewField() {
  const input = document.getElementById("delivery");
  input.min = getMinFirstReviewDate();

  const openPicker = () => {
    if (typeof input.showPicker === "function") {
      try {
        input.showPicker();
      } catch {
        // showPicker throws if already open or unsupported context
      }
    }
  };

  input.addEventListener("click", openPicker);
}

function validateFirstReviewDate(showInline = true) {
  const input = document.getElementById("delivery");
  const errorEl = document.getElementById("deliveryError");
  const min = getMinFirstReviewDate();
  state.delivery = input.value;

  input.min = min;

  if (!state.delivery) {
    if (showInline) {
      errorEl.textContent = "Pick a first review date.";
      errorEl.hidden = false;
      input.setAttribute("aria-invalid", "true");
    }
    return false;
  }

  if (state.delivery < min) {
    if (showInline) {
      errorEl.textContent = "First review must be at least 24 hours from now.";
      errorEl.hidden = false;
      input.setAttribute("aria-invalid", "true");
    }
    return false;
  }

  errorEl.hidden = true;
  input.removeAttribute("aria-invalid");
  return true;
}

document.getElementById("delivery").addEventListener("input", () => {
  if (document.getElementById("delivery").hasAttribute("aria-invalid")) {
    validateFirstReviewDate(true);
  }
});

function validateRequesterEmail(showInline = true) {
  const input = document.getElementById("requesterEmail");
  const errorEl = document.getElementById("requesterEmailError");
  state.requesterEmail = input.value.trim().toLowerCase();

  if (!state.requesterEmail) {
    if (showInline) {
      errorEl.textContent = "Enter your @smallest.ai email.";
      errorEl.hidden = false;
      input.setAttribute("aria-invalid", "true");
    }
    return false;
  }

  if (!isAllowedEmail(state.requesterEmail)) {
    if (showInline) {
      errorEl.textContent = "Use your @smallest.ai work email.";
      errorEl.hidden = false;
      input.setAttribute("aria-invalid", "true");
    }
    return false;
  }

  errorEl.hidden = true;
  input.removeAttribute("aria-invalid");
  return true;
}

document.getElementById("requesterEmail").addEventListener("input", () => {
  if (document.getElementById("requesterEmail").hasAttribute("aria-invalid")) {
    validateRequesterEmail(true);
  }
});

function validateCurrentStep(step) {
  if (step === 1) {
    if (!validateRequesterEmail(true)) return false;
    state.customerName = document.getElementById("customerName").value.trim();
    state.customerLogo = document.getElementById("customerLogo").value.trim();
    if (!validateFirstReviewDate(true)) return false;
    if (!state.customerName) {
      alert("Customer Name is required.");
      return false;
    }
  }
  if (step === 2) {
    if (state.pitches.length === 0) {
      alert("Pick one thing you're pitching.");
      return false;
    }
  }
  if (step === 3) {
    state.customSlidesText = document.getElementById("customSlides").value.trim();
    if (state.slides.length === 0 && !state.customSlidesText) {
      alert("Pick at least one slide, or describe custom slides in the text box.");
      return false;
    }
  }
  return true;
}

function syncStateFromForm() {
  state.requesterEmail = document.getElementById("requesterEmail").value.trim().toLowerCase();
  state.customerName = document.getElementById("customerName").value.trim();
  state.customerLogo = document.getElementById("customerLogo").value.trim();
  state.delivery = document.getElementById("delivery").value;
  state.customSlidesText = document.getElementById("customSlides").value.trim();
}

// ---------- Step 2: pitch options ----------

function selectPitchOption(index) {
  const container = document.getElementById("pitchOptions");
  const item = container.querySelector(`.choice-item[data-index="${index}"]`);
  if (!item) return;

  container.querySelectorAll(".choice-item").forEach((el) => {
    const selected = el === item;
    el.classList.toggle("selected", selected);
    el.setAttribute("aria-selected", String(selected));
  });

  state.pitches = [item.dataset.value];
}

function getPitchKeyLabel(index) {
  if (index === 0) return "1";
  if (index === 1) return "A";
  if (index >= 2 && index <= 9) return String(index);
  if (index === 10) return "0";
  return String(index + 1);
}

function getPitchIndexFromKey(key) {
  const normalized = key.length === 1 ? key.toLowerCase() : key;
  if (normalized === "a") return 1;
  if (normalized >= "1" && normalized <= "9") return Number(normalized) === 1 ? 0 : Number(normalized);
  if (normalized === "0") return 10;
  return -1;
}

function renderPitchOptions() {
  const container = document.getElementById("pitchOptions");
  container.innerHTML = "";

  PITCH_OPTIONS.forEach((option, index) => {
    const isSelected = state.pitches.includes(option);
    const keyLabel = getPitchKeyLabel(index);

    const item = document.createElement("button");
    item.type = "button";
    item.className = "choice-item" + (isSelected ? " selected" : "");
    item.dataset.value = option;
    item.dataset.index = String(index);
    item.setAttribute("role", "option");
    item.setAttribute("aria-selected", String(isSelected));
    item.innerHTML = `
      <span class="choice-key" aria-hidden="true">${keyLabel}</span>
      <span class="choice-label">${escapeHtml(option)}</span>
    `;
    item.addEventListener("click", () => selectPitchOption(index));
    container.appendChild(item);
  });
}

function handlePitchKeyboard(e) {
  const step2 = document.querySelector('.step[data-step="2"]');
  if (!step2?.classList.contains("active")) return;

  const target = e.target;
  if (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    target?.isContentEditable
  ) {
    return;
  }

  const index = getPitchIndexFromKey(e.key);
  if (index >= 0 && index < PITCH_OPTIONS.length) {
    e.preventDefault();
    selectPitchOption(index);
  }
}

document.addEventListener("keydown", handlePitchKeyboard);

// ---------- Step 3: slide options (list + gallery) ----------

document.getElementById("viewList").addEventListener("click", () => {
  slideView = "list";
  document.getElementById("viewList").classList.add("active");
  document.getElementById("viewGallery").classList.remove("active");
  document.getElementById("slideOptionsList").style.display = "grid";
  document.getElementById("slideOptionsGallery").style.display = "none";
});

document.getElementById("viewGallery").addEventListener("click", () => {
  slideView = "gallery";
  document.getElementById("viewGallery").classList.add("active");
  document.getElementById("viewList").classList.remove("active");
  document.getElementById("slideOptionsList").style.display = "none";
  document.getElementById("slideOptionsGallery").style.display = "grid";
});

function renderSlideOptions() {
  const available = getAvailableSlides(state.pitches);

  document.getElementById("slideHint").textContent =
    `Based on what you're pitching, ${available.length} slide${available.length === 1 ? "" : "s"} are available.`;

  const availableNames = available.map((s) => s.name);
  state.slides = state.slides.filter((s) => availableNames.includes(s));

  renderSlideList(available);
  renderSlideGallery(available);
}

function renderSlideList(available) {
  const container = document.getElementById("slideOptionsList");
  container.innerHTML = "";
  available.forEach((slide) => {
    const card = document.createElement("label");
    card.className = "option-card";
    const checked = state.slides.includes(slide.name) ? "checked" : "";
    if (checked) card.classList.add("selected");
    card.innerHTML = `<input type="checkbox" value="${slide.name}" ${checked} /> <span>${slide.name}</span>`;
    const checkbox = card.querySelector("input");
    checkbox.addEventListener("change", () => toggleSlide(slide.name, checkbox.checked));
    container.appendChild(card);
  });
}

function renderSlideGallery(available) {
  const container = document.getElementById("slideOptionsGallery");
  container.innerHTML = "";
  available.forEach((slide) => {
    const card = document.createElement("div");
    card.className = "gallery-card";
    if (state.slides.includes(slide.name)) card.classList.add("selected");

    const thumbHtml = slide.thumb
      ? `<img src="${slide.thumb}" alt="${slide.name}" />`
      : slide.name;

    card.innerHTML = `
      <div class="gallery-thumb">${thumbHtml}</div>
      <div class="gallery-label">${slide.name}</div>
    `;
    card.addEventListener("click", () => {
      const isSelected = state.slides.includes(slide.name);
      toggleSlide(slide.name, !isSelected);
      card.classList.toggle("selected", !isSelected);
      const listCheckbox = document.querySelector(
        `#slideOptionsList input[value="${slide.name}"]`
      );
      if (listCheckbox) {
        listCheckbox.checked = !isSelected;
        listCheckbox.closest(".option-card").classList.toggle("selected", !isSelected);
      }
    });
    container.appendChild(card);
  });
}

function toggleSlide(name, isSelected) {
  if (isSelected && !state.slides.includes(name)) {
    state.slides.push(name);
  } else if (!isSelected) {
    state.slides = state.slides.filter((s) => s !== name);
  }
}

// ---------- Step 4: review + submit ----------

function renderReview() {
  syncStateFromForm();

  const el = document.getElementById("reviewSummary");
  el.innerHTML = `
    <b>Requester</b> ${escapeHtml(state.requesterEmail)}
    <b>Customer Name</b> ${escapeHtml(state.customerName)}
    <b>First Review</b> ${escapeHtml(state.delivery)}
    <b>What are we pitching</b> ${state.pitches.map(escapeHtml).join(", ") || "(none)"}
    <b>Slides (${state.slides.length})</b> ${state.slides.map(escapeHtml).join(", ") || "(none)"}
    <b>Custom Slides</b> ${escapeHtml(state.customSlidesText) || "(none)"}
    <b>Customer Logo URL</b> ${escapeHtml(state.customerLogo) || "(none)"}
  `;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

document.getElementById("submitBtn").addEventListener("click", submitDeck);

document.getElementById("deckForm").addEventListener("submit", (e) => {
  e.preventDefault();
  submitDeck();
});

async function submitDeck() {
  syncStateFromForm();

  if (!validateRequesterEmail(true)) {
    goToStep(1);
    return;
  }
  if (!validateFirstReviewDate(true)) {
    goToStep(1);
    return;
  }
  if (!state.customerName) {
    alert("Customer Name is required.");
    goToStep(1);
    return;
  }
  if (state.pitches.length === 0) {
    alert("Pick one thing you're pitching.");
    goToStep(2);
    return;
  }
  if (state.slides.length === 0 && !state.customSlidesText) {
    alert("Pick at least one slide, or describe custom slides.");
    goToStep(3);
    return;
  }

  const statusEl = document.getElementById("submitStatus");
  const submitBtn = document.getElementById("submitBtn");
  submitBtn.disabled = true;
  statusEl.className = "submit-status";
  statusEl.textContent = "Submitting...";

  try {
    const res = await fetch(PROXY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create",
        requesterEmail: state.requesterEmail,
        customerName: state.customerName,
        customerLogo: state.customerLogo,
        delivery: state.delivery,
        pitches: state.pitches,
        slides: state.slides,
        customSlides: state.customSlidesText
      })
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      statusEl.className = "submit-status error";
      const hint = data?.hint ? ` ${data.hint}` : "";
      const msg = data?.error || data?.detail?.message || res.statusText;
      statusEl.textContent = `Submission failed (${res.status}): ${msg}${hint}`;

      if (res.status === 400 && String(msg).includes('Unknown action "create"')) {
        statusEl.textContent += " Deploy the updated worker.js to Cloudflare.";
      }

      submitBtn.disabled = false;
      return;
    }

    statusEl.className = "submit-status success";
    if (data?.url) {
      statusEl.innerHTML =
        `Submitted for ${escapeHtml(state.requesterEmail)}. <a href="${escapeHtml(data.url)}" target="_blank" rel="noopener">Open in Notion</a>`;
    } else {
      statusEl.textContent = `Submitted for ${state.requesterEmail}.`;
    }
  } catch (err) {
    statusEl.className = "submit-status error";
    statusEl.textContent = `Submission failed: ${err.message}`;
    submitBtn.disabled = false;
  }
}

// ---------- Init ----------

renderPitchOptions();
initFirstReviewField();
goToStep(1);
