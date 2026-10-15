/*
 * UI Manager
 * Handles Speech Recognition, Chat History (Recent), Toast Notifications, and Popover Menus.
 */

export interface RecentChatItem {
  id: number;
  title: string;
  prompt: string;
  timestamp: string;
}

export class UIManager {
  private chatInput: HTMLTextAreaElement;
  private recentContainer: HTMLDivElement | null;
  private toastTimeout: number | null = null;
  private placeholders = [
    "Ask about Enrique's 2026 Google Cloud Delta role...",
    "Tell me about the 4x Gartner & Forrester Leader wins",
    "What is the Q3 2026 Silver Google AI Award (SWIFTY)?",
    "Show me the Strategic Integration Matrix",
    "How do your skills match a Senior AI role?",
    "Show me the Hall of Mastery 🖼️",
    "What do Googlers say about him? ✨",
    "Show me your featured open source repositories"
  ];
  private currentPlaceholderIndex = 0;

  constructor() {
    this.chatInput = document.getElementById("chatInput") as HTMLTextAreaElement;
    this.recentContainer = document.getElementById("recent-chats-container") as HTMLDivElement;

    this.initPlaceholderRotation();
    this.initSpeechRecognition();
    this.initHistoryAndActions();
    this.renderRecentChats();
    this.initPromptTicker();
  }

  /**
   * Displays a non-blocking glassmorphic toast notification.
   */
  public showToast(message: string) {
    const toast = document.getElementById("ui-toast");
    const toastText = document.getElementById("ui-toast-text");
    if (!toast || !toastText) return;

    toastText.textContent = message;
    toast.classList.add("visible");

    if (this.toastTimeout) {
      window.clearTimeout(this.toastTimeout);
    }
    this.toastTimeout = window.setTimeout(() => {
      toast.classList.remove("visible");
    }, 3200);
  }

  /**
   * Rotates placeholders in the chat input.
   */
  private initPlaceholderRotation() {
    if (!this.chatInput) return;

    setInterval(() => {
      this.currentPlaceholderIndex = (this.currentPlaceholderIndex + 1) % this.placeholders.length;
      this.chatInput.placeholder = `Message Enrique's Agent... (Try: "${this.placeholders[this.currentPlaceholderIndex]}")`;
    }, 4000);
  }

  /**
   * Initializes the high-fidelity prompt ticker.
   */
  private initPromptTicker() {
    const tickerContainer = document.getElementById("prompt-ticker");
    const tickerText = document.getElementById("prompt-ticker-text");

    if (!tickerContainer || !tickerText || !this.chatInput) return;

    const prompts = [
      "Tell me about the Q3 2026 Silver Google AI Award (SWIFTY) and Advent of Agents",
      "How did Enrique drive 4x Gartner Magic Quadrant and Forrester Wave Leader wins in 2026?",
      "Tell me about Enrique's $2B+ enterprise AI deal scope and Google Cloud Delta role",
      "How do your skills match a Senior AI role?",
      "Show me the Strategic Integration Matrix",
      "Walk me through your career journey",
      "Show me your technical proficiency radar",
      "Listen to your vision in a podcast deep dive",
      "Show me your stage presence at Google Cloud Next",
      "Show me your featured open source repositories"
    ];

    let currentPromptIndex = 0;

    // Click to send prompt
    tickerContainer.addEventListener("click", () => {
      window.dispatchEvent(
        new CustomEvent("portfolio:send-prompt", {
          detail: { prompt: prompts[currentPromptIndex] }
        })
      );
    });

    // Rotate prompts with a fade effect
    setInterval(() => {
      tickerContainer.style.opacity = "0";
      tickerContainer.style.transform = "translateY(8px)";

      setTimeout(() => {
        currentPromptIndex = (currentPromptIndex + 1) % prompts.length;
        tickerText.textContent = prompts[currentPromptIndex];
        tickerContainer.style.opacity = "1";
        tickerContainer.style.transform = "translateY(0)";
      }, 400);
    }, 5000);
  }

