function initNavToggle({ toggleSelector, navSelector }) {
  const toggle = document.querySelector(toggleSelector);
  const nav = document.querySelector(navSelector);
  if (!toggle || !nav) return;

  function setNavState({ isOpen }) {
    nav.classList.toggle("is-open", isOpen);
    document.body.classList.toggle("nav-open", isOpen);
    toggle.setAttribute("aria-expanded", String(isOpen));
  }

  toggle.addEventListener("click", () => {
    setNavState({ isOpen: !nav.classList.contains("is-open") });
  });

  nav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => setNavState({ isOpen: false }));
  });
}

function getIsoDate({ date }) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isSunday({ value }) {
  if (!value) return false;
  return new Date(`${value}T12:00:00`).getDay() === 0;
}

function showStatus({ status, message, isError = false }) {
  status.textContent = message;
  status.classList.toggle("is-error", isError);
}

function initTourForm({ formSelector }) {
  const form = document.querySelector(formSelector);
  if (!form) return;

  const status = form.querySelector("[data-form-status]");
  const tourDate = form.elements.tourDate;
  const childDob = form.elements.childDob;
  const isVietnamese = document.documentElement.lang === "vi";
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  tourDate.min = getIsoDate({ date: tomorrow });
  childDob.max = getIsoDate({ date: today });

  tourDate.addEventListener("change", () => {
    if (isSunday({ value: tourDate.value })) {
      tourDate.setCustomValidity(isVietnamese ? "Vui lòng chọn ngày từ Thứ Hai đến Thứ Bảy." : "Please choose a date from Monday to Saturday.");
      showStatus({ status, message: tourDate.validationMessage, isError: true });
      return;
    }
    tourDate.setCustomValidity("");
    showStatus({ status, message: "" });
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (isSunday({ value: tourDate.value })) {
      tourDate.setCustomValidity(isVietnamese ? "Vui lòng chọn ngày từ Thứ Hai đến Thứ Bảy." : "Please choose a date from Monday to Saturday.");
    }
    if (!form.reportValidity()) return;

    const formData = new FormData(form);
    const subject = isVietnamese ? "Đăng ký tham quan Cocoon" : "Cocoon tour booking request";
    const labels = isVietnamese
      ? { name: "Phụ huynh", phone: "Điện thoại", email: "Email", dob: "Ngày sinh của trẻ", date: "Ngày tham quan", source: "Nguồn", message: "Câu hỏi" }
      : { name: "Parent", phone: "Phone", email: "Email", dob: "Child DOB", date: "Tour date", source: "Source", message: "Questions" };
    const body = [
      `${labels.name}: ${formData.get("parentName")}`,
      `${labels.phone}: ${formData.get("phone")}`,
      `${labels.email}: ${formData.get("email") || "-"}`,
      `${labels.dob}: ${formData.get("childDob")}`,
      `${labels.date}: ${formData.get("tourDate")}`,
      `${labels.source}: ${formData.get("source") || "-"}`,
      `${labels.message}: ${formData.get("message") || "-"}`
    ].join("\n");

    showStatus({
      status,
      message: isVietnamese ? "Đang mở ứng dụng email để bạn xác nhận gửi yêu cầu…" : "Opening your email app so you can confirm the request…"
    });
    window.location.href = `mailto:admin@cocoon.edu.vn?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initNavToggle({ toggleSelector: "[data-nav-toggle]", navSelector: "[data-nav-main]" });
  initTourForm({ formSelector: "[data-tour-form]" });
});
