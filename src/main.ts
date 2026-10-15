/*
 * Personalized Learning Demo - Main Entry Point
 */

console.log("[Demo] main.ts starting...");

import { ChatOrchestrator, DEFAULT_MODEL } from "./chat-orchestrator";
import { A2UIRenderer } from "./a2ui-renderer";
import { UIManager } from "./ui-manager";
import portfolioData from "./portfolio-data.json";

// Registry for components (side-effect import)
import "./theme-provider";

const THEME_STORAGE_KEY = "enriq_theme";
const MODEL_STORAGE_KEY = "enriq_model";

// Models offered in the selector; the server only honors models on its own allow-list.
const MODEL_OPTIONS = [
  { id: DEFAULT_MODEL, label: "Gemini 4 Argon" },
  { id: "gemini-3.6-flash", label: "Gemini 3.6 Flash" },
];

// True while a question is being answered, so overlapping sends can't interleave history.
let isProcessing = false;

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage can be unavailable (private mode); the preference just won't persist.
  }
}

/** Applies the saved theme, or the OS preference on first visit, before the UI renders. */
function applyInitialTheme(): void {
  const saved = readStorage(THEME_STORAGE_KEY);
  const prefersLight = window.matchMedia?.("(prefers-color-scheme: light)").matches ?? false;
  const useLight = saved ? saved === "light" : prefersLight;
  document.body.classList.toggle("light-mode", useLight);
  const icon = document.querySelector("#theme-toggle .material-symbols-outlined");
  if (icon) icon.textContent = useLight ? "dark_mode" : "light_mode";
}

async function init() {
  console.log("[Demo] init() running");
  
  // Ensure DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => start());
  } else {
    start();
  }
}

function start() {
  console.log("[Demo] Starting application");
  applyInitialTheme();
  
  // Show app container
  const appContainer = document.getElementById("app-container");
  if (appContainer) {
    appContainer.style.display = "flex";
  }

  // Initialize renderer, orchestrator and UI manager
  const renderer = new A2UIRenderer();
  const orchestrator = new ChatOrchestrator(renderer);
  const uiManager = new UIManager();

  // Set up UI
  setupUI(orchestrator, uiManager);
  
  console.log("[Demo] Application started successfully");
}

