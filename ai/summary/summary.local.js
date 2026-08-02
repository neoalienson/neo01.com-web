// Text Summarizer using Chrome's built-in AI
import DOMPurify from "../vendor/purify.es.mjs";

const LOCALE = (document.documentElement.lang || "en").toLowerCase();
const STRINGS = {
  "en": {
    prompt: "Prompt",
    typeLabel: "Summary Type",
    lengthLabel: "Length",
    formatLabel: "Format",
    tokenUsage: "Token Usage",
    summaryHeading: "Summary",
    outputPlaceholder: "Enter text above to generate a summary...",
    generating: "Generating summary...",
    empty: "Enter text above to generate a summary...",
    unsupportedTitle: "Summarization API is not supported in this browser. Please use Chrome Canary with AI features enabled.",
    unavailableTitle: "Summarization API is not available. Please check your browser settings.",
    overflow: "Text is too long for the model. Shorten the input and try again.",
    downloadProgress: "Downloading on-device model",
    restoring: "Restored previous summary",
    clearHistory: "Clear history",
    historyLabel: "Previous summaries",
    historyEmpty: "No previous summaries yet.",
    historyOption: (i, summary) => {
      const flat = summary.replace(/\s+/g, " ").trim();
      const preview = flat.length > 60 ? `${flat.slice(0, 57)}…` : flat || "(empty)";
      return `#${i} · ${preview}`;
    },
  },
  "zh-cn": {
    prompt: "提示",
    typeLabel: "摘要类型",
    lengthLabel: "长度",
    formatLabel: "格式",
    tokenUsage: "代币使用量",
    summaryHeading: "摘要",
    outputPlaceholder: "在上方输入文字以产生摘要...",
    generating: "正在生成摘要...",
    empty: "在上方输入文字以产生摘要...",
    unsupportedTitle: "此浏览器不支持摘要 API。请使用启用 AI 功能的 Chrome Canary。",
    unavailableTitle: "摘要 API 无法使用。请检查您的浏览器设定。",
    overflow: "文字过长，模型无法处理。请缩短后再试。",
    downloadProgress: "正在下载装置模型",
    restoring: "已还原先前的摘要",
    clearHistory: "清除记录",
    historyLabel: "先前的摘要",
    historyEmpty: "尚无先前的摘要。",
    historyOption: (i, summary) => {
      const flat = summary.replace(/\s+/g, " ").trim();
      const preview = flat.length > 60 ? `${flat.slice(0, 57)}…` : flat || "(空)";
      return `#${i} · ${preview}`;
    },
  },
  "zh-tw": {
    prompt: "提示",
    typeLabel: "摘要類型",
    lengthLabel: "長度",
    formatLabel: "格式",
    tokenUsage: "代幣使用量",
    summaryHeading: "摘要",
    outputPlaceholder: "在上方輸入文字以產生摘要...",
    generating: "正在產生摘要...",
    empty: "在上方輸入文字以產生摘要...",
    unsupportedTitle: "此瀏覽器不支援摘要 API。請使用啟用 AI 功能的 Chrome Canary。",
    unavailableTitle: "摘要 API 無法使用。請檢查您的瀏覽器設定。",
    overflow: "文字過長，模型無法處理。請縮短後再試。",
    downloadProgress: "正在下載裝置模型",
    restoring: "已還原先前的摘要",
    clearHistory: "清除紀錄",
    historyLabel: "先前的摘要",
    historyEmpty: "尚無先前的摘要。",
    historyOption: (i, summary) => {
      const flat = summary.replace(/\s+/g, " ").trim();
      const preview = flat.length > 60 ? `${flat.slice(0, 57)}…` : flat || "(空)";
      return `#${i} · ${preview}`;
    },
  },
};
const t = (() => {
  if (STRINGS[LOCALE]) return STRINGS[LOCALE];
  if (LOCALE.startsWith("zh")) {
    return STRINGS[LOCALE.includes("cn") || LOCALE === "zh" ? "zh-cn" : "zh-tw"];
  }
  return STRINGS.en;
})();

