document.body.classList.add("js-ready");

const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
const mobileNavQuery = window.matchMedia("(max-width: 720px)");
const toggle = document.querySelector(".nav-toggle");
const links = document.querySelector(".nav-links");

function syncMobileNav(expanded = toggle?.classList.contains("open") || false) {
  if (!toggle || !links) return;

  toggle.setAttribute("aria-expanded", String(expanded));

  if (mobileNavQuery.matches) {
    links.inert = !expanded;
    links.setAttribute("aria-hidden", String(!expanded));
  } else {
    links.inert = false;
    links.removeAttribute("aria-hidden");
  }
}

toggle?.addEventListener("click", () => {
  const expanded = toggle.classList.toggle("open");
  links?.classList.toggle("open", expanded);
  syncMobileNav(expanded);
});

if (mobileNavQuery.addEventListener) {
  mobileNavQuery.addEventListener("change", () => syncMobileNav());
} else {
  mobileNavQuery.addListener(() => syncMobileNav());
}
syncMobileNav(false);

document.querySelectorAll("[data-copy-email]").forEach((button) => {
  const originalText = button.textContent;

  button.addEventListener("click", async () => {
    const email = button.dataset.copyEmail;
    if (!email) return;

    try {
      await navigator.clipboard.writeText(email);
      button.textContent = "Copied";
      setTimeout(() => {
        button.textContent = originalText;
      }, 1800);
    } catch {
      window.prompt("Copy this email address:", email);
    }
  });
});

if (document.body.dataset.page === "projects") {
  const stage = document.getElementById("cards-stage");
  const cards = stage ? Array.from(stage.querySelectorAll(".project-card")) : [];
  const buttons = Array.from(document.querySelectorAll(".filter-btn"));
  const status = document.getElementById("filter-status");
  let activeFilter = "all";
  let currentOrder = cards.map((card) => card.dataset.id);

  function shuffle(list) {
    const copy = [...list];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function getVisibleCards(filter) {
    return cards.filter((card) => {
      if (filter === "all") return true;
      return (card.dataset.tools || "").split(",").includes(filter);
    });
  }

  function describeFilter(filter, count) {
    if (filter === "all") {
      return `Showing ${count} projects`;
    }

    const label = buttons.find((button) => button.dataset.filter === filter)?.textContent || filter;
    return `Showing ${count} ${label} project${count === 1 ? "" : "s"}`;
  }

  function layoutCards(filter = activeFilter, animate = true) {
    const visibleCards = getVisibleCards(filter);
    const hiddenCards = cards.filter((card) => !visibleCards.includes(card));
    const hiddenState = new Map(cards.map((card) => [card, card.classList.contains("is-hidden")]));

    currentOrder = shuffle(visibleCards).map((card) => card.dataset.id);

    const orderedVisible = currentOrder
      .map((id) => cards.find((card) => card.dataset.id === id))
      .filter(Boolean);

    const stageWidth = stage.clientWidth;
    const minWidth = 260;
    const gap = 24;
    const columns = Math.max(1, Math.floor((stageWidth + gap) / (minWidth + gap)));
    const cardWidth = columns === 1
      ? stageWidth
      : Math.floor((stageWidth - gap * (columns - 1)) / columns);
    stage.style.setProperty("--card-width", `${cardWidth}px`);
    stage.style.setProperty("--card-height", "360px");

    orderedVisible.forEach((card) => {
      card.style.width = `${cardWidth}px`;
      card.removeAttribute("aria-hidden");
      card.removeAttribute("tabindex");
      card.classList.remove("is-hidden");
    });

    const columnHeights = Array(columns).fill(0);

    orderedVisible.forEach((card) => {
      const cardHeight = card.offsetHeight;
      const column = columnHeights.indexOf(Math.min(...columnHeights));
      const x = column * (cardWidth + gap);
      const y = columnHeights[column];
      const wasHidden = hiddenState.get(card);

      columnHeights[column] += cardHeight + gap;

      card.style.setProperty("--x", `${x}px`);
      card.style.setProperty("--y", `${y}px`);

      if (wasHidden && animate) {
        card.style.transition = "none";
        card.style.setProperty("--offset-x", `${(Math.random() - 0.5) * 110}px`);
        card.style.setProperty("--offset-y", "56px");
        card.style.setProperty("--scale", "0.92");
        void card.offsetWidth;
        card.style.transition = "";
        requestAnimationFrame(() => {
          card.style.setProperty("--offset-x", "0px");
          card.style.setProperty("--offset-y", "0px");
          card.style.setProperty("--scale", "1");
        });
      } else {
        card.style.transition = animate ? "" : "none";
        card.style.setProperty("--offset-x", "0px");
        card.style.setProperty("--offset-y", "0px");
        card.style.setProperty("--scale", "1");
      }
    });

    stage.style.height = `${Math.max(0, ...columnHeights) - gap}px`;

    hiddenCards.forEach((card) => {
      const driftX = `${(Math.random() - 0.5) * 60}px`;
      card.style.setProperty("--offset-x", animate ? driftX : "0px");
      card.style.setProperty("--offset-y", animate ? "42px" : "0px");
      card.style.setProperty("--scale", animate ? "0.88" : "1");
      card.classList.add("is-hidden");
      card.setAttribute("aria-hidden", "true");
      card.setAttribute("tabindex", "-1");
      card.style.transition = animate ? "" : "none";
    });

    status.textContent = describeFilter(filter, orderedVisible.length);

    if (!animate) {
      requestAnimationFrame(() => {
        cards.forEach((card) => {
          card.style.transition = "";
        });
      });
    }
  }

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      const nextFilter = button.dataset.filter;
      activeFilter = nextFilter;
      buttons.forEach((item) => {
        const isActive = item === button;
        item.classList.toggle("active", isActive);
        item.setAttribute("aria-pressed", String(isActive));
      });
      layoutCards(nextFilter, true);
    });
  });

  cards.forEach((card) => {
    const shell = card.querySelector(".card-shell");

    card.addEventListener("mouseenter", () => {
      card.classList.add("is-active");
    });

    card.addEventListener("mousemove", (event) => {
      const rect = card.getBoundingClientRect();
      const rotateX = ((event.clientY - rect.top - rect.height / 2) / rect.height) * -14;
      const rotateY = ((event.clientX - rect.left - rect.width / 2) / rect.width) * 14;
      shell.style.transform = `perspective(1080px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-14px) scale(1.025)`;
      shell.style.boxShadow = `${-rotateY * 1.8}px 34px 54px rgba(15, 23, 42, 0.24)`;
      shell.style.borderColor = "rgba(29, 78, 216, 0.22)";
    });

    card.addEventListener("mouseleave", () => {
      shell.style.transform = "";
      shell.style.boxShadow = "";
      shell.style.borderColor = "";
      card.classList.remove("is-active");
    });
  });

  if (stage) {
    const resizeObserver = new ResizeObserver(() => {
      layoutCards(activeFilter, false);
    });

    resizeObserver.observe(stage);
    layoutCards(activeFilter, false);
  }
}

