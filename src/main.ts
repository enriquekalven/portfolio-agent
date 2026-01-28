/*
 * Personalized Learning Demo - Main Entry Point
 */

console.log("[Demo] main.ts starting...");

import { ChatOrchestrator } from "./chat-orchestrator";
import { A2UIRenderer } from "./a2ui-renderer";
import { UIManager } from "./ui-manager";

// Registry for components (side-effect import)
import "./theme-provider";

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

  if (!chatInput || !sendBtn || !chatArea) {
    console.warn("[Demo] Missing UI elements");
    return;
  }

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

  // Chips
  const chips = document.querySelectorAll(".suggestion-chip");
  chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      const prompt = chip.getAttribute("data-prompt");
      if (prompt) {
        chatInput.value = prompt;
        chatInput.dispatchEvent(new Event("input"));
        handleSend(orchestrator, chatInput, chatArea, uiManager);
      }
    });
  });

  // Sidebar Gems
  const gemHistorian = document.getElementById("gem-historian");
  const gemMatcher = document.getElementById("gem-matcher");
  const gemAnalyzer = document.getElementById("gem-analyzer");
  const gemMedia = document.getElementById("gem-media");
  const gemBlogs = document.getElementById("gem-blogs");
  const gemAwards = document.getElementById("gem-awards");
  const gemCerts = document.getElementById("gem-certs");
  const gemSpeaker = document.getElementById("gem-speaker");

  if (gemHistorian) {
    gemHistorian.addEventListener("click", () => {
      chatInput.value = "Show me Enrique's career highlights as a sequential timeline";
      chatInput.dispatchEvent(new Event("input"));
      handleSend(orchestrator, chatInput, chatArea, uiManager);
    });
  }
  if (gemMatcher) {
    gemMatcher.addEventListener("click", () => {
      chatInput.value = "How do Enrique's skills match a Senior AI role?";
      chatInput.dispatchEvent(new Event("input"));
      handleSend(orchestrator, chatInput, chatArea, uiManager);
    });
  }
  if (gemAnalyzer) {
    gemAnalyzer.addEventListener("click", () => {
      chatInput.value = "Analyze Enrique's fit for an AI Lead role";
      chatInput.dispatchEvent(new Event("input"));
      handleSend(orchestrator, chatInput, chatArea, uiManager);
    });
  }
  if (gemMedia) {
    gemMedia.addEventListener("click", () => {
      chatInput.value = "Show me his top YouTube videos";
      chatInput.dispatchEvent(new Event("input"));
      handleSend(orchestrator, chatInput, chatArea, uiManager);
    });
  }
  if (gemBlogs) {
    gemBlogs.addEventListener("click", () => {
      chatInput.value = "Show me some of his Medium blog posts";
      chatInput.dispatchEvent(new Event("input"));
      handleSend(orchestrator, chatInput, chatArea, uiManager);
    });
  }
  if (gemAwards) {
    gemAwards.addEventListener("click", () => {
      chatInput.value = "List Enrique's major awards and hackathon wins";
      chatInput.dispatchEvent(new Event("input"));
      handleSend(orchestrator, chatInput, chatArea, uiManager);
    });
  }
  if (gemCerts) {
    gemCerts.addEventListener("click", () => {
      chatInput.value = "Show Enrique's cloud certifications";
      chatInput.dispatchEvent(new Event("input"));
      handleSend(orchestrator, chatInput, chatArea, uiManager);
    });
  }
  if (gemSpeaker) {
    gemSpeaker.addEventListener("click", () => {
      chatInput.value = "Show Enrique's speaking engagements and keynotes";
      chatInput.dispatchEvent(new Event("input"));
      handleSend(orchestrator, chatInput, chatArea, uiManager);
    });
  }

  const gemTestimonials = document.getElementById("gem-testimonials");
  if (gemTestimonials) {
    gemTestimonials.addEventListener("click", () => {
      chatInput.value = "Show me what people think of Enrique (testimonials)";
      chatInput.dispatchEvent(new Event("input"));
      handleSend(orchestrator, chatInput, chatArea, uiManager);
    });
  }

  const gemGallery = document.getElementById("gem-gallery");
  if (gemGallery) {
    gemGallery.addEventListener("click", () => {
      chatInput.value = "Show me a gallery of your work and highlights";
      chatInput.dispatchEvent(new Event("input"));
      handleSend(orchestrator, chatInput, chatArea, uiManager);
    });
  }

  // Theme Toggle
  const themeToggle = document.getElementById("theme-toggle");
  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      document.body.classList.toggle("light-mode");
      const icon = themeToggle.querySelector(".material-symbols-outlined");
      if (icon) {
        icon.textContent = document.body.classList.contains("light-mode") ? "dark_mode" : "light_mode";
      }
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
  orchestrator: ChatOrchestrator,
  input: HTMLTextAreaElement,
  chatArea: HTMLDivElement,
  uiManager: UIManager
) {
  console.log("CLASSIFIED ACCESS GRANTED: Unlocking The Agentic Adventures...");

  // Visual feedback (CSS Confetti)
  const container = document.body;
  for (let i = 0; i < 50; i++) {
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

    const animation = confetti.animate([
      { transform: `translate3d(0, 0, 0) rotate(0deg)`, opacity: 1 },
      { transform: `translate3d(${(Math.random() - 0.5) * 200}px, 100vh, 0) rotate(${Math.random() * 360}deg)`, opacity: 0 }
    ], {
      duration: 2000 + Math.random() * 3000,
      easing: "cubic-bezier(0, .9, .57, 1)"
    });

    animation.onfinish = () => confetti.remove();
  }

  // Auto-send the secret command
  input.value = "unlock:comics";
  input.dispatchEvent(new Event("input"));
  // @ts-ignore
  handleSend(orchestrator, input, chatArea, uiManager);
}

async function handleSend(
  orchestrator: ChatOrchestrator,
  input: HTMLTextAreaElement,
  chatArea: HTMLDivElement,
  uiManager: UIManager
) {
  const message = input.value.trim();
  if (!message) return;

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

  // Add user msg
  const userMsg = document.createElement("div");
  userMsg.className = "message user";
  userMsg.innerHTML = `
    <div class="message-avatar">V</div>
    <div class="message-content">
      <div class="message-sender">You</div>
      <div class="message-text">${escapeHtml(message)}</div>
    </div>
  `;
  chatArea.appendChild(userMsg);

  // Add assistant msg
  const assistantMsg = document.createElement("div");
  assistantMsg.className = "message assistant";
  assistantMsg.innerHTML = `
    <div class="message-avatar"><span class="material-symbols-outlined">auto_awesome</span></div>
    <div class="message-content">
      <div class="message-header">
        <div class="message-sender">Gemini</div>
        <div class="message-actions"></div>
      </div>
      <div class="message-text"><div class="typing-indicator"><span></span><span></span><span></span></div></div>
    </div>
  `;
  chatArea.appendChild(assistantMsg);
  chatArea.scrollTop = chatArea.scrollHeight;

  try {
    await orchestrator.processMessage(message, assistantMsg);
  } catch (err) {
    console.error("[Demo] Error:", err);
    const text = assistantMsg.querySelector(".message-text");
    if (text) text.innerHTML = '<span style="color:red">Error processing message.</span>';
  }

  chatArea.scrollTop = chatArea.scrollHeight;
}

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

init();