function setupUI(orchestrator: ChatOrchestrator, uiManager: UIManager) {
  const chatInput = document.getElementById("chatInput") as HTMLTextAreaElement;
  const sendBtn = document.getElementById("sendBtn") as HTMLButtonElement;
  const chatArea = document.getElementById("chatArea") as HTMLDivElement;
  const newChatBtn = document.getElementById("new-chat-btn");
  const mobileMenuBtn = document.getElementById("mobile-menu-btn");
  const sidebar = document.getElementById("app-sidebar");
  const sidebarBackdrop = document.getElementById("sidebar-backdrop");

  if (!chatInput || !sendBtn || !chatArea) {
    console.warn("[Demo] Missing UI elements");
    return;
  }

  // The backdrop's CSS is keyed on .active (see .sidebar-backdrop.active in index.html).
  const closeMobileSidebar = () => {
    sidebar?.classList.remove("open");
    sidebarBackdrop?.classList.remove("active");
    mobileMenuBtn?.setAttribute("aria-expanded", "false");
  };

  if (mobileMenuBtn && sidebar) {
    mobileMenuBtn.setAttribute("aria-controls", "app-sidebar");
    mobileMenuBtn.setAttribute("aria-expanded", "false");
    mobileMenuBtn.addEventListener("click", () => {
      const isOpen = sidebar.classList.toggle("open");
      sidebarBackdrop?.classList.toggle("active", isOpen);
      mobileMenuBtn.setAttribute("aria-expanded", String(isOpen));
    });
  }

  if (sidebarBackdrop) {
    sidebarBackdrop.addEventListener("click", () => {
      closeMobileSidebar();
    });
  }

  const triggerPrompt = (prompt: string, activeGemEl?: HTMLElement | null) => {
    if (!prompt) return;
    if (isProcessing) {
      uiManager.showToast("Still answering your last question. One moment…");
      return;
    }
    if (activeGemEl) {
      document.querySelectorAll(".sidebar-nav .sidebar-item").forEach((el) => {
        el.classList.remove("active");
      });
      activeGemEl.classList.add("active");
    }
    closeMobileSidebar();
    chatInput.value = prompt;
    chatInput.dispatchEvent(new Event("input"));
    handleSend(orchestrator, chatInput, chatArea, uiManager);
  };

  // Global custom events for recent chats, prompt ticker, follow-up chips, and comics
  window.addEventListener("portfolio:send-prompt", (e: Event) => {
    const customEvent = e as CustomEvent<{ prompt: string }>;
    if (customEvent.detail?.prompt) {
      triggerPrompt(customEvent.detail.prompt);
    }
  });

  window.addEventListener("portfolio:unlock-comics", () => {
    closeMobileSidebar();
    triggerEasterEgg(orchestrator, chatInput, chatArea, uiManager);
  });

  // New Chat
  if (newChatBtn) {
    newChatBtn.addEventListener("click", () => {
      window.location.reload();
    });
  }

  // Input event
  chatInput.addEventListener("input", () => {
    chatInput.style.height = "auto";
    chatInput.style.height = Math.min(chatInput.scrollHeight, 200) + "px";
    sendBtn.disabled = chatInput.value.trim() === "";
  });

  // Enter to send
  chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(orchestrator, chatInput, chatArea, uiManager);
    }
  });

  // Click to send
  sendBtn.addEventListener("click", () => {
    handleSend(orchestrator, chatInput, chatArea, uiManager);
  });

  // Suggestion Chips, Bento KPI Cards, and Announcement Pill
  const interactivePrompts = document.querySelectorAll<HTMLElement>(
    ".suggestion-chip[data-prompt], .bento-kpi-card[data-prompt], #hero-announcement-pill[data-prompt]"
  );
  interactivePrompts.forEach((el) => {
    // These are divs in the markup; give them button semantics so keyboard users can reach them.
    el.setAttribute("role", "button");
    el.setAttribute("tabindex", "0");
    el.addEventListener("click", () => {
      const prompt = el.getAttribute("data-prompt");
      if (prompt) {
        triggerPrompt(prompt);
      }
    });
    el.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        const prompt = el.getAttribute("data-prompt");
        if (prompt) {
          triggerPrompt(prompt);
        }
      }
    });
  });

  // Sidebar Gems mapping
  const gemConfigs: Array<{ id: string; prompt: string }> = [
    { id: "gem-historian", prompt: "Show me Enrique's career highlights as a sequential timeline" },
    { id: "gem-matcher", prompt: "How do Enrique's skills match a Senior AI role?" },
    { id: "gem-analyzer", prompt: "Analyze Enrique's fit for an AI Lead role" },
    { id: "gem-media", prompt: "Show me his top YouTube videos" },
    { id: "gem-blogs", prompt: "Show me some of his Medium blog posts" },
    { id: "gem-awards", prompt: "List Enrique's major awards and hackathon wins" },
    { id: "gem-certs", prompt: "Show Enrique's cloud certifications" },
    { id: "gem-speaker", prompt: "Show Enrique's speaking engagements and keynotes" },
    { id: "gem-testimonials", prompt: "Show me what people think of Enrique (testimonials)" },
    { id: "gem-gallery", prompt: "Show me a gallery of your work and highlights" },
    { id: "gem-repos", prompt: "Show me your featured open source repositories" }
  ];

  gemConfigs.forEach(({ id, prompt }) => {
    const gemEl = document.getElementById(id);
    if (gemEl) {
      gemEl.addEventListener("click", () => triggerPrompt(prompt, gemEl));
      gemEl.addEventListener("keydown", (e: KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          triggerPrompt(prompt, gemEl);
        }
      });
    }
  });

  const gemComics = document.getElementById("gem-comics");
  if (gemComics) {
    gemComics.addEventListener("click", () => {
      closeMobileSidebar();
      showComicModal();
    });
    gemComics.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        closeMobileSidebar();
        showComicModal();
      }
    });
  }

  // Theme Toggle
  const themeToggle = document.getElementById("theme-toggle");
  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      const isLight = document.body.classList.toggle("light-mode");
      const icon = themeToggle.querySelector(".material-symbols-outlined");
      if (icon) {
        icon.textContent = isLight ? "dark_mode" : "light_mode";
      }
      writeStorage(THEME_STORAGE_KEY, isLight ? "light" : "dark");
      uiManager.showToast(isLight ? "Switched to Executive Light theme" : "Switched to Executive Dark theme");
    });
  }

  // Model Selector button: switches the model used for chat answers
  const modelSelectorBtn = document.getElementById("model-selector-btn");
  const modelSelectorLabel = document.getElementById("model-selector-label");
  if (modelSelectorBtn && modelSelectorLabel) {
    const savedModel = readStorage(MODEL_STORAGE_KEY);
    let modelIdx = Math.max(0, MODEL_OPTIONS.findIndex((m) => m.id === savedModel));
    const applyModel = () => {
      const option = MODEL_OPTIONS[modelIdx];
      orchestrator.setModel(option.id);
      modelSelectorLabel.textContent = option.label;
      modelSelectorBtn.setAttribute("aria-label", `Model: ${option.label}. Activate to switch.`);
    };
    const cycleModel = () => {
      modelIdx = (modelIdx + 1) % MODEL_OPTIONS.length;
      applyModel();
      writeStorage(MODEL_STORAGE_KEY, MODEL_OPTIONS[modelIdx].id);
      uiManager.showToast(`Answers now use ${MODEL_OPTIONS[modelIdx].label}`);
    };

    modelSelectorBtn.setAttribute("role", "button");
    modelSelectorBtn.setAttribute("tabindex", "0");
    applyModel();
    modelSelectorBtn.addEventListener("click", cycleModel);
    modelSelectorBtn.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        cycleModel();
      }
    });
  }

  // Quick Prompt (+) button
  const addPromptBtn = document.getElementById("add-prompt-btn");
  if (addPromptBtn) {
    const quickPrompts = [
      "What is Enrique's current 2026 role at Google Cloud Delta and his 4x Gartner/Forrester Leader wins?",
      "Tell me about the Q3 2026 Silver Google AI Award (SWIFTY) and Advent of Agents",
      "Show me the Strategic Integration Matrix",
      "Show me your technical proficiency radar"
    ];
    let qpIdx = 0;
    addPromptBtn.addEventListener("click", () => {
      const prompt = quickPrompts[qpIdx % quickPrompts.length];
      qpIdx++;
      triggerPrompt(prompt);
    });
  }

  // User Profile card in sidebar footer
  const userProfile = document.querySelector(".user-profile");
  if (userProfile) {
    userProfile.addEventListener("click", (e) => {
      if ((e.target as HTMLElement).closest("#profile-actions-btn") || (e.target as HTMLElement).closest("#profile-actions-menu")) {
        return;
      }
      triggerPrompt("Who is Enrique K Chan and what is his current 2026 role at Google Cloud Delta?");
    });
  }

  // Easter Egg Hint
  const hint = document.getElementById("easter-egg-hint");
  if (hint) {
    hint.addEventListener("click", () => {
      console.log("Looking for a secret? Unlocking The Agentic Adventures...");
      if (typeof hint.animate === "function") {
        hint.animate([
          { transform: "translateX(0)" },
          { transform: "translateX(-5px)" },
          { transform: "translateX(5px)" },
          { transform: "translateX(-5px)" },
          { transform: "translateX(5px)" },
          { transform: "translateX(0)" }
        ], { duration: 500 });
      }
      triggerEasterEgg(orchestrator, chatInput, chatArea, uiManager);
    });
  }

  // Konami Code Easter Egg
  setupKonamiCode(orchestrator, chatInput, chatArea, uiManager);
}

