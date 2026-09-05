/**
 * Creative Space — numbered pill (gionatannese.com style)
 * Vanilla JS + GSAP re-implementation of the "Creative Space 1" nav pill:
 * a label with a superscript index and an invisible spacer bar that pins the
 * number to the label's right edge. On first view of the works section the
 * pill rises in, the number drops in with a back-ease, and the label fades.
 * Hover darkens the pill background + lifts it (faithful to the reference).
 */
(function () {
  "use strict";

  var section = document.getElementById("page3");
  var pill = document.getElementById("creativeSpace");
  if (!section || !pill) return;

  var label = pill.querySelector(".creative-space__label");
  var bar = pill.querySelector(".creative-space__bar");
  var indexEl = pill.querySelector(".creative-space__index");
  var reducedMotion =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var hasGsap = typeof gsap !== "undefined";

  /* ---- spacer bar width = measured label width.
     In the reference the bar is an invisible flex child (same width as the
     label) that pushes the superscript to sit under the label's right edge. */
  function syncBarWidth() {
    if (!bar || !label) return;
    var w = Math.ceil(label.getBoundingClientRect().width);
    if (w > 0) bar.style.width = w + "px";
  }
  syncBarWidth();
  if (document.readyState !== "complete") {
    addEventListener("load", syncBarWidth);
  }

  /* ---- fallback reveal (no GSAP): class-keyed CSS transitions ---- */
  function revealFallback() {
    pill.classList.add("cs-pre"); // visible, opacity 0, translated down
    void pill.getBoundingClientRect(); // force reflow so the transition fires
    pill.classList.remove("cs-pre");
    pill.classList.add("is-in");
  }

  /* ---- entrance animation, played once when the section scrolls into view ---- */
  var played = false;
  function reveal() {
    if (played) return;
    played = true;

    if (reducedMotion) {
      pill.classList.add("is-in");
      return;
    }

    if (hasGsap) {
      pill.style.visibility = "visible";
      gsap.fromTo(
        pill,
        { opacity: 0, y: 20 },
        {
          opacity: 1,
          y: 0,
          duration: 0.9,
          ease: "expo.out",
          clearProps: "transform,opacity",
        }
      );
      if (label) {
        gsap.fromTo(
          label,
          { opacity: 0 },
          { opacity: 1, duration: 0.5, delay: 0.08, clearProps: "opacity" }
        );
      }
      if (indexEl) {
        gsap.fromTo(
          indexEl,
          { y: -12, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.55,
            delay: 0.32,
            ease: "back.out(2)",
            clearProps: "transform,opacity",
          }
        );
      }
    } else {
      revealFallback();
    }
  }

  if (reducedMotion) {
    reveal();
    return;
  }

  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          reveal();
          observer.disconnect();
        }
      });
    },
    { threshold: 0.15 }
  );
  observer.observe(section);
})();