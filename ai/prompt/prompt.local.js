// Prompt API Playground using Chrome's built-in AI
import * as smd from "../vendor/smd.min.js";
import DOMPurify from "../vendor/purify.es.mjs";

const SYSTEM_PROMPT = "You are a helpful and friendly assistant.";
const HISTORY_KEY = (() => {
  const locale = (document.documentElement.lang || "en").toLowerCase();
  return `ai_prompt_history_${locale}`;
})();
const HISTORY_LIMIT = 8;
const MIN_PERCEIVED_MS = 350;

const STRINGS = {
  "en": {
    promptLabel: "Prompt",
    submit: "Submit prompt",
    reset: "Reset session",
    settings: "Settings",
    jsonLabel: "JSON output",
    jsonHint: "Force the model to return a JSON object with an \"answer\" string.",
    historyHeading: "Previous turns",
    historyEmpty: "No previous turns yet. Submit a prompt to start the conversation.",
    restore: "Restore prompt",
    restoreResp: "Restore response",
    clearHistory: "Clear history",
    generating: "Generating response...",
    sessionStats: "Session stats",
    costEmpty: "",
    tokens: (n) => `${n} token${n === 1 ? "" : "s"}`,
    downloadProgress: "Downloading on-device model",
    jsonError: "Model returned text that was not valid JSON.",
    errorPrefix: "Error",
  },
  "zh-cn": {
    promptLabel: "提示",
    submit: "提交提示",
    reset: "重置会话",
    settings: "设定",
    jsonLabel: "JSON 输出",
    jsonHint: "强制模型返回包含 \"answer\" 字符串的 JSON 对象。",
    historyHeading: "先前的对话",
    historyEmpty: "尚无先前的对话。提交提示以开始对话。",
    restore: "还原提示",
    restoreResp: "还原回应",
    clearHistory: "清除记录",
    generating: "正在生成回应...",
    sessionStats: "会话统计",
    costEmpty: "",
    tokens: (n) => `${n} 个代币`,
    downloadProgress: "正在下载装置模型",
    jsonError: "模型返回的文字并非有效的 JSON。",
    errorPrefix: "错误",
  },
  "zh-tw": {
    promptLabel: "提示",
    submit: "提交提示",
    reset: "重置會話",
    settings: "設定",
    jsonLabel: "JSON 輸出",
    jsonHint: "強制模型回傳包含 \"answer\" 字串的 JSON 物件。",
    historyHeading: "先前的對話",
    historyEmpty: "尚無先前的對話。提交提示以開始對話。",
    restore: "還原提示",
    restoreResp: "還原回應",
    clearHistory: "清除紀錄",
    generating: "正在產生回應...",
    sessionStats: "會話統計",
    costEmpty: "",
    tokens: (n) => `${n} 個代幣`,
    downloadProgress: "正在下載裝置模型",
    jsonError: "模型回傳的文字並非有效的 JSON。",
    errorPrefix: "錯誤",
  },
};
const T = (() => {
  const locale = (document.documentElement.lang || "en").toLowerCase();
  if (STRINGS[locale]) return STRINGS[locale];
  if (locale.startsWith("zh")) {
    return STRINGS[locale.includes("cn") || locale === "zh" ? "zh-cn" : "zh-tw"];
  }
  return STRINGS.en;
})();

const JSON_SCHEMA = {
  type: "object",
  properties: { answer: { type: "string" } },
  required: ["answer"],
  additionalProperties: false,
};

const activeClones = new Set();

function safeLocalStorage() {
  try {
    const probe = "__ai_probe__";
    localStorage.setItem(probe, probe);
    localStorage.removeItem(probe);
    return localStorage;
  } catch {
    return null;
  }
}

function readHistory() {
  const ls = safeLocalStorage();
  if (!ls) return [];
  try {
    const raw = ls.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, HISTORY_LIMIT) : [];
  } catch {
    return [];
  }
}

function writeHistory(items) {
  const ls = safeLocalStorage();
  if (!ls) return;
  try {
    ls.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, HISTORY_LIMIT)));
  } catch {
    /* ignore quota */
  }
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c]));
}

class PromptPlayground {
  constructor() {
    this.baseSession = null;
    this.currentClone = null;
    this.parser = null;
    this.parserBuffer = null;
    this.downloadMonitor = null;
    this.downloadMonitorToken = 0;
    this.supportsMonitor = false;
    this.destroyed = false;
    this.initElements();
    this.init();
  }