const carousels = Array.from(document.querySelectorAll("[data-sheet-carousel]"));

carousels.forEach((carousel) => {
  const frame = carousel.querySelector(".sheet-carousel-frame");
  const track = carousel.querySelector("[data-carousel-track]");
  const slides = track ? Array.from(track.querySelectorAll(".project-img")) : [];
  const previous = carousel.querySelector("[data-carousel-prev]");
  const next = carousel.querySelector("[data-carousel-next]");
  const status = carousel.querySelector("[data-carousel-status]");
  let index = 0;
  let startX = null;
  let startY = null;

  if (!track || slides.length === 0) {
    return;
  }

  carousel.setAttribute("aria-roledescription", "carousel");
  status?.setAttribute("aria-live", "polite");

  slides.forEach((slide, slideIndex) => {
    slide.setAttribute("aria-roledescription", "slide");
    slide.setAttribute("aria-label", `${slideIndex + 1} of ${slides.length}`);
  });

  function syncFrameHeight() {
    const activeSlide = slides[index];
    if (!frame || !activeSlide) {
      return;
    }

    const height = activeSlide.offsetHeight;
    if (height) {
      frame.style.height = `${height}px`;
    }
  }

  function goTo(nextIndex) {
    const clampedIndex = Math.max(0, Math.min(slides.length - 1, nextIndex));
    if (clampedIndex === index) return;
    index = clampedIndex;
    render();
  }

  function render() {
    slides.forEach((slide, slideIndex) => {
      slide.classList.remove("is-current", "is-prev", "is-next", "is-far-prev", "is-far-next");
      slide.setAttribute("aria-hidden", String(slideIndex !== index));

      const delta = slideIndex - index;
      if (delta === 0) {
        slide.classList.add("is-current");
      } else if (delta === -1) {
        slide.classList.add("is-prev");
      } else if (delta === 1) {
        slide.classList.add("is-next");
      } else if (delta === -2) {
        slide.classList.add("is-far-prev");
      } else if (delta === 2) {
        slide.classList.add("is-far-next");
      }
    });

    if (status) {
      status.textContent = `${index + 1} / ${slides.length}`;
    }

    if (previous) {
      previous.disabled = index === 0;
    }

    if (next) {
      next.disabled = index === slides.length - 1;
    }

    requestAnimationFrame(syncFrameHeight);
  }

  previous?.addEventListener("click", () => {
    goTo(index - 1);
  });

  next?.addEventListener("click", () => {
    goTo(index + 1);
  });

  carousel.addEventListener("keydown", (event) => {
    if (!carousel.contains(document.activeElement)) {
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      goTo(index - 1);
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      goTo(index + 1);
    }
  });

  carousel.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse") return;
    startX = event.clientX;
    startY = event.clientY;
  });

  carousel.addEventListener("pointerup", (event) => {
    if (startX === null || startY === null) return;

    const deltaX = event.clientX - startX;
    const deltaY = event.clientY - startY;
    startX = null;
    startY = null;

    if (Math.abs(deltaX) < 44 || Math.abs(deltaX) < Math.abs(deltaY)) {
      return;
    }

    if (deltaX < 0) {
      goTo(index + 1);
    } else {
      goTo(index - 1);
    }
  });

  slides.forEach((slide) => {
    const image = slide.querySelector("img");
    image?.addEventListener("load", syncFrameHeight);
  });

  window.addEventListener("resize", syncFrameHeight);
  render();
});