  /**
   * Initializes Speech Recognition (Voice-to-Text).
   */
  private initSpeechRecognition() {
    const micBtn = document.getElementById("mic-btn");
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!micBtn || !SpeechRecognition) {
      if (micBtn) {
        micBtn.style.opacity = "0.6";
        micBtn.addEventListener("click", () => {
          this.showToast("Voice input requires a browser with Web Speech API support.");
        });
      }
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;

    micBtn.addEventListener("click", () => {
      try {
        recognition.start();
        micBtn.classList.add("recording");
        const iconEl = micBtn.querySelector(".material-symbols-outlined") as HTMLElement;
        if (iconEl) iconEl.textContent = "graphic_eq";
        this.chatInput.placeholder = "Listening...";
        this.showToast("Listening... Speak your question for Enrique's Agent.");
      } catch (e) {
        console.warn("Speech recognition already started or error:", e);
      }
    });

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      if (this.chatInput) {
        this.chatInput.value = transcript;
        this.chatInput.dispatchEvent(new Event("input"));
      }
    };

    recognition.onend = () => {
      micBtn.classList.remove("recording");
      const iconEl = micBtn.querySelector(".material-symbols-outlined") as HTMLElement;
      if (iconEl) iconEl.textContent = "mic";
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      micBtn.classList.remove("recording");
    };
  }

  /**
   * Initializes History, Popover Menus, and Action Items using non-blocking popovers.
   */
  private initHistoryAndActions() {
    const historyBtn = document.getElementById("history-btn");
    const moreActionsBtn = document.getElementById("more-actions-btn");
    const moreActionsMenu = document.getElementById("more-actions-menu");
    const profileActionsBtn = document.getElementById("profile-actions-btn");
    const profileActionsMenu = document.getElementById("profile-actions-menu");

    const closeAllPopovers = () => {
      moreActionsMenu?.classList.remove("open");
      profileActionsMenu?.classList.remove("open");
    };

    if (historyBtn) {
      historyBtn.addEventListener("click", () => {
        const sidebar = document.getElementById("app-sidebar");
        const backdrop = document.getElementById("sidebar-backdrop");
        if (window.innerWidth <= 820 && sidebar) {
          sidebar.classList.add("open");
          backdrop?.classList.add("open");
        }
        if (this.recentContainer) {
          this.recentContainer.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        this.showToast("Recent conversations are pinned in the left sidebar.");
      });
    }

    if (moreActionsBtn && moreActionsMenu) {
      moreActionsBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const isOpen = moreActionsMenu.classList.contains("open");
        closeAllPopovers();
        if (!isOpen) {
          moreActionsMenu.classList.add("open");
        }
      });
    }

    if (profileActionsBtn && profileActionsMenu) {
      profileActionsBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const isOpen = profileActionsMenu.classList.contains("open");
        closeAllPopovers();
        if (!isOpen) {
          profileActionsMenu.classList.add("open");
        }
      });
    }

    // Close popovers on outside click or Escape
    document.addEventListener("click", () => closeAllPopovers());
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeAllPopovers();
    });

    // Action: Clear Chat / Reset to Welcome Screen
    const actionClearChat = document.getElementById("action-clear-chat");
    if (actionClearChat) {
      actionClearChat.addEventListener("click", () => {
        closeAllPopovers();
        window.location.reload();
      });
    }

    // Action: Export Conversation to Markdown
    const actionExportMd = document.getElementById("action-export-md");
    if (actionExportMd) {
      actionExportMd.addEventListener("click", () => {
        closeAllPopovers();
        this.exportConversationMarkdown();
      });
    }

    // Action: Clear Recent History
    const actionClearHistory = document.getElementById("action-clear-history");
    if (actionClearHistory) {
      actionClearHistory.addEventListener("click", () => {
        closeAllPopovers();
        localStorage.removeItem("enriq_chat_history");
        this.renderRecentChats();
        this.showToast("Cleared recent chat history.");
      });
    }

    // Action: Unlock Secret Comics
    const actionUnlockComics = document.getElementById("action-unlock-comics");
    if (actionUnlockComics) {
      actionUnlockComics.addEventListener("click", () => {
        closeAllPopovers();
        window.dispatchEvent(new CustomEvent("portfolio:unlock-comics"));
      });
    }
  }

  /**
   * Exports the current chat transcript as a downloadable Markdown file.
   */
  private exportConversationMarkdown() {
    const messages = document.querySelectorAll("#chatArea .message");
    if (!messages.length) {
      this.showToast("Start a conversation first before exporting.");
      return;
    }

    const lines: string[] = [
      "# Enrique K Chan — Portfolio Concierge Transcript",
      `Exported: ${new Date().toISOString()}`,
      ""
    ];

    messages.forEach((msg) => {
      const sender = msg.querySelector(".message-sender")?.textContent?.trim() || "Speaker";
      const text = msg.querySelector(".message-text")?.textContent?.trim() || "";
      lines.push(`### ${sender}\n\n${text}\n`);
    });

    const blob = new Blob([lines.join("\n")], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `enriquekchan-concierge-${Date.now()}.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    this.showToast("Conversation exported as Markdown (.md)");
  }

  /**
   * Saves a message summary and full prompt to recent chats.
   */
  public saveToHistory(message: string) {
    if (!message || message.length < 4) return;

    let history: RecentChatItem[] = [];
    try {
      history = JSON.parse(localStorage.getItem("enriq_chat_history") || "[]");
    } catch {
      history = [];
    }

    const title = message.length > 28 ? message.substring(0, 28) + "..." : message;
    // Remove existing duplicate prompt
    history = history.filter((item) => item.prompt !== message && item.title !== title);

    history.unshift({
      id: Date.now(),
      title,
      prompt: message,
      timestamp: new Date().toISOString()
    });

    localStorage.setItem("enriq_chat_history", JSON.stringify(history.slice(0, 8)));
    this.renderRecentChats();
  }

  /**
   * Renders the recent chats in the sidebar using XSS-safe DOM APIs.
   */
  private renderRecentChats() {
    if (!this.recentContainer) return;

    let history: RecentChatItem[] = [];
    try {
      history = JSON.parse(localStorage.getItem("enriq_chat_history") || "[]");
    } catch {
      history = [];
    }

    this.recentContainer.replaceChildren();

    if (history.length === 0) {
      const emptyEl = document.createElement("div");
      emptyEl.className = "sidebar-item";
      emptyEl.style.pointerEvents = "none";
      emptyEl.style.opacity = "0.6";

      const icon = document.createElement("span");
      icon.className = "material-symbols-outlined";
      icon.textContent = "history";

      const label = document.createElement("span");
      label.textContent = "No recent chats yet";

      emptyEl.append(icon, label);
      this.recentContainer.appendChild(emptyEl);
      return;
    }

    history.forEach((item) => {
      const row = document.createElement("div");
      row.className = "sidebar-item";
      row.dataset.id = String(item.id);
      row.dataset.prompt = item.prompt || item.title;
      row.title = item.prompt || item.title;
      row.style.cursor = "pointer";

      const icon = document.createElement("span");
      icon.className = "material-symbols-outlined";
      icon.textContent = "chat_bubble_outline";

      const label = document.createElement("span");
      label.textContent = item.title;
      label.style.overflow = "hidden";
      label.style.textOverflow = "ellipsis";
      label.style.whiteSpace = "nowrap";

      row.append(icon, label);
      row.addEventListener("click", () => {
        const promptToSend = item.prompt || item.title.replace(/\.\.\.$/, "");
        window.dispatchEvent(
          new CustomEvent("portfolio:send-prompt", {
            detail: { prompt: promptToSend }
          })
        );
      });

      this.recentContainer?.appendChild(row);
    });
  }
}