  initElements() {
    this.errorMessage = document.getElementById("error-message");
    this.costSpan = document.getElementById("cost");
    this.promptArea = document.getElementById("prompt-area");
    this.promptInput = document.getElementById("prompt-input");
    this.responseArea = document.getElementById("response-area");
    this.resetButton = document.getElementById("reset-button");
    this.rawResponse = document.querySelector("details div");
    this.form = document.querySelector("form");
    this.maxTokensInfo = document.getElementById("max-tokens");
    this.temperatureInfo = document.getElementById("temperature");
    this.tokensLeftInfo = document.getElementById("tokens-left");
    this.tokensSoFarInfo = document.getElementById("tokens-so-far");
    this.topKInfo = document.getElementById("top-k");
    this.sessionTemperature = document.getElementById("session-temperature");
    this.sessionTopK = document.getElementById("session-top-k");
    this.historyList = document.getElementById("prompt-history");
    this.historyEmpty = document.getElementById("prompt-history-empty");
    this.historyClear = document.getElementById("prompt-history-clear");
    this.jsonToggle = document.getElementById("prompt-json-toggle");
    this.jsonHint = document.getElementById("prompt-json-hint");
  }

  async init() {
    if (!("LanguageModel" in self)) {
      this.errorMessage.style.display = "block";
      this.errorMessage.textContent =
        "Your browser doesn't support the Prompt API. If you're on Chrome, join the Early Preview Program to enable it.";
      return;
    }

    this.applyLocaleText();
    this.promptArea.style.display = "block";
    this.setupEventListeners();
    this.renderHistoryOptions();
    await this.initializeBaseSession();
  }

  applyLocaleText() {
    const setText = (id, text) => {
      const el = document.getElementById(id);
      if (el) el.textContent = text;
    };
    setText("prompt-prompt-label", T.promptLabel);
    setText("submit-button", T.submit);
    setText("reset-button", T.reset);
    setText("prompt-settings-legend", T.settings);
    setText("prompt-json-hint", T.jsonHint);
    setText("prompt-history-heading", T.historyHeading);
    setText("prompt-history-empty", T.historyEmpty);
    setText("prompt-history-clear", T.clearHistory);
    setText("session-stats-heading", T.sessionStats);
    setText("error-message", "");
    if (this.jsonToggle) {
      const label = this.jsonToggle.closest("label");
      if (label) {
        const span = label.querySelector("span");
        if (span) span.textContent = T.jsonLabel;
      }
    }
  }

