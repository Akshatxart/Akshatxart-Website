const header = document.querySelector("[data-header]");
const revealItems = document.querySelectorAll(".reveal");
const tiltPanel = document.querySelector("[data-tilt]");
const internalLinks = document.querySelectorAll("[data-scroll]");
const scrollContainer = document.querySelector(".scroll-container");
const backgroundVideo = document.querySelector(".background-video");

const updateHeader = () => {
  if (scrollContainer) {
    header.classList.toggle("is-scrolled", scrollContainer.scrollTop > 12);
  } else {
    header.classList.toggle("is-scrolled", window.scrollY > 12);
  }
};

const setActiveSection = (target) => {
  const elements = scrollContainer 
    ? scrollContainer.children 
    : document.querySelectorAll("main section");
  Array.from(elements).forEach((section) => {
    section.classList.toggle("is-active", section === target);
  });
  target.focus({ preventScroll: true });
};

internalLinks.forEach((link) => {
  link.addEventListener("click", (event) => {
    const target = document.querySelector(link.getAttribute("href"));
    if (!target) return;
    event.preventDefault();
    target.scrollIntoView({ behavior: "smooth" });
    setActiveSection(target);
  });
});

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.18 }
);

revealItems.forEach((item) => revealObserver.observe(item));

// Circular Cursor with Text Reveal
const cursorEl = document.querySelector(".cursor__inner");
const cursorTextEl = document.querySelector(".cursor__text");

if (cursorEl) {
  let cursorX = 0;
  let cursorY = 0;
  let targetX = 0;
  let targetY = 0;
  
  const lerp = (start, end, factor) => start + (end - start) * factor;
  
  const animateCursor = () => {
    cursorX = lerp(cursorX, targetX, 0.15);
    cursorY = lerp(cursorY, targetY, 0.15);
    
    cursorEl.style.left = cursorX + "px";
    cursorEl.style.top = cursorY + "px";
    
    if (cursorTextEl) {
      cursorTextEl.style.left = cursorX + "px";
      cursorTextEl.style.top = cursorY + "px";
    }
    
    requestAnimationFrame(animateCursor);
  };
  
  window.addEventListener("mousemove", (e) => {
    targetX = e.clientX;
    targetY = e.clientY;
  });
  
  // Hover effects for interactive elements with text reveal
  const interactiveElements = document.querySelectorAll("a, button, .cv-flip-container, .cover-letter-container");
  
  interactiveElements.forEach(el => {
    el.addEventListener("mouseenter", () => {
      cursorEl.classList.add("hover");
      if (cursorTextEl) {
        const linkText = el.textContent.trim().toLowerCase();
        cursorTextEl.textContent = linkText;
        cursorTextEl.classList.add("visible");
      }
    });
    el.addEventListener("mouseleave", () => {
      cursorEl.classList.remove("hover");
      if (cursorTextEl) {
        cursorTextEl.classList.remove("visible");
      }
    });
  });
  
  animateCursor();
}

if (tiltPanel) {
   tiltPanel.addEventListener("pointermove", (event) => {
     const rect = tiltPanel.getBoundingClientRect();
     const x = (event.clientX - rect.left) / rect.width - 0.5;
     const y = (event.clientY - rect.top) / rect.height - 0.5;
     tiltPanel.style.transform = `rotateY(${x * 10}deg) rotateX(${y * -10}deg)`;
   });

   tiltPanel.addEventListener("pointerleave", () => {
     tiltPanel.style.transform = "";
   });
 }

// Cursor tilt on thumbnails (CV + cover letter)
const tiltCursorTargets = document.querySelectorAll("[data-tilt-cursor]");

tiltCursorTargets.forEach((el) => {
  el.addEventListener("pointermove", (event) => {
    const rect = el.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width; // 0..1
    const py = (event.clientY - rect.top) / rect.height; // 0..1
    const x = px - 0.5;
    const y = py - 0.5;

    // Use translateZ(0) to ensure the transform is applied visually
    el.style.transform = `perspective(800px) translateZ(0) rotateY(${x * 10}deg) rotateX(${y * -10}deg) scale(1.01)`;
  });

  el.addEventListener("pointerleave", () => {
    el.style.transform = "perspective(800px) rotateX(0deg) rotateY(0deg)";
  });
});





/* ==============================
   In-site full-screen document viewer
   ============================== */