function setupKonamiCode(
  orchestrator: ChatOrchestrator,
  input: HTMLTextAreaElement,
  chatArea: HTMLDivElement,
  uiManager: UIManager
) {
  const konamiPattern = [
    "ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown",
    "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight",
    "b", "a"
  ];
  let konamiIndex = 0;

  window.addEventListener("keydown", (e) => {
    if (e.key === konamiPattern[konamiIndex]) {
      konamiIndex++;
      if (konamiIndex === konamiPattern.length) {
        konamiIndex = 0;
        triggerEasterEgg(orchestrator, input, chatArea, uiManager);
      }
    } else {
      konamiIndex = 0;
    }
  });

  // Triple tap on logo secret
  const logo = document.querySelector(".sidebar-logo");
  if (logo) {
    let tapCount = 0;
    let lastTap = 0;
    logo.addEventListener("click", () => {
      const now = Date.now();
      if (now - lastTap < 500) {
        tapCount++;
        if (tapCount === 3) {
          triggerEasterEgg(orchestrator, input, chatArea, uiManager);
          tapCount = 0;
        }
      } else {
        tapCount = 1;
      }
      lastTap = now;
    });
  }
}

function triggerEasterEgg(
  _orchestrator: ChatOrchestrator,
  _input: HTMLTextAreaElement,
  _chatArea: HTMLDivElement,
  uiManager: UIManager
) {
  console.log("CLASSIFIED ACCESS GRANTED: Unlocking The Agentic Adventures...");
  uiManager.showToast("Unlocked: The Agentic Adventures Comic Series!");

  // Visual feedback (CSS Confetti)
  const container = document.body;
  for (let i = 0; i < 45; i++) {
    const confetti = document.createElement("div");
    confetti.style.position = "fixed";
    confetti.style.width = "10px";
    confetti.style.height = "10px";
    confetti.style.backgroundColor = ["#4285F4", "#34A853", "#FBBC05", "#EA4335"][Math.floor(Math.random() * 4)];
    confetti.style.left = Math.random() * 100 + "vw";
    confetti.style.top = "-10px";
    confetti.style.zIndex = "1000";
    confetti.style.borderRadius = "2px";
    container.appendChild(confetti);

    if (typeof confetti.animate === "function") {
      const animation = confetti.animate([
        { transform: "translate3d(0, 0, 0) rotate(0deg)", opacity: 1 },
        { transform: `translate3d(${(Math.random() - 0.5) * 200}px, 100vh, 0) rotate(${Math.random() * 360}deg)`, opacity: 0 }
      ], {
        duration: 2000 + Math.random() * 3000,
        easing: "cubic-bezier(0, .9, .57, 1)"
      });

      animation.onfinish = () => confetti.remove();
    } else {
      setTimeout(() => confetti.remove(), 2500);
    }
  }

  // Reveal hidden sidebar gem
  const gemComics = document.getElementById("gem-comics");
  if (gemComics) {
    gemComics.style.display = "flex";
  }

  // Show the modal
  showComicModal();
}