  setupEventListeners() {
    this.form.addEventListener("submit", async (e) => {
      e.preventDefault();
      await this.promptModel();
    });

    document.getElementById("submit-button").addEventListener("click", async (e) => {
      e.preventDefault();
      await this.promptModel();
    });

    this.promptInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        this.form.dispatchEvent(new Event("submit"));
      }
    });

    this.promptInput.addEventListener("input", async () => {
      await this.updateCost();
    });

    this.resetButton.addEventListener("click", () => {
      this.resetConversation();
    });

    this.sessionTemperature.addEventListener("input", async () => {
      await this.updateBaseSession();
    });
    this.sessionTopK.addEventListener("input", async () => {
      await this.updateBaseSession();
    });

    if (this.jsonToggle) {
      this.jsonToggle.addEventListener("change", () => {
        if (this.jsonHint) {
          this.jsonHint.style.display = this.jsonToggle.checked ? "block" : "none";
        }
      });
    }

    if (this.historyClear) {
      this.historyClear.addEventListener("click", () => {
        const ls = safeLocalStorage();
        if (ls) {
          try {
            ls.removeItem(HISTORY_KEY);
          } catch {
            /* ignore */
          }
        }
        this.renderHistoryOptions();
      });
    }

    window.addEventListener("pagehide", () => this.destroy());
  }

  async initializeBaseSession() {
    try {
      const params = await LanguageModel.params();
      this.sessionTemperature.value = params.defaultTemperature || 1;
      this.sessionTemperature.max = params.maxTemperature || 2;
      this.sessionTopK.value = params.defaultTopK || 3;
      this.sessionTopK.max = params.maxTopK || 128;
      await this.updateBaseSession();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Failed to initialize session:", error);
      this.errorMessage.style.display = "block";
      this.errorMessage.textContent =
        `${T.errorPrefix}: Unable to access the Prompt API. Verify chrome://flags/#optimization-guide-on-device-model is enabled.`;
    }
  }

  async updateBaseSession() {
    if (this.destroyed) return;
    try {
      if (this.baseSession) {
        try {
          this.baseSession.destroy();
        } catch {
          /* ignore */
        }
      }

      const creation = LanguageModel.create({
        temperature: Number(this.sessionTemperature.value),
        topK: Number(this.sessionTopK.value),
        initialPrompts: [{ role: "system", content: SYSTEM_PROMPT }],
      });

      let instance;
      if (typeof LanguageModel.availability === "function") {
        const availability = await LanguageModel.availability();
        this.supportsMonitor = availability === "downloadable";
      }

      if (this.supportsMonitor) {
        try {
          const monitorPromise = LanguageModel.create({
            temperature: Number(this.sessionTemperature.value),
            topK: Number(this.sessionTopK.value),
            initialPrompts: [{ role: "system", content: SYSTEM_PROMPT }],
            monitor: (m) => {
              m.addEventListener("downloadprogress", (event) => {
                if (this.errorMessage) {
                  const pct = Math.round((event.loaded || 0) * 100);
                  this.errorMessage.style.display = "block";
                  this.errorMessage.textContent = `${T.downloadProgress} (${pct}%)...`;
                }
              });
            },
          });
          instance = await monitorPromise;
        } catch {
          instance = await creation;
        }
      } else {
        instance = await creation;
      }

      this.baseSession = instance;
      if (this.errorMessage) {
        this.errorMessage.style.display = "none";
        this.errorMessage.textContent = "";
      }
      this.resetUI();
      this.updateStats();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Failed to update session:", error);
    }
  }

  async updateCost() {
    const value = this.promptInput.value.trim();
    if (!value || !this.baseSession) return;
    try {
      let cost;
      if (typeof this.baseSession.countPromptTokens === "function") {
        cost = await this.baseSession.countPromptTokens(value);
      } else if (typeof this.baseSession.measureInputUsage === "function") {
        cost = await this.baseSession.measureInputUsage(value);
      }
      if (cost !== undefined) {
        this.costSpan.textContent = T.tokens(cost);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Failed to calculate cost:", error);
    }
  }

  async promptModel() {
    if (!this.baseSession) {
      return;
    }
    const prompt = this.promptInput.value.trim();
    if (!prompt) return;

    if (this.currentClone) {
      try {
        this.currentClone.destroy();
      } catch {
        /* ignore */
      }
      activeClones.delete(this.currentClone);
      this.currentClone = null;
    }

    const useJson = !!(this.jsonToggle && this.jsonToggle.checked);

    this.responseArea.style.display = "block";

    const heading = document.createElement("h3");
    heading.classList.add("prompt", "speech-bubble");
    heading.textContent = prompt;
    this.responseArea.append(heading);

    const responseBubble = document.createElement("p");
    responseBubble.classList.add("response", "speech-bubble");
    responseBubble.textContent = T.generating;
    this.responseArea.append(responseBubble);

    const startedAt = performance.now();
    let clone = null;
    try {
      clone = await this.baseSession.clone();
      activeClones.add(clone);
      this.currentClone = clone;

      const streamOpts = useJson ? { responseConstraint: JSON_SCHEMA } : undefined;
      const stream = await clone.promptStreaming(prompt, streamOpts);

      this.attachRenderer(responseBubble);

      let result = "";
      for await (const chunk of stream) {
        result += chunk;
        this.renderChunk(result);
      }

      const elapsed = performance.now() - startedAt;
      if (elapsed < MIN_PERCEIVED_MS) {
        await new Promise((r) => setTimeout(r, MIN_PERCEIVED_MS - elapsed));
      }

      if (this.rawResponse) this.rawResponse.innerText = result;

      this.recordHistory({ prompt, response: result, json: useJson });
    } catch (error) {
      responseBubble.textContent = `${T.errorPrefix}: ${error && error.message ? error.message : error}`;
      if (useJson) {
        try {
          JSON.parse(responseBubble.textContent);
        } catch {
          responseBubble.textContent += ` (${T.jsonError})`;
        }
      }
      // eslint-disable-next-line no-console
      console.error("Prompt API error:", error);
    } finally {
      if (clone) {
        try {
          clone.destroy();
        } catch {
          /* ignore */
        }
        activeClones.delete(clone);
        if (this.currentClone === clone) this.currentClone = null;
      }
      this.updateStats();
    }
  }

  attachRenderer(target) {
    this.parserBuffer = document.createElement("div");
    const renderer = smd.default_renderer(this.parserBuffer);
    this.parser = smd.parser(renderer);
    this.parserTarget = target;
    target.innerHTML = "";
  }

  renderChunk(text) {
    if (!this.parser) return;
    smd.parser_write(this.parser, text);
    if (this.parserTarget && this.parserBuffer) {
      const html = DOMPurify.sanitize(this.parserBuffer.innerHTML, {
        ADD_ATTR: ["target", "rel"],
      });
      this.parserTarget.innerHTML = html;
    }
  }

  updateStats() {
    if (!this.baseSession) return;
    const numberFormat = new Intl.NumberFormat("en-US");
    const decimalFormat = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });

    this.temperatureInfo.textContent = decimalFormat.format(this.baseSession.temperature || 0);
    this.topKInfo.textContent = numberFormat.format(this.baseSession.topK || 0);

    const maxTokens = this.baseSession.inputQuota || this.baseSession.maxTokens || 0;
    const tokensUsed = this.baseSession.inputUsage || this.baseSession.tokensSoFar || 0;
    const tokensLeft = Math.max(0, maxTokens - tokensUsed);

    this.maxTokensInfo.textContent = numberFormat.format(maxTokens);
    this.tokensLeftInfo.textContent = numberFormat.format(tokensLeft);
    this.tokensSoFarInfo.textContent = numberFormat.format(tokensUsed);
  }

  resetUI() {
    this.responseArea.style.display = "none";
    this.responseArea.innerHTML = "";
    if (this.rawResponse) this.rawResponse.innerHTML = "";
    this.parser = null;
    this.parserBuffer = null;
    this.parserTarget = null;
    this.promptInput.focus();
  }

  resetConversation() {
    this.promptInput.value = "";
    this.resetUI();
    if (this.currentClone) {
      try {
        this.currentClone.destroy();
      } catch {
        /* ignore */
      }
      activeClones.delete(this.currentClone);
      this.currentClone = null;
    }
    if (this.baseSession) {
      try {
        this.baseSession.destroy();
      } catch {
        /* ignore */
      }
      this.baseSession = null;
    }
    this.updateBaseSession();
  }

  recordHistory(entry) {
    const items = readHistory().filter((it) => it.prompt !== entry.prompt);
    items.unshift(entry);
    writeHistory(items);
    this.renderHistoryOptions();
  }

  renderHistoryOptions() {
    if (!this.historyList) return;
    const items = readHistory();
    this.historyList.innerHTML = "";
    if (this.historyEmpty) {
      this.historyEmpty.style.display = items.length === 0 ? "block" : "none";
    }
    if (this.historyClear) {
      this.historyClear.style.display = items.length === 0 ? "none" : "inline-block";
    }
    items.forEach((item, index) => {
      const li = document.createElement("li");
      li.className = "history-item";
      const preview = (item.response || "").replace(/\s+/g, " ").trim();
      const snippet = preview.length > 80 ? `${preview.slice(0, 77)}...` : preview || "(empty)";
      li.innerHTML = `
        <div class="history-prompt">${escapeHtml(item.prompt)}</div>
        <div class="history-snippet">${escapeHtml(snippet)}</div>
        <div class="history-actions">
          <button type="button" class="history-restore-prompt" data-index="${index}">${escapeHtml(T.restore)}</button>
          <button type="button" class="history-restore-response" data-index="${index}">${escapeHtml(T.restoreResp)}</button>
        </div>
      `;
      this.historyList.appendChild(li);
    });
    this.historyList.querySelectorAll(".history-restore-prompt").forEach((btn) => {
      btn.addEventListener("click", () => {
        const i = Number(btn.getAttribute("data-index"));
        const entry = readHistory()[i];
        if (entry) {
          this.promptInput.value = entry.prompt;
          this.updateCost();
        }
      });
    });
    this.historyList.querySelectorAll(".history-restore-response").forEach((btn) => {
      btn.addEventListener("click", () => {
        const i = Number(btn.getAttribute("data-index"));
        const entry = readHistory()[i];
        if (entry) {
          this.responseArea.style.display = "block";
          this.responseArea.innerHTML = "";
          const heading = document.createElement("h3");
          heading.classList.add("prompt", "speech-bubble");
          heading.textContent = entry.prompt;
          this.responseArea.append(heading);
          const resp = document.createElement("p");
          resp.classList.add("response", "speech-bubble");
          resp.innerHTML = DOMPurify.sanitize(this.formatStoredResponse(entry.response));
          this.responseArea.append(resp);
        }
      });
    });
  }

  formatStoredResponse(text) {
    return text
      .split(/\n+/)
      .map((line) => {
        if (/^[-*]\s+/.test(line)) return `<li>${escapeHtml(line.replace(/^[-*]\s+/, ""))}</li>`;
        if (/^#\s+/.test(line)) return `<h3>${escapeHtml(line.replace(/^#\s+/, ""))}</h3>`;
        return `<p>${escapeHtml(line)}</p>`;
      })
      .join("");
  }

  destroy() {
    this.destroyed = true;
    for (const clone of activeClones) {
      try {
        clone.destroy();
      } catch {
        /* ignore */
      }
    }
    activeClones.clear();
    if (this.baseSession) {
      try {
        this.baseSession.destroy();
      } catch {
        /* ignore */
      }
      this.baseSession = null;
    }
  }
}

if (typeof window !== "undefined") {
  document.addEventListener("DOMContentLoaded", () => {
    new PromptPlayground();
  });
}

export { PromptPlayground, T, JSON_SCHEMA, HISTORY_KEY, HISTORY_LIMIT };