const docViewer = document.getElementById('docViewer');
const docBackdrop = document.querySelector('[data-doc-viewer-backdrop]');
const docCloseBtn = document.querySelector('[data-doc-viewer-close]');
const docDownloadA = document.querySelector('[data-doc-viewer-download]');
const docPdf = document.querySelector('[data-doc-viewer-pdf]');
const docTriggers = document.querySelectorAll('[data-doc]');

const pdfMap = {
  'cv': {
    pdfUrl: 'assets/CV - Curriculum Vitae - Akshat Singh.pdf',
    filename: 'CV - Curriculum Vitae - Akshat Singh.pdf'
  },
  'cover-letter': {
    pdfUrl: 'assets/Cover Letter - Akshat Singh.pdf',
    filename: 'Cover Letter - Akshat Singh.pdf'
  }
};

let lastScrollTop = 0;
let lastActiveElement = null;

let backgroundInertTargets = [];
let backgroundPrevPointerEvents = new Map();
let backgroundPrevAriaHidden = new Map();

const setBackgroundInert = (inert) => {
  if (!docViewer) return;

  const all = Array.from(document.body.children);
  const viewerRoot = docViewer;

  // Exclude viewer + its children from being disabled.
  const targets = all.filter((el) => !viewerRoot.contains(el) && el !== viewerRoot);

  if (inert) {
    // Capture previous state only once per open.
    backgroundInertTargets = targets;

    backgroundPrevPointerEvents = new Map();
    backgroundPrevAriaHidden = new Map();

    targets.forEach((el) => {
      backgroundPrevPointerEvents.set(el, el.style.pointerEvents);
      backgroundPrevAriaHidden.set(el, el.getAttribute('aria-hidden'));

      el.setAttribute('aria-hidden', 'true');
      el.style.pointerEvents = 'none';
    });
  } else {
    // Restore previous state.
    backgroundInertTargets.forEach((el) => {
      const prevPe = backgroundPrevPointerEvents.get(el);
      const prevAria = backgroundPrevAriaHidden.get(el);

      if (prevPe === undefined) {
        el.style.pointerEvents = '';
      } else {
        el.style.pointerEvents = prevPe;
      }

      if (prevAria === null || prevAria === undefined) {
        el.removeAttribute('aria-hidden');
      } else {
        el.setAttribute('aria-hidden', prevAria);
      }
    });

    backgroundInertTargets = [];
    backgroundPrevPointerEvents.clear();
    backgroundPrevAriaHidden.clear();
  }
};

const openDoc = (docKey) => {
  if (!docViewer || !docPdf || !docDownloadA) return;

  const doc = pdfMap[docKey];
  if (!doc) return;

  const scrollContainer = document.querySelector('.scroll-container');
  if (scrollContainer) lastScrollTop = scrollContainer.scrollTop;

  lastActiveElement = document.activeElement;

  // Load iframe with toolbar hidden (as much as supported)
  const toolbarSafeSrc = `${doc.pdfUrl}#toolbar=0&navpanes=0&scrollbar=0`;
  docPdf.src = toolbarSafeSrc;

  // Configure download with original filename
  // Using direct link preserves original filename via download attribute.
  docDownloadA.href = doc.pdfUrl;
  docDownloadA.download = doc.filename;

  // Show viewer
  docViewer.setAttribute('aria-hidden', 'false');
  document.body.classList.add('doc-viewer-open');
  setBackgroundInert(true);

  // Focus close for accessibility
  if (docCloseBtn) docCloseBtn.focus({ preventScroll: true });
};

let isFlipped = false;
let dragStartX = 0;
let isDragging = false;
const cvFlipInner = document.querySelector('.cv-flip-inner');
const cvFlipContainer = document.querySelector('.cv-flip-container');

/**
 * CV flip interaction is still preserved.
 * Document opening is handled by the full-screen doc viewer below (data-doc).
 */
if (cvFlipContainer && cvFlipInner) {
  let hasDragged = false;

  cvFlipContainer.addEventListener("pointerdown", (e) => {
    isDragging = true;
    hasDragged = false;
    dragStartX = e.clientX;
  });

  cvFlipContainer.addEventListener("pointermove", (e) => {
    if (!isDragging) return;
    const deltaX = e.clientX - dragStartX;

    if (Math.abs(deltaX) > 50) {
      hasDragged = true;
      const shouldFlip = deltaX > 0;
      if (isFlipped !== shouldFlip) {
        isFlipped = shouldFlip;
        cvFlipInner.classList.toggle('flipped', isFlipped);
      }
      isDragging = false;
    }
  });

  cvFlipContainer.addEventListener("pointerup", () => {
    isDragging = false;
    hasDragged = false;
  });

  cvFlipContainer.addEventListener("pointercancel", () => {
    isDragging = false;
    hasDragged = false;
  });

  // Click handler for CV - opens CV PDF
  cvFlipContainer.addEventListener("click", (e) => {
    // Only prevent if we actually dragged significantly
    if (hasDragged) {
      hasDragged = false;
      return;
    }
    e.preventDefault();
    openDoc("cv");
  });
}

