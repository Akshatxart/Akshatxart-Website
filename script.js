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
const docDownloadA = document.querySelector('[data-doc-viewer-download]');
const docScrollContainer = document.querySelector('[data-doc-viewer-scroll]');
const docIframe = document.querySelector('[data-doc-viewer-iframe]');
const docPanel = document.querySelector('.doc-viewer__panel');
const docTriggers = document.querySelectorAll('[data-doc]');
const zoomSlider = document.querySelector('[data-zoom-slider]');
const zoomLabel = document.querySelector('[data-zoom-label]');
const zoomInBtn = document.querySelector('[data-zoom-in]');
const zoomOutBtn = document.querySelector('[data-zoom-out]');

// Detect file:// protocol (PDF.js fetch fails here, need iframe fallback)
const isFileProtocol = window.location.protocol === 'file:';

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

// --- Shared zoom/scroll state (persists across open/close cycles) ---
let zoomLevel = 100;
let zoomWrapper = null;
let scrollVelocity = 0;
let scrollRAF = null;

const applyZoom = () => {
  if (zoomLabel) zoomLabel.textContent = `${zoomLevel}%`;
  if (zoomSlider) zoomSlider.value = zoomLevel;

  if (docPanel && docPanel.classList.contains('is-iframe-mode') && docIframe && docIframe.src) {
    // Iframe mode: update zoom via URL hash parameter
    const baseUrl = docIframe.src.split('#')[0];
    docIframe.src = baseUrl + '#toolbar=0&navpanes=0&view=FitH&zoom=' + zoomLevel;
    return;
  }

  // PDF.js canvas mode
  if (!zoomWrapper) return;
  const cssScale = zoomLevel / 100;
  zoomWrapper.style.transform = `scale(${cssScale})`;
  zoomWrapper.style.width = `${100 / cssScale}%`;
  zoomWrapper.style.transformOrigin = 'top center';
};

const setZoom = (newLevel) => {
  zoomLevel = Math.min(Math.max(Math.round(newLevel / 5) * 5, 50), 300);
  applyZoom();
};

// --- One-time listeners (attached once, never duplicated) ---
if (zoomSlider) {
  zoomSlider.addEventListener('input', (e) => setZoom(Number(e.target.value)));
}
if (zoomInBtn) zoomInBtn.addEventListener('click', () => setZoom(zoomLevel + 10));
if (zoomOutBtn) zoomOutBtn.addEventListener('click', () => setZoom(zoomLevel - 10));

const clampScroll = () => {
  if (!docScrollContainer) return;
  const max = docScrollContainer.scrollHeight - docScrollContainer.clientHeight;
  docScrollContainer.scrollTop = Math.max(0, Math.min(docScrollContainer.scrollTop, max));
};

const smoothScroll = () => {
  scrollVelocity *= 0.88;
  docScrollContainer.scrollTop += scrollVelocity;
  clampScroll();
  if (Math.abs(scrollVelocity) > 0.3) {
    scrollRAF = requestAnimationFrame(smoothScroll);
  } else {
    scrollVelocity = 0;
    scrollRAF = null;
  }
};

if (docScrollContainer) {
  docScrollContainer.addEventListener('wheel', (e) => {
    e.preventDefault();
    const cssScale = zoomLevel / 100;
    const rawDelta = e.deltaY || e.deltaX || 0;
    const delta = (rawDelta / cssScale) * 0.2;
    const clampedDelta = Math.max(-40, Math.min(40, delta));
    scrollVelocity += clampedDelta;
    if (!scrollRAF) {
      scrollRAF = requestAnimationFrame(smoothScroll);
    }
  }, { passive: false });
}

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

