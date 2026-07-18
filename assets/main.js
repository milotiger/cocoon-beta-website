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

function initActiveNav({ navSelector }) {
  const nav = document.querySelector(navSelector);
  if (!nav) return;

  const links = Array.from(nav.querySelectorAll(":scope > a[href^='#']:not(.nav-cta)"));
  const sections = links
    .map((link) => document.querySelector(link.getAttribute("href")))
    .filter(Boolean);
  if (!sections.length) return;

  function setActiveLink({ sectionId }) {
    links.forEach((link) => {
      const isActive = link.getAttribute("href") === `#${sectionId}`;
      link.classList.toggle("is-active", isActive);
      if (isActive) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
  }

  links.forEach((link) => {
    link.addEventListener("click", () => {
      setActiveLink({ sectionId: link.getAttribute("href").slice(1) });
    });
  });

  if (!("IntersectionObserver" in window)) return;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) setActiveLink({ sectionId: entry.target.id });
    });
  }, { rootMargin: "-24% 0px -66% 0px", threshold: 0 });

  sections.forEach((section) => observer.observe(section));
}

function initCarousels({ carouselSelector }) {
  document.querySelectorAll(carouselSelector).forEach((carousel) => {
    const viewport = carousel.querySelector("[data-carousel-viewport]");
    const track = carousel.querySelector(".quote-track");
    const cards = Array.from(carousel.querySelectorAll(".testimonial-card"));
    const previousButton = carousel.querySelector("[data-carousel-prev]");
    const nextButton = carousel.querySelector("[data-carousel-next]");
    const status = carousel.querySelector("[data-carousel-status]");
    if (!viewport || !track || !cards.length || !previousButton || !nextButton || !status) return;

    function getMetrics() {
      const cardWidth = cards[0].getBoundingClientRect().width;
      const gap = parseFloat(window.getComputedStyle(track).columnGap) || 0;
      const step = cardWidth + gap;
      const visibleCards = Math.max(1, Math.round(viewport.clientWidth / cardWidth));
      const firstCard = Math.min(cards.length - visibleCards, Math.max(0, Math.round(viewport.scrollLeft / step)));
      return { firstCard, step, visibleCards };
    }

    function updateCarousel() {
      const { firstCard, visibleCards } = getMetrics();
      const lastVisibleCard = Math.min(firstCard + visibleCards, cards.length);
      previousButton.disabled = firstCard === 0;
      nextButton.disabled = lastVisibleCard === cards.length;
      status.textContent = `${firstCard + 1}–${lastVisibleCard} / ${cards.length}`;
    }

    function moveCarousel({ direction }) {
      const { firstCard, step, visibleCards } = getMetrics();
      const lastStart = Math.max(0, cards.length - visibleCards);
      const targetCard = Math.min(lastStart, Math.max(0, firstCard + direction * visibleCards));
      viewport.scrollTo({ left: targetCard * step, behavior: "smooth" });
    }

    previousButton.addEventListener("click", () => moveCarousel({ direction: -1 }));
    nextButton.addEventListener("click", () => moveCarousel({ direction: 1 }));
    viewport.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      moveCarousel({ direction: event.key === "ArrowRight" ? 1 : -1 });
    });

    let updateFrame;
    viewport.addEventListener("scroll", () => {
      window.cancelAnimationFrame(updateFrame);
      updateFrame = window.requestAnimationFrame(updateCarousel);
    }, { passive: true });

    if ("ResizeObserver" in window) {
      new ResizeObserver(updateCarousel).observe(viewport);
    } else {
      window.addEventListener("resize", updateCarousel);
    }
    updateCarousel();
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
  initActiveNav({ navSelector: "[data-nav-main]" });
  initCarousels({ carouselSelector: "[data-carousel]" });
  initTourForm({ formSelector: "[data-tour-form]" });
});