// Also handle clicks on CV label
const cvLabel = document.querySelector('.cv-label[data-doc="cv"]');
if (cvLabel) {
  cvLabel.addEventListener("click", (e) => {
    e.preventDefault();
    openDoc("cv");
  });
}

const closeDoc = () => {
  if (!docViewer) return;

  docViewer.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('doc-viewer-open');
  setBackgroundInert(false);

  // Restore scroll position
  const scrollContainer = document.querySelector('.scroll-container');
  if (scrollContainer) scrollContainer.scrollTop = lastScrollTop;

  // Keep iframe src to avoid re-download; but remove focus trap
  if (lastActiveElement && typeof lastActiveElement.focus === 'function') {
    lastActiveElement.focus({ preventScroll: true });
  }
};

/**
 * Open on triggers (delegated).
 */
docTriggers.forEach((el) => {
  el.addEventListener("click", (e) => {
    e.preventDefault();
    const key = el.getAttribute("data-doc");
    openDoc(key);
  });

  // keyboard accessibility
  el.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const key = el.getAttribute("data-doc");
      openDoc(key);
    }
  });
});

// HARD fallback: capture-phase click handler for CV, ensuring it opens even if flip/tilt layers stop bubbling.
document.addEventListener(
  "click",
  (e) => {
    try {
      const target = e.target;
      const closestCv = target?.closest?.(
        '.cv-flip-container[data-doc="cv"], .cv-page1[data-doc="cv"], .cv-page2[data-doc="cv"]'
      );
      if (!closestCv) return;
      openDoc("cv");
    } catch (_) {
      // no-op
    }
  },
  true
);

// Close handlers
if (docCloseBtn) {
  docCloseBtn.addEventListener('click', (e) => {
    e.preventDefault();
    closeDoc();
  });
}

if (docBackdrop) {
  docBackdrop.addEventListener('click', (e) => {
    // only close when clicking the backdrop itself
    e.preventDefault();
    closeDoc();
  });
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && docViewer && docViewer.getAttribute('aria-hidden') === 'false') {
    closeDoc();
  }
});

// Animation functions
const runTitleGlitch = () => {
  const title = document.querySelector('.about-section__title');
  if (!title) return;
  
  const originalText = title.textContent;
  const glitchChars = ['а', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '@', '#', '$', '%', '&', '*'];
  
  const weights = [700, 800, 900, 800, 700];
  
  const steps = 5;
  const tl = gsap.timeline();

  const scrambleText = () => {

    let scrambled = '';
    for (let i = 0; i < originalText.length; i++) {
      if (Math.random() < 0.15) {
        scrambled += glitchChars[Math.floor(Math.random() * glitchChars.length)];
      } else {
        scrambled += originalText[i];
      }
    }
    title.textContent = scrambled;
  };

  // Scrambling/glitch effect disabled (requested)
  // for (let i = 0; i < steps; i++) {
  //   tl.to(title, {
  //     fontWeight: weights[Math.floor(Math.random() * weights.length)],
  //     duration: 0.6,
  //     ease: 'power2.out',
  //     onUpdate: scrambleText
  //   });
  // }


  tl.to(title, {
    fontWeight: 800,
    textTransform: 'lowercase',
    duration: 0.35,
    ease: 'power2.out',
    onComplete: () => {
      title.textContent = originalText;
    }
  });
};

const runCVAnimation = () => {
  const cvLabel = document.querySelector('.cv-label');
  const cvContainer = document.querySelector('.cv-flip-container');
  
  if (cvLabel) {
    gsap.from(cvLabel, {
      opacity: 0,
      y: 30,
      duration: 0.6,
      ease: 'power2.out'
    });
  }
  
  if (cvContainer) {
    gsap.from(cvContainer, {
      opacity: 0,
      y: 40,
      scale: 0.95,
      duration: 0.8,
      delay: 0.1,
      ease: 'power2.out'
    });
  }
};