const CACHE_TTL_MS = 60 * 60 * 1000;
const HISTORY_KEY = `ai_summary_history_${LOCALE}`;
const HISTORY_LIMIT = 5;
const CACHE_PREFIX = `ai_summary_cache_${LOCALE}_`;

function normalize(text) {
  return (text || "").trim().replace(/\s+/g, " ");
}

async function hashKey(text) {
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const data = new TextEncoder().encode(text);
    const buf = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return `h_${(hash >>> 0).toString(16)}`;
}

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
    /* quota or disabled storage */
  }
}

function readCacheEntry(key) {
  const ls = safeLocalStorage();
  if (!ls) return null;
  try {
    const raw = ls.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.value !== "string") return null;
    if (Date.now() - parsed.savedAt > CACHE_TTL_MS) {
      ls.removeItem(CACHE_PREFIX + key);
      return null;
    }
    return parsed.value;
  } catch {
    return null;
  }
}

function writeCacheEntry(key, value) {
  const ls = safeLocalStorage();
  if (!ls) return;
  try {
    ls.setItem(CACHE_PREFIX + key, JSON.stringify({ value, savedAt: Date.now() }));
  } catch {
    /* quota or disabled storage */
  }
}

class TextSummarizer {
  constructor() {
    this.input = document.querySelector("#input");
    this.typeSelect = document.querySelector("#type");
    this.formatSelect = document.querySelector("#format");
    this.lengthSelect = document.querySelector("#length");
    this.characterCount = document.querySelector("#character-count");
    this.unsupportedDiv = document.querySelector("#summarization-unsupported");
    this.unavailableDiv = document.querySelector("#summarization-unavailable");
    this.overflowDiv = document.querySelector("#summarization-overflow");
    this.downloadDiv = document.querySelector("#summarization-download");
    this.output = document.querySelector("#output");
    this.historySelect = document.querySelector("#summary-history");
    this.historyEmpty = document.querySelector("#summary-history-empty");
    this.clearHistoryButton = document.querySelector("#summary-history-clear");
    this.summarizer = null;
    this.inFlight = null;
    this.inFlightToken = 0;
    this.debounceTimer = null;
    this.destroyed = false;

    this.renderHistoryOptions();

    if (this.unsupportedDiv) {
      this.unsupportedDiv.textContent = t.unsupportedTitle;
    }
    if (this.unavailableDiv) {
      this.unavailableDiv.textContent = t.unavailableTitle;
    }
    if (this.overflowDiv) {
      this.overflowDiv.textContent = t.overflow;
      this.overflowDiv.style.display = "none";
    }
    if (this.downloadDiv) {
      this.downloadDiv.textContent = t.downloadProgress + "...";
      this.downloadDiv.style.display = "none";
    }
    if (this.output) {
      this.output.textContent = t.empty;
    }

    this.init();
  }

  async init() {
    if (!("Summarizer" in self)) {
      if (this.unavailableDiv) this.unavailableDiv.style.display = "block";
      return;
    }

    try {
      const availability = await self.Summarizer.availability();
      if (this.destroyed) return;
      if (availability !== "available" && availability !== "downloadable") {
        if (this.unsupportedDiv) this.unsupportedDiv.style.display = "block";
        return;
      }
    } catch {
      if (this.unsupportedDiv) this.unsupportedDiv.style.display = "block";
      return;
    }

    this.setupEventListeners();
    this.runWithDownloadMonitor(() => this.primeSummarizer()).then((ok) => {
      if (ok) this.generateSummary();
    });
  }

  setupEventListeners() {
    const debounceGenerate = () => {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => this.generateSummary(), 400);
    };
    if (this.typeSelect) this.typeSelect.addEventListener("change", debounceGenerate);
    if (this.formatSelect) this.formatSelect.addEventListener("change", debounceGenerate);
    if (this.lengthSelect) this.lengthSelect.addEventListener("change", debounceGenerate);
    if (this.input) this.input.addEventListener("input", debounceGenerate);

