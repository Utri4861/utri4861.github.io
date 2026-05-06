const toggle = document.querySelector(".nav-toggle");
const links = document.querySelector(".nav-links");

toggle?.addEventListener("click", () => {
  const expanded = toggle.classList.toggle("open");
  links?.classList.toggle("open", expanded);
  toggle.setAttribute("aria-expanded", String(expanded));
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
    const cardHeight = 360;
    const rows = Math.max(1, Math.ceil(orderedVisible.length / columns));

    stage.style.height = `${rows * (cardHeight + gap) - gap}px`;
    stage.style.setProperty("--card-width", `${cardWidth}px`);
    stage.style.setProperty("--card-height", `${cardHeight}px`);

    orderedVisible.forEach((card, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      const x = column * (cardWidth + gap);
      const y = row * (cardHeight + gap);
      const wasHidden = card.classList.contains("is-hidden");

      card.style.setProperty("--x", `${x}px`);
      card.style.setProperty("--y", `${y}px`);
      card.removeAttribute("aria-hidden");
      card.removeAttribute("tabindex");
      card.classList.remove("is-hidden");

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
      buttons.forEach((item) => item.classList.toggle("active", item === button));
      layoutCards(nextFilter, true);
    });
  });

  cards.forEach((card) => {
    const shell = card.querySelector(".card-shell");

    card.addEventListener("mousemove", (event) => {
      const rect = card.getBoundingClientRect();
      const rotateX = ((event.clientY - rect.top - rect.height / 2) / rect.height) * -10;
      const rotateY = ((event.clientX - rect.left - rect.width / 2) / rect.width) * 10;
      shell.style.transform = `perspective(960px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-8px)`;
      shell.style.boxShadow = `${-rotateY * 1.4}px 28px 42px rgba(30, 41, 59, 0.18)`;
    });

    card.addEventListener("mouseleave", () => {
      shell.style.transform = "";
      shell.style.boxShadow = "";
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