const renderPdfToCanvases = async (pdfUrl, docKey) => {
  if (!docScrollContainer) return;

  // Reset state
  docScrollContainer.innerHTML = '';
  docScrollContainer.scrollTop = 0;
  scrollVelocity = 0;
  if (scrollRAF) { cancelAnimationFrame(scrollRAF); scrollRAF = null; }

  if (!window.pdfjsLib) {
    // PDF.js not loaded — show error with download fallback
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = 'padding:40px;text-align:center;font-family:monospace;color:#666;';
    errorDiv.innerHTML = '<p style="font-size:1.1rem;margin-bottom:16px;">PDF preview unavailable.</p>'
      + '<a href="' + pdfUrl + '" download style="color:#000;text-decoration:underline;">Download to view</a>';
    docScrollContainer.appendChild(errorDiv);
    return;
  }

  // Create fresh zoom wrapper
  zoomWrapper = document.createElement('div');
  zoomWrapper.className = 'doc-viewer__pdf-zoom-wrapper';
  docScrollContainer.appendChild(zoomWrapper);

  // Reset zoom to 100% (fit-to-width)
  zoomLevel = 100;

  try {
    let loadingTask;
    if (isFileProtocol && window.__pdfData && window.__pdfData[docKey]) {
      // file:// — use embedded base64 data (no fetch/XHR needed)
      loadingTask = pdfjsLib.getDocument({
        url: window.__pdfData[docKey],
        disableWorker: true
      });
    } else if (isFileProtocol) {
      // file:// without base64 data — can't load, show error
      throw new Error('No embedded PDF data available on file://');
    } else {
      loadingTask = pdfjsLib.getDocument(pdfUrl);
    }
    const pdf = await loadingTask.promise;

    // Calculate fit-to-width scale from page 1
    const panelWidth = docScrollContainer.clientWidth || 800;
    const firstPage = await pdf.getPage(1);
    const defaultViewport = firstPage.getViewport({ scale: 1 });
    const fitScale = panelWidth / defaultViewport.width;
    const renderScale = fitScale;

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = (pageNum === 1) ? firstPage : await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: renderScale });

      const pageDiv = document.createElement('div');
      pageDiv.className = 'doc-viewer__page';
      pageDiv.style.width = `${viewport.width}px`;
      pageDiv.style.height = `${viewport.height}px`;

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      pageDiv.appendChild(canvas);

      await page.render({ canvasContext: ctx, viewport }).promise;

      // Text layer (manual positioning for selectability)
      const textContent = await page.getTextContent();
      const textLayerDiv = document.createElement('div');
      textLayerDiv.className = 'textLayer';
      textLayerDiv.style.width = `${viewport.width}px`;
      textLayerDiv.style.height = `${viewport.height}px`;

      textContent.items.forEach((item) => {
        if (!item.str && !item.hasEOL) return;

        const vt = viewport.transform;
        const it = item.transform;
        const tx = [
          vt[0] * it[0] + vt[2] * it[1],
          vt[1] * it[0] + vt[3] * it[1],
          vt[0] * it[2] + vt[2] * it[3],
          vt[1] * it[2] + vt[3] * it[3],
          vt[0] * it[4] + vt[2] * it[5] + vt[4],
          vt[1] * it[4] + vt[3] * it[5] + vt[5],
        ];

        const span = document.createElement('span');
        span.textContent = item.str || '';
        span.style.left = `${tx[4]}px`;
        span.style.top = `${tx[5]}px`;

        const fontSize = Math.sqrt(tx[2] * tx[2] + tx[3] * tx[3]);
        if (fontSize > 0) span.style.fontSize = `${fontSize}px`;
        if (item.fontName) span.style.fontFamily = item.fontName;

        const textWidth = item.width * viewport.scale;
        if (textWidth > 0 && item.str) span.style.width = `${textWidth}px`;

        textLayerDiv.appendChild(span);

        if (item.url) {
          const a = document.createElement('a');
          a.href = item.url;
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
          a.style.left = span.style.left;
          a.style.top = span.style.top;
          a.style.width = span.style.width;
          a.style.height = span.style.fontSize;
          textLayerDiv.appendChild(a);
        }
      });

      pageDiv.appendChild(textLayerDiv);
      zoomWrapper.appendChild(pageDiv);
    }

    // Apply initial fit-to-width zoom
    applyZoom();

  } catch (err) {
    console.error('PDF render error:', err);
    // Show error to user with download fallback
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = 'padding:40px;text-align:center;font-family:monospace;color:#666;';
    errorDiv.innerHTML = '<p style="font-size:1.1rem;margin-bottom:16px;">Unable to preview PDF.</p>'
      + '<p style="font-size:0.8rem;color:#999;margin-bottom:16px;">' + (err.message || err) + '</p>'
      + '<a href="' + pdfUrl + '" download style="color:#000;text-decoration:underline;">Download to view</a>';
    if (zoomWrapper) zoomWrapper.innerHTML = '';
    (zoomWrapper || docScrollContainer).appendChild(errorDiv);
  }
};

