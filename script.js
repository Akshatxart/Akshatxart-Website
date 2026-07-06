const header = document.querySelector("[data-header]");
const revealItems = document.querySelectorAll(".reveal");
const tiltPanel = document.querySelector("[data-tilt]");
const internalLinks = document.querySelectorAll("[data-scroll]");
const scrollContainer = document.querySelector(".scroll-container");

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

// Circular Cursor
const cursorEl = document.querySelector(".cursor__inner");

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
    
    requestAnimationFrame(animateCursor);
  };
  
  window.addEventListener("mousemove", (e) => {
    targetX = e.clientX;
    targetY = e.clientY;
  });
  
  // Hover effects for interactive elements
  const interactiveElements = document.querySelectorAll("a, button, .cv-flip-container");
  
  interactiveElements.forEach(el => {
    el.addEventListener("mouseenter", () => {
      cursorEl.classList.add("hover");
    });
    el.addEventListener("mouseleave", () => {
      cursorEl.classList.remove("hover");
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

let isFlipped = false;
let dragStartX = 0;
let isDragging = false;
const cvFlipInner = document.querySelector('.cv-flip-inner');
const cvFlipContainer = document.querySelector('.cv-flip-container');

 const cvOverlay = document.querySelector('.cv-overlay');

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
  });

  cvFlipContainer.addEventListener("pointercancel", () => {
    isDragging = false;
   });

  cvFlipContainer.addEventListener("click", (e) => {
    if (hasDragged) {
      e.stopImmediatePropagation();
      return;
    }
    const scrollCont = document.querySelector('.scroll-container');
    const headerEl = document.querySelector('.site-header');
    const footerEl = document.querySelector('.site-footer');

    if (cvOverlay) {
      scrollCont.style.filter = 'blur(8px)';
      headerEl.style.filter = 'blur(8px)';
      footerEl.style.filter = 'blur(8px)';
     gsap.fromTo(cvOverlay, 
       { opacity: 0, scale: 0.8 },
       { opacity: 1, scale: 1, duration: 0.5, ease: 'power2.out', onStart: () => {
           cvOverlay.style.display = 'flex';
         }
       });
    }
   });
 }

 if (cvOverlay) {
   cvOverlay.addEventListener("click", (e) => {
     if (e.target === cvOverlay) {
       gsap.to(cvOverlay, {
         opacity: 0,
         scale: 0.8,
         duration: 0.3,
         ease: 'power2.in',
         onComplete: () => {
           cvOverlay.style.display = 'none';
           document.querySelector('.scroll-container').style.filter = '';
           document.querySelector('.site-header').style.filter = '';
           document.querySelector('.site-footer').style.filter = '';
         }
       });
     }
   });
 }

 document.addEventListener("keydown", (e) => {
   if (e.key === "Escape" && cvOverlay && cvOverlay.style.display === 'flex') {
     gsap.to(cvOverlay, {
       opacity: 0,
       scale: 0.8,
       duration: 0.3,
       ease: 'power2.in',
       onComplete: () => {
         cvOverlay.style.display = 'none';
         document.querySelector('.scroll-container').style.filter = '';
         document.querySelector('.site-header').style.filter = '';
         document.querySelector('.site-footer').style.filter = '';
       }
     });
   }
 });

updateHeader();
if (scrollContainer) {
  let lastScrollTime = 0;
  const scrollCooldown = 800; // ms
  const fadeBgOverlay = document.querySelector(".fade-bg-overlay");
  const aboutInner = document.querySelector(".about-section__inner");
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
    if (fadeBgOverlay && aboutInner) {
      const scrollTop = scrollContainer.scrollTop;
      const height = window.innerHeight;
      const progress = Math.min(Math.max(scrollTop / height, 0), 1);

      fadeBgOverlay.style.opacity = progress;
      aboutInner.style.opacity = progress;
      
      if (asciiOverlay) {
        const density = 1 - 2 * Math.abs(progress - 0.5);
        asciiOverlay.style.opacity = Math.max(0, density);
        
        if (density > 0.05) {
          asciiOverlay.textContent = generateASCIIFrame(density);
        } else {
          asciiOverlay.textContent = "";
        }
      }
    }
  };

  const aboutSection = document.querySelector('.about-section-full');
  if (aboutSection) {
    const aboutObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          runTitleGlitch();
          runDescriptionZoomOut();
        }
      });
    }, { threshold: 0.3 });
    aboutObserver.observe(aboutSection);
  }

  const runTitleGlitch = () => {
    const title = document.querySelector('.about-section__title');
    if (!title) return;
    
    const originalText = title.textContent;
    const glitchChars = ['а', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '@', '#', '$', '%', '&', '*'];
    
    const weights = [700, 800, 900, 800, 700];
    
const steps = 10;
    const tl = gsap.timeline();

const scrambleText = () => {
      let scrambled = '';
      for (let i = 0; i < originalText.length; i++) {
        if (Math.random() < 0.25) {
          scrambled += glitchChars[Math.floor(Math.random() * glitchChars.length)];
        } else {
          scrambled += originalText[i];
        }
      }
      title.textContent = scrambled;
    };

    for (let i = 0; i < steps; i++) {
      tl.to(title, {
        fontWeight: weights[Math.floor(Math.random() * weights.length)],
        duration: 0.035,
        ease: 'power2.out',
        onUpdate: scrambleText
      });
    }

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