const runCoverLetterAnimation = () => {
  const coverLetterLabel = document.querySelector('.cover-letter-label');
  const coverLetterContainer = document.querySelector('.cover-letter-container');
  
  if (coverLetterLabel) {
    gsap.from(coverLetterLabel, {
      opacity: 0,
      y: 30,
      duration: 0.6,
      delay: 0.2,
      ease: 'power2.out'
    });
  }
  
  if (coverLetterContainer) {
    gsap.from(coverLetterContainer, {
      opacity: 0,
      y: 40,
      scale: 0.95,
      duration: 0.8,
      delay: 0.3,
      ease: 'power2.out'
    });
  }
};

const runDescriptionZoomOut = () => {
  const bioParagraphs = document.querySelectorAll('.about-section__bio p');
  if (!bioParagraphs.length) return;
  
  gsap.from(bioParagraphs, 
    { 
      scale: 1.08, 
      opacity: 0,
      y: 12,
      duration: 0.7, 
      stagger: 0.1, 
      ease: 'power2.out' 
    }
  );
};

updateHeader();
if (scrollContainer) {
  let lastScrollTime = 0;
  const scrollCooldown = 800; // ms
  const fadeBgOverlay = document.querySelector(".fade-bg-overlay");
  const asciiOverlay = document.querySelector(".ascii-transition-overlay");
  const asciiChars = [" ", ".", ":", "-", "=", "+", "*", "#", "%", "@", "█"];

  const generateASCIIFrame = (density) => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const charWidth = 14; 
    const charHeight = 22;
    const cols = Math.floor(width / charWidth);
    const rows = Math.floor(height / charHeight);
    
    let result = "";
    const maxCharIndex = Math.floor(density * (asciiChars.length - 1));

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (maxCharIndex <= 0) {
          result += " ";
        } else {
          const charIndex = Math.floor(Math.random() * (maxCharIndex + 1));
          result += asciiChars[charIndex];
        }
      }
      result += "\n";
    }
    return result;
  };

  const handleScroll = () => {
    updateHeader();
    if (fadeBgOverlay) {
      const scrollTop = scrollContainer.scrollTop;
      const height = window.innerHeight;
      const progress = Math.min(Math.max(scrollTop / height, 0), 1);

      fadeBgOverlay.style.opacity = progress;
    }
    
    // Fade out background video when scrolling to page2
    if (backgroundVideo) {
      const scrollTop = scrollContainer.scrollTop;
      const height = window.innerHeight;
      const videoOpacity = 1 - Math.min(Math.max(scrollTop / height, 0), 1);
      backgroundVideo.style.opacity = videoOpacity;
    }
  };

  // Page 1 animations
  const page1 = document.querySelector('#page1');
  if (page1) {
    const page1Observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          runCVAnimation();
          runCoverLetterAnimation();
        }
      });
    }, { threshold: 0.3 });
    page1Observer.observe(page1);
  }

  // Page 2 animations
  const page2 = document.querySelector('#page2');
  if (page2) {
    const page2Observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          runTitleGlitch();
          runDescriptionZoomOut();
        }
      });
    }, { threshold: 0.3 });
    page2Observer.observe(page2);
  }

  scrollContainer.addEventListener("scroll", handleScroll, { passive: true });
  // Using CSS scroll snapping instead of JavaScript-based scrolling for better performance and reliability
  // scrollContainer.addEventListener("wheel", (evt) => {
  //   if (evt.deltaY === 0) return;
  //   
  //   const now = Date.now();
  //   if (now - lastScrollTime < scrollCooldown) {
  //     evt.preventDefault();
  //     return;
  //   }
  //   
  //   const slides = Array.from(scrollContainer.children);
  //   const scrollTop = scrollContainer.scrollTop;
  //   const height = window.innerHeight;
  //   const currentActiveIndex = Math.round(scrollTop / height);
  //   
  //   let targetIndex = currentActiveIndex;
  //   if (evt.deltaY > 0) {
  //     targetIndex = Math.min(currentActiveIndex + 1, slides.length - 1);
  //   } else {
  //     targetIndex = Math.max(currentActiveIndex - 1, 0);
  //   }
  //   
  //   if (targetIndex !== currentActiveIndex) {
  //     evt.preventDefault();
  //     lastScrollTime = now;
  //     slides[targetIndex].scrollIntoView({ behavior: "smooth" });
  //     setActiveSection(slides[targetIndex]);
  //   }
  // }, { passive: false });
} else {
  window.addEventListener("scroll", updateHeader, { passive: true });
}