// The PDFs are hosted on the main portfolio (enriquekchan.web.app); the concierge domain
// doesn't serve them. Only https links from the synced dataset are used.
const COMICS_DATA: Array<{ title: string; url: string }> = ((portfolioData as any).COMICS || [])
  .map((comic: any) => ({ title: String(comic.title || comic.name || "Comic"), url: String(comic.url || "") }))
  .filter((comic: { url: string }) => comic.url.startsWith("https://"));

function showComicModal() {
  const modal = document.getElementById("comic-modal");
  const closeBtn = document.getElementById("modal-close");
  const list = document.getElementById("comic-list");

  if (!modal || !list) return;

  // Populate list using safe DOM construction
  list.replaceChildren();
  COMICS_DATA.forEach((comic) => {
    const item = document.createElement("a");
    item.className = "comic-item";
    item.href = comic.url;
    item.target = "_blank";
    item.rel = "noopener noreferrer";

    // No cover art is published for the issues, so show an icon tile instead of a broken image.
    const thumb = document.createElement("div");
    thumb.className = "comic-thumb comic-thumb-icon";
    thumb.setAttribute("aria-hidden", "true");
    const icon = document.createElement("span");
    icon.className = "material-symbols-outlined";
    icon.textContent = "auto_stories";
    thumb.appendChild(icon);

    const title = document.createElement("div");
    title.className = "comic-title";
    title.textContent = comic.title;

    item.append(thumb, title);
    list.appendChild(item);
  });

  // Show modal
  modal.style.display = "flex";
  setTimeout(() => modal.classList.add("active"), 10);

  // Close logic
  const close = () => {
    modal.classList.remove("active");
    document.removeEventListener("keydown", onKeydown);
    setTimeout(() => {
      modal.style.display = "none";
    }, 300);
  };
  const onKeydown = (e: KeyboardEvent) => {
    if (e.key === "Escape") close();
  };
  document.addEventListener("keydown", onKeydown);

  if (closeBtn) closeBtn.onclick = close;
  modal.onclick = (e) => {
    if (e.target === modal) close();
  };
}