const openDoc = (docKey) => {
  if (!docViewer || !docDownloadA) return;

  const doc = pdfMap[docKey];
  if (!doc) return;

  const scrollContainerEl = document.querySelector('.scroll-container');
  if (scrollContainerEl) lastScrollTop = scrollContainerEl.scrollTop;

  lastActiveElement = document.activeElement;

  docDownloadA.href = doc.pdfUrl;
  docDownloadA.download = doc.filename;

  if (isFileProtocol && window.__pdfData && window.__pdfData[docKey] && window.pdfjsLib) {
    // file:// with embedded base64 data — use PDF.js for full rendering
    if (docPanel) docPanel.classList.remove('is-iframe-mode');
    if (docIframe) { docIframe.src = ''; }
    renderPdfToCanvases(doc.pdfUrl, docKey);
  } else if (isFileProtocol && docIframe && docPanel) {
    // file:// without base64 data — fallback to iframe
    docPanel.classList.add('is-iframe-mode');
    docIframe.src = encodeURI(doc.pdfUrl) + '#toolbar=0&navpanes=0&view=FitH';
  } else if (!window.pdfjsLib && docIframe && docPanel) {
    // PDF.js not loaded — fallback to iframe
    docPanel.classList.add('is-iframe-mode');
    docIframe.src = encodeURI(doc.pdfUrl) + '#toolbar=0&navpanes=0&view=FitH';
  } else {
    // HTTP + PDF.js — full-featured rendering
    if (docPanel) docPanel.classList.remove('is-iframe-mode');
    if (docIframe) { docIframe.src = ''; }
    renderPdfToCanvases(doc.pdfUrl, docKey);
  }

  docViewer.setAttribute('aria-hidden', 'false');
  document.body.classList.add('doc-viewer-open');
  setBackgroundInert(true);
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

  // Click handler for CV - handled by generic docTriggers below (data-doc="cv")
  // No separate handler needed here to avoid double-firing openDoc.
}

const closeDoc = () => {
  if (!docViewer) return;

  // Start closing animation
  docViewer.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('doc-viewer-open');
  setBackgroundInert(false);

  // Delay cleanup until closing transition finishes (~280ms)
  setTimeout(() => {
    if (docViewer.getAttribute('aria-hidden') !== 'true') return; // re-opened during close

    // Clean up PDF.js state
    if (docScrollContainer) {
      docScrollContainer.innerHTML = '';
      docScrollContainer.scrollTop = 0;
    }
    zoomWrapper = null;
    scrollVelocity = 0;
    if (scrollRAF) { cancelAnimationFrame(scrollRAF); scrollRAF = null; }

    // Clean up iframe mode
    if (docPanel) docPanel.classList.remove('is-iframe-mode');
    if (docIframe) { docIframe.src = ''; }
  }, 300);

  // Restore scroll position
  const scrollContainerEl = document.querySelector('.scroll-container');
  if (scrollContainerEl) scrollContainerEl.scrollTop = lastScrollTop;

  // Restore focus
  if (lastActiveElement && typeof lastActiveElement.focus === 'function') {
    lastActiveElement.focus({ preventScroll: true });
  }
};

/**
 * Delegated click handler — catches ALL clicks on any [data-doc] element
 * (including nested children like <img>). This is bulletproof across browsers.
 */
document.addEventListener('click', (e) => {
  const trigger = e.target.closest('[data-doc]');
  if (!trigger) return;
  // Ignore clicks inside the open doc viewer itself
  if (docViewer && trigger.closest('.doc-viewer')) return;

  e.preventDefault();
  const key = trigger.getAttribute('data-doc');
  if (key) openDoc(key);
});

// Keyboard accessibility for [data-doc] elements
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const trigger = e.target.closest && e.target.closest('[data-doc]');
  if (!trigger) return;
  if (docViewer && trigger.closest('.doc-viewer')) return;

  e.preventDefault();
  const key = trigger.getAttribute('data-doc');
  if (key) openDoc(key);
});