    if (this.historySelect) {
      this.historySelect.addEventListener("change", (e) => {
        const index = Number(e.target.value);
        if (Number.isNaN(index)) return;
        const items = readHistory();
        const item = items[index];
        if (!item) return;
        if (this.output) this.output.textContent = item.summary;
        if (this.input) this.input.value = item.input;
        if (this.unsupportedDiv) this.unsupportedDiv.style.display = "none";
        if (this.unavailableDiv) this.unavailableDiv.style.display = "none";
        if (this.overflowDiv) this.overflowDiv.style.display = "none";
      });
    }

    if (this.clearHistoryButton) {
      this.clearHistoryButton.addEventListener("click", () => {
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

  async runWithDownloadMonitor(fn) {
    try {
      const promise = fn();
      if (
        self.Summarizer.create &&
        typeof self.Summarizer.create === "function" &&
        typeof self.Summarizer.availability === "function"
      ) {
        const availability = await self.Summarizer.availability();
        if (availability === "downloadable" && typeof self.Summarizer.create === "function") {
          // The on-device docs allow calling `create({ monitor })` to receive a
          // monitor callback during the initial download. We try a fresh call to
          // get the monitor; the resulting instance is replaced after the
          // existing priming completes.
          try {
            const monitorPromise = self.Summarizer.create({
              type: this.typeSelect ? this.typeSelect.value : "key-points",
              format: this.formatSelect ? this.formatSelect.value : "markdown",
              length: this.lengthSelect ? this.lengthSelect.value : "short",
              monitor(m) {
                m.addEventListener("downloadprogress", (event) => {
                  if (this.downloadDiv) {
                    const pct = Math.round((event.loaded || 0) * 100);
                    this.downloadDiv.textContent = `${t.downloadProgress} (${pct}%)...`;
                    this.downloadDiv.style.display = "block";
                  }
                });
              },
            });
            const downloadInstance = await monitorPromise;
            this.replaceSummarizer(downloadInstance);
            this.summarizer = downloadInstance;
            if (this.downloadDiv) this.downloadDiv.style.display = "none";
          } catch {
            /* monitor not supported yet; keep priming instance */
          }
        }
      }
      return await promise;
    } catch (err) {
      return false;
    }
  }

  replaceSummarizer(next) {
    if (this.summarizer && this.summarizer !== next && typeof this.summarizer.destroy === "function") {
      try {
        this.summarizer.destroy();
      } catch {
        /* ignore */
      }
    }
    this.summarizer = next;
  }

  async primeSummarizer() {
    if (!("Summarizer" in self)) return false;
    try {
      const instance = await self.Summarizer.create({
        type: this.typeSelect ? this.typeSelect.value : "key-points",
        format: this.formatSelect ? this.formatSelect.value : "markdown",
        length: this.lengthSelect ? this.lengthSelect.value : "short",
      });
      this.replaceSummarizer(instance);
      return true;
    } catch {
      return false;
    }
  }

  async ensureSummarizer() {
    if (this.summarizer) return this.summarizer;
    const ok = await this.primeSummarizer();
    return ok ? this.summarizer : null;
  }

  async generateSummary() {
    if (this.destroyed) return;
    const text = normalize(this.input ? this.input.value : "");
    if (!text) {
      if (this.output) this.output.textContent = t.empty;
      if (this.characterCount) this.characterCount.textContent = "0";
      return;
    }

    const options = {
      type: this.typeSelect ? this.typeSelect.value : "key-points",
      format: this.formatSelect ? this.formatSelect.value : "markdown",
      length: this.lengthSelect ? this.lengthSelect.value : "short",
    };
    const cacheKeyText = `${options.type}|${options.length}|${options.format}|${text}`;
    const cached = readCacheEntry(cacheKeyText);
    if (cached) {
      if (this.output) this.output.innerHTML = DOMPurify.sanitize(this.formatOutput(cached, options.format));
      if (this.characterCount) this.characterCount.textContent = `${text.length} chars`;
      this.recordHistory({ input: text, summary: cached, options });
      return;
    }

    if (this.output) this.output.textContent = t.generating;
    const token = ++this.inFlightToken;

    try {
      let summarizer = await this.ensureSummarizer();
      if (token !== this.inFlightToken || this.destroyed) return;

      if (summarizer && summarizer.measureInputUsage) {
        try {
          const used = await summarizer.measureInputUsage(text);
          if (this.characterCount) this.characterCount.textContent = `${Math.round(used)} tokens used`;
          if (summarizer.inputQuota && used > summarizer.inputQuota) {
            if (this.overflowDiv) this.overflowDiv.style.display = "block";
            if (this.output) this.output.textContent = t.overflow;
            return;
          }
        } catch {
          if (this.characterCount) this.characterCount.textContent = `${text.length} chars`;
        }
      }

      const promise = summarizer
        ? summarizer.summarize(text)
        : self.Summarizer.create(options).then((created) => created.summarize(text).finally(() => {
          try {
            created.destroy();
          } catch {
            /* ignore */
          }
        }));

      const summary = await promise;
      if (token !== this.inFlightToken || this.destroyed) return;

      writeCacheEntry(cacheKeyText, summary);
      if (this.output) this.output.innerHTML = DOMPurify.sanitize(this.formatOutput(summary, options.format));
      if (this.overflowDiv) this.overflowDiv.style.display = "none";
      this.recordHistory({ input: text, summary, options });
    } catch (error) {
      if (token !== this.inFlightToken || this.destroyed) return;
      if (this.output) this.output.textContent = `Error: ${error && error.message ? error.message : error}`;
      // eslint-disable-next-line no-console
      console.error("Summarization error:", error);
    }
  }

  formatOutput(summary, format) {
    if (format === "markdown") {
      return summary
        .split(/\n+/)
        .map((line) => {
          if (/^[-*]\s+/.test(line)) return `<li>${line.replace(/^[-*]\s+/, "")}</li>`;
          if (/^#\s+/.test(line)) return `<h3>${line.replace(/^#\s+/, "")}</h3>`;
          return `<p>${line}</p>`;
        })
        .join("");
    }
    return summary;
  }

  recordHistory(entry) {
    const items = readHistory().filter((it) => it.input !== entry.input);
    items.unshift(entry);
    writeHistory(items);
    this.renderHistoryOptions();
  }

  renderHistoryOptions() {
    if (!this.historySelect) return;
    const items = readHistory();
    this.historySelect.innerHTML = "";
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = items.length === 0 ? t.historyEmpty : t.historyLabel;
    this.historySelect.appendChild(placeholder);
    items.forEach((item, index) => {
      const option = document.createElement("option");
      option.value = String(index);
      option.textContent = t.historyOption(index + 1, item.summary);
      this.historySelect.appendChild(option);
    });
    if (this.historyEmpty) {
      this.historyEmpty.style.display = items.length === 0 ? "block" : "none";
    }
    if (this.clearHistoryButton) {
      this.clearHistoryButton.style.display = items.length === 0 ? "none" : "inline-block";
      this.clearHistoryButton.textContent = t.clearHistory;
    }
  }

  destroy() {
    this.destroyed = true;
    clearTimeout(this.debounceTimer);
    this.replaceSummarizer(null);
  }
}

if (typeof window !== "undefined") {
  document.addEventListener("DOMContentLoaded", () => {
    new TextSummarizer();
  });
}

export { TextSummarizer, t, hashKey, CACHE_PREFIX, HISTORY_KEY, CACHE_TTL_MS, HISTORY_LIMIT };