async function handleSend(
  orchestrator: ChatOrchestrator,
  input: HTMLTextAreaElement,
  chatArea: HTMLDivElement,
  uiManager: UIManager
) {
  const message = input.value.trim();
  if (!message) return;
  if (isProcessing) {
    uiManager.showToast("Still answering your last question. One moment…");
    return;
  }
  isProcessing = true;
  try {
    await sendMessage(message, orchestrator, input, chatArea, uiManager);
  } finally {
    isProcessing = false;
    const sendBtn = document.getElementById("sendBtn") as HTMLButtonElement | null;
    if (sendBtn) sendBtn.disabled = input.value.trim() === "";
  }
}

async function sendMessage(
  message: string,
  orchestrator: ChatOrchestrator,
  input: HTMLTextAreaElement,
  chatArea: HTMLDivElement,
  uiManager: UIManager
) {

  // Save to sidebar history
  uiManager.saveToHistory(message);

  // Clear input
  input.value = "";
  input.style.height = "auto";
  const sendBtn = document.getElementById("sendBtn") as HTMLButtonElement;
  if (sendBtn) sendBtn.disabled = true;

  // Remove welcome screen
  const welcome = chatArea.querySelector(".welcome-screen");
  if (welcome) welcome.remove();

  // Add user msg with safe DOM APIs
  const userMsg = document.createElement("div");
  userMsg.className = "message user";

  const userAvatar = document.createElement("div");
  userAvatar.className = "message-avatar";
  userAvatar.textContent = "Y";

  const userContent = document.createElement("div");
  userContent.className = "message-content";

  const userSender = document.createElement("div");
  userSender.className = "message-sender";
  userSender.textContent = "You";

  const userText = document.createElement("div");
  userText.className = "message-text";
  userText.textContent = message;

  userContent.append(userSender, userText);
  userMsg.append(userAvatar, userContent);
  chatArea.appendChild(userMsg);

  // Add assistant msg container
  const assistantMsg = document.createElement("div");
  assistantMsg.className = "message assistant";

  const assistantAvatar = document.createElement("div");
  assistantAvatar.className = "message-avatar";
  const avatarIcon = document.createElement("span");
  avatarIcon.className = "material-symbols-outlined";
  avatarIcon.textContent = "auto_awesome";
  assistantAvatar.appendChild(avatarIcon);

  const assistantContent = document.createElement("div");
  assistantContent.className = "message-content";

  const messageHeader = document.createElement("div");
  messageHeader.className = "message-header";

  const assistantSender = document.createElement("div");
  assistantSender.className = "message-sender";
  assistantSender.textContent = "Enrique's Concierge";

  const messageActions = document.createElement("div");
  messageActions.className = "message-actions";

  messageHeader.append(assistantSender, messageActions);

  const assistantText = document.createElement("div");
  assistantText.className = "message-text";

  const typingIndicator = document.createElement("div");
  typingIndicator.className = "typing-indicator";
  typingIndicator.append(
    document.createElement("span"),
    document.createElement("span"),
    document.createElement("span")
  );
  assistantText.appendChild(typingIndicator);

  assistantContent.append(messageHeader, assistantText);
  assistantMsg.append(assistantAvatar, assistantContent);
  chatArea.appendChild(assistantMsg);
  chatArea.scrollTop = chatArea.scrollHeight;

  try {
    await orchestrator.processMessage(message, assistantMsg);
  } catch (err) {
    console.error("[Demo] Error:", err);
    assistantText.replaceChildren();
    const errSpan = document.createElement("span");
    errSpan.style.color = "#f87171";
    errSpan.textContent = "Error processing message. Please try again.";
    assistantText.appendChild(errSpan);
  }

  chatArea.scrollTop = chatArea.scrollHeight;
}

init();