// Close handlers
if (docBackdrop) {
  docBackdrop.addEventListener('click', (e) => {
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

  // Prevent re-triggering if already running
  if (title._glitching) return;
  title._glitching = true;

  const originalText = title.textContent;
  const glitchChars = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '@', '#', '$', '%', '&', '*', '?', '!', '/', '\\', '|', '_', '~', ':', ';', '<', '>'];

  // Remove any existing glitch layers
  const existingGlitches = title.querySelectorAll('.glitch-layer');
  existingGlitches.forEach(el => el.remove());

  // Create two glitch overlay layers (red + cyan) for visual displacement
  const createGlitchLayer = (className, color, offsetX, offsetY) => {
    const layer = document.createElement('span');
    layer.className = `glitch-layer ${className}`;
    layer.textContent = originalText;
    layer.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      font-family: inherit;
      font-size: inherit;
      font-weight: inherit;
      letter-spacing: inherit;
      line-height: inherit;
      text-transform: lowercase;
      color: ${color};
      pointer-events: none;
      clip-path: inset(0 0 0 0);
      transform: translate(${offsetX}px, ${offsetY}px);
      opacity: 0;
      z-index: -1;
    `;
    return layer;
  };

  const redLayer = createGlitchLayer('glitch-red', '#ff0040', 1.5, 0);
  const cyanLayer = createGlitchLayer('glitch-cyan', '#00e5ff', -1.5, 0);
  
  const computedPos = window.getComputedStyle(title).position;
  if (computedPos === 'static') title.style.position = 'relative';

  title.appendChild(redLayer);
  title.appendChild(cyanLayer);

  const scrambleDuration = 0.35; // how long scrambling lasts (seconds)
  const settleDuration = 0.25;   // how long settling lasts
  const intervalMs = 35;         // ms between scramble frames
  const maxScrambles = Math.floor((scrambleDuration * 1000) / intervalMs);

  let scrambleInterval = null;

  const tl = gsap.timeline({
    ease: 'power1.out',
    onComplete: () => {
      title.textContent = originalText;
      gsap.to([redLayer, cyanLayer], {
        opacity: 0,
        duration: 0.1,
        ease: 'power1.out',
        onComplete: () => {
          redLayer.remove();
          cyanLayer.remove();
          title._glitching = false;
        }
      });
    }
  });

  // Phase 1: Scramble build-up (spans scrambleDuration seconds)
  tl.to({}, {
    duration: scrambleDuration,
    ease: 'power1.out',
    onStart: () => {
      gsap.to(redLayer, { opacity: 0.5, duration: 0.08, ease: 'power1.out' });
      gsap.to(cyanLayer, { opacity: 0.5, duration: 0.08, ease: 'power1.out' });

      let scrambleCount = 0;
      scrambleInterval = setInterval(() => {
        if (scrambleCount >= maxScrambles) {
          clearInterval(scrambleInterval);
          scrambleInterval = null;
          return;
        }
        scrambleCount++;
        
        const t = scrambleCount / maxScrambles;
        const intensity = t < 0.4
          ? t * 2.0           // ramp up from 0 → 0.8
          : 0.8 - (t - 0.4) * 1.33; // ramp down from 0.8 → ~0
        
        let scrambled = '';
        for (let i = 0; i < originalText.length; i++) {
          scrambled += Math.random() < intensity
            ? glitchChars[Math.floor(Math.random() * glitchChars.length)]
            : originalText[i];
        }
        title.textContent = scrambled;
        redLayer.textContent = scrambled;
        cyanLayer.textContent = scrambled;

        // Slice offset layers
        const sy = Math.random() * 55;
        const sh = 5 + Math.random() * 18;
        redLayer.style.clipPath = `inset(${sy}% 0 ${100 - sy - sh}% 0)`;
        cyanLayer.style.clipPath = `inset(${sy + 8}% 0 ${100 - sy - sh - 8}% 0)`;
        
        const jx = (Math.random() - 0.5) * 5;
        const jy = (Math.random() - 0.5) * 2;
        redLayer.style.transform = `translate(${1.5 + jx}px, ${jy}px)`;
        cyanLayer.style.transform = `translate(${-1.5 - jx}px, ${-jy}px)`;
      }, intervalMs);
    },
    onComplete: () => {
      if (scrambleInterval) {
        clearInterval(scrambleInterval);
        scrambleInterval = null;
      }
    }
  });

  // Phase 2: Settle back to original — easy ease out
  tl.to(title, {
    duration: settleDuration,
    ease: 'power1.out',
    onStart: () => {
      title.textContent = originalText;
    }
  });

  // Phase 3: Fade out glitch layers (overlaps with settle)
  tl.to([redLayer, cyanLayer], {
    opacity: 0,
    duration: settleDuration * 0.6,
    ease: 'power1.out',
    onStart: () => {
      redLayer.textContent = originalText;
      cyanLayer.textContent = originalText;
      redLayer.style.transform = 'translate(2px, 0)';
      cyanLayer.style.transform = 'translate(-2px, 0)';
      redLayer.style.clipPath = 'inset(0 0 0 0)';
      cyanLayer.style.clipPath = 'inset(0 0 0 0)';
    }
  }, `-=${settleDuration * 0.4}`);
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