(function () {
  const SAVE_KEY = "sysrush_lpic_save_v2";
  const LEGACY_KEY = "sysrush_lpic_save_v1";
  const C = window.CURRICULUM;
  const DOJO = window.DOJO_ENGINE || { CONCEPT_CARDS: [], INCIDENT_CASES: [], ARENAS_META: [], generateArenaQuestion: () => null };
  const CFG = window.SYSRUSH_CONFIG || {};
  const IS_ANDROID = Boolean(window.AndroidBridge);
  const DEVICE_NAME = IS_ANDROID ? "📱 Телефон" : "💻 Ноутбук";
  const ORIGIN_ID = (() => {
    try {
      let id = localStorage.getItem("sysrush_origin_id");
      if (!id) {
        id = (IS_ANDROID ? "mob_" : "pc_") + Math.random().toString(36).slice(2, 10);
        localStorage.setItem("sysrush_origin_id", id);
      }
      return id;
    } catch (e) {
      return IS_ANDROID ? "mob_volatile" : "pc_volatile";
    }
  })();

  // Exact v1 -> v2 ID remapping so upgrading from v1 NEVER loses solved tasks or unlocked levels
  const V1_TASK_MAP = {
    t0_1: "t0_1", t0_2: "t0_2", t0_3: "t0_3",
    t1_1: "t1_1", t1_2: "t2_1", t1_3: "t2_3",
    t2_1: "t3_1", t2_2: "t3_2", t2_3: "t3_3",
    t3_1: "t4_1", t3_2: "t4_2", t3_3: "t4_3",
    t4_1: "t6_1", t4_2: "t6_2", t4_3: "t6_3",
    t5_1: "t12_1", t5_2: "t12_2", t5_3: "t12_3",
    t6_1: "t13_1", t6_2: "t13_2", t6_3: "t13_3",
    t7_1: "t14_1", t7_2: "t15_2", t7_3: "t14_3"
  };
  const V1_LEVEL_MAP = {
    0: [0], 1: [1, 2], 2: [3], 3: [4], 4: [5, 6], 5: [12], 6: [13], 7: [14, 15]
  };
  // Lossless v3 (16 levels: 0..15) -> v4 (24 levels: 0..23) remapping
  const V3_TO_V4_LEVEL_MAP = {
    0: 0, 1: 1, 2: 2, 3: 4,
    4: 6, 5: 9, 6: 11, 7: 7,
    8: 12, 9: 13, 10: 15, 11: 16,
    12: 18, 13: 19, 14: 20, 15: 22
  };

  const todayIso = () => new Date().toISOString().slice(0, 10);

  const defaultState = () => ({
    resetEpoch: 0,
    updatedAt: 0,
    lastDevice: DEVICE_NAME,
    matter: 30,
    matterBase: 30,
    matterFloor: 30,
    vocabBonusMatter: 0,
    examBonusMatter: 0,
    reviewBonusMatter: 0,
    dojoBonusMatter: 0,
    srsDeck: {},
    dojoStats: {},
    unlockedLevels: [0],
    freeAccessMode: false,
    currentQuestId: "q_hw",
    currentLevel: 0,
    solvedTasks: [],
    vocabStreak: 0,
    vocabCorrectTotal: 0,
    vocabMode: "en2ru", // "en2ru" | "ru2en"
    tasksFilter: "all",
    taskSearch: "",
    vocabSearch: "",
    examHubTab: "sim", // "sim" | "calc" | "cheat"
    cidrPrefix: 24,
    bestExamScore: 0,
    unlockedAch: [],
    streakDays: 1,
    lastActiveDate: todayIso(),
    v1MigratedV3: false,
    v4Migrated: false,
    crdtMatterCalibrated: false,
    restoreBannerClosed: false,
    aiEngine: "gemini",
    customLanUrl: "",
    customSyncChannel: "",
    customApiKey: ""
  });

  function computeTaskAndLevelMatter(st) {
    let earned = 0;
    const taskRewardById = {};
    C.levels.forEach(lvl => {
      lvl.tasks.forEach(t => { taskRewardById[t.id] = t.matter || 0; });
    });
    (st.solvedTasks || []).forEach(tid => {
      earned += taskRewardById[tid] || 0;
    });
    let spent = 0;
    const costByLvl = {};
    C.levels.forEach(lvl => { costByLvl[lvl.level] = lvl.cost || 0; });
    (st.unlockedLevels || []).forEach(lNum => {
      if (lNum > 0) spent += costByLvl[lNum] || 0;
    });
    return { earned, spent };
  }

  function recalcMatter(st) {
    const { earned, spent } = computeTaskAndLevelMatter(st);
    const bonusSum = (st.vocabBonusMatter || 0) + (st.examBonusMatter || 0) + (st.reviewBonusMatter || 0) + (st.dojoBonusMatter || 0);
    const rawCalc = (st.matterBase || 30) + earned + bonusSum - spent;
    if (!st.crdtMatterCalibrated) {
      if ((st.matter || 30) > rawCalc) {
        st.matterBase = (st.matterBase || 30) + ((st.matter || 30) - rawCalc);
      }
      st.crdtMatterCalibrated = true;
    }
    const finalCalc = (st.matterBase || 30) + earned + bonusSum - spent;
    st.matter = Math.max(0, finalCalc);
    return st.matter;
  }

  function mergeSrsTuple(locVal, incVal) {
    const okL = Array.isArray(locVal) && locVal.length >= 7;
    const okI = Array.isArray(incVal) && incVal.length >= 7;
    if (!okL) return okI ? [...incVal] : [0, 0, 0, 0, 0, 0, 0];
    if (!okI) return [...locVal];
    const newer = Number(incVal[5] || 0) >= Number(locVal[5] || 0) ? incVal : locVal;
    return [
      Number(newer[0] || 0),
      Number(newer[1] || 0),
      Math.max(Number(locVal[2] || 0), Number(incVal[2] || 0)),
      Math.max(Number(locVal[3] || 0), Number(incVal[3] || 0)),
      Math.max(Number(locVal[4] || 0), Number(incVal[4] || 0)),
      Math.max(Number(locVal[5] || 0), Number(incVal[5] || 0)),
      Number(newer[6] || 0)
    ];
  }

  function mergeCrdtStates(localS, incomingS) {
    if (!incomingS || typeof incomingS !== "object") return localS;
    const locEp = Number(localS.resetEpoch || 0);
    const incEp = Number(incomingS.resetEpoch || 0);
    if (incEp > locEp) {
      const fresh = Object.assign(defaultState(), incomingS);
      fresh.resetEpoch = incEp;
      fresh.crdtMatterCalibrated = true;
      recalcMatter(fresh);
      return fresh;
    }
    if (incEp < locEp) return localS;

    const merged = Object.assign({}, localS);
    merged.resetEpoch = locEp;
    merged.unlockedLevels = Array.from(new Set([0, ...(localS.unlockedLevels || []), ...(incomingS.unlockedLevels || [])])).sort((a, b) => a - b);
    merged.solvedTasks = Array.from(new Set([...(localS.solvedTasks || []), ...(incomingS.solvedTasks || [])])).sort();
    merged.unlockedAch = Array.from(new Set([...(localS.unlockedAch || []), ...(incomingS.unlockedAch || [])])).sort();

    merged.vocabCorrectTotal = Math.max(Number(localS.vocabCorrectTotal || 0), Number(incomingS.vocabCorrectTotal || 0));
    merged.bestExamScore = Math.max(Number(localS.bestExamScore || 0), Number(incomingS.bestExamScore || 0));
    merged.streakDays = Math.max(Number(localS.streakDays || 1), Number(incomingS.streakDays || 1));
    merged.matterBase = Math.max(Number(localS.matterBase || 30), Number(incomingS.matterBase || 30));
    merged.matterFloor = Math.max(Number(localS.matterFloor || 30), Number(incomingS.matterFloor || 30));
    merged.vocabBonusMatter = Math.max(Number(localS.vocabBonusMatter || 0), Number(incomingS.vocabBonusMatter || 0));
    merged.examBonusMatter = Math.max(Number(localS.examBonusMatter || 0), Number(incomingS.examBonusMatter || 0));
    merged.reviewBonusMatter = Math.max(Number(localS.reviewBonusMatter || 0), Number(incomingS.reviewBonusMatter || 0));
    merged.dojoBonusMatter = Math.max(Number(localS.dojoBonusMatter || 0), Number(incomingS.dojoBonusMatter || 0));

    // Merge SRS deck & Dojo stats
    const locSrs = (localS.srsDeck && typeof localS.srsDeck === "object") ? localS.srsDeck : {};
    const incSrs = (incomingS.srsDeck && typeof incomingS.srsDeck === "object") ? incomingS.srsDeck : {};
    const mergedSrs = {};
    new Set([...Object.keys(locSrs), ...Object.keys(incSrs)]).forEach(k => {
      mergedSrs[k] = mergeSrsTuple(locSrs[k], incSrs[k]);
    });
    merged.srsDeck = mergedSrs;

    const locDojo = (localS.dojoStats && typeof localS.dojoStats === "object") ? localS.dojoStats : {};
    const incDojo = (incomingS.dojoStats && typeof incomingS.dojoStats === "object") ? incomingS.dojoStats : {};
    const mergedDojo = {};
    new Set([...Object.keys(locDojo), ...Object.keys(incDojo)]).forEach(k => {
      const ld = locDojo[k] || {};
      const id = incDojo[k] || {};
      mergedDojo[k] = {
        solved: Math.max(Number(ld.solved || 0), Number(id.solved || 0)),
        correct: Math.max(Number(ld.correct || 0), Number(id.correct || 0)),
        bestStreak: Math.max(Number(ld.bestStreak || 0), Number(id.bestStreak || 0))
      };
    });
    merged.dojoStats = mergedDojo;

    const locTs = Number(localS.updatedAt || 0);
    const incTs = Number(incomingS.updatedAt || 0);
    const newer = incTs >= locTs ? incomingS : localS;
    ["currentQuestId", "currentLevel", "freeAccessMode", "lastActiveDate", "lastDevice"].forEach(f => {
      if (newer[f] !== undefined) merged[f] = newer[f];
    });
    if (merged.solvedTasks.length > 0) merged.restoreBannerClosed = true;
    merged.updatedAt = Math.max(locTs, incTs);
    merged.v4Migrated = Boolean(localS.v4Migrated || incomingS.v4Migrated);
    merged.crdtMatterCalibrated = true;
    recalcMatter(merged);
    return merged;
  }

  function stateFingerprint(s) {
    return JSON.stringify({
      ep: s.resetEpoch || 0,
      u: [...(s.unlockedLevels || [])].sort((a, b) => a - b),
      s: [...(s.solvedTasks || [])].sort(),
      mb: s.matterBase || 30,
      vb: s.vocabBonusMatter || 0,
      eb: s.examBonusMatter || 0,
      rb: s.reviewBonusMatter || 0,
      db: s.dojoBonusMatter || 0,
      srs: Object.keys(s.srsDeck || {}).length,
      dj: s.dojoStats || {},
      m: s.matter || 30,
      f: Boolean(s.freeAccessMode),
      c: s.currentLevel || 0,
      q: s.currentQuestId || "q_hw",
      v: s.vocabCorrectTotal || 0,
      e: s.bestExamScore || 0
    });
  }

  function recoverLegacyV1(st) {
    if (st.v1MigratedV3) return st;
    try {
      const oldRaw = localStorage.getItem(LEGACY_KEY);
      if (oldRaw) {
        const old = JSON.parse(oldRaw);
        const mappedTasks = (old.solvedTasks || []).map(id => V1_TASK_MAP[id] || id).filter(Boolean);
        const mappedLvls = [0];
        (old.unlockedLevels || []).forEach(l => {
          (V1_LEVEL_MAP[l] || [l]).forEach(nl => mappedLvls.push(nl));
        });
        st.solvedTasks = Array.from(new Set([...(st.solvedTasks || []), ...mappedTasks]));
        st.unlockedLevels = Array.from(new Set([...(st.unlockedLevels || []), ...mappedLvls])).sort((a, b) => a - b);
        if ((old.matter || 0) > (st.matter || 0)) st.matter = old.matter;
        if (st.currentLevel === 0 && old.currentLevel > 0) {
          const mappedCur = V1_LEVEL_MAP[old.currentLevel];
          if (mappedCur && mappedCur.length) st.currentLevel = mappedCur[0];
        }
        if (mappedTasks.length > 0 || mappedLvls.length > 1) {
          st.updatedAt = Date.now();
        }
      }
    } catch (e) {}
    st.v1MigratedV3 = true;
    return st;
  }

  function migrateV3ToV4(st) {
    if (!st || st.v4Migrated) return st;
    const hasProgress = (st.unlockedLevels || []).some(l => l > 0) || (st.solvedTasks || []).length > 0;
    if (hasProgress) {
      const matterBefore = Number(st.matter || 30);
      const mappedMax = Math.max(0, ...(st.unlockedLevels || [0]).map(l => (V3_TO_V4_LEVEL_MAP[l] !== undefined ? V3_TO_V4_LEVEL_MAP[l] : l)));
      const expandedLvls = [];
      for (let i = 0; i <= mappedMax; i++) expandedLvls.push(i);
      st.unlockedLevels = Array.from(new Set([0, ...(st.unlockedLevels || []), ...expandedLvls])).sort((a, b) => a - b);
      if (V3_TO_V4_LEVEL_MAP[st.currentLevel] !== undefined) {
        st.currentLevel = V3_TO_V4_LEVEL_MAP[st.currentLevel];
      }
      const curLvlObj = C.levels.find(l => l.level === st.currentLevel);
      if (curLvlObj) st.currentQuestId = curLvlObj.questId;
      recalcMatter(st);
      if (st.matter < matterBefore) {
        st.matterBase = (st.matterBase || 30) + (matterBefore - st.matter);
        recalcMatter(st);
      }
    }
    st.v4Migrated = true;
    return st;
  }

  function loadState() {
    let st = defaultState();
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) st = Object.assign(defaultState(), JSON.parse(raw));
    } catch (e) {}

    // Merge native Android file backup if present
    try {
      if (window.AndroidBridge && window.AndroidBridge.loadNativeState) {
        const natRaw = window.AndroidBridge.loadNativeState();
        if (natRaw && natRaw.startsWith("{")) {
          st = mergeCrdtStates(st, migrateV3ToV4(JSON.parse(natRaw)));
        }
      }
    } catch (e) {}

    st = recoverLegacyV1(st);
    st = migrateV3ToV4(st);
    recalcMatter(st);
    return st;
  }

  let state = loadState();
  let syncStatus = { mode: "init", text: "Подключение...", lastSyncTs: 0, lanBase: "" };
  let cloudPushTimer = null;
  let lastPushedFp = "";
  let aiChatHistory = [];
  let aiBusy = false;

  function persistStateLocally() {
    const json = JSON.stringify(state);
    try { localStorage.setItem(SAVE_KEY, json); } catch (e) {}
    try {
      if (window.AndroidBridge && window.AndroidBridge.saveNativeState) {
        window.AndroidBridge.saveNativeState(json);
      }
    } catch (e) {}
  }

  function saveState(opts) {
    const silentSync = opts && opts.fromRemote;
    if (!silentSync) {
      state.updatedAt = Date.now();
      state.lastDevice = DEVICE_NAME;
    }
    recalcMatter(state);
    persistStateLocally();
    if (!silentSync) {
      SyncEngine.pushChange();
    }
  }

  // Persist initial recovered v1/native state immediately
  persistStateLocally();
  updateDailyStreak();

  let currentView = "map";
  let activeTask = null;
  let labState = null;
  let lastValidation = null;
  let cmdHistoryIdx = -1;
  let vocabQuizWord = null;
  let currentXrayWord = "";
  let audioCtx = null;

  // Exam Simulator, Smart Review & Skill Dojo runtime state
  let examSession = null;
  let reviewSession = null;
  let dojoSession = null;

  // =========================================================================
  // REAL-TIME BIDIRECTIONAL SYNC ENGINE (LAN DAEMON + NTFY CLOUD HTTPS RELAY)
  // =========================================================================
  const SyncEngine = {
    lanEs: null,
    cloudEs: null,
    started: false,

    getCandidateLanUrls() {
      const list = [];
      const proto = (window.location && window.location.protocol) || "";
      const host = (window.location && window.location.hostname) || "";
      const isHttpsWeb = proto === "https:";
      const isMobBrowser = IS_ANDROID || /Android|iPhone|iPad|iPod|Mobile/i.test((navigator && navigator.userAgent) || "");

      if (proto === "http:" && host && !host.endsWith("github.io")) {
        list.push(window.location.origin);
      }
      if (isHttpsWeb) {
        // On HTTPS (GitHub Pages): mobile browsers should skip HTTP LAN completely and use instant HTTPS Cloud Sync;
        // desktop browsers can fast-probe loopback 127.0.0.1:8765 (allowed by W3C Secure Context + PNA header).
        if (!isMobBrowser) {
          list.push(CFG.localUrl || "http://127.0.0.1:8765");
        }
        return Array.from(new Set(list.filter(Boolean)));
      }
      if (!IS_ANDROID) list.push(CFG.localUrl || "http://127.0.0.1:8765");
      if (state.customLanUrl) list.push(state.customLanUrl.replace(/\/+$/, ""));
      try {
        const disc = localStorage.getItem("sysrush_discovered_lan");
        if (disc) list.push(disc);
      } catch (e) {}
      if (CFG.defaultLanUrl) list.push(CFG.defaultLanUrl);
      return Array.from(new Set(list.filter(Boolean)));
    },

    getChannel() {
      if (state.customSyncChannel) return state.customSyncChannel;
      if (CFG.syncChannel) return CFG.syncChannel;
      try {
        let autoCh = localStorage.getItem("sysrush_auto_channel");
        if (!autoCh) {
          autoCh = "sr_" + Math.random().toString(36).slice(2, 12) + Math.random().toString(36).slice(2, 12);
          localStorage.setItem("sysrush_auto_channel", autoCh);
        }
        return autoCh;
      } catch (e) {
        return "sr_local_fallback";
      }
    },

    getRelayBase() {
      return (CFG.cloudRelayBase || "https://ntfy.sh").replace(/\/+$/, "");
    },

    fetchWithTimeout(url, options, ms) {
      const ctrl = new AbortController();
      const tid = setTimeout(() => ctrl.abort(), ms || 2500);
      return fetch(url, Object.assign({}, options || {}, { signal: ctrl.signal }))
        .finally(() => clearTimeout(tid));
    },

    setStatus(mode, text) {
      syncStatus.mode = mode;
      syncStatus.text = text;
      const sbDot = document.getElementById("sbSyncDot");
      const sbTxt = document.getElementById("sbSyncText");
      const mobDot = document.getElementById("mobSyncDot");
      const mobLbl = document.getElementById("mobSyncLbl");
      const dotCls = mode === "lan" ? "online" : (mode === "cloud" ? "cloud" : (mode === "syncing" ? "syncing" : ""));
      if (sbDot) sbDot.className = "sync-dot " + dotCls;
      if (sbTxt) sbTxt.textContent = text;
      if (mobDot) mobDot.className = "sync-dot " + dotCls;
      if (mobLbl) mobLbl.textContent = mode === "lan" ? "LAN" : (mode === "cloud" ? "4G/Cloud" : "Офлайн");
    },

    applyRemoteState(remoteState, sourceLabel, discoveredLan) {
      if (discoveredLan && typeof discoveredLan === "string" && discoveredLan.startsWith("http")) {
        try { localStorage.setItem("sysrush_discovered_lan", discoveredLan); } catch (e) {}
      }
      if (!remoteState || typeof remoteState !== "object") return false;
      const beforeFp = stateFingerprint(state);
      const migratedRemote = migrateV3ToV4(Object.assign({}, remoteState));
      state = mergeCrdtStates(state, migratedRemote);
      const afterFp = stateFingerprint(state);
      syncStatus.lastSyncTs = Date.now();
      if (afterFp !== beforeFp) {
        saveState({ fromRemote: true });
        refreshVisibleUiAfterSync(sourceLabel);
        return true;
      }
      return false;
    },

    async probeAndSyncLan() {
      const candidates = this.getCandidateLanUrls();
      const isHttpsPage = (window.location && window.location.protocol) === "https:";
      for (const base of candidates) {
        try {
          const r = await this.fetchWithTimeout(`${base}/api/state`, { method: "GET" }, isHttpsPage ? 850 : 1600);
          if (!r.ok) continue;
          const data = await r.json();
          syncStatus.lanBase = base;
          if (data.lanUrl) {
            try { localStorage.setItem("sysrush_discovered_lan", data.lanUrl); } catch (e) {}
          }
          let pairedChanged = false;
          if (data.channel && !state.customSyncChannel) {
            state.customSyncChannel = data.channel;
            pairedChanged = true;
          }
          if (data.localPairKey && !state.customApiKey) {
            state.customApiKey = data.localPairKey;
            pairedChanged = true;
          }
          if (pairedChanged) persistStateLocally();

          const localBefore = stateFingerprint(state);
          this.applyRemoteState(data.state, "Ноутбук (LAN)", data.lanUrl);
          const remoteFp = data.state ? stateFingerprint(mergeCrdtStates(defaultState(), data.state)) : "";
          if (stateFingerprint(state) !== remoteFp || localBefore !== remoteFp) {
            await this.pushToLanNow();
          }
          this.connectLanSse(base);
          this.setStatus("lan", "Ноут ↔ Телефон (Онлайн)");

          // One-time file:// -> http://127.0.0.1:8765 handoff when launched via sysrush.sh
          if (window.location && window.location.protocol === "file:" && (window.location.search || "").includes("handoff=1") && base.includes("127.0.0.1")) {
            window.location.replace(base + (window.location.hash || ""));
          }
          return true;
        } catch (e) {}
      }
      syncStatus.lanBase = "";
      return false;
    },

    async pushToLanNow() {
      if (!syncStatus.lanBase) return false;
      try {
        const r = await this.fetchWithTimeout(`${syncStatus.lanBase}/api/state`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ state })
        }, 2500);
        if (r.ok) {
          const data = await r.json();
          lastPushedFp = stateFingerprint(state);
          syncStatus.lastSyncTs = Date.now();
          if (data && data.state) this.applyRemoteState(data.state, "LAN", data.lanUrl);
          this.setStatus("lan", "Ноут ↔ Телефон (Онлайн)");
          return true;
        }
      } catch (e) {
        syncStatus.lanBase = "";
      }
      return false;
    },

    connectLanSse(base) {
      if (this.lanEs) return;
      try {
        const es = new EventSource(`${base}/api/events`);
        this.lanEs = es;
        es.onmessage = ev => {
          try {
            const msg = JSON.parse(ev.data);
            if (msg && msg.state) this.applyRemoteState(msg.state, "Живая синхр.", msg.lanUrl);
          } catch (e) {}
        };
        es.onerror = () => {
          try { es.close(); } catch (e) {}
          this.lanEs = null;
          syncStatus.lanBase = "";
          if (this.cloudEs) this.setStatus("cloud", "Синхр. через Облако");
        };
      } catch (e) {}
    },

    async pullCloudHistory() {
      const url = `${this.getRelayBase()}/${this.getChannel()}/json?poll=1&since=all`;
      try {
        const r = await this.fetchWithTimeout(url, { method: "GET" }, 6000);
        if (!r.ok) return false;
        const text = await r.text();
        const lines = text.split("\n");
        let gotAny = false;
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const ev = JSON.parse(line);
            if (ev.event !== "message" || !ev.message || !ev.message.startsWith("{")) continue;
            const env = JSON.parse(ev.message);
            if (env.type === "sysrush_sync_v3" && env.state) {
              gotAny = true;
              lastPushedFp = stateFingerprint(env.state);
              this.applyRemoteState(env.state, "Облако", env.lanUrl);
            }
          } catch (e) {}
        }
        if (!syncStatus.lanBase) {
          this.setStatus("cloud", "Облако 4G (Онлайн)");
        }
        // If local device has newer unpushed progress than cloud, push it
        if (!syncStatus.lanBase && stateFingerprint(state) !== lastPushedFp && (state.solvedTasks.length > 0 || state.unlockedLevels.length > 1)) {
          this.scheduleCloudPush();
        }
        return gotAny;
      } catch (e) {
        if (!syncStatus.lanBase) this.setStatus("offline", "Офлайн (сохранено локально)");
        return false;
      }
    },

    connectCloudSse() {
      if (this.cloudEs) return;
      try {
        const es = new EventSource(`${this.getRelayBase()}/${this.getChannel()}/sse`);
        this.cloudEs = es;
        es.onopen = () => {
          if (!syncStatus.lanBase) this.setStatus("cloud", "Облако 4G (Онлайн)");
        };
        es.onmessage = ev => {
          try {
            const wrapper = JSON.parse(ev.data);
            const rawMsg = wrapper.message || ev.data;
            if (!rawMsg || !rawMsg.startsWith("{")) return;
            const env = JSON.parse(rawMsg);
            if (env.type === "sysrush_sync_v3" && env.state && env.origin !== ORIGIN_ID) {
              lastPushedFp = stateFingerprint(env.state);
              this.applyRemoteState(env.state, env.state.lastDevice || "Другое устройство", env.lanUrl);
              // If phone just saw laptop wake up on LAN, try connecting LAN for ultra-fast sync!
              if (!syncStatus.lanBase && env.lanUrl) {
                this.probeAndSyncLan();
              }
            }
          } catch (e) {}
        };
        es.onerror = () => {
          try { es.close(); } catch (e) {}
          this.cloudEs = null;
          setTimeout(() => this.connectCloudSse(), 7000);
        };
      } catch (e) {}
    },

    scheduleCloudPush() {
      clearTimeout(cloudPushTimer);
      cloudPushTimer = setTimeout(() => this.pushCloudNow(), 1800);
    },

    async pushCloudNow() {
      const fp = stateFingerprint(state);
      if (fp === lastPushedFp) return true;
      try {
        let cloudState = Object.assign({}, state);
        let bodyStr = JSON.stringify({ type: "sysrush_sync_v3", origin: ORIGIN_ID, state: cloudState });
        if (bodyStr.length > 3650 && cloudState.srsDeck) {
          const topEntries = Object.entries(cloudState.srsDeck)
            .sort((a, b) => ((b[1]?.[2] || 0) * 1000000 + (b[1]?.[5] || 0)) - ((a[1]?.[2] || 0) * 1000000 + (a[1]?.[5] || 0)))
            .slice(0, 45);
          cloudState.srsDeck = Object.fromEntries(topEntries);
          bodyStr = JSON.stringify({ type: "sysrush_sync_v3", origin: ORIGIN_ID, state: cloudState });
        }
        const r = await this.fetchWithTimeout(`${this.getRelayBase()}/${this.getChannel()}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Title": "SysRush Sync" },
          body: bodyStr
        }, 6500);
        if (r.ok) {
          lastPushedFp = fp;
          syncStatus.lastSyncTs = Date.now();
          if (!syncStatus.lanBase) this.setStatus("cloud", "Облако 4G (Онлайн)");
          return true;
        }
      } catch (e) {}
      return false;
    },

    async pushChange() {
      if (window.SYSRUSH_TEST_MODE) return;
      if (syncStatus.lanBase) {
        const ok = await this.pushToLanNow();
        if (ok) return;
      }
      const lanOk = await this.probeAndSyncLan();
      if (!lanOk) {
        this.scheduleCloudPush();
      }
    },

    async fullSyncNow(showToastMsg) {
      if (window.SYSRUSH_TEST_MODE) return;
      this.setStatus("syncing", "Синхронизация...");
      const lanOk = await this.probeAndSyncLan();
      if (lanOk && syncStatus.lanBase) {
        try {
          const r = await this.fetchWithTimeout(`${syncStatus.lanBase}/api/sync-now`, { method: "POST", body: "{}" }, 6000);
          if (r.ok) {
            const d = await r.json();
            if (d.state) this.applyRemoteState(d.state, "Облако + LAN", d.lanUrl);
          }
        } catch (e) {}
        this.setStatus("lan", "Ноут ↔ Телефон (Онлайн)");
      } else {
        await this.pullCloudHistory();
        await this.pushCloudNow();
      }
      if (showToastMsg) {
        toast("✅ Прогресс синхронизирован между Ноутбуком и Телефоном!");
      }
    },

    async start() {
      if (window.SYSRUSH_TEST_MODE || this.started) return;
      this.started = true;
      this.setStatus("syncing", "Подключение...");
      const lanOk = await this.probeAndSyncLan();
      await this.pullCloudHistory();
      if (lanOk) await this.pushToLanNow();
      this.connectCloudSse();

      if (document.addEventListener) {
        document.addEventListener("visibilitychange", () => {
          if (!document.hidden) this.fullSyncNow(false);
        });
      }
      if (window.addEventListener) {
        window.addEventListener("online", () => this.fullSyncNow(false));
      }
      setInterval(() => {
        if (!syncStatus.lanBase) this.probeAndSyncLan();
      }, 25000);
    }
  };

  function refreshVisibleUiAfterSync(sourceLabel) {
    updateGlobalBars();
    if (currentView === "map") renderMap();
    else if (currentView === "roadmap") renderRoadmapView();
    else if (currentView === "lecture") renderLecture(state.currentLevel);
    else if (currentView === "tasks") renderTasksList();
    else if (currentView === "vocab") renderVocabView();
    else if (currentView === "review" && !reviewSession) renderReviewView();
    else if (currentView === "dojo" && !dojoSession) renderDojoView();
    else if (currentView === "exam" && !examSession) renderExamHub();
    else if (currentView === "ide" && activeTask) renderIde();
    if (sourceLabel) {
      toast(`🔄 Синхронизировано (${sourceLabel})`);
    }
  }

  function updateDailyStreak() {
    const today = todayIso();
    if (state.lastActiveDate !== today) {
      const prev = new Date(state.lastActiveDate + "T00:00:00");
      const cur = new Date(today + "T00:00:00");
      const diffDays = Math.round((cur - prev) / 86400000);
      if (diffDays === 1) {
        state.streakDays = (state.streakDays || 1) + 1;
      } else if (diffDays > 1) {
        state.streakDays = 1;
      }
      state.lastActiveDate = today;
      saveState();
    }
  }

  function isLevelOpen(lvlNum) {
    return Boolean(state.freeAccessMode) || state.unlockedLevels.includes(lvlNum);
  }

  function haptic(ms) {
    try {
      if (window.AndroidBridge && window.AndroidBridge.vibrate) {
        window.AndroidBridge.vibrate(ms);
      } else if (navigator.vibrate) {
        navigator.vibrate(ms);
      }
    } catch (e) {}
  }

  function speakEnglish(text) {
    const clean = String(text || "").replace(/[`()]/g, "").trim();
    if (!clean) return;
    haptic(10);
    try {
      if (window.AndroidBridge && window.AndroidBridge.speakEn) {
        window.AndroidBridge.speakEn(clean);
        return;
      }
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(clean);
        u.lang = "en-US";
        u.rate = 0.88;
        window.speechSynthesis.speak(u);
        return;
      }
    } catch (e) {}
    toast(`🔊 ${clean}`);
  }

  function copyTextCrossPlatform(text) {
    try {
      if (window.AndroidBridge && window.AndroidBridge.copyToClipboard) {
        window.AndroidBridge.copyToClipboard(text);
        return true;
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text);
        return true;
      }
    } catch (e) {}
    return false;
  }

  function sfx(type) {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!audioCtx) audioCtx = new AC();
      if (audioCtx.state === "suspended") audioCtx.resume();
      const osc = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      osc.connect(g);
      g.connect(audioCtx.destination);

      if (type === "ok") {
        osc.type = "triangle";
        osc.frequency.setValueAtTime(523, audioCtx.currentTime);
        osc.frequency.setValueAtTime(784, audioCtx.currentTime + 0.08);
        g.gain.setValueAtTime(0.06, audioCtx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.22);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.22);
      } else if (type === "fail") {
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(220, audioCtx.currentTime);
        g.gain.setValueAtTime(0.05, audioCtx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.16);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.16);
      } else {
        osc.type = "sine";
        osc.frequency.setValueAtTime(640, audioCtx.currentTime);
        g.gain.setValueAtTime(0.025, audioCtx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.045);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.045);
      }
    } catch (e) {}
  }

  function toast(msg) {
    const el = document.getElementById("toastEl");
    if (!el) return;
    el.textContent = msg;
    el.classList.remove("hidden");
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.add("hidden"), 2900);
  }

  function getAllTasks() {
    const out = [];
    C.levels.forEach(lvl => {
      lvl.tasks.forEach(t => out.push(Object.assign({}, t, { levelNum: lvl.level, questId: lvl.questId })));
    });
    return out;
  }

  function getUnlockedVocab() {
    const words = [];
    C.levels.forEach(lvl => {
      if (isLevelOpen(lvl.level)) {
        (lvl.vocab || []).forEach(v => words.push(Object.assign({}, v, { level: lvl.level })));
      }
    });
    return words;
  }

  function checkAndUnlockAchievements() {
    const allTasks = getAllTasks();
    const newlyUnlocked = [];
    const grant = id => {
      if (!state.unlockedAch.includes(id)) {
        state.unlockedAch.push(id);
        const meta = (C.achievements || []).find(a => a.id === id);
        if (meta) newlyUnlocked.push(meta);
      }
    };

    if (state.solvedTasks.length >= 1) grant("ach_first");

    const questAllSolved = qId => {
      const qt = allTasks.filter(t => t.questId === qId && getTaskDifficulty(t) !== "hard");
      return qt.length > 0 && qt.every(t => state.solvedTasks.includes(t.id));
    };
    if (questAllSolved("q_hw")) grant("ach_hw");
    if (questAllSolved("q_linux")) grant("ach_linux");
    if (questAllSolved("q_admin")) grant("ach_admin");
    if (questAllSolved("q_net")) grant("ach_net");
    if ((state.vocabCorrectTotal || 0) >= 25) grant("ach_vocab25");
    if ((state.bestExamScore || 0) >= 500) grant("ach_exam");

    if (newlyUnlocked.length > 0) {
      saveState();
      setTimeout(() => {
        toast(`🏆 Ачивка открыта: ${newlyUnlocked[0].icon} ${newlyUnlocked[0].title}!`);
      }, 600);
    }
  }

  function pluralRu(n, one, two, five) {
    const abs = Math.abs(Number(n) || 0) % 100;
    const last = abs % 10;
    if (abs > 10 && abs < 20) return five;
    if (last > 1 && last < 5) return two;
    if (last === 1) return one;
    return five;
  }

  const MATTER_ORB_SVG = `<svg class="jr-inline-orb" width="15" height="15" viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="10" cy="10" r="8.5" fill="#1D4ED8" stroke="#60A5FA" stroke-width="1.3"/><circle cx="7.5" cy="7.2" r="2.2" fill="#93C5FD" opacity="0.75"/><circle cx="7" cy="6.8" r="1" fill="#FFFFFF"/><circle cx="13" cy="12" r="0.9" fill="#BAE6FD"/></svg>`;

  function getCharAvatarSvg(charKey, size = 48) {
    const k = charKey || "batya";
    if (k === "kira") {
      return `<svg width="${size}" height="${size}" viewBox="0 0 80 80" fill="none" class="jr-illus-ava">
        <circle cx="40" cy="40" r="39" fill="#1E2B3C" stroke="#2E435E" stroke-width="2"/>
        <path d="M16 74C19 58 28 52 40 52C52 52 61 58 64 74" fill="#1D4ED8"/>
        <path d="M29 52L40 64L51 52" fill="#0F172A"/>
        <path d="M23 35C23 22 30 15 40 15C50 15 57 22 57 35L55 46H25L23 35Z" fill="#0EA5E9"/>
        <rect x="27" y="25" width="26" height="24" rx="11" fill="#F1C6A7"/>
        <rect x="28" y="32" width="10" height="6" rx="2" fill="#0F172A" stroke="#38BDF8" stroke-width="1.5"/>
        <rect x="42" y="32" width="10" height="6" rx="2" fill="#0F172A" stroke="#38BDF8" stroke-width="1.5"/>
        <line x1="38" y1="35" x2="42" y2="35" stroke="#38BDF8" stroke-width="1.5"/>
        <path d="M36 43Q40 46 44 43" stroke="#7C2D12" stroke-width="2" stroke-linecap="round"/>
      </svg>`;
    }
    if (k === "diego") {
      return `<svg width="${size}" height="${size}" viewBox="0 0 80 80" fill="none" class="jr-illus-ava">
        <circle cx="40" cy="40" r="39" fill="#1F2937" stroke="#334155" stroke-width="2"/>
        <path d="M18 74C21 59 29 53 40 53C51 53 59 59 62 74" fill="#334155"/>
        <line x1="40" y1="12" x2="40" y2="20" stroke="#94A3B8" stroke-width="2.5"/>
        <circle cx="40" cy="11" r="3.5" fill="#FF6B1A"/>
        <rect x="24" y="20" width="32" height="28" rx="8" fill="#475569" stroke="#94A3B8" stroke-width="1.8"/>
        <rect x="28" y="27" width="24" height="9" rx="4" fill="#0F172A"/>
        <circle cx="34" cy="31.5" r="2.5" fill="#38BDF8"/>
        <circle cx="46" cy="31.5" r="2.5" fill="#38BDF8"/>
        <rect x="33" y="40" width="14" height="3" rx="1.5" fill="#94A3B8"/>
      </svg>`;
    }
    if (k === "smith") {
      return `<svg width="${size}" height="${size}" viewBox="0 0 80 80" fill="none" class="jr-illus-ava">
        <circle cx="40" cy="40" r="39" fill="#1B2330" stroke="#2D3A4F" stroke-width="2"/>
        <path d="M16 74C19 57 28 51 40 51C52 51 61 57 64 74" fill="#111827"/>
        <path d="M35 51L40 66L45 51Z" fill="#E5E7EB"/>
        <path d="M39 53L41 53L41.8 65L40 68L38.2 65Z" fill="#1E40AF"/>
        <rect x="27" y="21" width="26" height="27" rx="11" fill="#E8BFA0"/>
        <path d="M26 28C26 19 32 15 40 15C48 15 54 19 54 28C50 24 30 24 26 28Z" fill="#1F2937"/>
        <rect x="28" y="30" width="10.5" height="6.5" rx="1.5" fill="#090D16"/>
        <rect x="41.5" y="30" width="10.5" height="6.5" rx="1.5" fill="#090D16"/>
        <line x1="38.5" y1="32.5" x2="41.5" y2="32.5" stroke="#090D16" stroke-width="2"/>
        <line x1="36" y1="42" x2="44" y2="42" stroke="#6B4423" stroke-width="2" stroke-linecap="round"/>
      </svg>`;
    }
    // Default: Batya Torvalds (Illustrated Senior Engineer Mentor like JavaRush)
    return `<svg width="${size}" height="${size}" viewBox="0 0 80 80" fill="none" class="jr-illus-ava">
      <circle cx="40" cy="40" r="39" fill="#232C3B" stroke="#344258" stroke-width="2"/>
      <path d="M15 75C18 58 27 51 40 51C53 51 62 58 65 75" fill="#1E293B"/>
      <path d="M32 51L40 61L48 51" fill="#334155"/>
      <rect x="26" y="20" width="28" height="29" rx="12" fill="#ECC3A5"/>
      <path d="M25 29C25 18 31 14 40 14C49 14 55 18 55 29C51 23 29 23 25 29Z" fill="#3B2F2F"/>
      <path d="M27 38C27 46 33 50 40 50C47 50 53 46 53 38C50 42 46 43 40 43C34 43 30 42 27 38Z" fill="#4A3B39"/>
      <rect x="28.5" y="30" width="9.5" height="6.5" rx="2" stroke="#1E293B" stroke-width="1.8" fill="rgba(255,255,255,0.2)"/>
      <rect x="42" y="30" width="9.5" height="6.5" rx="2" stroke="#1E293B" stroke-width="1.8" fill="rgba(255,255,255,0.2)"/>
      <line x1="38" y1="33" x2="42" y2="33" stroke="#1E293B" stroke-width="1.8"/>
      <path d="M36.5 41.5Q40 43.5 43.5 41.5" stroke="#ECC3A5" stroke-width="1.8" stroke-linecap="round"/>
    </svg>`;
  }

  function getRankTitle(solvedCount, totalCount) {
    const total = Math.max(1, totalCount || 72);
    const ratio = solvedCount / total;
    if (ratio >= 0.88) return "LPIC-1 Мастер";
    if (ratio >= 0.65) return "Сетевой Архитектор";
    if (ratio >= 0.42) return "DevOps / Сисадмин";
    if (ratio >= 0.18) return "Linux-Инженер";
    if (solvedCount >= 4) return "Сборщик Серверов";
    return "Стажёр";
  }

  const DIFF_META = {
    easy: { label: "Лёгкая", short: "Easy", cls: "diff-easy" },
    medium: { label: "Средняя", short: "Medium", cls: "diff-medium" },
    hard: { label: "Сложная · 120%", short: "Hard 120%", cls: "diff-hard" }
  };

  function getTaskDifficulty(t) {
    const d = t && t.difficulty;
    if (d === "easy" || d === "medium" || d === "hard") return d;
    return "medium";
  }

  function renderDiffBadge(t) {
    const d = getTaskDifficulty(t);
    const m = DIFF_META[d] || DIFF_META.medium;
    return `<span class="jr-diff-pill ${m.cls}">${m.label}</span>`;
  }

  function getLevelBaseTasks(lvl) {
    const all = (lvl && lvl.tasks) || [];
    const base = all.filter(t => getTaskDifficulty(t) !== "hard");
    return base.length > 0 ? base : all;
  }

  function getLevelHardTasks(lvl) {
    return ((lvl && lvl.tasks) || []).filter(t => getTaskDifficulty(t) === "hard");
  }

  function isLevelBaseCompleted(lvl) {
    const base = getLevelBaseTasks(lvl);
    return base.length > 0 && base.every(t => state.solvedTasks.includes(t.id));
  }

  function isLevelBossSolved(lvl) {
    const hard = getLevelHardTasks(lvl);
    return hard.length > 0 && hard.every(t => state.solvedTasks.includes(t.id));
  }

  function isLevelMastered(lvl) {
    return isLevelBaseCompleted(lvl) && isLevelBossSolved(lvl);
  }

  function getCompletedUserLevel() {
    let completedLvls = 0;
    for (const l of C.levels) {
      if (isLevelBaseCompleted(l)) {
        completedLvls++;
      }
    }
    const byTasks = Math.floor(state.solvedTasks.length / 4);
    return Math.min(24, Math.max(1, Math.max(completedLvls, byTasks)));
  }

  function updateGlobalBars() {
    checkAndUnlockAchievements();
    const allTasks = getAllTasks();
    const userLvl = getCompletedUserLevel();
    const rankTitle = getRankTitle(state.solvedTasks.length, allTasks.length);
    const pct = Math.min(100, Math.max(6, Math.round((state.solvedTasks.length / Math.max(1, allTasks.length)) * 100)));

    const sbRankEl = document.getElementById("sbRank");
    if (sbRankEl) sbRankEl.textContent = `Ур. ${userLvl} • ${rankTitle}`;
    const topUserLvlEl = document.getElementById("topUserLvl");
    if (topUserLvlEl) topUserLvlEl.textContent = `${userLvl} уровень`;
    const mobRankEl = document.getElementById("mobRank");
    if (mobRankEl) mobRankEl.textContent = `${userLvl} ур. • ${rankTitle}`;
    const xpBarEl = document.getElementById("sbXpBar");
    if (xpBarEl) xpBarEl.style.width = `${pct}%`;

    document.getElementById("sbMatter").textContent = state.matter;
    document.getElementById("mobMatter").textContent = state.matter;
    const sbStreakEl = document.getElementById("sbStreak");
    if (sbStreakEl) sbStreakEl.textContent = state.streakDays || 1;
    const mobStreakEl = document.getElementById("mobStreakChip");
    if (mobStreakEl) mobStreakEl.textContent = `${state.streakDays || 1}д`;
    document.getElementById("sbSolved").textContent = state.solvedTasks.length;
    document.getElementById("sbTasksCount").textContent = `${state.solvedTasks.length}/${allTasks.length}`;
    document.getElementById("sbVocabCount").textContent = getUnlockedVocab().length;
    const revBadge = document.getElementById("sbReviewCount");
    if (revBadge) {
      const urg = getUrgentReviewCount();
      revBadge.textContent = urg;
      revBadge.style.display = urg > 0 ? "inline-block" : "none";
    }
  }

  // =========================================================================
  // VIEW 1: QUEST MAP RENDERER (Authentic JavaRush Style)
  // =========================================================================
  function renderMap() {
    const restoreSlot = document.getElementById("restoreBannerSlot");
    if (restoreSlot) {
      if (state.solvedTasks.length === 0 && !state.restoreBannerClosed) {
        const quickPills = [1, 3, 6, 9, 12, 15, 18, 21].map(n =>
          `<button class="restore-lvl-btn" onclick="App.restoreUpToLevel(${n})">До Уровня ${n}</button>`
        ).join("");
        restoreSlot.innerHTML = `
          <div class="restore-banner-card">
            <div class="restore-banner-top">
              <div>
                <div style="font-size:14px;font-weight:700;color:#FBBF24;">Проходил уровни раньше? Восстанови свой рубеж в 1 клик</div>
                <div style="font-size:12.5px;color:#94A3B8;margin-top:3px;">Выбери уровень — мы засчитаем предыдущие задачи, начислим материю и синхронизируем устройства:</div>
              </div>
              <button class="jr-icon-btn" onclick="App.dismissRestoreBanner()" title="Скрыть">✕</button>
            </div>
            <div class="restore-lvl-pills">${quickPills}</div>
          </div>
        `;
      } else {
        restoreSlot.innerHTML = "";
      }
    }

    const maxLvlIdx = Math.max(0, C.levels.length - 1);
    const highestLvlNum = Math.max(...state.unlockedLevels);
    const activeLvl = C.levels.find(l => l.level === state.currentLevel) || C.levels.find(l => l.level === highestLvlNum) || C.levels[0];
    const unsolvedBaseInLvl = getLevelBaseTasks(activeLvl).filter(t => !state.solvedTasks.includes(t.id));
    const unsolvedBossInLvl = getLevelHardTasks(activeLvl).filter(t => !state.solvedTasks.includes(t.id));

    let heroSubTxt = "Все задачи этого уровня (включая Босса 120%) закрыты — можно двигаться дальше!";
    if (unsolvedBaseInLvl.length > 0) {
      heroSubTxt = `Осталось базовых задач (Easy / Medium): ${unsolvedBaseInLvl.length} из ${getLevelBaseTasks(activeLvl).length}` +
        (unsolvedBossInLvl.length > 0 ? ` + Босс 120% (+${unsolvedBossInLvl[0].matter} материи)` : "");
    } else if (unsolvedBossInLvl.length > 0) {
      heroSubTxt = `База уровня закрыта! Доступен бонусный Босс 120% (+${unsolvedBossInLvl[0].matter} материи) — или переходи к следующей лекции.`;
    }

    const urgentCnt = getUrgentReviewCount();
    document.getElementById("continueBanner").innerHTML = `
      <div class="jr-course-banner-left">
        <div class="hero-kicker">ПРОДОЛЖИТЬ ОБУЧЕНИЕ • УРОВЕНЬ ${activeLvl.level} ИЗ ${maxLvlIdx}</div>
        <div class="hero-title">${activeLvl.title}</div>
        <div class="hero-sub">${heroSubTxt}</div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:16px;">
          <button class="jr-btn-primary-blue" onclick="App.openLecture(${activeLvl.level})">Продолжить лекцию ›</button>
          ${urgentCnt > 0
            ? `<button class="jr-outline-nav-btn" onclick="App.nav('review')">Умное повторение (${urgentCnt})</button>`
            : `<button class="jr-outline-nav-btn" onclick="App.nav('dojo')">Полигон скиллов</button>`}
        </div>
      </div>
      <div class="jr-course-banner-ava">
        ${getCharAvatarSvg("batya", 88)}
      </div>
    `;

    // Achievements Strip
    document.getElementById("achStrip").innerHTML = (C.achievements || []).map(a => {
      const done = state.unlockedAch.includes(a.id);
      return `
        <div class="ach-badge ${done ? "unlocked" : ""}">
          <span class="ach-ico">${a.icon}</span>
          <div>
            <div class="ach-title">${a.title}</div>
            <div class="ach-desc">${a.desc}</div>
          </div>
        </div>
      `;
    }).join("");

    // 4 Quest Tabs
    const allTasks = getAllTasks();
    document.getElementById("questTabs").innerHTML = C.quests.map(q => {
      const qTasks = allTasks.filter(t => t.questId === q.id);
      const qDone = qTasks.filter(t => state.solvedTasks.includes(t.id)).length;
      const qPct = Math.round((qDone / Math.max(1, qTasks.length)) * 100);
      return `
        <div class="quest-tab-card ${state.currentQuestId === q.id ? "active" : ""}" onclick="App.selectQuest('${q.id}')">
          <div class="qt-top">
            <span class="qt-quest-num">КВЕСТ ${q.num}</span>
            <span class="qt-lpic">${q.lpicBadge}</span>
          </div>
          <div class="qt-name">${q.title.replace(/^Квест \d+:\s*/i, "")}</div>
          <div class="qt-prog">Уровни ${q.levels[0]}–${q.levels[q.levels.length - 1]} • Решено <strong>${qDone} из ${qTasks.length}</strong> (${qPct}%)</div>
        </div>
      `;
    }).join("");

    const curQuest = C.quests.find(q => q.id === state.currentQuestId) || C.quests[0];
    document.getElementById("questHeaderCard").innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:4px;">
        <div style="font-size:16px;font-weight:700;color:var(--text-heading);">${curQuest.title}</div>
        <span class="qt-lpic">${curQuest.lpicBadge}</span>
      </div>
      <div style="font-size:13.5px;color:var(--text-secondary);line-height:1.5;">${curQuest.subtitle}</div>
    `;

    // Levels Trail
    const qLevels = C.levels.filter(l => l.questId === curQuest.id);
    document.getElementById("levelsTrail").innerHTML = qLevels.map(lvl => {
      const isUnlocked = isLevelOpen(lvl.level);
      const baseTasks = getLevelBaseTasks(lvl);
      const hardTasks = getLevelHardTasks(lvl);
      const baseSolvedCnt = baseTasks.filter(t => state.solvedTasks.includes(t.id)).length;
      const isCompleted = isLevelBaseCompleted(lvl);
      const isMaster = isLevelMastered(lvl);
      const bossDone = isLevelBossSolved(lvl);
      const stepsCnt = (lvl.blocks || []).filter(b => b.type === "step_head").length;

      const statusCls = isMaster ? "completed mastered" : isCompleted ? "completed" : isUnlocked ? "current" : "locked";
      const btnHtml = isUnlocked
        ? `<button class="${isCompleted ? "jr-outline-nav-btn" : "jr-btn-primary-blue"}" onclick="App.openLecture(${lvl.level})">${isCompleted ? (bossDone ? "Открыть" : "К Боссу 120% ›") : "Открыть лекцию ›"}</button>`
        : `<button class="jr-btn-primary-blue" onclick="App.unlockLevel(${lvl.level})">Открыть за ${MATTER_ORB_SVG} ×${lvl.cost} ›</button>`;

      return `
        <div class="level-node-card ${statusCls}">
          <div class="lvl-circle">
            <span class="lvl-num-lbl">УР.</span>
            <span class="lvl-num-val">${lvl.level}</span>
          </div>
          <div class="lvl-info">
            <div class="lvl-title-row">
              <span class="lvl-title">${lvl.title}</span>
              ${isMaster
                ? `<span class="jr-status-pill mastered">★ МАСТЕР 120%</span>`
                : isCompleted
                  ? `<span class="jr-status-pill done">ПРОЙДЕНА</span>`
                  : isUnlocked
                    ? `<span class="jr-status-pill open">ОТКРЫТА</span>`
                    : `<span class="jr-status-pill locked">ЗАКРЫТА</span>`}
            </div>
            <div class="lvl-desc">${lvl.shortDesc}</div>
            <div class="lvl-chips">
              <span class="lvl-chip">${stepsCnt > 0 ? `${stepsCnt} ${pluralRu(stepsCnt, "раздел", "раздела", "разделов")}` : "Лекция"}</span>
              <span class="lvl-chip ${isCompleted ? "done" : ""}">База (Easy/Med): ${baseSolvedCnt}/${baseTasks.length}</span>
              ${hardTasks.length > 0 ? `<span class="lvl-chip ${bossDone ? "boss-done" : "boss-chip"}">${bossDone ? "★ Босс 120%: взят" : `Босс 120%: +${hardTasks[0].matter}`}</span>` : ""}
              <span class="lvl-chip">Терминов: ${(lvl.vocab || []).length}</span>
            </div>
          </div>
          ${btnHtml}
        </div>
      `;
    }).join("");
  }

  // =========================================================================
  // VIEW 1B: INTERACTIVE ROADMAP.SH TREE RENDERER
  // =========================================================================
  function renderRoadmapView() {
    const box = document.getElementById("roadmapTreeBody");
    if (!box) return;

    const allTasks = getAllTasks();
    const doneNodes = C.levels.filter(lvl => isLevelBaseCompleted(lvl)).length;
    const masterNodes = C.levels.filter(lvl => isLevelMastered(lvl)).length;

    const summaryHtml = `
      <div class="jr-hero-banner" style="margin-bottom:20px;">
        <div>
          <div class="hero-kicker">ДЕРЕВО КОМПЕТЕНЦИЙ ROADMAP.SH/LINUX</div>
          <div class="hero-title">База закрыта: ${doneNodes} из ${C.levels.length} • Мастер 120%: ${masterNodes} • Задач: ${state.solvedTasks.length} из ${allTasks.length}</div>
          <div class="hero-sub">В каждом узле: разогрев Easy в начале, задачи Medium на подумать и бонусный Босс Hard (120% знаний) с двойной материей.</div>
        </div>
        <button class="jr-btn-primary-blue" onclick="App.openCurrentLecture()">К текущей лекции ›</button>
      </div>
    `;

    const stagesHtml = (C.roadmapStages || []).map(stage => {
      const nodesHtml = (stage.nodes || []).map(node => {
        const lvl = C.levels.find(l => l.level === node.level);
        const baseT = lvl ? getLevelBaseTasks(lvl).length : 4;
        const solvedBaseT = lvl ? getLevelBaseTasks(lvl).filter(t => state.solvedTasks.includes(t.id)).length : 0;
        const isDone = lvl ? isLevelBaseCompleted(lvl) : false;
        const isMaster = lvl ? isLevelMastered(lvl) : false;
        const isOpen = isLevelOpen(node.level);
        const cls = isDone ? "done" : (isOpen ? "open" : "locked");
        const statusBadge = isMaster
          ? `<span class="jr-status-pill mastered">★ 120%</span>`
          : isDone
            ? `<span class="jr-status-pill done">${solvedBaseT}/${baseT}</span>`
            : (isOpen
              ? `<span class="jr-status-pill open">${solvedBaseT}/${baseT}</span>`
              : `<span class="jr-status-pill locked">${MATTER_ORB_SVG} ×${lvl ? lvl.cost : 0}</span>`);

        return `
          <div class="rm-node ${cls}" onclick="App.openLecture(${node.level})">
            <div class="rm-node-top">
              <span class="rm-node-tag">${escapeHtml(node.tag)}</span>
              ${statusBadge}
            </div>
            <div class="rm-node-name">Уровень ${node.level} • ${escapeHtml(node.name)}</div>
            <div class="rm-node-topics">${escapeHtml(node.topics)}</div>
          </div>
        `;
      }).join("");

      return `
        <div class="rm-stage-card">
          <div class="rm-stage-head">
            <div class="rm-stage-title">${escapeHtml(stage.title)}</div>
            <span class="qt-lpic">${escapeHtml(stage.badge)}</span>
          </div>
          <div class="rm-nodes-grid">${nodesHtml}</div>
        </div>
      `;
    }).join("");

    box.innerHTML = summaryHtml + stagesHtml;
  }

  // =========================================================================
  // VIEW 2: AUTHENTIC JAVARUSH EDITORIAL LECTURE READER
  // =========================================================================
  function renderLecture(levelNum) {
    const lvl = C.levels.find(l => l.level === levelNum);
    if (!lvl) return;
    state.currentLevel = levelNum;
    state.currentQuestId = lvl.questId;
    saveState();

    const quest = C.quests.find(q => q.id === lvl.questId);

    const typeLabels = {
      terminal: "Лаборатория Linux CLI",
      builder: "Инженерный стенд",
      lpic_en: "Экзамен LPIC-1 • Тест",
      lpic_fill: "Экзамен LPIC-1 • Точный ввод"
    };

    const renderInlineTaskCard = (t, idx, stepLinked) => {
      const isSolved = state.solvedTasks.includes(t.id);
      const diff = getTaskDifficulty(t);
      const isHard = diff === "hard";
      const typeHdr = isHard
        ? `БОСС УРОВНЯ (120% ЗНАНИЙ) • ${typeLabels[t.type] || "Боевая задача"}`
        : `${typeLabels[t.type] || "Практическая задача"} • Задача ${idx + 1} из ${lvl.tasks.length}`;
      const rewardTxt = isSolved
        ? `<span style="color:#4ADE80;">✓ ${isHard ? "Босс повержен (★ Мастер 120%)" : "Задача решена"}</span>`
        : (isHard
          ? `Двойная награда (бонусная задача): ${MATTER_ORB_SVG} <strong>+${t.matter}</strong> • Знак «★ МАСТЕР 120%»`
          : `Награда за решение: ${MATTER_ORB_SVG} <strong>+${t.matter}</strong>`);
      const btnCls = isSolved
        ? "jr-outline-nav-btn"
        : (isHard ? "jr-btn-cta orange" : "jr-btn-primary-blue");
      const btnLbl = isSolved
        ? "Открыть решение ›"
        : (isHard ? "Принять вызов Босса ›" : "Решить задачу ›");

      return `
        <div class="jr-inline-task ${stepLinked ? "step-linked" : ""} ${isHard ? "hard-boss" : ""} ${isSolved ? "solved" : ""}" id="lec_task_${t.id}">
          <div class="jr-it-left">
            <div class="it-type-row">
              ${renderDiffBadge(t)}
              <span class="it-type">${typeHdr}</span>
            </div>
            <div class="it-title">${t.title}</div>
            <div class="it-reward">${rewardTxt}</div>
          </div>
          <button class="${btnCls}" onclick="App.openTask('${t.id}')">${btnLbl}</button>
        </div>
      `;
    };

    const stepHeads = [];
    let currentStepObj = null;
    let leadChar = "batya";
    let foundFirstDialog = false;
    (lvl.blocks || []).forEach(b => {
      if (b.type === "dialog" && !foundFirstDialog && b.char) {
        leadChar = b.char;
        foundFirstDialog = true;
      }
      if (b.type === "step_head") {
        currentStepObj = { step: b.step, title: b.title, roadmap: b.roadmap, taskIds: [] };
        stepHeads.push(currentStepObj);
      } else if (b.type === "task_ref" && currentStepObj) {
        currentStepObj.taskIds.push(b.taskId);
      }
    });

    const formatJrEditorialDialog = (charKey, rawText) => {
      const cues = {
        batya: "говорит Батя Торвальдс",
        diego: "спрашивает Диего",
        kira: "включается Кира",
        smith: "отмечает экзаменатор Смит"
      };
      const cue = cues[charKey] || cues.batya;
      const withCode = String(rawText || "").replace(/`([^`]+)`/g, "<code>$1</code>");
      const paras = withCode
        .split(/<br\s*\/?>\s*<br\s*\/?>/i)
        .map(p => p.trim())
        .filter(Boolean);
      if (paras.length === 0) return "";

      const p0 = paras[0].replace(/^—\s*/, "").trim();
      const plainLen = p0.replace(/<[^>]+>/g, "").length;
      let firstParaHtml = "";

      if (plainLen <= 215) {
        firstParaHtml = `<p class="jr-story-p"><span class="jr-speech-blue">— ${p0}</span> — ${cue}.</p>`;
      } else {
        // Find first sentence end outside any HTML tag
        let depth = 0;
        let cutIdx = -1;
        for (let i = 0; i < p0.length - 2; i++) {
          const ch = p0[i];
          if (ch === "<") {
            if (p0[i + 1] === "/") depth = Math.max(0, depth - 1);
            else if (p0.slice(i, i + 5).toLowerCase() !== "<br/>" && p0.slice(i, i + 4).toLowerCase() !== "<br>") depth++;
            const closePos = p0.indexOf(">", i);
            if (closePos > i) i = closePos;
            continue;
          }
          if (depth === 0 && i >= 14 && i <= 185 && (ch === "!" || ch === "?" || ch === ".") && /\s/.test(p0[i + 1])) {
            cutIdx = i;
            break;
          }
        }
        if (cutIdx > 0) {
          let s1 = p0.slice(0, cutIdx + 1).trim();
          const s2 = p0.slice(cutIdx + 1).trim();
          if (s1.endsWith(".")) s1 = s1.slice(0, -1) + ",";
          firstParaHtml = `<p class="jr-story-p"><span class="jr-speech-blue">— ${s1}</span> — ${cue}. <span class="jr-speech-blue">— ${s2}</span></p>`;
        } else {
          firstParaHtml = `<p class="jr-story-p"><span class="jr-speech-blue">— ${p0}</span> — ${cue}.</p>`;
        }
      }

      const restHtml = paras.slice(1).map(p => `<p class="jr-story-p">${p}</p>`).join("");
      return `<div class="jr-story-dialog">${firstParaHtml}${restHtml}</div>`;
    };

    const renderedTaskIds = new Set();

    const blocksHtml = (lvl.blocks || []).map(b => {
      if (b.type === "step_head") {
        const cleanHeading = String(b.title || "").replace(/^Шаг\s*(\d+)[:.]?\s*/i, "$1. ");
        const finalHeading = /^\d+\./.test(cleanHeading) ? cleanHeading : `${b.step}. ${cleanHeading}`;
        return `
          <div class="jr-editorial-h2-wrap" id="lec_step_${b.step}">
            <h2 class="jr-editorial-h2">${escapeHtml(finalHeading)}</h2>
          </div>
        `;
      }
      if (b.type === "cmd_anatomy") {
        const notesHtml = (b.notes || []).map(n =>
          `<div class="cmd-ana-note">${String(n).replace(/`([^`]+)`/g, "<code>$1</code>")}</div>`
        ).join("");
        return `
          <div class="cmd-anatomy-box">
            <div class="cmd-ana-top">
              <span class="cmd-ana-badge">$ ${escapeHtml(b.cmd || "")}</span>
              <span class="cmd-ana-desc">${escapeHtml(b.desc || "Разбор команды в терминале")}</span>
            </div>
            <pre class="cmd-ana-out">${escapeHtml(b.output || "")}</pre>
            ${notesHtml ? `<div class="cmd-ana-notes">${notesHtml}</div>` : ""}
          </div>
        `;
      }
      if (b.type === "task_ref") {
        const idx = lvl.tasks.findIndex(x => x.id === b.taskId);
        if (idx >= 0) {
          renderedTaskIds.add(lvl.tasks[idx].id);
          return renderInlineTaskCard(lvl.tasks[idx], idx, true);
        }
        return "";
      }
      if (b.type === "dialog") {
        return formatJrEditorialDialog(b.char || "batya", b.text);
      }
      if (b.type === "diagram") {
        return `<div class="lec-diagram">${escapeHtml(b.text || b.ascii || "")}</div>`;
      }
      if (b.type === "theory") {
        const cleanHtml = String(b.html || "").replace(/`([^`<]+)`/g, "<code>$1</code>");
        return `<div class="lec-theory-block">${cleanHtml}</div>`;
      }
      if (b.type === "vocab") {
        const cards = (lvl.vocab || []).map(v => `
          <div class="vocab-mini-card">
            <div class="xray-top-row">
              <div class="vm-en">${v.en} <span class="vm-pron">${v.pron}</span></div>
              <button class="speak-btn mini" onclick="App.speak('${escapeAttr(v.en)}')" title="Прослушать">🔊</button>
            </div>
            <div class="vm-ru">${v.ru}</div>
            <div class="vm-assoc">${v.assoc}</div>
          </div>
        `).join("");
        return `
          <div class="lec-vocab-box">
            <div class="lec-vocab-head">Английские термины LPIC-1 к лекции (${(lvl.vocab || []).length})</div>
            <div class="lec-vocab-sub">Нажми 🔊, чтобы прослушать произношение терминов из экзаменационных билетов:</div>
            <div class="lec-vocab-grid">${cards}</div>
          </div>
        `;
      }
      return "";
    }).join("");

    const remainingTasks = lvl.tasks
      .map((t, idx) => ({ t, idx }))
      .filter(item => !renderedTaskIds.has(item.t.id));

    const remainingTasksHtml = remainingTasks.length > 0 ? `
      <h2 class="jr-editorial-h2" style="margin-top:36px;">Дополнительные задачи к уровню</h2>
      ${remainingTasks.map(item => renderInlineTaskCard(item.t, item.idx, false)).join("")}
    ` : "";

    const baseLvlDone = isLevelBaseCompleted(lvl);
    const masterLvlDone = isLevelMastered(lvl);
    const baseTasks = getLevelBaseTasks(lvl);
    const baseSolvedCount = baseTasks.filter(t => state.solvedTasks.includes(t.id)).length;
    const bossTasks = getLevelHardTasks(lvl);
    const bossDone = isLevelBossSolved(lvl);

    const prevLvl = levelNum > 0 ? C.levels.find(l => l.level === levelNum - 1) : null;
    const nextLvl = C.levels.find(l => l.level === levelNum + 1);

    let rightFooterBtn = "";
    if (nextLvl) {
      const nextUnlocked = isLevelOpen(nextLvl.level);
      if (nextUnlocked) {
        rightFooterBtn = `<button class="jr-btn-primary-blue lg" onclick="App.openLecture(${nextLvl.level})">Следующая лекция (Уровень ${nextLvl.level}) ›</button>`;
      } else {
        rightFooterBtn = `<button class="jr-btn-primary-blue lg" onclick="App.unlockLevel(${nextLvl.level})">Открыть следующую лекцию за ${MATTER_ORB_SVG} ×${nextLvl.cost} ›</button>`;
      }
    } else {
      rightFooterBtn = `<button class="jr-btn-primary-blue lg" onclick="App.nav('exam')">Перейти к пробному экзамену LPIC-1 ›</button>`;
    }

    document.getElementById("lectureContent").innerHTML = `
      <div class="jr-subnav-strip">
        <button class="jr-subnav-link" onclick="App.nav('map')">Мое обучение</button>
        <button class="jr-subnav-link" onclick="App.nav('map')">Курсы</button>
        <button class="jr-subnav-link" onclick="App.nav('roadmap')">Карта навыков</button>
        <button class="jr-subnav-link active">Лекции</button>
        <button class="jr-subnav-link" onclick="App.nav('tasks')">Задачи</button>
        <button class="jr-subnav-link" onclick="App.openAiDrawer()">AI Помощник</button>
      </div>

      <div class="jr-breadcrumbs">
        <a onclick="App.nav('map')">SysRush</a>
        <span class="bc-sep">/</span>
        <a onclick="App.nav('map')">${escapeHtml(quest ? quest.title : "Курс Linux")}</a>
        <span class="bc-sep">/</span>
        <span class="bc-cur">${escapeHtml(lvl.title)}</span>
      </div>

      <div class="jr-lec-hero">
        <div class="jr-lec-hero-portrait">
          ${getCharAvatarSvg(leadChar, 76)}
        </div>
        <div class="jr-lec-hero-meta">
          <h1 class="lec-h1">${escapeHtml(lvl.title)}</h1>
          <div class="jr-lec-meta-line">${escapeHtml(quest ? quest.title : "Linux LPIC-1")}</div>
          <div class="jr-lec-meta-line">${lvl.level} уровень, ${stepHeads.length || 1} ${pluralRu(stepHeads.length || 1, "раздел", "раздела", "разделов")} • База (Easy/Med): ${baseSolvedCount} из ${baseTasks.length}${bossTasks.length ? ` • Босс 120%: ${bossDone ? "взят ★" : "доступен"}` : ""}</div>
          <div style="margin-top:8px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            ${masterLvlDone
              ? `<span class="jr-status-pill mastered">★ МАСТЕР 120%</span>`
              : `<span class="jr-status-pill ${baseLvlDone ? "done" : "open"}">${baseLvlDone ? "ПРОЙДЕНА" : "ОТКРЫТА"}</span>`}
          </div>
        </div>
      </div>

      <article class="jr-editorial-article">
        ${blocksHtml}
        ${remainingTasksHtml}
      </article>

      <div class="jr-lec-bottom-nav" id="lec_next_level">
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          <button class="jr-outline-nav-btn lg" onclick="App.nav('map')">‹ Список квестов</button>
          ${prevLvl ? `<button class="jr-outline-nav-btn lg" onclick="App.openLecture(${prevLvl.level})">‹ Уровень ${prevLvl.level}</button>` : ""}
        </div>
        ${rightFooterBtn}
      </div>
    `;
  }

  // =========================================================================
  // VIEW 3: ALL TASKS LIST (+SEARCH & FILTERS)
  // =========================================================================
  function renderTasksList() {
    const filters = [
      { id: "all", lbl: "Все открытые" },
      { id: "todo", lbl: "Нерешённые" },
      { id: "easy", lbl: "Лёгкие (Easy)" },
      { id: "medium", lbl: "Средние (Medium)" },
      { id: "hard", lbl: "Сложные (Hard · 120%)" },
      { id: "terminal", lbl: "Терминал CLI" },
      { id: "builder", lbl: "Стенды" },
      { id: "lpic", lbl: "LPIC Тест / Ввод" }
    ];

    document.getElementById("tasksFilterBar").innerHTML = filters.map(f => `
      <button class="filter-btn ${state.tasksFilter === f.id ? "active" : ""}" onclick="App.setTaskFilter('${f.id}')">${f.lbl}</button>
    `).join("");

    const q = (state.taskSearch || "").trim().toLowerCase();
    const all = getAllTasks().filter(t => isLevelOpen(t.levelNum));
    const filtered = all.filter(t => {
      const diff = getTaskDifficulty(t);
      if (state.tasksFilter === "todo" && state.solvedTasks.includes(t.id)) return false;
      if (state.tasksFilter === "easy" && diff !== "easy") return false;
      if (state.tasksFilter === "medium" && diff !== "medium") return false;
      if (state.tasksFilter === "hard" && diff !== "hard") return false;
      if (state.tasksFilter === "terminal" && t.type !== "terminal") return false;
      if (state.tasksFilter === "builder" && t.type !== "builder") return false;
      if (state.tasksFilter === "lpic" && t.type !== "lpic_en" && t.type !== "lpic_fill") return false;
      if (q) {
        const hay = `${t.title} ${t.story || ""} ${(t.chips || []).join(" ")}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    const badgeName = t =>
      t === "terminal" ? "Терминал CLI" : t === "builder" ? "Инженерный стенд" : t === "lpic_fill" ? "LPIC Ввод" : "LPIC Тест";

    document.getElementById("allTasksList").innerHTML = filtered.map(t => {
      const isSolved = state.solvedTasks.includes(t.id);
      const isHard = getTaskDifficulty(t) === "hard";
      return `
        <div class="jr-inline-task ${isHard ? "hard-boss" : ""} ${isSolved ? "solved" : ""}">
          <div>
            <div class="it-type-row">
              ${renderDiffBadge(t)}
              <span class="it-type">Уровень ${t.levelNum} • ${badgeName(t.type)}</span>
            </div>
            <div class="it-title">${isSolved ? "✓ " : ""}${t.title}</div>
            <div class="it-reward">${isSolved ? "Выполнено" : `Награда: ${MATTER_ORB_SVG} +${t.matter} материи`}</div>
          </div>
          <button class="${isSolved ? "jr-outline-nav-btn" : (isHard ? "jr-btn-cta orange" : "jr-btn-primary-blue")}" onclick="App.openTask('${t.id}')">${isSolved ? "Открыть" : "Решить ›"}</button>
        </div>
      `;
    }).join("") || `<div style="color:#94A3B8;padding:16px;">Ничего не найдено по фильтру.</div>`;
  }

  // =========================================================================
  // VIEW 4: LPIC ENGLISH TRAINER (+SPEECH TTS, 2 MODES, SEARCH)
  // =========================================================================
  function renderVocabView() {
    const unlockedWords = getUnlockedVocab();
    const allPool = C.levels.flatMap(l => l.vocab || []);

    if (!vocabQuizWord || !unlockedWords.some(w => w.en === vocabQuizWord.en)) {
      vocabQuizWord = unlockedWords[Math.floor(Math.random() * unlockedWords.length)] || allPool[0];
    }

    const isEn2Ru = (state.vocabMode || "en2ru") === "en2ru";
    const distractors = allPool
      .filter(w => (isEn2Ru ? w.ru !== vocabQuizWord.ru : w.en !== vocabQuizWord.en))
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);
    const quizOpts = [vocabQuizWord, ...distractors].sort(() => Math.random() - 0.5);

    document.getElementById("vocabTrainerBox").innerHTML = `
      <div class="xray-box">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:10px;">
          <div style="display:flex;gap:6px;">
            <button class="filter-btn ${isEn2Ru ? "active" : ""}" onclick="App.setVocabMode('en2ru')">🇬🇧 EN → RU</button>
            <button class="filter-btn ${!isEn2Ru ? "active" : ""}" onclick="App.setVocabMode('ru2en')">🇷🇺 RU → EN</button>
          </div>
          <span style="font-size:12px;font-weight:800;color:#4ADE80;">Серия: ${state.vocabStreak}/3 (+⚫ 3 материи) • Всего верных: ${state.vocabCorrectTotal || 0}</span>
        </div>

        <div class="xray-top-row" style="margin-bottom:4px;">
          <div style="font-size:21px;font-weight:900;color:#fff;">
            ${isEn2Ru ? vocabQuizWord.en : vocabQuizWord.ru}
          </div>
          ${isEn2Ru ? `<button class="speak-btn" onclick="App.speak('${escapeAttr(vocabQuizWord.en)}')">🔊 Прослушать</button>` : ""}
        </div>
        <div style="font-size:13px;color:#94A3B8;margin-bottom:12px;">
          ${isEn2Ru ? `Произношение: ${vocabQuizWord.pron}` : "Выбери правильный английский термин LPIC:"}
        </div>

        <div class="lpic-opts">
          ${quizOpts.map(o => {
            const label = isEn2Ru ? o.ru : `${o.en}  ${o.pron}`;
            const answerKey = isEn2Ru ? o.ru : o.en;
            return `<button class="lpic-opt" onclick="App.answerVocabQuiz('${escapeAttr(answerKey)}')">👉 ${escapeHtml(label)}</button>`;
          }).join("")}
        </div>
      </div>
    `;

    const q = (state.vocabSearch || "").trim().toLowerCase();
    const listWords = (q ? allPool : unlockedWords).filter(v => {
      if (!q) return true;
      return `${v.en} ${v.ru} ${v.assoc}`.toLowerCase().includes(q);
    });

    document.getElementById("vocabCardsGrid").innerHTML = listWords.map(v => `
      <div class="vocab-mini-card">
        <div class="xray-top-row">
          <div class="vm-en">${v.en} <span class="vm-pron">${v.pron}</span></div>
          <button class="speak-btn mini" onclick="App.speak('${escapeAttr(v.en)}')" title="Озвучить">🔊</button>
        </div>
        <div class="vm-ru">${v.ru}</div>
        <div class="vm-assoc">💡 ${v.assoc}</div>
      </div>
    `).join("");
  }

  // =========================================================================
  // VIEW 5: LPIC-1 EXAM SIMULATOR + SUBNET CIDR CALCULATOR + CHEAT SHEETS
  // =========================================================================
  function calcCidrInfo(prefix) {
    const p = Math.min(30, Math.max(16, Number(prefix) || 24));
    const hostBits = 32 - p;
    const totalIps = Math.pow(2, hostBits);
    const usableHosts = Math.max(0, totalIps - 2);
    const maskInt = p === 0 ? 0 : (~((1 << hostBits) - 1)) >>> 0;
    const octets = [
      (maskInt >>> 24) & 255,
      (maskInt >>> 16) & 255,
      (maskInt >>> 8) & 255,
      maskInt & 255
    ];
    return {
      prefix: p,
      hostBits,
      totalIps,
      usableHosts,
      maskStr: octets.join(".")
    };
  }

  function renderExamHub() {
    const tabs = [
      { id: "sim", lbl: "🎓 Пробный Экзамен LPIC-1" },
      { id: "calc", lbl: "🧮 Калькулятор Масок CIDR" },
      { id: "cheat", lbl: "📚 Шпаргалка Админа" }
    ];
    document.getElementById("examHubTabs").innerHTML = tabs.map(t => `
      <button class="filter-btn ${state.examHubTab === t.id ? "active" : ""}" onclick="App.setExamHubTab('${t.id}')">${t.lbl}</button>
    `).join("");

    const box = document.getElementById("examHubBody");

    if (state.examHubTab === "calc") {
      const info = calcCidrInfo(state.cidrPrefix || 24);
      box.innerHTML = `
        <div class="subnet-calc-card">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
            <div style="font-size:16px;font-weight:900;">🧮 Интерактивный калькулятор подсетей IPv4 (192.168.1.0/${info.prefix})</div>
            <span class="qt-lpic" style="font-size:13px;">/${info.prefix} = ${info.maskStr}</span>
          </div>
          <p style="font-size:13px;color:#94A3B8;margin-top:4px;">Двигай ползунок префикса маски от <code>/16</code> до <code>/30</code> и смотри, как меняется число хостов по формуле <code>2^(32 − префикс) − 2</code>:</p>
          <input type="range" min="16" max="30" value="${info.prefix}" class="cidr-slider" oninput="App.setCidrPrefix(this.value)" />
          <div class="cidr-stat-grid">
            <div class="cidr-stat">
              <div class="cidr-stat-lbl">Маска подсети</div>
              <div class="cidr-stat-val">${info.maskStr}</div>
            </div>
            <div class="cidr-stat">
              <div class="cidr-stat-lbl">Бит под хосты (32 − ${info.prefix})</div>
              <div class="cidr-stat-val">${info.hostBits} бит</div>
            </div>
            <div class="cidr-stat">
              <div class="cidr-stat-lbl">Всего адресов (2^${info.hostBits})</div>
              <div class="cidr-stat-val">${info.totalIps.toLocaleString("ru-RU")}</div>
            </div>
            <div class="cidr-stat">
              <div class="cidr-stat-lbl">Рабочих хостов (Usable = −2)</div>
              <div class="cidr-stat-val" style="color:#FB923C;">${info.usableHosts.toLocaleString("ru-RU")}</div>
            </div>
          </div>
          <div class="quick-chips" style="margin-top:14px;">
            ${[24, 25, 26, 27, 28, 29, 30].map(p => `<button class="q-chip" onclick="App.setCidrPrefix(${p})">/${p}</button>`).join("")}
          </div>
        </div>
      `;
      return;
    }

    if (state.examHubTab === "cheat") {
      box.innerHTML = (C.cheatsheets || []).map(sec => `
        <div class="cheat-card">
          <div style="font-size:15px;font-weight:900;color:#4ADE80;margin-bottom:8px;">${sec.title}</div>
          ${sec.items.map(it => `
            <div class="cheat-row">
              <span class="cheat-cmd">${escapeHtml(it.cmd)}</span>
              <span class="cheat-desc">${escapeHtml(it.desc)}</span>
            </div>
          `).join("")}
        </div>
      `).join("");
      return;
    }

    // SIMULATOR TAB
    if (!examSession) {
      const cnt101 = (C.examBank || []).filter(q => q.exam === "101").length;
      const cnt102 = (C.examBank || []).filter(q => q.exam === "102").length;
      const cntAll = (C.examBank || []).length;
      box.innerHTML = `
        <div class="exam-sim-card">
          <div style="font-size:17px;font-weight:900;margin-bottom:6px;">🎯 Симулятор сертификации LPIC-1 (шкала Pearson VUE: 200–800, проходной — 500)</div>
          <div style="font-size:13.5px;color:#CBD5E1;line-height:1.55;margin-bottom:14px;">
            Как и на настоящем экзамене LPI, билет включает <strong>тестовые вопросы</strong> и <strong>вопросы с ручным вводом команды или пути к файлу</strong>.<br/>
            Твой лучший результат: <strong style="color:#4ADE80;">${state.bestExamScore ? `${state.bestExamScore} / 800` : "ещё не сдавал"}</strong> • За успешную сдачу (500+): <strong>+⚫ 40 материи</strong>!
          </div>
          <div class="exam-modes-grid">
            <button class="jr-btn-cta" onclick="App.startExam('all', true)">🇬🇧 Полный марафон с X-Ray (${cntAll} вопр.)</button>
            <button class="jr-btn-cta orange" onclick="App.startExam('all', false)">🔥 Боевой Pearson VUE без подсказок (${cntAll} вопр.)</button>
            <button class="jr-btn-cta purple" onclick="App.startExam('101', true)">🖥️ Экзамен 101-500: Железо + База (${cnt101} вопр.)</button>
            <button class="jr-btn-cta purple" onclick="App.startExam('102', true)">🌐 Экзамен 102-500: Админка + Сети (${cnt102} вопр.)</button>
          </div>
        </div>
      `;
      return;
    }

    if (examSession.finished) {
      let correctCnt = 0;
      const total = examSession.questions.length;
      const reviewHtml = examSession.questions.map((qObj, idx) => {
        const userAns = examSession.answers[idx];
        let isOk = false;
        let userText = "— (пусто)";
        let rightText = "";
        if (qObj.kind === "mc") {
          isOk = userAns === qObj.ans;
          if (userAns !== undefined) userText = qObj.opts[userAns];
          rightText = qObj.opts[qObj.ans];
        } else {
          const norm = String(userAns || "").trim();
          userText = norm || "— (пусто)";
          isOk = qObj.accepted.some(a => a.toLowerCase() === norm.toLowerCase());
          rightText = qObj.accepted[0];
        }
        if (isOk) correctCnt++;

        return `
          <div class="cheat-card" style="border-color:${isOk ? "rgba(34,197,94,0.45)" : "rgba(239,68,68,0.45)"};">
            <div style="font-size:12px;font-weight:800;color:${isOk ? "#4ADE80" : "#F87171"};margin-bottom:4px;">
              Вопрос ${idx + 1} [LPIC-${qObj.exam}] — ${isOk ? "✅ ВЕРНО" : "❌ ОШИБКА"}
            </div>
            <div style="font-size:14px;font-weight:700;margin-bottom:6px;">${formatXrayHtml(qObj.q, true)}</div>
            <div style="font-size:12.5px;color:#CBD5E1;">Твой ответ: <code>${escapeHtml(userText)}</code> ${isOk ? "" : ` • Правильный: <code>${escapeHtml(rightText)}</code>`}</div>
            <div style="font-size:12.5px;color:#94A3B8;margin-top:5px;">💡 ${qObj.exp}</div>
          </div>
        `;
      }).join("");

      const score = Math.round(200 + (correctCnt / total) * 600);
      const passed = score >= 500;

      box.innerHTML = `
        <div class="jr-hero-banner" style="border-color:${passed ? "#22C55E" : "#EF4444"};">
          <div>
            <div class="hero-kicker">${passed ? "🎉 СЕРТИФИКАТ В КАРМАНЕ (PASSED!)" : "💪 НУЖНА ПЕРЕПОДГОТОВКА (FAILED)"}</div>
            <div class="hero-title">Твой балл LPIC-1: ${score} из 800 (${correctCnt}/${total} верных)</div>
            <div class="hero-sub">${passed ? "Проходной порог 500 баллов взят! Разбор всех вопросов ниже." : "Для сдачи нужно минимум 500/800. Посмотри разбор ошибок ниже — и повтори попытку!"}</div>
          </div>
          <button class="jr-btn-cta orange" onclick="App.closeExamSession()">Новая попытка</button>
        </div>
        ${reviewHtml}
      `;
      return;
    }

    // Active Exam Question
    const qIdx = examSession.idx;
    const qObj = examSession.questions[qIdx];
    const savedAns = examSession.answers[qIdx];

    let inputArea = "";
    if (qObj.kind === "mc") {
      const letters = ["A", "B", "C", "D"];
      inputArea = `<div class="lpic-opts">` + qObj.opts.map((opt, oi) => `
        <button class="lpic-opt ${savedAns === oi ? "selected" : ""}" onclick="App.answerExamMc(${oi})">
          <strong style="color:#FF7A00;">${letters[oi]}.</strong> <span>${escapeHtml(opt)}</span>
        </button>
      `).join("") + `</div>`;
    } else {
      inputArea = `
        <div class="sim-field" style="margin-top:12px;">
          <label>✍️ Введи точное имя команды или полный путь (Fill-in-the-blank):</label>
          <input class="sim-text-in" value="${escapeAttr(savedAns || "")}" placeholder="Например: /etc/fstab или lsmod" oninput="App.answerExamFill(this.value)" />
        </div>
      `;
    }

    box.innerHTML = `
      <div class="xray-box">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
          <span class="qt-lpic">LPIC-${qObj.exam} • Вопрос ${qIdx + 1} из ${examSession.questions.length}</span>
          <span style="font-size:12px;color:#94A3B8;">${examSession.xrayAllowed ? "🇬🇧 X-Ray перевод включён (кликай по словам)" : "🔥 Режим Pearson VUE (без перевода)"}</span>
        </div>
        <div class="xray-question-en">${formatXrayHtml(qObj.q, examSession.xrayAllowed)}</div>
        ${inputArea}
        <div style="display:flex;justify-content:space-between;gap:10px;margin-top:16px;">
          <button class="ide-btn" ${qIdx === 0 ? "disabled" : ""} onclick="App.stepExam(-1)">← Назад</button>
          ${qIdx + 1 < examSession.questions.length
            ? `<button class="jr-btn-cta" onclick="App.stepExam(1)">Следующий вопрос →</button>`
            : `<button class="jr-btn-cta orange" onclick="App.finishExam()">🏁 Завершить и узнать балл</button>`}
        </div>
      </div>
    `;
  }

  // =========================================================================
  // VIEW 5B: SMART NON-RANDOM REVIEW («СЛУЧАЙНОСТИ НЕ СЛУЧАЙНЫ»)
  // =========================================================================
  const SRS_INTERVAL_HRS = [0, 24, 72, 168, 336, 720]; // Сейчас, 1д, 3д, 7д, 14д, 30д
  const SRS_BOX_NAMES = ["0 • Старт", "1 • 1 день", "2 • 3 дня", "3 • 7 дней", "4 • 14 дней", "5 • 30 дней"];

  function nowHours() {
    return Math.floor(Date.now() / 3600000);
  }

  function getSrsTuple(key) {
    const raw = state.srsDeck && state.srsDeck[key];
    if (Array.isArray(raw) && raw.length >= 7) {
      return raw.slice(0, 7).map(n => Number(n || 0));
    }
    return [0, 0, 0, 0, 0, 0, 0]; // [box, streak, fails, hints, reps, lastHr, dueHr]
  }

  function recordSrsOutcome(key, isCorrect, keepShortInterval) {
    if (!key) return;
    if (!state.srsDeck || typeof state.srsDeck !== "object") state.srsDeck = {};
    let [box, streak, fails, hints, reps, lastHr, dueHr] = getSrsTuple(key);
    const nh = nowHours();
    reps += 1;
    lastHr = nh;
    if (isCorrect) {
      if (keepShortInterval) {
        box = 1;
        streak = 1;
        dueHr = nh + 24;
      } else {
        box = Math.min(5, box + 1);
        streak += 1;
        dueHr = nh + (SRS_INTERVAL_HRS[box] || 24);
      }
    } else {
      box = 0;
      streak = 0;
      fails += 1;
      dueHr = nh;
    }
    state.srsDeck[key] = [box, streak, fails, hints, reps, lastHr, dueHr];
  }

  function recordSrsHint(key) {
    if (!key) return;
    if (!state.srsDeck || typeof state.srsDeck !== "object") state.srsDeck = {};
    let [box, streak, fails, hints, reps, lastHr, dueHr] = getSrsTuple(key);
    const nh = nowHours();
    hints += 1;
    if (box > 1) box = 1;
    if (!dueHr || dueHr > nh + 24) dueHr = nh;
    state.srsDeck[key] = [box, streak, fails, hints, reps, lastHr, dueHr];
  }

  function detHash(str) {
    let h = 2166136261;
    const s = String(str || "");
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function formatRichInline(raw) {
    let safe = escapeHtml(String(raw || ""));
    safe = safe.replace(/`([^`\n]+)`/g, "<code>$1</code>");
    safe = safe.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    return safe.replace(/\n/g, "<br/>");
  }

  function normalizeFillAns(s) {
    return String(s || "").trim().replace(/\s+/g, " ").toLowerCase();
  }

  const CLI_DISTRACTORS = [
    "lscpu", "lspci -k", "lsblk -f", "df -i", "du -sh /var/*",
    "systemctl get-default", "grep -i error /var/log/syslog", "tar -czvf backup.tar.gz /etc",
    "cut -d: -f1 /etc/passwd", "dpkg -S /usr/sbin/sshd", "chmod 600 ~/.ssh/id_ed25519",
    "journalctl -u nginx -n 50", "ethtool eth0", "ip route show", "ss -tulnp", "ufw status verbose"
  ];

  function buildSmartReviewPool(filterLvl) {
    const openLvls = C.levels.filter(l => isLevelOpen(l.level) && (filterLvl === null || filterLvl === undefined || l.level === filterLvl));
    if (openLvls.length === 0) return [];

    const allOpenVocabRu = Array.from(new Set(
      C.levels.filter(l => isLevelOpen(l.level)).flatMap(l => (l.vocab || []).map(v => v.ru))
    ));
    const nh = nowHours();
    const rawItems = [];

    openLvls.forEach(lvl => {
      const isLvlCompleted = lvl.tasks.every(t => state.solvedTasks.includes(t.id));

      // 1. Deep Concept & Command Cards for this unlocked level
      (DOJO.CONCEPT_CARDS || []).filter(c => c.level === lvl.level).forEach(c => {
        rawItems.push({
          key: `concept:${c.id}`,
          family: "concept",
          level: lvl.level,
          levelTitle: lvl.title,
          isLvlCompleted,
          sourceLabel: `🧠 Концепт • ${c.topic}`,
          kind: c.kind,
          qHtml: formatRichInline(c.q),
          qPlain: c.q,
          opts: c.opts ? [...c.opts] : null,
          ans: c.ans,
          accepted: c.accepted ? [...c.accepted] : null,
          placeholder: c.placeholder || "Введи точный ответ...",
          deepHtml: formatRichInline(c.deep || "")
        });
      });

      // 2. Tasks from this level (only already solved OR where user failed / took hint -> zero spoilers!)
      (lvl.tasks || []).forEach(t => {
        const key = `task:${t.id}`;
        const [, , fails, hints] = getSrsTuple(key);
        const isSolved = state.solvedTasks.includes(t.id);
        if (!isSolved && fails === 0 && hints === 0) return;

        if (t.type === "lpic_en" && Array.isArray(t.options) && t.options.length >= 2) {
          const rightVal = t.correct !== undefined ? t.correct : t.correctVal;
          const ansIdx = Math.max(0, t.options.findIndex(o => o.val === rightVal));
          rawItems.push({
            key,
            family: "task",
            linkedTaskId: t.id,
            level: lvl.level,
            levelTitle: lvl.title,
            isLvlCompleted: isLvlCompleted || isSolved,
            sourceLabel: `🇬🇧 Вопрос LPIC-1 • ${t.title}`,
            kind: "mc",
            qHtml: formatXrayHtml(t.enQuestion || "", true),
            qPlain: String(t.enQuestion || "").replace(/<[^>]+>/g, ""),
            opts: t.options.map(o => String(o.text || "").replace(/<[^>]+>/g, "")),
            ans: ansIdx,
            deepHtml: formatRichInline(t.explainRu || t.hint || "")
          });
        } else if (t.type === "lpic_fill" && Array.isArray(t.acceptedAnswers) && t.acceptedAnswers.length > 0) {
          rawItems.push({
            key,
            family: "task",
            linkedTaskId: t.id,
            level: lvl.level,
            levelTitle: lvl.title,
            isLvlCompleted: isLvlCompleted || isSolved,
            sourceLabel: `✍️ Ввод команды LPIC-1 • ${t.title}`,
            kind: "fill",
            qHtml: formatXrayHtml(t.enQuestion || "", true),
            qPlain: String(t.enQuestion || "").replace(/<[^>]+>/g, ""),
            accepted: [...t.acceptedAnswers],
            placeholder: "Команда или полный путь...",
            deepHtml: formatRichInline(t.explainRu || t.hint || "")
          });
        } else if (t.type === "builder" && Array.isArray(t.fields) && t.fields.length > 0) {
          const fIdx = detHash(t.id) % t.fields.length;
          const f = t.fields[fIdx];
          if (f && Array.isArray(f.options) && f.options.length >= 2) {
            const ansIdx = Math.max(0, f.options.findIndex(o => o.val === f.correct));
            rawItems.push({
              key,
              family: "task",
              linkedTaskId: t.id,
              level: lvl.level,
              levelTitle: lvl.title,
              isLvlCompleted: isLvlCompleted || isSolved,
              sourceLabel: `🛠️ Инженерный стенд • ${t.title}`,
              kind: "mc",
              qHtml: `<strong>${escapeHtml(t.title)}</strong><br/>${escapeHtml(f.label)}`,
              qPlain: `${t.title}: ${f.label}`,
              opts: f.options.map(o => o.text),
              ans: ansIdx,
              deepHtml: formatRichInline(t.hint || "")
            });
          }
        } else if (t.type === "terminal") {
          const chips = (t.chips || []).filter(c => c !== "clear");
          const sigChip = chips.find(c => !c.startsWith("cat ") && c !== "pwd" && c !== "ls -l") || chips[0];
          if (sigChip) {
            const pool = CLI_DISTRACTORS.filter(d => d !== sigChip && !chips.includes(d));
            const hBase = detHash(t.id);
            const dists = [
              pool[hBase % pool.length],
              pool[(hBase + 5) % pool.length],
              pool[(hBase + 11) % pool.length]
            ];
            const slot = hBase % 4;
            const opts = [...dists];
            opts.splice(slot, 0, sigChip);
            rawItems.push({
              key,
              family: "task",
              linkedTaskId: t.id,
              level: lvl.level,
              levelTitle: lvl.title,
              isLvlCompleted: isLvlCompleted || isSolved,
              sourceLabel: `💻 Терминал • ${t.title}`,
              kind: "mc",
              qHtml: `<strong>${escapeHtml(t.title)}</strong><br/><span style="color:#CBD5E1;font-size:13.5px;">${formatRichInline(t.story || "")}</span><br/><br/>Какая ключевая команда использовалась в этой лабораторной?`,
              qPlain: `${t.title}: ${t.story}`,
              opts,
              ans: slot,
              deepHtml: formatRichInline(t.hint || "")
            });
          }
        }
      });

      // 3. Technical English Vocabulary for this unlocked level
      (lvl.vocab || []).forEach(v => {
        const key = `vocab:${lvl.level}:${v.en}`;
        const wrongPool = allOpenVocabRu.filter(r => r !== v.ru);
        const hBase = detHash(key);
        const dists = [];
        for (let step = 0; step < wrongPool.length && dists.length < 3; step++) {
          const cand = wrongPool[(hBase + step * 7) % wrongPool.length];
          if (cand && !dists.includes(cand)) dists.push(cand);
        }
        while (dists.length < 3) {
          const fb = ["системный вызов ядра", "таблица разделов диска", "сетевой шлюз по умолчанию"][dists.length];
          if (fb !== v.ru && !dists.includes(fb)) dists.push(fb);
          else dists.push("параметр конфигурации");
        }
        const slot = hBase % 4;
        const opts = [...dists];
        opts.splice(slot, 0, v.ru);

        rawItems.push({
          key,
          family: "vocab",
          level: lvl.level,
          levelTitle: lvl.title,
          isLvlCompleted,
          sourceLabel: `🇬🇧 Термин LPIC-1 • Уровень ${lvl.level}`,
          speakWord: v.en,
          kind: "mc",
          qHtml: `Вспомни точный перевод термина экзамена LPIC-1: <strong style="color:#38BDF8;font-size:18px;">${escapeHtml(v.en)}</strong> <span style="color:#94A3B8;font-size:13px;">[${escapeHtml(v.pron || "")}]</span>`,
          qPlain: `Перевод термина ${v.en}`,
          opts,
          ans: slot,
          deepHtml: `<strong>${escapeHtml(v.en)}</strong> [${escapeHtml(v.pron || "")}] — <strong>${escapeHtml(v.ru)}</strong>.${v.assoc ? ` 💡 Ассоциация: ${escapeHtml(v.assoc)}` : ""}`
        });
      });
    });

    // Compute deterministic Non-Random Priority Score for every item
    const scored = rawItems.map(item => {
      const [box, streak, fails, hints, reps, lastHr, dueHr] = getSrsTuple(item.key);
      let score = 0;
      let reasonTone = "blue";
      let reasonText = "";
      let isWeak = false;

      if (fails > 0 && streak < 2) {
        score = 135 + fails * 12 + hints * 5 - box * 6;
        reasonTone = "red";
        reasonText = `🎯 Не случайно: здесь была ошибка (${fails}×) — закрываем пробел!`;
        isWeak = true;
      } else if (hints > 0 && box < 2) {
        score = 102 + hints * 8 - box * 5;
        reasonTone = "orange";
        reasonText = `💡 Не случайно: открывалась шпора / помощь ИИ (${hints}×)`;
        isWeak = true;
      } else if (reps > 0 && nh >= dueHr) {
        const overdueDays = Math.max(0, Math.floor((nh - dueHr) / 24));
        score = 86 + Math.min(20, overdueDays * 2) + (5 - box) * 3;
        reasonTone = "orange";
        reasonText = `⏰ Подошёл интервал памяти (Коробка ${box}/5${overdueDays > 0 ? ` • +${overdueDays} дн.` : ""})`;
        if (box <= 1) isWeak = true;
      } else if (reps === 0) {
        const famBoost = item.family === "concept" ? 5 : item.family === "task" ? 3 : 0;
        if (item.isLvlCompleted) {
          score = 64 + famBoost;
          reasonTone = "blue";
          reasonText = `🆕 Первичное закрепление пройденного Уровня ${item.level}`;
        } else {
          score = 40 + famBoost;
          reasonTone = "blue";
          reasonText = `📖 Текущая тема открытого Уровня ${item.level}`;
        }
      } else {
        const remHrs = Math.max(1, dueHr - nh);
        const remTxt = remHrs >= 24 ? `${Math.ceil(remHrs / 24)} дн.` : `${remHrs} ч.`;
        score = Math.max(4, 24 - box * 4);
        reasonTone = "green";
        reasonText = `✅ В крепкой памяти (Коробка ${box}/5 • след. повтор через ~${remTxt})`;
      }

      // Deterministic tie-breaker so order is stable but mixes levels nicely
      const tie = (detHash(item.key) % 97) / 1000;
      return Object.assign({}, item, {
        box, streak, fails, hints, reps, lastHr, dueHr,
        score: score + tie,
        isWeak,
        isDueNow: score >= 60,
        reasonTone,
        reasonText
      });
    });

    scored.sort((a, b) => b.score - a.score);
    return scored;
  }

  function getUrgentReviewCount() {
    return buildSmartReviewPool(null).filter(x => x.isDueNow).length;
  }

  function renderReviewView() {
    const box = document.getElementById("reviewHubBody");
    if (!box) return;

    // Active or Finished Session
    if (reviewSession) {
      if (reviewSession.finished) {
        const total = reviewSession.cards.length;
        const okCnt = reviewSession.results.filter(r => r.ok).length;
        const earned = reviewSession.earnedMatter || 0;

        const rowsHtml = reviewSession.cards.map((c, idx) => {
          const res = reviewSession.results[idx] || { ok: false };
          const [newBox] = getSrsTuple(c.key);
          return `
            <div class="cheat-card" style="border-color:${res.ok ? "rgba(34,197,94,0.45)" : "rgba(239,68,68,0.45)"};padding:12px 14px;">
              <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px;">
                <span style="font-size:12px;font-weight:800;color:${res.ok ? "#4ADE80" : "#F87171"};">${res.ok ? "✅ Закреплено" : "❌ Вернётся в приоритет"} • ${escapeHtml(c.sourceLabel)}</span>
                <span class="sr-box-dot active">${SRS_BOX_NAMES[newBox] || "Коробка 0"}</span>
              </div>
              <div style="font-size:13px;color:#E2E8F0;">${c.qHtml}</div>
            </div>
          `;
        }).join("");

        box.innerHTML = `
          <div class="jr-hero-banner" style="border-color:${okCnt >= Math.ceil(total * 0.6) ? "#22C55E" : "#F59E0B"};">
            <div>
              <div class="hero-kicker">🎯 СЕССИЯ УМНОГО ПОВТОРЕНИЯ ЗАВЕРШЕНА</div>
              <div class="hero-title">Результат: ${okCnt} из ${total} в точку! ${earned > 0 ? `(+⚫ ${earned} материи)` : ""}</div>
              <div class="hero-sub">Интервалы памяти пересчитаны и синхронизированы между ноутбуком и телефоном. Ошибки остались в красной зоне радара!</div>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              <button class="jr-btn-cta orange" onclick="App.startReviewSession('smart', null)">🔄 Следующий смарт-раунд →</button>
              <button class="ide-btn" onclick="App.closeReviewSession()">← К Радару памяти</button>
            </div>
          </div>
          ${rowsHtml}
        `;
        return;
      }

      // Active Card Runner
      const card = reviewSession.cards[reviewSession.idx];
      const [curBox] = getSrsTuple(card.key);
      const boxDots = SRS_BOX_NAMES.map((lbl, bi) =>
        `<span class="sr-box-dot ${bi === curBox ? "active" : ""}">${lbl}</span>`
      ).join("");

      let inputHtml = "";
      let rightDisplay = "";

      if (card.kind === "mc") {
        const letters = ["A", "B", "C", "D"];
        rightDisplay = card.opts[card.ans];
        inputHtml = `<div class="lpic-opts" style="margin-top:12px;">` + card.opts.map((opt, oi) => {
          let cls = "";
          if (reviewSession.checked) {
            if (oi === card.ans) cls = "correct";
            else if (oi === reviewSession.chosenIdx) cls = "wrong";
          }
          const borderExtra = reviewSession.checked && oi === card.ans
            ? "border-color:#22C55E;background:rgba(34,197,94,0.14);"
            : (reviewSession.checked && oi === reviewSession.chosenIdx && oi !== card.ans
                ? "border-color:#EF4444;background:rgba(239,68,68,0.14);"
                : "");
          return `
            <button class="lpic-opt ${cls}" style="${borderExtra}" ${reviewSession.checked ? "disabled" : ""} onclick="App.submitReviewMc(${oi})">
              <strong style="color:#FF7A00;">${letters[oi] || "•"}.</strong> <span>${escapeHtml(opt)}</span>
            </button>
          `;
        }).join("") + `</div>`;
      } else {
        rightDisplay = (card.accepted || [])[0] || "";
        inputHtml = `
          <div class="sim-field" style="margin-top:12px;">
            <label>✍️ Вспомни без подсказок и введи ответ:</label>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              <input
                type="text"
                class="sim-text-in"
                id="reviewFillInput"
                style="flex:1;min-width:200px;"
                value="${escapeAttr(reviewSession.typedVal || "")}"
                placeholder="${escapeAttr(card.placeholder || "Введи ответ...")}"
                ${reviewSession.checked ? "disabled" : ""}
                oninput="App.setReviewFill(this.value)"
                onkeydown="if(event.key==='Enter'){event.preventDefault();App.submitReviewFill();}"
              />
              ${!reviewSession.checked ? `<button class="jr-btn-cta orange" onclick="App.submitReviewFill()">Проверить</button>` : ""}
            </div>
          </div>
        `;
      }

      const feedbackHtml = reviewSession.checked ? `
        <div class="dojo-explain-box ${reviewSession.lastOk ? "" : "wrong"}">
          <div style="font-weight:900;font-size:14.5px;margin-bottom:6px;color:${reviewSession.lastOk ? "#4ADE80" : "#FBBF24"};">
            ${reviewSession.lastOk ? "✅ Красавчик! Точное попадание." : `❌ Промах! Правильный ответ: <code>${escapeHtml(rightDisplay)}</code>`}
          </div>
          <div>${card.deepHtml}</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;align-items:center;justify-content:space-between;">
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              <button class="ide-btn ai" onclick="App.openAiDrawer('Разбери эту карточку повторения глубже простыми словами и дай ассоциацию для запоминания!')">🤖 Разжевать с ИИ</button>
              ${card.linkedTaskId ? `<button class="ide-btn" onclick="App.openTask('${card.linkedTaskId}')">💻 Открыть стенд задачи</button>` : ""}
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              ${reviewSession.lastOk ? `
                <button class="ide-btn" onclick="App.nextReviewCard(true)" title="Оставить короткий интервал 1 день">🤔 Вспомнил с трудом (1д)</button>
                <button class="jr-btn-cta" onclick="App.nextReviewCard(false)">🚀 Легко! Увеличить интервал →</button>
              ` : `
                <button class="jr-btn-cta orange" onclick="App.nextReviewCard(false)">💪 Запомнил, дальше →</button>
              `}
            </div>
          </div>
        </div>
      ` : "";

      box.innerHTML = `
        <div class="xray-box">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:10px;">
            <span class="qt-lpic">${escapeHtml(card.sourceLabel)} • Точка ${reviewSession.idx + 1} из ${reviewSession.cards.length}</span>
            <button class="ide-btn" onclick="App.closeReviewSession()">✕ Завершить</button>
          </div>
          <div class="sr-reason-badge ${card.reasonTone}">${escapeHtml(card.reasonText)}</div>
          <div class="sr-box-steps" style="margin-bottom:14px;">${boxDots}</div>

          <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;">
            <div class="xray-question-en" style="flex:1;">${card.qHtml}</div>
            ${card.speakWord ? `<button class="speak-btn" onclick="App.speak('${escapeAttr(card.speakWord)}')">🔊 Озвучить</button>` : ""}
          </div>

          ${inputHtml}
          ${feedbackHtml}
        </div>
      `;

      if (!reviewSession.checked && card.kind === "fill") {
        setTimeout(() => document.getElementById("reviewFillInput")?.focus(), 40);
      }
      return;
    }

    // Dashboard View (No active session)
    const pool = buildSmartReviewPool(null);
    const dueItems = pool.filter(x => x.isDueNow);
    const weakItems = pool.filter(x => x.isWeak);
    const solidItems = pool.filter(x => x.reps > 0 && x.box >= 2 && !x.isWeak);

    // Per-unlocked-level Retention Heatmap
    const openLvls = C.levels.filter(l => isLevelOpen(l.level));
    const lvlPillsHtml = openLvls.map(lvl => {
      const items = pool.filter(x => x.level === lvl.level);
      const wCnt = items.filter(x => x.isWeak).length;
      const dCnt = items.filter(x => x.isDueNow).length;
      const cls = wCnt > 0 ? "risk" : dCnt > 0 ? "due" : "fresh";
      const dot = wCnt > 0 ? `🔴 ${wCnt} слаб.` : dCnt > 0 ? `🟡 ${dCnt} к повт.` : "🟢 Крепко";
      return `
        <button class="sr-lvl-pill ${cls}" onclick="App.startReviewSession('level', ${lvl.level})" title="Запустить прицельное повторение Уровня ${lvl.level}: ${escapeAttr(lvl.title)}">
          <span>Ур. ${lvl.level}</span>
          <span style="font-weight:600;color:#94A3B8;">• ${dot}</span>
        </button>
      `;
    }).join("");

    const previewTop = pool.slice(0, 5).map(item => `
      <div class="cheat-row" style="align-items:center;">
        <div style="display:flex;flex-direction:column;gap:3px;">
          <span style="font-weight:800;color:#F8FAFC;">${escapeHtml(item.sourceLabel)} (Ур. ${item.level})</span>
          <span style="font-size:12px;color:#94A3B8;">${escapeHtml(item.reasonText)}</span>
        </div>
        <span class="sr-box-dot active">${SRS_BOX_NAMES[item.box] || "0 • Старт"}</span>
      </div>
    `).join("");

    box.innerHTML = `
      <div class="sr-radar-grid">
        <div class="sr-stat-card urgent">
          <div class="sr-stat-lbl">⏰ На очереди сейчас</div>
          <div class="sr-stat-val">${dueItems.length}</div>
          <div class="sr-stat-sub">Подошедшие интервалы и свежие уровни</div>
        </div>
        <div class="sr-stat-card weak">
          <div class="sr-stat-lbl">🩸 Ошибки и шпоры</div>
          <div class="sr-stat-val">${weakItems.length}</div>
          <div class="sr-stat-sub">Неслучайный приоритет №1 на разбор</div>
        </div>
        <div class="sr-stat-card solid">
          <div class="sr-stat-lbl">🧠 В крепкой памяти</div>
          <div class="sr-stat-val">${solidItems.length} <span style="font-size:14px;color:#94A3B8;">/ ${pool.length}</span></div>
          <div class="sr-stat-sub">Коробки 2–5 (интервал от 3 до 30 дней)</div>
        </div>
        <div class="sr-stat-card">
          <div class="sr-stat-lbl">⚫ Заработано на повторах</div>
          <div class="sr-stat-val">+${state.reviewBonusMatter || 0}</div>
          <div class="sr-stat-sub">+12 материи за каждую качественную сессию</div>
        </div>
      </div>

      <div class="jr-hero-banner" style="margin-bottom:16px;">
        <div>
          <div class="hero-kicker">🧠 АЛГОРИТМ ЭББИНГАУЗА + ТЕЛЕМЕТРИЯ ТВОИХ ДЕЙСТВИЙ</div>
          <div class="hero-title">Умная выборка без спойлеров (${pool.length} карточек по открытым уровням)</div>
          <div class="hero-sub">Система ставит на первое место задачи WebLab, концепты и английские слова, где ты ошибался или открывал подсказку/ИИ, затем — карточки с истёкшим интервалом (1→3→7→14→30 дней).</div>
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          <button class="jr-btn-cta orange" onclick="App.startReviewSession('smart', null)">🎯 Запустить Умную Сессию (${Math.min(pool.length, Math.max(6, Math.min(16, dueItems.length || pool.length)))} ${pluralRu(Math.min(pool.length, Math.max(6, Math.min(16, dueItems.length || pool.length))), "точка", "точки", "точек")}) →</button>
          <button class="jr-btn-cta" onclick="App.startReviewSession('weak', null)">🩸 Только ошибки и шпоры (${weakItems.length})</button>
        </div>
      </div>

      <div class="sr-heatmap-card">
        <div style="font-size:14.5px;font-weight:900;color:#F8FAFC;">🗺️ Тепловая карта памяти по открытым уровням (жми на уровень для точечного повтора)</div>
        <div style="font-size:12.5px;color:#94A3B8;margin-top:2px;">🔴 Есть ошибки/шпоры • 🟡 Ждёт закрепления по интервалу • 🟢 Надёжно усвоено</div>
        <div class="sr-lvl-pills">${lvlPillsHtml}</div>
      </div>

      <div class="cheat-card">
        <div style="font-size:14.5px;font-weight:900;margin-bottom:8px;">🔍 Топ-5 кандидатов в твоей очереди прямо сейчас (доказательство неслучайности):</div>
        ${previewTop || `<div style="font-size:13px;color:#94A3B8;">Реши первую задачу на Карте, чтобы наполнить Радар памяти!</div>`}
      </div>
    `;
  }

  // =========================================================================
  // VIEW 5C: 5-ARENA SKILL DOJO («ПОЛИГОН СКИЛЛОВ»)
  // =========================================================================
  function getDojoArenaStat(arenaId) {
    const st = (state.dojoStats && state.dojoStats[arenaId]) || {};
    return {
      solved: Number(st.solved || 0),
      correct: Number(st.correct || 0),
      bestStreak: Number(st.bestStreak || 0)
    };
  }

  function getDojoBelt(correctCnt) {
    if (correctCnt >= 50) return "⚫ Чёрный пояс (Root)";
    if (correctCnt >= 25) return "🟣 Фиолетовый пояс (Senior)";
    if (correctCnt >= 10) return "🔵 Синий пояс (SysAdmin)";
    if (correctCnt >= 3) return "🟢 Зелёный пояс (Junior+)";
    return "⚪ Белый пояс (Стажёр)";
  }

  function renderDojoView() {
    const box = document.getElementById("dojoHubBody");
    if (!box) return;

    // Active Arena Runner
    if (dojoSession) {
      const meta = (DOJO.ARENAS_META || []).find(a => a.id === dojoSession.arenaId) || { icon: "🥋", title: "Арена", tag: "LPIC-1" };
      const st = getDojoArenaStat(dojoSession.arenaId);
      const q = dojoSession.currentQ;
      const toNextReward = 3 - (dojoSession.streak % 3);

      let inputHtml = "";
      let rightDisplay = "";

      if (q.kind === "mc") {
        const letters = ["A", "B", "C", "D"];
        rightDisplay = q.opts[q.ans];
        inputHtml = `<div class="lpic-opts" style="margin-top:12px;">` + q.opts.map((opt, oi) => {
          const borderExtra = dojoSession.checked && oi === q.ans
            ? "border-color:#22C55E;background:rgba(34,197,94,0.14);"
            : (dojoSession.checked && oi === dojoSession.chosenIdx && oi !== q.ans
                ? "border-color:#EF4444;background:rgba(239,68,68,0.14);"
                : "");
          return `
            <button class="lpic-opt" style="${borderExtra}" ${dojoSession.checked ? "disabled" : ""} onclick="App.submitDojoMc(${oi})">
              <strong style="color:#FF7A00;">${letters[oi] || "•"}.</strong> <span>${formatRichInline(opt)}</span>
            </button>
          `;
        }).join("") + `</div>`;
      } else {
        rightDisplay = (q.accepted || [])[0] || "";
        inputHtml = `
          <div class="sim-field" style="margin-top:12px;">
            <label>✍️ Твой расчёт / ответ:</label>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              <input
                type="text"
                class="sim-text-in"
                id="dojoFillInput"
                style="flex:1;min-width:200px;"
                value="${escapeAttr(dojoSession.typedVal || "")}"
                placeholder="${escapeAttr(q.placeholder || "Введи точный ответ...")}"
                ${dojoSession.checked ? "disabled" : ""}
                oninput="App.setDojoFill(this.value)"
                onkeydown="if(event.key==='Enter'){event.preventDefault();App.submitDojoFill();}"
              />
              ${!dojoSession.checked ? `<button class="jr-btn-cta orange" onclick="App.submitDojoFill()">⚡ Проверить</button>` : ""}
            </div>
          </div>
        `;
      }

      const explainHtml = dojoSession.checked ? `
        <div class="dojo-explain-box ${dojoSession.lastOk ? "" : "wrong"}">
          <div style="font-weight:900;font-size:15px;margin-bottom:6px;color:${dojoSession.lastOk ? "#4ADE80" : "#FBBF24"};">
            ${dojoSession.lastOk ? "✅ В яблочко! Так держать!" : `❌ Осечка! Правильный ответ: <code>${escapeHtml(rightDisplay)}</code>`}
          </div>
          ${q.visual ? `<pre class="dojo-dump-pre" style="margin-top:8px;margin-bottom:10px;color:#7DD3FC;">${escapeHtml(q.visual)}</pre>` : ""}
          <div>${formatRichInline(q.deep || "")}</div>
          <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-top:14px;">
            <button class="ide-btn ai" onclick="App.openAiDrawer('Объясни на пальцах механику этого задания из Полигона скиллов и покажи, как решать такие задачи в уме за 5 секунд!')">🤖 Разобрать механику с ИИ</button>
            <button class="jr-btn-cta orange" onclick="App.nextDojoQuestion()">Следующий вызов →</button>
          </div>
        </div>
      ` : "";

      box.innerHTML = `
        <div class="xray-box">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:12px;">
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
              <button class="ide-back-btn" onclick="App.closeDojoArena()">← К аренам</button>
              <span class="qt-lpic">${meta.icon} ${escapeHtml(meta.title)}</span>
              <span class="dojo-belt-pill">${getDojoBelt(st.correct)}</span>
            </div>
            <div style="font-size:12.5px;font-weight:900;color:#FB923C;">
              🔥 Комбо: ${dojoSession.streak} ${dojoSession.checked ? "" : `(ещё ${toNextReward} до +⚫ 4)`}
            </div>
          </div>

          <div class="sr-reason-badge blue">${escapeHtml(q.badge || meta.tag)}</div>

          ${q.alertText ? `<div class="dojo-alert-box">📟 <strong>СИГНАЛ МОНИТОРИНГА:</strong> ${formatRichInline(q.alertText)}</div>` : ""}
          ${q.dumpCmd ? `<pre class="dojo-dump-pre">${escapeHtml(q.dumpCmd)}</pre>` : ""}

          <div class="xray-question-en">${formatRichInline(q.q)}</div>

          ${inputHtml}
          ${explainHtml}
        </div>
      `;

      if (!dojoSession.checked && q.kind === "fill") {
        setTimeout(() => document.getElementById("dojoFillInput")?.focus(), 40);
      }
      return;
    }

    // 5-Arena Hub View
    const arenas = DOJO.ARENAS_META || [];
    let totalSolved = 0;
    let totalCorrect = 0;
    let maxBestStreak = 0;
    arenas.forEach(a => {
      const st = getDojoArenaStat(a.id);
      totalSolved += st.solved;
      totalCorrect += st.correct;
      if (st.bestStreak > maxBestStreak) maxBestStreak = st.bestStreak;
    });
    const totalAcc = totalSolved > 0 ? Math.round((totalCorrect / totalSolved) * 100) : 100;

    const cardsHtml = arenas.map(a => {
      const st = getDojoArenaStat(a.id);
      const acc = st.solved > 0 ? Math.round((st.correct / st.solved) * 100) : 0;
      const belt = getDojoBelt(st.correct);
      return `
        <div class="dojo-arena-card">
          <div>
            <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:10px;">
              <span style="font-size:28px;">${a.icon}</span>
              <span class="dojo-belt-pill">${belt}</span>
            </div>
            <div style="font-size:11px;font-weight:800;color:#38BDF8;margin-bottom:4px;">${escapeHtml(a.tag)}</div>
            <div style="font-size:16px;font-weight:900;color:#F8FAFC;margin-bottom:6px;line-height:1.3;">${escapeHtml(a.title)}</div>
            <div style="font-size:12.5px;color:#94A3B8;line-height:1.45;">${escapeHtml(a.sub)}</div>
          </div>
          <div>
            <div style="font-size:12px;color:#CBD5E1;margin-bottom:10px;padding-top:8px;border-top:1px solid rgba(51,65,85,0.5);display:flex;justify-content:space-between;">
              <span>Точных: <strong>${st.correct}/${st.solved}</strong> ${st.solved > 0 ? `(${acc}%)` : ""}</span>
              <span>Рекорд: <strong>🔥 ${st.bestStreak}</strong></span>
            </div>
            <button class="jr-btn-cta orange" style="width:100%;justify-content:center;" onclick="App.startDojoArena('${a.id}')">🥋 Тренировать скилл →</button>
          </div>
        </div>
      `;
    }).join("");

    box.innerHTML = `
      <div class="sr-radar-grid">
        <div class="sr-stat-card solid">
          <div class="sr-stat-lbl">🥋 Вызовов пройдено</div>
          <div class="sr-stat-val">${totalCorrect} <span style="font-size:14px;color:#94A3B8;">(${totalAcc}% точность)</span></div>
          <div class="sr-stat-sub">Каждые 3 ответа подряд дают +⚫ 4 материи</div>
        </div>
        <div class="sr-stat-card urgent">
          <div class="sr-stat-lbl">🔥 Лучшая серия без ошибок</div>
          <div class="sr-stat-val">${maxBestStreak}</div>
          <div class="sr-stat-sub">Качай пояса от Белого до Чёрного Root (50+)</div>
        </div>
        <div class="sr-stat-card">
          <div class="sr-stat-lbl">⚫ Бонус материи с Полигона</div>
          <div class="sr-stat-val">+${state.dojoBonusMatter || 0}</div>
          <div class="sr-stat-sub">Синхронизируется между ноутбуком и телефоном</div>
        </div>
      </div>

      <div class="dojo-arenas-grid">${cardsHtml}</div>
    `;
  }

  // =========================================================================
  // VIEW 6: JAVARUSH WEBLAB IDE & STATEFUL VIRTUAL LINUX ENGINE
  // =========================================================================
  function createInitialLabState(task) {
    return {
      cwd: "/root",
      prevCwd: "/root",
      history: [],
      logs: [
        { cls: "t-info", text: `SysRush Linux Lab v6.8.0-lpic (tty1) — ${task.title}` },
        { cls: "t-out", text: "Режим ручного CLI: вводи команды самостоятельно (↑/↓ история, Tab — автодополнение утилит). Жми «✅ Проверка» когда готов!\n" }
      ],
      answerInput: "",
      fillInput: "",
      builderValues: {},
      selectedLpicOpt: null,
      dirs: ["/root", "/etc", "/var", "/var/log", "/opt", "/tmp"],
      files: {
        "/proc/cmdline": "BOOT_IMAGE=/vmlinuz-6.8.0-generic root=UUID=8f3a-91c2 ro quiet splash",
        "/proc/meminfo": "MemTotal:       16384000 kB\nMemFree:         6420000 kB\nMemAvailable:   11200000 kB\nSwapTotal:       4194304 kB\nSwapFree:        4194304 kB",
        "/proc/swaps": "Filename\t\t\t\tType\t\tSize\t\tUsed\t\tPriority\n/dev/nvme0n1p3                          partition\t4194300\t\t0\t\t-2",
        "/etc/fstab": "UUID=8f3a-91c2  /          ext4  errors=remount-ro  0  1\nUUID=19ab-4401  /boot/efi  vfat  umask=0077         0  1",
        "/etc/passwd": "root:x:0:0:root:/root:/bin/bash\nwww-data:x:33:33:www-data:/var/www:/usr/sbin/nologin\npostgres:x:108:115:PostgreSQL:/var/lib/postgresql:/bin/bash",
        "/etc/crontab": "# m h dom mon dow user  command\n17 * * * * root cd / && run-parts --report /etc/cron.hourly",
        "/etc/ssh/sshd_config": "Port 22\nPubkeyAuthentication yes\nAuthorizedKeysFile .ssh/authorized_keys",
        "/var/log/syslog": "Nov 15 07:41:02 srv systemd[1]: Started OpenBSD Secure Shell server.\nNov 15 07:42:19 srv kernel: eth0: Link is up - 100Mbps/Full\nNov 15 07:44:51 srv postgres[842]: ERROR: could not bind IPv6 socket: Address already in use\nNov 15 07:45:00 srv cron[911]: (root) CMD (run-parts /etc/cron.hourly)",
        "/var/log/access.log": [
          "10.0.0.5 - - [15/Nov/2026:08:01:10 +0500] \"GET / HTTP/1.1\" 200 612",
          "185.220.101.9 - - [15/Nov/2026:08:01:12 +0500] \"POST /login HTTP/1.1\" 401 180",
          "185.220.101.9 - - [15/Nov/2026:08:01:13 +0500] \"POST /login HTTP/1.1\" 401 180",
          "10.0.0.5 - - [15/Nov/2026:08:01:15 +0500] \"GET /style.css HTTP/1.1\" 200 1024",
          "185.220.101.9 - - [15/Nov/2026:08:01:16 +0500] \"POST /login HTTP/1.1\" 401 180",
          "192.168.1.25 - - [15/Nov/2026:08:01:20 +0500] \"GET /api/health HTTP/1.1\" 200 42"
        ].join("\n"),
        "/etc/resolv.conf": (task.id === "t14_1" || task.id === "t20_boss") ? "# пустой файл! DNS не задан\n" : "nameserver 1.1.1.1\n",
        "/etc/hosts": "127.0.0.1   localhost\n192.168.1.50   sysrush-srv\n",
        "/root/id_ed25519": "-----BEGIN OPENSSH PRIVATE KEY-----\nb3BlbnNzaC1rZXktdjEAAAAABG5vbmU...\n-----END OPENSSH PRIVATE KEY-----",
        "/root/deploy.sh": "#!/bin/bash\necho 'Deploy successful!'",
        "/root/backup.sh": "#!/bin/bash\ntar -czf /var/backups/etc.tgz /etc",
        "/root/healthcheck.sh": "#!/bin/bash\nif [ -f \"$1\" ]; then\n  echo \"OK: File $1 exists!\"\nelse\n  echo \"ERROR: File $1 missing!\"\n  exit 1\nfi"
      },
      perms: {
        "id_ed25519": "644",
        "deploy.sh": "644",
        "backup.sh": "755",
        "healthcheck.sh": "644"
      },
      symlinks: {},
      archives: {},
      killedPids: [],
      renicedPids: {},
      bgJobs: [],
      lvmExtended: false,
      lvmSize: "60.00g",
      vgFree: "40.00g",
      sshKeyGenerated: false,
      rsyncDone: false,
      ulimitNofile: 1024,
      ulimitRaised: false,
      scriptTested: false,
      http200Ok: false,
      tcpdumpRan: false,
      iptablesDroppedIps: [],
      envVars: {
        PATH: "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin",
        USER: "root",
        HOME: "/root",
        SHELL: "/bin/bash"
      },
      users: {
        root: { uid: 0, shell: "/bin/bash", groups: ["root"] }
      },
      services: {
        nginx: { running: false, enabled: false },
        sshd: { running: true, enabled: true }
      },
      net: {
        eth0Ip: (task.id === "t13_1" || task.id === "t19_boss") ? null : "192.168.1.50/24",
        defaultGw: (task.id === "t13_1" || task.id === "t19_boss") ? null : "192.168.1.1",
        linkSpeed: task.id === "t12_1" ? "100Mb/s" : "1000Mb/s"
      },
      fw: {
        enabled: false,
        defaultIncoming: "allow",
        allowedPorts: []
      },
      lastExitCode: 0
    };
  }

  function normalizePath(p) {
    if (!p) return labState ? labState.cwd : "/root";
    const clean = p.trim().replace(/^["']|["']$/g, "");
    if (clean === "~") return "/root";
    if (clean.startsWith("~/")) return `/root/${clean.slice(2)}`;
    if (clean.startsWith("/")) return clean.replace(/\/+$/, "") || "/";
    const base = (labState && labState.cwd && labState.cwd !== "/") ? labState.cwd : "/root";
    return `${base}/${clean.replace(/^\.\//, "")}`.replace(/\/+/g, "/");
  }

  function permToRwx(oct) {
    const map = { "0": "---", "1": "--x", "2": "-w-", "4": "r--", "5": "r-x", "6": "rw-", "7": "rwx" };
    return String(oct).slice(-3).split("").map(d => map[d] || "---").join("");
  }

  function execLinuxCommand(rawLine) {
    const cmdLine = rawLine.trim();
    if (!cmdLine) return;

    labState.history.push(cmdLine);
    cmdHistoryIdx = labState.history.length;
    labState.logs.push({ cls: "t-cmd", text: `root@sysrush:${labState.cwd === "/root" ? "~" : labState.cwd}# ${cmdLine}` });

    if (cmdLine === "clear") {
      labState.logs = [];
      return;
    }

    let redirectFile = null;
    let appendMode = false;
    let workCmd = cmdLine.replace(/\s+2>\/dev\/null/g, "").replace(/\s+2>&1/g, "");

    // Handle background job (&) if not a pipe
    if (!workCmd.includes("|") && (workCmd.startsWith("nohup ") || /\s&\s*$/.test(workCmd))) {
      const cleanJob = workCmd.replace(/\s*&\s*$/, "").trim();
      const jobId = labState.bgJobs.length + 1;
      const pid = 1420 + jobId * 7;
      labState.bgJobs.push({ id: jobId, pid, cmd: cleanJob });
      const msg = workCmd.startsWith("nohup ")
        ? `[${jobId}] ${pid}\nnohup: ignoring input and appending output to 'nohup.out'`
        : `[${jobId}] ${pid}`;
      labState.logs.push({ cls: "t-out", text: msg });
      labState.lastExitCode = 0;
      return;
    }

    if (workCmd.includes(">>")) {
      const idx = workCmd.indexOf(">>");
      redirectFile = normalizePath(workCmd.slice(idx + 2));
      workCmd = workCmd.slice(0, idx).trim();
      appendMode = true;
    } else if (workCmd.includes(">")) {
      const idx = workCmd.indexOf(">");
      redirectFile = normalizePath(workCmd.slice(idx + 1));
      workCmd = workCmd.slice(0, idx).trim();
      appendMode = false;
    }

    const pipeStages = workCmd.split("|").map(s => s.trim());
    let output = runBaseCommand(pipeStages[0]);

    for (let i = 1; i < pipeStages.length; i++) {
      const stage = pipeStages[i];
      if (stage.startsWith("grep ")) {
        const isCi = /\s-[a-zA-Z]*i/.test(stage);
        const isInv = /\s-[a-zA-Z]*v/.test(stage);
        const pat = stage.replace(/^grep\s+(-[iEvn]+\s+)*/, "").replace(/^["']|["']$/g, "");
        let rx = null;
        try { rx = new RegExp(pat, isCi ? "i" : ""); } catch (e) {}
        output = output
          .split("\n")
          .filter(line => {
            const matched = rx ? rx.test(line) : (isCi ? line.toLowerCase().includes(pat.toLowerCase()) : line.includes(pat));
            return isInv ? !matched : matched;
          })
          .join("\n");
      } else if (stage === "wc -l") {
        output = String(output ? output.split("\n").filter(Boolean).length : 0);
      } else if (stage === "sort" || stage.startsWith("sort ")) {
        const lines = output ? output.split("\n").filter(Boolean) : [];
        const rev = stage.includes("-r");
        const num = stage.includes("-n");
        lines.sort((a, b) => num ? (parseFloat(a) - parseFloat(b)) : a.localeCompare(b));
        if (rev) lines.reverse();
        output = lines.join("\n");
      } else if (stage === "uniq" || stage.startsWith("uniq ")) {
        const lines = output ? output.split("\n").filter(Boolean) : [];
        const withCount = stage.includes("-c");
        const groups = [];
        for (const l of lines) {
          if (groups.length && groups[groups.length - 1].val === l) {
            groups[groups.length - 1].cnt++;
          } else {
            groups.push({ val: l, cnt: 1 });
          }
        }
        output = groups.map(g => withCount ? `      ${g.cnt} ${g.val}` : g.val).join("\n");
      } else if (stage.startsWith("cut ")) {
        const delim = stage.match(/-d\s*["']?([^"'\s])["']?/)?.[1] || "\t";
        const fNum = parseInt(stage.match(/-f\s*(\d+)/)?.[1] || "1", 10);
        output = (output || "").split("\n").filter(Boolean).map(l => (l.split(delim)[fNum - 1] || "")).join("\n");
      } else if (stage.startsWith("awk ")) {
        const sep = stage.match(/-F\s*["']?([^"'\s])["']?/)?.[1] || null;
        const col = parseInt(stage.match(/\$(\d+)/)?.[1] || "1", 10);
        output = (output || "").split("\n").filter(Boolean).map(l => {
          const cols = sep ? l.split(sep) : l.trim().split(/\s+/);
          return col === 0 ? l : (cols[col - 1] || "");
        }).join("\n");
      } else if (stage.startsWith("head") || stage.startsWith("tail")) {
        const n = parseInt(stage.match(/-n\s*(\d+)/)?.[1] || "5", 10);
        const lines = (output || "").split("\n");
        output = (stage.startsWith("head") ? lines.slice(0, n) : lines.slice(-n)).join("\n");
      } else if (stage.startsWith("tr ")) {
        if (stage.includes("a-z") && stage.includes("A-Z")) output = (output || "").toUpperCase();
        else if (stage.includes("A-Z") && stage.includes("a-z")) output = (output || "").toLowerCase();
      } else if (stage.startsWith("tee ")) {
        const appendTee = stage.includes("-a ");
        const parts = stage.split(/\s+/);
        const tPath = normalizePath(parts[parts.length - 1]);
        const prev = appendTee && labState.files[tPath] ? labState.files[tPath].replace(/\n$/, "") + "\n" : "";
        labState.files[tPath] = prev + output;
      }
    }

    if (redirectFile) {
      if (redirectFile !== "/dev/null") {
        const prev = appendMode && labState.files[redirectFile] ? labState.files[redirectFile].replace(/\n$/, "") + "\n" : "";
        labState.files[redirectFile] = prev + output;
        labState.logs.push({ cls: "t-info", text: `[Записано в ${redirectFile}]` });
      }
      labState.lastExitCode = 0;
    } else if (output) {
      const isErr = output.startsWith("bash:") || output.startsWith("Error:") || output.includes("unreachable") || output.includes("timed out") || output.includes("Permission denied") || output.includes("502 Bad Gateway");
      labState.lastExitCode = isErr ? 1 : 0;
      labState.logs.push({ cls: isErr ? "t-err" : "t-out", text: output });
    } else {
      labState.lastExitCode = 0;
    }
  }

  function runBaseCommand(rawCmd) {
    const cmd = rawCmd.replace(/^sudo\s+/, "").trim();
    if (cmd === "pwd") return labState.cwd;
    if (cmd === "whoami") return "root";
    if (cmd === "uname -r" || cmd === "uname -a") return "6.8.0-45-generic x86_64 GNU/Linux";
    if (cmd === "echo $?") return String(labState.lastExitCode);
    if (cmd === "echo $PATH") return labState.envVars.PATH;
    if (cmd === "echo $HOME") return labState.envVars.HOME;
    if (cmd === "echo $USER") return labState.envVars.USER;

    if (cmd === "env" || cmd === "printenv") {
      return Object.entries(labState.envVars).map(([k, v]) => `${k}=${v}`).join("\n");
    }
    if (cmd.startsWith("export ")) {
      const m = cmd.slice(7).trim().match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (m) {
        labState.envVars[m[1]] = m[2].replace(/^["']|["']$/g, "");
        return "";
      }
      return "export: синтаксис -> export KEY=VALUE";
    }

    if (cmd === "cd" || cmd === "cd ~") {
      labState.prevCwd = labState.cwd;
      labState.cwd = "/root";
      return "";
    }
    if (cmd.startsWith("cd ")) {
      const arg = cmd.slice(3).trim();
      let target = labState.cwd;
      if (arg === "-") target = labState.prevCwd || "/root";
      else if (arg === "..") target = labState.cwd.split("/").slice(0, -1).join("/") || "/";
      else target = normalizePath(arg);
      labState.prevCwd = labState.cwd;
      labState.cwd = target;
      if (!labState.dirs.includes(target)) labState.dirs.push(target);
      return "";
    }

    if (cmd.startsWith("which ")) {
      const bin = cmd.slice(6).trim().split(/\s+/)[0];
      const map = {
        nginx: "/usr/sbin/nginx",
        sshd: "/usr/sbin/sshd",
        bash: "/usr/bin/bash",
        ls: "/usr/bin/ls",
        grep: "/usr/bin/grep",
        python3: "/usr/bin/python3",
        docker: "/usr/bin/docker",
        iptables: "/usr/sbin/iptables",
        ufw: "/usr/sbin/ufw"
      };
      return map[bin] || `/usr/bin/${bin}`;
    }

    if (cmd.startsWith("type ")) {
      const t = cmd.slice(5).trim();
      if (["cd", "echo", "export", "ulimit", "jobs", "umask"].includes(t)) return `${t} is a shell builtin`;
      return `${t} is /usr/bin/${t}`;
    }

    if (cmd.startsWith("man ")) {
      const parts = cmd.slice(4).trim().split(/\s+/);
      const sec = /^\d+$/.test(parts[0]) ? parts[0] : "1";
      const topic = parts[parts.length - 1];
      const secDesc = sec === "5" ? "File Formats & Configuration (Конфиги)" : (sec === "8" ? "System Administration (Команды root)" : "User Commands (Пользовательские команды)");
      return [
        `${topic.toUpperCase()}(${sec})               Linux Programmer's Manual — ${secDesc}`,
        `NAME: ${topic} — справочная страница раздела (${sec})`,
        "SYNOPSIS: используй флаги из лекции (выход из реального man — клавиша q)."
      ].join("\n");
    }

    if (cmd.startsWith("mkdir ")) {
      const hasP = /\s-p(\s|$)/.test(cmd);
      const parts = cmd.split(/\s+/).filter(t => t !== "mkdir" && !t.startsWith("-"));
      for (const rawDir of parts) {
        const full = normalizePath(rawDir);
        if (hasP) {
          const segs = full.split("/").filter(Boolean);
          let cur = "";
          for (const s of segs) {
            cur += "/" + s;
            if (!labState.dirs.includes(cur)) labState.dirs.push(cur);
          }
        } else {
          const parent = full.split("/").slice(0, -1).join("/") || "/";
          if (parent !== "/" && !labState.dirs.includes(parent)) {
            return `mkdir: cannot create directory ‘${rawDir}’: No such file or directory (используй флаг -p!)`;
          }
          if (!labState.dirs.includes(full)) labState.dirs.push(full);
        }
      }
      return "";
    }

    if (cmd.startsWith("cp ")) {
      const args = cmd.split(/\s+/).filter(t => t !== "cp" && !t.startsWith("-"));
      if (args.length >= 2) {
        const src = normalizePath(args[0]);
        let dst = normalizePath(args[1]);
        if (labState.dirs.includes(dst)) {
          dst = `${dst}/${src.split("/").pop()}`;
        }
        if (labState.files[src] === undefined) return `cp: cannot stat '${src}': No such file or directory`;
        labState.files[dst] = labState.files[src];
        return "";
      }
      return "cp: синтаксис -> cp <откуда> <куда>";
    }

    if (cmd.startsWith("mv ")) {
      const args = cmd.split(/\s+/).filter(t => t !== "mv" && !t.startsWith("-"));
      if (args.length >= 2) {
        const src = normalizePath(args[0]);
        const dst = normalizePath(args[1]);
        if (labState.files[src] === undefined) return `mv: cannot stat '${src}': No such file or directory`;
        labState.files[dst] = labState.files[src];
        delete labState.files[src];
        return "";
      }
      return "mv: синтаксис -> mv <откуда> <куда>";
    }

    if (cmd === "lscpu" || cmd.startsWith("lscpu ")) {
      return [
        "Architecture:            x86_64",
        "CPU op-mode(s):          32-bit, 64-bit",
        "CPU(s):                  8",
        "Thread(s) per core:      2",
        "Core(s) per socket:      4",
        "Socket(s):               1",
        "Model name:              AMD EPYC 4344P 4-Core / 8-Thread",
        "L1d cache:               128 KiB",
        "L2 cache:                4 MiB",
        "L3 cache:                32 MiB"
      ].join("\n");
    }

    if (cmd === "free" || cmd.startsWith("free ")) {
      return [
        "               total        used        free      shared  buff/cache   available",
        "Mem:           15Gi       4.2Gi       6.1Gi        84Mi       5.1Gi        10Gi",
        "Swap:         4.0Gi          0B       4.0Gi"
      ].join("\n");
    }

    if (cmd.startsWith("swapon")) {
      return "NAME           TYPE      SIZE USED PRIO\n/dev/nvme0n1p3 partition   4G   0B   -2";
    }

    if (cmd.startsWith("lspci")) {
      const withK = cmd.includes("-k") || cmd.includes("-v");
      return [
        "00:00.0 Host bridge: Advanced Micro Devices, Inc. [AMD] Root Complex",
        "01:00.0 Non-Volatile memory controller: Samsung Electronics NVMe SSD Controller PM9A1",
        ...(withK ? ["\tSubsystem: Samsung Electronics Co Ltd NVMe SSD", "\tKernel driver in use: nvme"] : []),
        "02:00.0 Ethernet controller: Intel Corporation I350 Gigabit Network Connection (rev 01)",
        ...(withK ? ["\tSubsystem: Intel Corporation Ethernet Server Adapter I350-T2", "\tKernel driver in use: igb", "\tKernel modules: igb"] : [])
      ].join("\n");
    }

    if (cmd === "lsusb" || cmd.startsWith("lsusb ")) return "Bus 001 Device 001: ID 1d6b:0002 Linux Foundation 2.0 root hub";
    if (cmd === "lsmod" || cmd.startsWith("lsmod ")) return "Module                  Size  Used by\nigb                   282624  0\nnvme                   57344  3\next4                  995328  1";
    if (cmd.startsWith("modprobe ")) return "";
    if (cmd === "dmesg" || cmd.startsWith("dmesg ")) return "[    0.412011] nvme nvme0: pci function 0000:01:00.0\n[    1.184220] igb 0000:02:00.0: Intel(R) Gigabit Ethernet Network Connection";

    if (cmd === "lsblk" || cmd.startsWith("lsblk ")) {
      if (cmd.includes("-f")) {
        return [
          "NAME                FSTYPE      UUID      MOUNTPOINTS",
          "nvme0n1                                   ",
          "├─nvme0n1p1         vfat        19ab-4401 /boot/efi",
          "├─nvme0n1p2         ext4        8f3a-91c2 /",
          "└─nvme0n1p3         swap        swap-7721 [SWAP]",
          "nvme1n1             LVM2_member           ",
          "└─vg_data-lv_app    ext4        c410-88ef /srv/app"
        ].join("\n");
      }
      return [
        "NAME                MAJ:MIN RM   SIZE RO TYPE MOUNTPOINTS",
        "nvme0n1             259:0    0   512G  0 disk ",
        "├─nvme0n1p1         259:1    0   512M  0 part /boot/efi",
        "├─nvme0n1p2         259:2    0   490G  0 part /",
        "└─nvme0n1p3         259:3    0  21.5G  0 part [SWAP]",
        "nvme1n1             259:4    0   100G  0 disk ",
        `└─vg_data-lv_app    253:0    0   ${labState.lvmSize.replace(".00g", "G")}  0 lvm  /srv/app`
      ].join("\n");
    }

    if (cmd === "blkid" || cmd.startsWith("blkid ")) {
      return [
        "/dev/nvme0n1p1: UUID=\"19ab-4401\" TYPE=\"vfat\"",
        "/dev/nvme0n1p2: UUID=\"8f3a-91c2\" TYPE=\"ext4\"",
        "/dev/nvme0n1p3: UUID=\"swap-7721\" TYPE=\"swap\"",
        "/dev/mapper/vg_data-lv_app: UUID=\"c410-88ef\" TYPE=\"ext4\""
      ].join("\n");
    }

    if (cmd === "df -i" || cmd.startsWith("df -i ")) {
      return [
        "Filesystem       Inodes  IUsed    IFree IUse% Mounted on",
        "/dev/nvme0n1p2 32112640 245120 31867520    1% /",
        "/dev/nvme0n1p1        0      0        0     - /boot/efi"
      ].join("\n");
    }

    if (cmd === "df -h" || cmd === "df" || cmd.startsWith("df ")) {
      const appSz = labState.lvmExtended ? "80G   58G   22G  73%" : "60G   58G  2.0G  97%";
      return [
        "Filesystem                  Size  Used Avail Use% Mounted on",
        "/dev/nvme0n1p2              490G   64G  426G  14% /",
        "/dev/nvme0n1p1              511M  6.1M  505M   2% /boot/efi",
        `/dev/mapper/vg_data-lv_app   ${appSz} /srv/app`
      ].join("\n");
    }

    if (cmd.startsWith("du ")) {
      return [
        "12M\t/var/backups",
        "148M\t/var/cache",
        "284M\t/var/lib",
        "18G\t/var/log",
        "4.0K\t/var/tmp"
      ].join("\n");
    }

    if (cmd === "pvs" || cmd.startsWith("pvs ")) {
      return `  PV           VG      Fmt  Attr PSize   PFree\n  /dev/nvme1n1 vg_data lvm2 a--  100.00g ${labState.vgFree}`;
    }
    if (cmd === "vgs" || cmd.startsWith("vgs ")) {
      return `  VG      #PV #LV #SN Attr   VSize   VFree\n  vg_data   1   1   0 wz--n- 100.00g ${labState.vgFree}`;
    }
    if (cmd === "lvs" || cmd.startsWith("lvs ")) {
      return `  LV     VG      Attr       LSize  Pool Origin Data%\n  lv_app vg_data -wi-ao---- ${labState.lvmSize}`;
    }
    if (cmd.startsWith("lvextend ")) {
      if (!cmd.includes("vg_data") && !cmd.includes("lv_app")) {
        return "lvextend: укажи том /dev/vg_data/lv_app (например: lvextend -r -L +20G /dev/vg_data/lv_app)";
      }
      labState.lvmExtended = true;
      labState.lvmSize = "80.00g";
      labState.vgFree = "20.00g";
      const fsMsg = cmd.includes("-r") ? "\nresize2fs 1.47.0: Filesystem at /dev/mapper/vg_data-lv_app resized on-line to 80G!" : "";
      return `  Size of logical volume vg_data/lv_app changed from 60.00 GiB to 80.00 GiB.\n  Logical volume vg_data/lv_app successfully resized.${fsMsg}`;
    }

    if (cmd === "apt update" || cmd === "sudo apt update") {
      return "Hit:1 http://archive.ubuntu.com/ubuntu noble InRelease\nFetched 184 kB in 0.4s\nReading package lists... Done\nAll packages are up to date.";
    }
    if (cmd.startsWith("apt install ") || cmd.startsWith("dnf install ")) {
      const pkg = cmd.split(/\s+/).slice(2).join(" ");
      return `Setting up ${pkg} (1.24.0-2) ...\nProcessing triggers for man-db ... Done.`;
    }
    if (cmd === "dpkg -l" || cmd.startsWith("dpkg -l ") || cmd === "rpm -qa" || cmd.startsWith("rpm -qa ")) {
      return "ii  bash            5.2.21-2   amd64  GNU Bourne Again SHell\nii  openssh-server  1:9.6p1    amd64  secure shell (SSH) server\nii  nginx           1.24.0-2   amd64  high performance web server";
    }
    if (cmd.startsWith("dpkg -S ") || cmd.startsWith("rpm -qf ")) {
      const p = cmd.split(/\s+/).slice(2).join(" ").trim();
      if (p.includes("sshd")) return "openssh-server: /usr/sbin/sshd";
      if (p.includes("nginx")) return "nginx: /usr/sbin/nginx";
      return `coreutils: ${p}`;
    }
    if (cmd.startsWith("dpkg -L ") || cmd.startsWith("rpm -ql ")) {
      const pkg = cmd.split(/\s+/).slice(2).join(" ").trim();
      if (pkg.includes("nginx")) {
        return "/etc/nginx\n/etc/nginx/nginx.conf\n/etc/nginx/sites-enabled/default\n/usr/sbin/nginx\n/lib/systemd/system/nginx.service";
      }
      return `/usr/bin/${pkg}\n/etc/${pkg}.conf\n/usr/share/doc/${pkg}/copyright`;
    }

    if (cmd === "uptime" || cmd.startsWith("uptime ")) {
      return " 10:15:42 up 14 days,  3:22,  1 user,  load average: 2.48, 1.92, 1.15";
    }

    if (cmd === "ps aux" || cmd === "ps -ef" || cmd === "top") {
      const rows = [
        "USER       PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND",
        "root         1  0.0  0.1 168420 13120 ?        Ss   07:00   0:01 /sbin/init",
        "root       519  0.0  0.1  15420  9200 ?        Ss   07:00   0:00 sshd: /usr/sbin/sshd",
        "postgres   842  0.2  0.8 218400 64200 ?        Ss   07:01   0:03 /usr/lib/postgresql/16/bin/postgres"
      ];
      if (!labState.killedPids.includes("6660")) {
        rows.push("root      6660 99.2  4.5 894120 361000 ?       Rl   07:15  42:18 /tmp/cryptominer --threads=8");
      }
      labState.bgJobs.forEach(j => {
        rows.push(`root      ${j.pid}  0.4  0.2  18200  4100 pts/0    SN   10:16   0:00 ${j.cmd}`);
      });
      return rows.join("\n");
    }

    if (cmd.startsWith("renice ")) {
      const prio = cmd.match(/-n\s+(-?\d+)/)?.[1] || "15";
      const pid = cmd.match(/-p\s+(\d+)/)?.[1] || cmd.split(/\s+/).pop();
      labState.renicedPids[pid] = prio;
      return `${pid} (process ID) old priority 0, new priority ${prio}`;
    }

    if (cmd.startsWith("nice ")) {
      return `[Процесс запущен со стартовым приоритетом nice]`;
    }

    if (cmd === "jobs") {
      if (!labState.bgJobs.length) return "[Фоновых задач в текущем шелле пока нет]";
      return labState.bgJobs.map(j => `[${j.id}]+  Running                 ${j.cmd} &`).join("\n");
    }

    if (cmd.startsWith("kill ")) {
      const parts = cmd.split(/\s+/);
      const pid = parts[parts.length - 1];
      if (pid === "6660") {
        if (!labState.killedPids.includes("6660")) labState.killedPids.push("6660");
        return `[Процесс PID ${pid} (/tmp/cryptominer) уничтожен! Нагрузка CPU упала до 0.3%]`;
      }
      return `kill: (${pid}) - No such process`;
    }

    if (cmd === "umask" || cmd.startsWith("umask ")) return "0022";
    if (cmd.startsWith("chown ")) return "";
    if (cmd === "visudo" || cmd.startsWith("visudo ")) return "visudo: /etc/sudoers: parsed OK (синтаксис проверен без ошибок)";

    if (cmd.startsWith("useradd ")) {
      const parts = cmd.split(/\s+/);
      const uname = parts[parts.length - 1];
      labState.users[uname] = {
        uid: 1001,
        shell: cmd.includes("-s ") ? (cmd.match(/-s\s+(\S+)/)?.[1] || "/bin/bash") : "/bin/sh",
        groups: [uname]
      };
      labState.files["/etc/passwd"] += `\n${uname}:x:1001:1001::/home/${uname}:${labState.users[uname].shell}`;
      return "";
    }

    if (cmd.startsWith("usermod ")) {
      const m = cmd.match(/usermod\s+-aG\s+(\S+)\s+(\S+)/);
      if (m) {
        const [, grp, uname] = m;
        if (!labState.users[uname]) return `usermod: user '${uname}' does not exist`;
        if (!labState.users[uname].groups.includes(grp)) labState.users[uname].groups.push(grp);
        return "";
      }
      return "Подсказка: используй usermod -aG <группа> <пользователь>";
    }

    if (cmd.startsWith("id")) {
      const uname = cmd.split(/\s+/)[1] || "root";
      const u = labState.users[uname];
      if (!u) return `id: ‘${uname}’: no such user`;
      const grps = u.groups.map((g, idx) => `${idx === 0 ? u.uid : 27}(${g})`).join(",");
      return `uid=${u.uid}(${uname}) gid=${u.uid}(${uname}) groups=${grps}`;
    }

    if (cmd === "systemctl get-default") return "multi-user.target";
    if (cmd.startsWith("systemctl ")) {
      const [, action, rawSvc] = cmd.split(/\s+/);
      const svc = (rawSvc || "").replace(/\.service$/, "");
      if (action === "daemon-reload") return "";
      if (!labState.services[svc]) labState.services[svc] = { running: false, enabled: false };
      if (action === "start" || action === "restart") {
        labState.services[svc].running = true;
        return "";
      }
      if (action === "stop") {
        labState.services[svc].running = false;
        return "";
      }
      if (action === "enable") {
        labState.services[svc].enabled = true;
        if (cmd.includes("--now")) labState.services[svc].running = true;
        return `Created symlink /etc/systemd/system/multi-user.target.wants/${svc}.service.`;
      }
      if (action === "status") {
        const st = labState.services[svc];
        return [
          `● ${svc}.service - System Service (${svc})`,
          `     Loaded: loaded (/lib/systemd/system/${svc}.service; ${st.enabled ? "enabled" : "disabled"})`,
          `     Active: ${st.running ? "active (running)" : "inactive (dead)"}`
        ].join("\n");
      }
    }

    if (cmd.startsWith("journalctl")) {
      return [
        "Nov 15 08:10:01 sysrush systemd[1]: nginx.service: Was stopped before reboot.",
        "Nov 15 08:10:02 sysrush nginx[680]: [notice] configuration file /etc/nginx/nginx.conf syntax is ok"
      ].join("\n");
    }

    if (cmd === "timedatectl" || cmd.startsWith("timedatectl ")) {
      return [
        "               Local time: Sun 2026-11-15 09:00:00 +05",
        "           Universal time: Sun 2026-11-15 04:00:00 UTC",
        "System clock synchronized: yes",
        "              NTP service: active"
      ].join("\n");
    }

    if (cmd === "sshd -t") {
      const cfg = labState.files["/etc/ssh/sshd_config"] || "";
      return cfg.includes("PermitRootLogin") ? "" : "[Подсказка: синтаксис валиден, но PermitRootLogin ещё не задан]";
    }

    if (cmd.startsWith("ssh-keygen")) {
      labState.sshKeyGenerated = true;
      labState.files["/root/.ssh/id_ed25519"] = "-----BEGIN OPENSSH PRIVATE KEY-----\n...";
      labState.files["/root/.ssh/id_ed25519.pub"] = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIKp7x... root@sysrush";
      return [
        "Generating public/private ed25519 key pair.",
        "Your identification has been saved in /root/.ssh/id_ed25519",
        "Your public key has been saved in /root/.ssh/id_ed25519.pub",
        "The key fingerprint is: SHA256:9xL4pQv7kM2sT8wR1nF6 root@sysrush"
      ].join("\n");
    }

    if (cmd.startsWith("rsync ")) {
      labState.rsyncDone = true;
      return [
        "sending incremental file list",
        "etc/fstab",
        "etc/hosts",
        "etc/passwd",
        "sent 4,812 bytes  received 92 bytes  9,808.00 bytes/sec",
        "total size is 68,420  speedup is 13.95 (дельта-синхронизация завершена!)"
      ].join("\n");
    }

    if (cmd.startsWith("scp ")) {
      return "hosts                                         100%  142   185.2KB/s   00:00";
    }

    if (cmd === "ulimit -n" || cmd === "ulimit -a") {
      return String(labState.ulimitNofile);
    }
    if (cmd.startsWith("ulimit -n ")) {
      const n = parseInt(cmd.slice(10).trim(), 10);
      if (!isNaN(n) && n >= 4096) {
        labState.ulimitNofile = n;
        labState.ulimitRaised = true;
      }
      return "";
    }

    if (cmd === "aa-status" || cmd.startsWith("aa-status ")) {
      return [
        "apparmor module is loaded.",
        "18 profiles are loaded.",
        "16 profiles are in enforce mode.",
        "   /usr/sbin/nginx",
        "   /usr/sbin/sshd"
      ].join("\n");
    }
    if (cmd === "getenforce") return "Enforcing";

    if (cmd.startsWith("docker ps")) {
      return [
        "CONTAINER ID   IMAGE          COMMAND                  CREATED       STATUS       PORTS                  NAMES",
        "9f41c8a201b4   nginx:alpine   \"/docker-entrypoint.…\"   2 hours ago   Up 2 hours   0.0.0.0:8080->80/tcp   web-proxy",
        "4b12e9d073c1   redis:7        \"docker-entrypoint.s…\"   2 hours ago   Up 2 hours   6379/tcp               cache-redis"
      ].join("\n");
    }

    if (cmd.startsWith("tar ")) {
      const m = cmd.match(/-c[zvf]*\s+(\S+)\s+(\S+)/) || cmd.match(/tar\s+-czvf\s+(\S+)\s+(\S+)/);
      if (m) {
        const archPath = normalizePath(m[1]);
        labState.archives[archPath] = m[2];
        return `/etc/fstab\n/etc/passwd\n/etc/hosts\n/etc/resolv.conf\n[Архив ${archPath} успешно создан!]`;
      }
      if (cmd.includes("-t")) return "etc/fstab\netc/passwd\netc/hosts\netc/resolv.conf";
      return "Подсказка синтаксиса: tar -czvf /root/etc-backup.tar.gz /etc";
    }

    if (cmd.startsWith("find ")) {
      return "/var/log/syslog\n/var/log/access.log";
    }

    if (cmd.startsWith("wc -l ")) {
      const target = normalizePath(cmd.slice(6));
      const content = labState.files[target];
      if (content === undefined) return `wc: ${target}: No such file or directory`;
      const cnt = content.split("\n").filter(Boolean).length;
      return `${cnt} ${target}`;
    }

    if (cmd.startsWith("head ") || cmd.startsWith("tail ")) {
      const parts = cmd.split(/\s+/);
      const target = normalizePath(parts[parts.length - 1]);
      const content = labState.files[target];
      if (content === undefined) return `${parts[0]}: ${target}: No such file or directory`;
      const lines = content.split("\n");
      const n = cmd.includes("-n ") ? parseInt(cmd.match(/-n\s+(\d+)/)?.[1] || "5", 10) : 5;
      return (cmd.startsWith("head") ? lines.slice(0, n) : lines.slice(-n)).join("\n");
    }

    if (cmd.startsWith("cut ")) {
      const delim = cmd.match(/-d\s*["']?([^"'\s])["']?/)?.[1] || "\t";
      const fNum = parseInt(cmd.match(/-f\s*(\d+)/)?.[1] || "1", 10);
      const parts = cmd.split(/\s+/);
      const file = normalizePath(parts[parts.length - 1]);
      const content = labState.files[file];
      if (content === undefined) return `cut: ${file}: No such file or directory`;
      return content.split("\n").filter(Boolean).map(l => (l.split(delim)[fNum - 1] || "")).join("\n");
    }

    if (cmd.startsWith("awk ")) {
      const sep = cmd.match(/-F\s*["']?([^"'\s])["']?/)?.[1] || null;
      const col = parseInt(cmd.match(/\$(\d+)/)?.[1] || "1", 10);
      const parts = cmd.split(/\s+/);
      const file = normalizePath(parts[parts.length - 1]);
      const content = labState.files[file];
      if (content === undefined) return `awk: can't open file ${file}`;
      return content.split("\n").filter(Boolean).map(l => {
        const cols = sep ? l.split(sep) : l.trim().split(/\s+/);
        return col === 0 ? l : (cols[col - 1] || "");
      }).join("\n");
    }

    if (cmd.startsWith("sort ")) {
      const parts = cmd.split(/\s+/).filter(t => t !== "sort" && !t.startsWith("-"));
      const file = normalizePath(parts[parts.length - 1]);
      const content = labState.files[file];
      if (content === undefined) return `sort: cannot read: ${file}: No such file or directory`;
      return content.split("\n").filter(Boolean).sort().join("\n");
    }

    if (cmd.startsWith("sed ")) {
      const inPlace = cmd.includes("-i");
      const m = cmd.match(/s\/([^/]+)\/([^/]*)\/([g]*)/);
      const parts = cmd.split(/\s+/);
      const file = normalizePath(parts[parts.length - 1]);
      const content = labState.files[file];
      if (!m || content === undefined) return `sed: проверь выражение 's/старое/новое/g' и путь к файлу`;
      const updated = content.replace(new RegExp(m[1], m[3].includes("g") ? "g" : ""), m[2]);
      if (inPlace) {
        labState.files[file] = updated;
        return "";
      }
      return updated;
    }

    if (cmd.startsWith("echo ")) {
      return cmd.slice(5).trim().replace(/^["']|["']$/g, "");
    }

    if (cmd.startsWith("cat ")) {
      const target = normalizePath(cmd.slice(4));
      if (labState.files[target] !== undefined) return labState.files[target];
      return `cat: ${target}: No such file or directory`;
    }

    if (cmd.startsWith("grep ")) {
      const isCi = /\s-[a-zA-Z]*i/.test(cmd);
      const isInv = /\s-[a-zA-Z]*v/.test(cmd);
      const tokens = cmd.split(/\s+/);
      if (tokens.length >= 3) {
        const pat = tokens[tokens.length - 2].replace(/^["']|["']$/g, "");
        const file = normalizePath(tokens[tokens.length - 1]);
        const content = labState.files[file];
        if (content === undefined) return `grep: ${file}: No such file or directory`;
        let rx = null;
        try { rx = new RegExp(pat, isCi ? "i" : ""); } catch (e) {}
        return content.split("\n").filter(l => {
          const matched = rx ? rx.test(l) : (isCi ? l.toLowerCase().includes(pat.toLowerCase()) : l.includes(pat));
          return isInv ? !matched : matched;
        }).join("\n");
      }
    }

    if (cmd.startsWith("ln -s ")) {
      const parts = cmd.split(/\s+/);
      if (parts.length >= 4) {
        const src = normalizePath(parts[2]);
        const dst = normalizePath(parts[3]);
        labState.symlinks[dst] = src;
        return "";
      }
      return "Синтаксис: ln -s <оригинал> <ссылка>";
    }

    if (cmd === "ls" || cmd.startsWith("ls -")) {
      const pKey = permToRwx(labState.perms["id_ed25519"] || "644");
      const pSh = permToRwx(labState.perms["deploy.sh"] || "644");
      const pBk = permToRwx(labState.perms["backup.sh"] || "755");
      const pHc = permToRwx(labState.perms["healthcheck.sh"] || "644");
      if (cmd === "ls") {
        const extras = [
          labState.files["/root/errors.txt"] ? "errors.txt" : "",
          labState.archives["/root/etc-backup.tar.gz"] ? "etc-backup.tar.gz" : "",
          ...Object.keys(labState.symlinks).map(k => k.replace("/root/", ""))
        ].filter(Boolean);
        return ["backup.sh", "deploy.sh", "healthcheck.sh", "id_ed25519", ...extras].join("  ");
      }
      const lines = [
        `-${pBk} 1 root root   64 Nov 15 07:10 backup.sh`,
        `-${pSh} 1 root root   42 Nov 15 07:30 deploy.sh`,
        `-${pHc} 1 root root  118 Nov 15 07:35 healthcheck.sh`,
        `-${pKey} 1 root root  412 Nov 15 07:20 id_ed25519`
      ];
      if (labState.sshKeyGenerated) {
        lines.push("drwx------ 2 root root 4096 Nov 15 10:05 .ssh");
      }
      if (labState.files["/root/errors.txt"]) {
        lines.push("-rw-r--r-- 1 root root   95 Nov 15 07:50 errors.txt");
      }
      if (labState.archives["/root/etc-backup.tar.gz"]) {
        lines.push("-rw-r--r-- 1 root root 4096 Nov 15 08:20 etc-backup.tar.gz");
      }
      Object.entries(labState.symlinks).forEach(([lnk, tgt]) => {
        lines.push(`lrwxrwxrwx 1 root root   15 Nov 15 08:25 ${lnk.replace("/root/", "")} -> ${tgt}`);
      });
      return lines.join("\n");
    }

    if (cmd.startsWith("chmod ")) {
      const parts = cmd.split(/\s+/);
      if (parts.length >= 3) {
        let mode = parts[1];
        const fname = parts[2].replace(/^\/root\//, "").replace(/^\.\//, "");
        if (mode === "+x" || mode === "u+x" || mode === "a+x") mode = "755";
        labState.perms[fname] = mode;
        return "";
      }
      return "chmod: проверь режим и имя файла";
    }

    if (cmd === "./deploy.sh" || cmd === "/root/deploy.sh" || cmd === "./run" || cmd === "/root/run") {
      const mode = labState.perms["deploy.sh"] || "644";
      if (!["755", "750", "700", "775", "777", "+x"].includes(mode)) {
        return "bash: ./deploy.sh: Permission denied (нет бита исполнения 'x'!)";
      }
      return "🚀 Deploy successful! Production updated.";
    }

    if (cmd.startsWith("./healthcheck.sh") || cmd.startsWith("/root/healthcheck.sh")) {
      const mode = labState.perms["healthcheck.sh"] || "644";
      if (!["755", "750", "700", "775", "777", "+x"].includes(mode)) {
        return "bash: ./healthcheck.sh: Permission denied (сначала выдай права chmod 755 healthcheck.sh!)";
      }
      const arg = cmd.split(/\s+/)[1] || "";
      if (!arg) {
        return "ERROR: File  missing! (передай аргумент $1, например: ./healthcheck.sh /etc/passwd)";
      }
      const normArg = normalizePath(arg);
      if (labState.files[normArg] !== undefined) {
        labState.scriptTested = true;
        return `OK: File ${arg} exists!`;
      }
      return `ERROR: File ${arg} missing!`;
    }

    if (cmd === "ethtool eth0" || cmd.startsWith("ethtool ")) {
      return [
        "Settings for eth0:",
        `\tSpeed: ${labState.net.linkSpeed}`,
        "\tDuplex: Full",
        "\tPort: Twisted Pair",
        "\tLink detected: yes",
        ...(labState.net.linkSpeed === "100Mb/s" ? ["\t[Diagnostics: Pair C/D open circuit — работают только 4 жилы из 8!]"] : [])
      ].join("\n");
    }

    if (cmd.startsWith("ip link")) {
      return [
        "1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 state UNKNOWN",
        "    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00",
        "2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 state UP",
        "    link/ether 52:54:00:8a:4f:11 brd ff:ff:ff:ff:ff:ff"
      ].join("\n");
    }

    if (cmd === "ip neigh" || cmd === "ip n" || cmd === "arp -a") {
      return "192.168.1.1 dev eth0 lladdr d4:ca:6d:11:22:33 REACHABLE";
    }

    if (cmd === "ip a" || cmd === "ip addr" || cmd === "ip addr show" || cmd === "ip addr show eth0") {
      const ipLine = labState.net.eth0Ip
        ? `    inet ${labState.net.eth0Ip} brd 192.168.1.255 scope global eth0`
        : "    [IPv4 адрес не назначен!]";
      return [
        "1: lo: <LOOPBACK,UP> inet 127.0.0.1/8 scope host lo  inet6 ::1/128 scope host",
        "2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 state UP",
        "    link/ether 52:54:00:8a:4f:11 brd ff:ff:ff:ff:ff:ff",
        ipLine
      ].join("\n");
    }

    if (cmd.startsWith("ip addr add ")) {
      const m = cmd.match(/ip\s+addr\s+add\s+(\S+)\s+dev\s+eth0/);
      if (m) {
        labState.net.eth0Ip = m[1];
        return "";
      }
      return "Error: синтаксис -> ip addr add 192.168.1.50/24 dev eth0";
    }

    if (cmd === "ip r" || cmd === "ip route" || cmd === "ip route show") {
      const routes = [];
      if (labState.net.defaultGw) routes.push(`default via ${labState.net.defaultGw} dev eth0`);
      if (labState.net.eth0Ip) routes.push("192.168.1.0/24 dev eth0 proto kernel scope link");
      return routes.length ? routes.join("\n") : "[Таблица маршрутизации пуста!]";
    }

    if (cmd.startsWith("ip route add default via ")) {
      const m = cmd.match(/via\s+(\S+)/);
      if (m) {
        labState.net.defaultGw = m[1];
        return "";
      }
      return "Error: синтаксис -> ip route add default via 192.168.1.1 dev eth0";
    }

    if (cmd.startsWith("ping ")) {
      const host = cmd.split(/\s+/)[1];
      if (!labState.net.eth0Ip || !labState.net.defaultGw) {
        return "ping: connect: Network is unreachable (сначала назначь IP и default gateway!)";
      }
      if (!/^\d+\.\d+\.\d+\.\d+$/.test(host) && host !== "::1" && host !== "localhost") {
        const resolv = labState.files["/etc/resolv.conf"] || "";
        if (!resolv.includes("nameserver")) {
          return `ping: ${host}: Temporary failure in name resolution (проверь /etc/resolv.conf!)`;
        }
      }
      return `PING ${host}: 64 bytes from ${host}: icmp_seq=1 ttl=57 time=10.8 ms\n--- 1 packets transmitted, 1 received, 0% packet loss ---`;
    }

    if (cmd.startsWith("traceroute ")) {
      const dst = cmd.split(/\s+/)[1] || "8.8.8.8";
      return [
        `traceroute to ${dst} (${dst}), 30 hops max, 60 byte packets`,
        " 1  gateway (192.168.1.1)  0.812 ms  0.744 ms  0.701 ms",
        " 2  isp-core-1.net (100.64.0.1)  4.210 ms  4.185 ms  4.302 ms",
        ` 3  dns.google (${dst})  11.420 ms  11.380 ms  11.501 ms`
      ].join("\n");
    }

    if (cmd.startsWith("dig ") || cmd.startsWith("nslookup ")) {
      const resolv = labState.files["/etc/resolv.conf"] || "";
      if (!resolv.includes("nameserver")) {
        return ";; connection timed out; no servers could be reached (в /etc/resolv.conf нет nameserver!)";
      }
      return ";; ANSWER SECTION:\nlpi.org.\t\t300\tIN\tA\t54.209.142.88\n;; SERVER: 1.1.1.1#53 (OK!)";
    }

    if (cmd.startsWith("curl ")) {
      if (!labState.services.nginx?.running) {
        return [
          "HTTP/1.1 502 Bad Gateway",
          "Server: edge-gateway",
          "X-Error-Reason: upstream local nginx.service is dead (запусти systemctl start nginx!)"
        ].join("\n");
      }
      labState.http200Ok = true;
      return [
        "HTTP/1.1 200 OK",
        "Server: nginx/1.24.0 (Ubuntu)",
        "Content-Type: text/html; charset=UTF-8",
        "Connection: keep-alive"
      ].join("\n");
    }

    if (cmd.startsWith("wget ")) {
      return "Saving to: ‘index.html’\nindex.html          100%[===================>]     612  --.-KB/s    in 0s";
    }

    if (cmd.startsWith("tcpdump")) {
      labState.tcpdumpRan = true;
      return [
        "tcpdump: verbose output suppressed, listening on eth0, link-type EN10MB (Ethernet)",
        "10:20:01.104 IP 10.0.0.5.51422 > 192.168.1.50.80: Flags [S], seq 190421, win 64240",
        "10:20:01.105 IP 192.168.1.50.80 > 10.0.0.5.51422: Flags [S.], seq 884120, ack 190422",
        "10:20:01.106 IP 10.0.0.5.51422 > 192.168.1.50.80: Flags [P.], HTTP: GET / HTTP/1.1",
        "3 packets captured"
      ].join("\n");
    }

    if (cmd.startsWith("ss ")) {
      return [
        "Netid  State   Recv-Q  Send-Q  Local Address:Port   Peer Address:Port  Process",
        "udp    UNCONN  0       0       0.0.0.0:68           0.0.0.0:*          users:((\"dhclient\",pid=412,fd=6))",
        "tcp    LISTEN  0       128     0.0.0.0:22           0.0.0.0:*          users:((\"sshd\",pid=519,fd=3))",
        "tcp    LISTEN  0       511     0.0.0.0:443          0.0.0.0:*          users:((\"nginx\",pid=688,fd=7))",
        "tcp    LISTEN  0       244     127.0.0.1:5432       0.0.0.0:*          users:((\"postgres\",pid=842,fd=5))"
      ].join("\n");
    }

    if (cmd.startsWith("ufw ")) {
      if (cmd.startsWith("ufw status")) {
        if (!labState.fw.enabled) return "Status: inactive";
        return [
          `Status: active (Default: ${labState.fw.defaultIncoming} incoming)`,
          "To                         Action      From",
          "--                         ------      ----",
          ...labState.fw.allowedPorts.map(p => `${p.padEnd(26)} ALLOW       Anywhere`)
        ].join("\n");
      }
      if (cmd === "ufw default deny incoming") {
        labState.fw.defaultIncoming = "deny";
        return "Default incoming policy changed to 'deny'";
      }
      if (cmd.startsWith("ufw allow ")) {
        const portSpec = cmd.slice(10).trim();
        if (!labState.fw.allowedPorts.includes(portSpec)) labState.fw.allowedPorts.push(portSpec);
        return `Rule added (${portSpec})`;
      }
      if (cmd === "ufw enable") {
        labState.fw.enabled = true;
        return "Firewall is active and enabled on system startup";
      }
    }

    if (cmd.startsWith("iptables ")) {
      if (cmd.includes("-L")) {
        const drops = labState.iptablesDroppedIps.map(ip => `DROP       all  --  ${ip.padEnd(15)} 0.0.0.0/0`);
        return [
          "Chain INPUT (policy ACCEPT)",
          "target     prot opt source               destination",
          "ACCEPT     tcp  --  0.0.0.0/0            0.0.0.0/0            tcp dpt:22",
          ...drops,
          "",
          "Chain FORWARD (policy DROP)",
          "Chain OUTPUT (policy ACCEPT)"
        ].join("\n");
      }
      const m = cmd.match(/iptables\s+-A\s+INPUT\s+-s\s+(\S+)\s+-j\s+(DROP|REJECT)/i);
      if (m) {
        const ip = m[1];
        if (!labState.iptablesDroppedIps.includes(ip)) labState.iptablesDroppedIps.push(ip);
        return `[Netfilter: все входящие пакеты с ${ip} теперь мгновенно сбрасываются (${m[2].toUpperCase()})!]`;
      }
      return "iptables: синтаксис -> iptables -A INPUT -s <IP> -j DROP (или iptables -L -n)";
    }

    if (cmd.startsWith("fail2ban-client")) {
      return [
        "Status for the jail: sshd",
        "|- Filter",
        "|  |- Currently failed:\t4",
        "|  `- Total failed:\t49",
        "`- Actions",
        "   |- Currently banned:\t1",
        "   `- Banned IP list:\t185.220.101.44"
      ].join("\n");
    }

    if (cmd === "help") {
      return "Доступные команды WebLab: lscpu, free -h, swapon, lspci -k, lsmod, lsblk, blkid, df -h, df -i, du -sh, pvs, vgs, lvs, lvextend, pwd, cd, which, man, mkdir -p, cp, mv, ls -la, cat, grep, cut, awk, sort, uniq -c, sed, find, wc -l, tar, ln -s, chmod, chown, umask, apt, dpkg -l/-L/-S, dnf, rpm, uptime, ps aux, renice, nohup, jobs, kill, useradd, usermod, visudo, id, env, export, systemctl, journalctl, timedatectl, ssh-keygen, sshd -t, rsync, ulimit -n, aa-status, docker ps, ethtool eth0, ip a/r/neigh, ping, traceroute, dig, curl -I, tcpdump, ss -tulnp, ufw, iptables, fail2ban-client, clear";
    }

    return `bash: ${cmd.split(" ")[0]}: команда не найдена (введи help или открой «? Аварийная подсказка» сверху)`;
  }

  function formatXrayHtml(enMarkup, allowXray = true) {
    return String(enMarkup || "")
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/<w k=['"]([^'"]+)['"]>([^<]+)<\/w>/g, (_, key, word) => {
        if (!allowXray) return word;
        return `<span class="xw" onclick="App.showXray('${key}', '${escapeAttr(word)}')">${word}</span>`;
      });
  }

  const SAFE_TAB_TOKENS = [
    "lscpu", "free", "swapon", "lspci", "lsusb", "lsmod", "modprobe", "dmesg",
    "lsblk", "blkid", "df", "du", "pvs", "vgs", "lvs", "lvextend",
    "pwd", "cd", "which", "type", "man", "mkdir", "cp", "mv", "ls", "cat",
    "grep", "cut", "awk", "sort", "uniq", "sed", "find", "wc", "head", "tail",
    "tar", "ln", "chmod", "chown", "umask", "apt", "dpkg", "dnf", "rpm",
    "uptime", "ps", "renice", "nohup", "jobs", "kill", "useradd", "usermod",
    "visudo", "id", "env", "export", "systemctl", "journalctl", "timedatectl",
    "ssh-keygen", "sshd", "rsync", "scp", "ulimit", "aa-status", "docker",
    "ethtool", "ip", "ping", "traceroute", "dig", "nslookup", "curl", "wget",
    "tcpdump", "ss", "ufw", "iptables", "fail2ban-client", "clear", "help",
    "/etc/fstab", "/etc/passwd", "/etc/hosts", "/etc/resolv.conf", "/etc/crontab",
    "/etc/ssh/sshd_config", "/var/log/syslog", "/var/log/access.log",
    "/proc/swaps", "/proc/meminfo", "/proc/cpuinfo", "/proc/cmdline",
    "/dev/vg_data/lv_app", "/root/etc-backup.tar.gz"
  ];

  function renderIde() {
    if (!activeTask) return;
    const isHardBoss = getTaskDifficulty(activeTask) === "hard";
    document.getElementById("ideTaskTitle").textContent = activeTask.title;

    const ch = C.chars[activeTask.char] || C.chars.diego;
    const fmtInline = s => String(s || "").replace(/`([^`]+)`/g, "<code>$1</code>");

    const reqsHtml = activeTask.requirements.map((reqText, idx) => {
      let cls = "";
      let icon = `${idx + 1}.`;
      if (lastValidation && lastValidation.results[idx] !== undefined) {
        const ok = lastValidation.results[idx];
        cls = ok ? "pass" : "fail";
        icon = ok ? "✅" : "❌";
      }
      return `<div class="req-item ${cls}"><strong>${icon}</strong> <span>${fmtInline(reqText)}</span></div>`;
    }).join("");

    let bannerHtml = "";
    if (lastValidation) {
      const lvlObj = C.levels.find(l => l.level === activeTask.levelNum);
      const tIdx = lvlObj ? lvlObj.tasks.findIndex(t => t.id === activeTask.id) : -1;
      const hasNextTask = lvlObj && tIdx >= 0 && tIdx + 1 < lvlObj.tasks.length;
      const hasSteps = lvlObj && (lvlObj.blocks || []).some(b => b.type === "step_head");
      const nextStepBtnLbl = hasNextTask
        ? (hasSteps ? `📖 К теории Шага ${tIdx + 2} →` : "Следующая задача →")
        : "🏁 Завершить уровень →";

      bannerHtml = lastValidation.allPassed
        ? `<div class="lec-theory-block" style="border-left-color:#22C55E;background:rgba(34,197,94,0.12);">
            🎉 <strong>${isHardBoss ? "БОСС 120% ПОВЕРЖЕН!" : "Проверка пройдена!"}</strong> Все требования выполнены! ${lastValidation.explain ? "<br/>" + fmtInline(lastValidation.explain) : ""}
            <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;">
              <button class="jr-btn-cta" onclick="App.goNextAfterTask()">${nextStepBtnLbl}</button>
              ${hasNextTask && hasSteps ? `<button class="jr-btn-cta purple" onclick="App.openTask('${lvlObj.tasks[tIdx + 1].id}')">⚡ Сразу к Задаче ${tIdx + 2}</button>` : ""}
            </div>
          </div>`
        : `<div class="lec-theory-block" style="border-left-color:#EF4444;background:rgba(239,68,68,0.12);">
            ❌ <strong>Проверку не прошла:</strong> посмотри красные пункты в чек-листе Требований ниже и доделай решение!
          </div>`;
    }

    const bossNoteHtml = isHardBoss
      ? `<div class="boss-mode-note">🔥 <strong>Режим Босса 120%:</strong> точные команды в условии не разжёваны — комбинируй арсенал текущего и прошлых уровней самостоятельно!</div>`
      : "";

    document.getElementById("ideConditionBody").innerHTML = `
      ${bannerHtml}
      <div class="jr-dialog" style="margin-top:4px;">
        <div class="jr-char-ava-svg">${getCharAvatarSvg(activeTask.char || "diego", 44)}</div>
        <div class="jr-bubble">
          <div class="jr-char-name ${ch.cls}">${ch.name}</div>
          <div class="jr-bubble-text">${fmtInline(activeTask.story)}</div>
        </div>
      </div>
      <div class="req-box ${isHardBoss ? "boss-req-box" : ""}">
        <div class="req-head" style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;">
          <span>Требования проверки • Награда: ${MATTER_ORB_SVG} +${activeTask.matter}</span>
          ${renderDiffBadge(activeTask)}
        </div>
        ${bossNoteHtml}
        ${reqsHtml}
      </div>
    `;

    const workEl = document.getElementById("ideWorkspaceBody");

    if (activeTask.type === "terminal") {
      const logsHtml = labState.logs.map(l => `<div class="${l.cls}">${escapeHtml(l.text)}</div>`).join("");

      const ansHtml = activeTask.expectedAnswer ? `
        <div class="sim-widget" style="padding:10px 12px;">
          <div class="sim-field">
            <label>✍️ ${activeTask.answerLabel}</label>
            <input class="sim-text-in" id="termAnswerField" value="${escapeAttr(labState.answerInput)}"
              placeholder="${escapeAttr(activeTask.answerPlaceholder || "")}"
              oninput="App.setAnswerInput(this.value)" />
          </div>
        </div>
      ` : "";

      workEl.innerHTML = `
        <div class="term-window">
          <div class="term-header">
            <span>bash — root@sysrush:~</span>
            <span>Ручной CLI (↑/↓ история • Tab утилиты)</span>
          </div>
          <div class="term-log" id="termLogBox">${logsHtml}</div>
          <div class="term-input-row">
            <span class="term-ps1">root@sysrush:~#</span>
            <input class="term-input" id="termCmdInput" placeholder="Введи команду вручную и нажми Enter..." autocomplete="off" autocapitalize="off" spellcheck="false" />
            <button class="term-run-btn" onclick="App.submitTermInput()">▶ Ввод</button>
          </div>
        </div>
        ${ansHtml}
      `;

      const logBox = document.getElementById("termLogBox");
      if (logBox) logBox.scrollTop = logBox.scrollHeight;

      const cmdIn = document.getElementById("termCmdInput");
      if (cmdIn) {
        if (window.innerWidth > 880) cmdIn.focus();
        cmdIn.addEventListener("keydown", e => {
          if (e.key === "Enter" && !e.ctrlKey) {
            e.preventDefault();
            App.submitTermInput();
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            if (labState.history.length > 0) {
              cmdHistoryIdx = Math.max(0, cmdHistoryIdx - 1);
              cmdIn.value = labState.history[cmdHistoryIdx] || "";
            }
          } else if (e.key === "ArrowDown") {
            e.preventDefault();
            if (cmdHistoryIdx < labState.history.length - 1) {
              cmdHistoryIdx++;
              cmdIn.value = labState.history[cmdHistoryIdx] || "";
            } else {
              cmdHistoryIdx = labState.history.length;
              cmdIn.value = "";
            }
          } else if (e.key === "Tab") {
            e.preventDefault();
            const rawVal = cmdIn.value;
            const parts = rawVal.split(/(\s+)/);
            const lastTok = parts[parts.length - 1] || "";
            if (lastTok.length >= 2) {
              const match = SAFE_TAB_TOKENS.find(tok => tok.startsWith(lastTok));
              if (match) {
                parts[parts.length - 1] = match;
                cmdIn.value = parts.join("") + (parts.length === 1 && !match.startsWith("/") ? " " : "");
              }
            }
          }
        });
      }
    } else if (activeTask.type === "builder") {
      const fieldsHtml = activeTask.fields.map(f => {
        const curVal = labState.builderValues[f.id] || "";
        return `
          <div class="sim-field">
            <label>${f.label}</label>
            <select class="sim-select" onchange="App.setBuilderField('${f.id}', this.value)">
              <option value="">— Выбери решение —</option>
              ${f.options.map(o => `<option value="${o.val}" ${curVal === o.val ? "selected" : ""}>${o.text}</option>`).join("")}
            </select>
          </div>
        `;
      }).join("");

      workEl.innerHTML = `
        <div class="sim-widget">
          <div style="font-size:13px;font-weight:900;color:#38BDF8;">🛠️ ИНТЕРАКТИВНЫЙ КОНФИГУРАТОР СТЕНДА</div>
          ${fieldsHtml}
          <button class="jr-btn-cta" onclick="App.verifyCurrentTask()">✅ Проверить конфигурацию</button>
        </div>
      `;
    } else if (activeTask.type === "lpic_en") {
      const letters = ["A", "B", "C", "D", "E", "F"];
      const optsHtml = activeTask.options.map((o, i) => `
        <button class="lpic-opt ${labState.selectedLpicOpt === o.val ? "selected" : ""}" onclick="App.selectLpicOption('${o.val}')">
          <strong style="color:#FF7A00;">${letters[i]}.</strong>
          <span>${/<w\s+k=/.test(String(o.text || "")) ? formatXrayHtml(o.text, true) : escapeHtml(o.text)}</span>
        </button>
      `).join("");

      workEl.innerHTML = `
        <div class="xray-box">
          <div class="xray-hint-bar">🇬🇧 РЕНТГЕН АНГЛИЙСКОГО ВКЛЮЧЁН: нажми на любое подчёркнутое слово для перевода и озвучки 🔊!</div>
          <div class="xray-question-en">${formatXrayHtml(activeTask.enQuestion, true)}</div>
          <div class="lpic-opts">${optsHtml}</div>
          <button class="jr-btn-cta" style="margin-top:14px;width:100%;" onclick="App.verifyCurrentTask()">✅ Отправить ответ на проверку</button>
        </div>
      `;
    } else if (activeTask.type === "lpic_fill") {
      workEl.innerHTML = `
        <div class="xray-box">
          <div class="xray-hint-bar">✍️ РЕАЛЬНЫЙ ФОРМАТ PEARSON VUE (ВВОД БЕЗ ВАРИАНТОВ) + X-RAY ПЕРЕВОДЧИК СЛОВ!</div>
          <div class="xray-question-en">${formatXrayHtml(activeTask.enQuestion, true)}</div>
          <div class="sim-field" style="margin-top:14px;">
            <label>Введи точный ответ (команду или полный путь):</label>
            <input class="sim-text-in" id="lpicFillInput" value="${escapeAttr(labState.fillInput || "")}"
              placeholder="${escapeAttr(activeTask.placeholder || "Введи ответ...")}"
              oninput="App.setFillInput(this.value)" />
          </div>
          <button class="jr-btn-cta" style="margin-top:14px;width:100%;" onclick="App.verifyCurrentTask()">✅ Проверить ответ</button>
        </div>
      `;
      const fillEl = document.getElementById("lpicFillInput");
      if (fillEl) {
        fillEl.addEventListener("keydown", e => {
          if (e.key === "Enter") App.verifyCurrentTask();
        });
      }
    }
  }

  function evalSingleRule(rule) {
    if (rule.startsWith("cmd:")) {
      const needle = rule.slice(4);
      return labState.history.some(h => h.includes(needle));
    }
    if (rule.startsWith("ans:")) {
      const exp = rule.slice(4).trim().toLowerCase();
      const raw = (labState.answerInput || "").trim().toLowerCase();
      const norm = raw.replace(/^\/dev\//, "").replace(/\s*(mb\/s|мбит\/с|mbit\/s)$/i, "");
      return raw === exp || norm === exp;
    }
    if (rule.startsWith("file_has:")) {
      const [, path, ...rest] = rule.split(":");
      const substr = rest.join(":");
      return (labState.files[path] || "").includes(substr);
    }
    if (rule.startsWith("perm:")) {
      const [, fname, mode] = rule.split(":");
      return labState.perms[fname] === mode;
    }
    if (rule.startsWith("symlink:")) {
      const [, lnk, tgt] = rule.split(":");
      return labState.symlinks[lnk] === tgt;
    }
    if (rule.startsWith("archive:")) {
      return Boolean(labState.archives[rule.slice(8)]);
    }
    if (rule.startsWith("proc_killed:")) {
      return labState.killedPids.includes(rule.slice(12));
    }
    if (rule.startsWith("user_exists:")) {
      return Boolean(labState.users[rule.slice(12)]);
    }
    if (rule.startsWith("user_in_sudo:")) {
      const u = labState.users[rule.slice(13)];
      return Boolean(u && u.groups.includes("sudo"));
    }
    if (rule.startsWith("svc_running:")) {
      return Boolean(labState.services[rule.slice(12)]?.running);
    }
    if (rule.startsWith("svc_enabled:")) {
      return Boolean(labState.services[rule.slice(12)]?.enabled);
    }
    if (rule.startsWith("net_ip:")) {
      return labState.net.eth0Ip === rule.slice(7);
    }
    if (rule.startsWith("net_gw:")) {
      return labState.net.defaultGw === rule.slice(7);
    }
    if (rule === "dns_fixed") {
      return (labState.files["/etc/resolv.conf"] || "").includes("nameserver ");
    }
    if (rule === "fw_deny_in") {
      return labState.fw.defaultIncoming === "deny";
    }
    if (rule.startsWith("fw_allow:")) {
      const p = rule.slice(9);
      return labState.fw.allowedPorts.includes(p) || labState.fw.allowedPorts.includes(p.split("/")[0]);
    }
    if (rule === "fw_enabled") {
      return Boolean(labState.fw.enabled);
    }
    if (rule === "lvm_extended") {
      return Boolean(labState.lvmExtended);
    }
    if (rule.startsWith("dir_exists:")) {
      return labState.dirs.includes(rule.slice(11));
    }
    if (rule === "bg_job_started") {
      return labState.bgJobs.length > 0;
    }
    if (rule === "script_tested") {
      return Boolean(labState.scriptTested);
    }
    if (rule === "ssh_keygen_done") {
      return Boolean(labState.sshKeyGenerated);
    }
    if (rule === "rsync_done") {
      return Boolean(labState.rsyncDone);
    }
    if (rule === "ulimit_raised") {
      return Boolean(labState.ulimitRaised);
    }
    if (rule === "http_200_ok") {
      return Boolean(labState.http200Ok);
    }
    if (rule === "tcpdump_ran") {
      return Boolean(labState.tcpdumpRan);
    }
    if (rule.startsWith("ip_banned:")) {
      return labState.iptablesDroppedIps.includes(rule.slice(10));
    }
    if (rule.startsWith("env_has:")) {
      const [, k, ...vRest] = rule.split(":");
      return labState.envVars[k] === vRest.join(":");
    }
    if (rule.startsWith("cwd_is:")) {
      return labState.cwd === rule.slice(7);
    }
    return false;
  }

  function validateTask(task) {
    if (task.type === "terminal") {
      const results = (task.checkRules || []).map(compound =>
        compound.split("&&").every(r => evalSingleRule(r.trim()))
      );
      return { allPassed: results.every(Boolean), results };
    }

    if (task.type === "builder") {
      const results = task.fields.map(f => labState.builderValues[f.id] === f.correct);
      return { allPassed: results.every(Boolean), results };
    }

    if (task.type === "lpic_en") {
      const ok = labState.selectedLpicOpt === task.correct;
      return {
        allPassed: ok,
        results: task.requirements.map(() => ok),
        explain: ok ? task.explainRu : ""
      };
    }

    if (task.type === "lpic_fill") {
      const typed = (labState.fillInput || "").trim().toLowerCase();
      const ok = Boolean(typed) && task.acceptedAnswers.some(a => a.toLowerCase() === typed);
      return {
        allPassed: ok,
        results: task.requirements.map(() => ok),
        explain: ok ? task.explainRu : ""
      };
    }

    return { allPassed: false, results: [] };
  }

  function escapeHtml(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function escapeAttr(s) {
    return String(s).replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/"/g, "&quot;");
  }

  // =========================================================================
  // PUBLIC APP CONTROLLER
  // =========================================================================
  window.App = {
    nav(viewName) {
      currentView = viewName;
      document.querySelectorAll(".jr-view").forEach(v => v.classList.remove("active"));
      document.getElementById(`view_${viewName}`)?.classList.add("active");

      const pageTitles = {
        map: "Курсы",
        roadmap: "Карта навыков",
        lecture: "Лекции",
        review: "Умное повторение",
        dojo: "Полигон скиллов",
        tasks: "Задачи",
        vocab: "Английский LPIC",
        exam: "Университет LPIC",
        ide: "Практика WebLab"
      };
      const topTitleEl = document.getElementById("topPageTitle");
      if (topTitleEl) topTitleEl.textContent = pageTitles[viewName] || "Обучение";

      ["map", "roadmap", "lecture", "review", "dojo", "tasks", "vocab", "exam"].forEach(k => {
        document.getElementById(`snav_${k}`)?.classList.toggle("active", k === viewName);
        const mobMatch = k === "map" ? (viewName === "map" || viewName === "roadmap" || viewName === "tasks") : k === viewName;
        document.getElementById(`mnav_${k}`)?.classList.toggle("active", mobMatch);
      });

      document.getElementById("mobileBottomNav")?.classList.toggle("hidden", viewName === "ide");

      if (viewName === "map") renderMap();
      if (viewName === "roadmap") renderRoadmapView();
      if (viewName === "review") renderReviewView();
      if (viewName === "dojo") renderDojoView();
      if (viewName === "tasks") renderTasksList();
      if (viewName === "vocab") renderVocabView();
      if (viewName === "exam") renderExamHub();
      updateGlobalBars();
      haptic(8);
    },

    toggleSidebar() {
      const sb = document.getElementById("jrSidebar");
      const chev = document.getElementById("sidebarCollapseChevron");
      if (!sb) return;
      const collapsed = sb.classList.toggle("collapsed");
      if (chev) chev.textContent = collapsed ? "›" : "‹";
      sfx("tap");
    },

    toggleTheme() {
      const root = document.body;
      if (!root) return;
      const isLight = root.classList.toggle("jr-light-theme");
      try { localStorage.setItem("sysrush_theme", isLight ? "light" : "dark"); } catch (e) {}
      sfx("tap");
    },

    onGlobalSearch(val) {
      state.taskSearch = val || "";
      const taskIn = document.getElementById("taskSearchIn");
      if (taskIn) taskIn.value = state.taskSearch;
      if (currentView === "tasks") {
        renderTasksList();
      }
    },

    submitGlobalSearch() {
      const q = (state.taskSearch || "").trim();
      if (!q) return;
      this.nav("tasks");
      const taskIn = document.getElementById("taskSearchIn");
      if (taskIn) taskIn.value = q;
      renderTasksList();
    },

    selectQuest(qId) {
      state.currentQuestId = qId;
      saveState();
      renderMap();
      sfx("tap");
    },

    openCurrentLecture() {
      const lvl = isLevelOpen(state.currentLevel) ? state.currentLevel : Math.max(...state.unlockedLevels);
      this.openLecture(lvl);
    },

    openLecture(levelNum, scrollTargetId) {
      if (!isLevelOpen(levelNum)) {
        this.unlockLevel(levelNum);
        return;
      }
      renderLecture(levelNum);
      this.nav("lecture");
      const lecView = document.getElementById("view_lecture");
      if (scrollTargetId) {
        setTimeout(() => this.scrollToLectureEl(scrollTargetId), 30);
      } else if (lecView) {
        lecView.scrollTop = 0;
      }
    },

    scrollToLectureEl(elId) {
      const el = document.getElementById(elId);
      if (el && el.scrollIntoView) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    },

    unlockLevel(levelNum) {
      const lvl = C.levels.find(l => l.level === levelNum);
      if (!lvl) return;
      if (isLevelOpen(levelNum)) {
        this.openLecture(levelNum);
        return;
      }

      if (state.matter < lvl.cost) {
        sfx("fail");
        haptic(35);
        this.openModal("🔒 Не хватает Чёрной материи", `
          <div style="font-size:14px;line-height:1.5;">
            Для открытия <strong>Уровня ${lvl.level}: «${lvl.title}»</strong> нужно <strong>⚫ ${lvl.cost} материи</strong>, а у тебя сейчас <strong>⚫ ${state.matter}</strong>.
          </div>
          <div class="lec-theory-block" style="margin:4px 0;">
            💡 <strong>Где быстро набрать материю:</strong><br/>
            1. Дорешай практические задачи на открытых уровнях.<br/>
            2. Пройди сессию в <strong>🎯 Умном повторении</strong> (+⚫ 12) или набей комбо в <strong>🥋 Полигоне скиллов</strong> (+⚫ 4 за серию из 3).<br/>
            3. Зайди во вкладку <strong>🇬🇧 Англ. LPIC</strong> (+⚫ 3 за серию) или включи «Свободный режим» в ⚙️ Настройках!
          </div>
          <button class="jr-btn-cta" onclick="App.closeModal(); App.nav('tasks');">К нерешённым задачам →</button>
        `);
        return;
      }

      if (!state.unlockedLevels.includes(levelNum)) {
        state.unlockedLevels.push(levelNum);
      }
      state.currentLevel = levelNum;
      state.currentQuestId = lvl.questId;
      recalcMatter(state);
      saveState();
      sfx("ok");
      haptic(45);
      toast(`🎉 Уровень ${levelNum} открыт!`);
      this.openLecture(levelNum);
    },

    openTask(taskId) {
      const task = getAllTasks().find(t => t.id === taskId);
      if (!task) return;
      activeTask = task;
      labState = createInitialLabState(task);
      cmdHistoryIdx = 0;
      lastValidation = null;
      this.nav("ide");
      this.switchIdeMobileTab("cond");
      renderIde();
    },

    exitIde() {
      if (activeTask) {
        this.openLecture(activeTask.levelNum, `lec_task_${activeTask.id}`);
      } else {
        this.nav("map");
      }
    },

    switchIdeMobileTab(which) {
      ["cond", "work", "res"].forEach(k => {
        document.getElementById(`imtab_${k}`)?.classList.toggle("active", k === which);
      });
      const condPane = document.getElementById("idePaneCond");
      const workPane = document.getElementById("idePaneWork");
      if (which === "work") {
        condPane.classList.remove("active");
        workPane.classList.add("active");
      } else {
        workPane.classList.remove("active");
        condPane.classList.add("active");
        if (which === "res") condPane.scrollTop = 0;
      }
    },

    submitTermInput() {
      const inp = document.getElementById("termCmdInput");
      if (!inp || !inp.value.trim()) return;
      const val = inp.value;
      inp.value = "";
      sfx("tap");
      haptic(10);
      execLinuxCommand(val);
      renderIde();
      if (window.innerWidth <= 880) this.switchIdeMobileTab("work");
    },

    runChipCommand(cmd) {
      sfx("tap");
      haptic(12);
      execLinuxCommand(cmd);
      renderIde();
      if (window.innerWidth <= 880) this.switchIdeMobileTab("work");
    },

    setAnswerInput(val) {
      if (labState) labState.answerInput = val;
    },

    setFillInput(val) {
      if (labState) labState.fillInput = val;
    },

    setBuilderField(fieldId, val) {
      if (labState) labState.builderValues[fieldId] = val;
      sfx("tap");
    },

    selectLpicOption(val) {
      if (labState) labState.selectedLpicOpt = val;
      sfx("tap");
      haptic(10);
      renderIde();
      if (window.innerWidth <= 880) this.switchIdeMobileTab("work");
    },

    verifyCurrentTask() {
      if (!activeTask) return;
      const check = validateTask(activeTask);
      lastValidation = check;
      recordSrsOutcome(`task:${activeTask.id}`, check.allPassed, false);

      if (check.allPassed) {
        const firstTime = !state.solvedTasks.includes(activeTask.id);
        if (firstTime) {
          state.solvedTasks.push(activeTask.id);
          state.restoreBannerClosed = true;
          recalcMatter(state);
          toast(`✅ Задача решена! +⚫ ${activeTask.matter} чёрной материи!`);
        } else {
          toast("✅ Все проверки пройдены повторно!");
        }
        sfx("ok");
        haptic(45);
      } else {
        sfx("fail");
        haptic(35);
        toast("❌ Не все пункты Требований выполнены! (Точка взята на карандаш в Умном повторении)");
      }

      saveState();
      updateGlobalBars();
      renderIde();
      if (window.innerWidth <= 880) this.switchIdeMobileTab("res");
    },

    resetCurrentTask() {
      if (!activeTask) return;
      labState = createInitialLabState(activeTask);
      lastValidation = null;
      renderIde();
      toast("Стенд сброшен к исходному состоянию");
    },

    showTaskHint() {
      if (!activeTask) return;
      recordSrsHint(`task:${activeTask.id}`);
      saveState();
      updateGlobalBars();
      const fmt = s => String(s || "").replace(/`([^`]+)`/g, "<code>$1</code>");
      this.openModal("💡 Аварийная подсказка наставника", `
        <div style="font-size:14.5px;line-height:1.65;color:#E2E8F0;margin-bottom:14px;">
          ${fmt(activeTask.hint || "Проверь пронумерованные пункты в блоке Требования.")}
        </div>
        <div id="emergencySyntaxSlot" style="margin-bottom:14px;">
          <button class="jr-outline-nav-btn sm" style="border-color:rgba(245,158,11,0.5);color:#FBBF24;" onclick="App.revealEmergencySyntax()">
            🆘 Совсем тупик — показать эталонный синтаксис
          </button>
        </div>
        <button class="jr-btn-cta" onclick="App.closeModal()">Понял, печатаю сам!</button>
      `);
    },

    revealEmergencySyntax() {
      if (!activeTask) return;
      const slot = document.getElementById("emergencySyntaxSlot");
      if (!slot) return;
      let refHtml = "";
      if (activeTask.type === "terminal") {
        const cmds = (activeTask.chips || []).filter(c => c !== "clear");
        refHtml = `<div style="background:#0D1117;border:1px solid #30363D;border-radius:8px;padding:12px;font-family:ui-monospace,monospace;font-size:13px;color:#4ADE80;line-height:1.7;">
          <div style="font-size:11px;color:#94A3B8;margin-bottom:6px;text-transform:uppercase;">Эталонные команды для ручного ввода:</div>
          ${cmds.map(c => `<div>$ ${escapeHtml(c)}</div>`).join("")}
          ${activeTask.expectedAnswer ? `<div style="color:#FBBF24;margin-top:6px;">Ответ в поле внизу: ${escapeHtml(activeTask.expectedAnswer)}</div>` : ""}
        </div>`;
      } else if (activeTask.type === "lpic_fill") {
        const ans = (activeTask.acceptedAnswers || [])[0] || "";
        refHtml = `<div style="background:#0D1117;border:1px solid #30363D;border-radius:8px;padding:12px;font-family:ui-monospace,monospace;font-size:13.5px;color:#4ADE80;">
          Точный ответ: <strong>${escapeHtml(ans)}</strong>
        </div>`;
      } else if (activeTask.type === "builder") {
        const lines = (activeTask.fields || []).map(f => {
          const okOpt = (f.options || []).find(o => o.val === f.correct);
          return `<div style="margin-bottom:6px;"><span style="color:#94A3B8;">${escapeHtml(f.label)}</span><br/><strong style="color:#4ADE80;">→ ${escapeHtml(okOpt ? okOpt.text : f.correct)}</strong></div>`;
        }).join("");
        refHtml = `<div style="background:#0D1117;border:1px solid #30363D;border-radius:8px;padding:12px;font-size:13px;line-height:1.5;">${lines}</div>`;
      } else if (activeTask.type === "lpic_en") {
        const idx = (activeTask.options || []).findIndex(o => o.val === activeTask.correct);
        const letter = ["A", "B", "C", "D", "E", "F"][idx] || activeTask.correct;
        refHtml = `<div style="background:#0D1117;border:1px solid #30363D;border-radius:8px;padding:12px;font-size:13.5px;color:#4ADE80;">
          Правильный вариант: <strong>${escapeHtml(letter)}</strong>
        </div>`;
      }
      slot.innerHTML = refHtml;
    },

    goNextAfterTask() {
      if (!activeTask) return;
      const lvl = C.levels.find(l => l.level === activeTask.levelNum);
      if (lvl) {
        const idx = lvl.tasks.findIndex(t => t.id === activeTask.id);
        if (idx >= 0 && idx + 1 < lvl.tasks.length) {
          const nextTask = lvl.tasks[idx + 1];
          const blocks = lvl.blocks || [];
          const curRefIdx = blocks.findIndex(b => b.type === "task_ref" && b.taskId === activeTask.id);
          const nextRefIdx = blocks.findIndex(b => b.type === "task_ref" && b.taskId === nextTask.id);
          if (curRefIdx >= 0 && nextRefIdx > curRefIdx) {
            const stepBetween = blocks.slice(curRefIdx + 1, nextRefIdx).find(b => b.type === "step_head");
            if (stepBetween) {
              this.openLecture(activeTask.levelNum, `lec_step_${stepBetween.step}`);
            } else {
              this.openLecture(activeTask.levelNum, `lec_task_${nextTask.id}`);
            }
          } else {
            this.openTask(nextTask.id);
          }
          return;
        }
      }
      this.openLecture(activeTask.levelNum, "lec_next_level");
    },

    setTaskFilter(f) {
      state.tasksFilter = f;
      saveState();
      renderTasksList();
    },

    setTaskSearch(val) {
      state.taskSearch = val;
      renderTasksList();
    },

    setVocabMode(mode) {
      state.vocabMode = mode;
      vocabQuizWord = null;
      saveState();
      renderVocabView();
    },

    setVocabSearch(val) {
      state.vocabSearch = val;
      renderVocabView();
    },

    answerVocabQuiz(chosenKey) {
      if (!vocabQuizWord) return;
      const isEn2Ru = (state.vocabMode || "en2ru") === "en2ru";
      const expected = isEn2Ru ? vocabQuizWord.ru : vocabQuizWord.en;
      const isOk = chosenKey === expected;
      recordSrsOutcome(`vocab:${vocabQuizWord.level ?? 0}:${vocabQuizWord.en}`, isOk, false);

      if (isOk) {
        state.vocabStreak = (state.vocabStreak || 0) + 1;
        state.vocabCorrectTotal = (state.vocabCorrectTotal || 0) + 1;
        sfx("ok");
        haptic(18);
        if (state.vocabStreak >= 3) {
          state.vocabStreak = 0;
          state.vocabBonusMatter = (state.vocabBonusMatter || 0) + 3;
          recalcMatter(state);
          toast("🔥 Серия 3/3! +⚫ 3 чёрной материи!");
        } else {
          toast(`✅ Верно! ${vocabQuizWord.en} = ${vocabQuizWord.ru}`);
        }
      } else {
        state.vocabStreak = 0;
        sfx("fail");
        haptic(35);
        toast(`❌ Запомни: ${vocabQuizWord.en} = «${vocabQuizWord.ru}»`);
      }
      vocabQuizWord = null;
      saveState();
      updateGlobalBars();
      renderVocabView();
    },

    speak(word) {
      speakEnglish(word);
    },

    showXray(key, rawWord) {
      const entry = C.xrayDict[key] || C.xrayDict[key.toLowerCase()];
      currentXrayWord = rawWord;
      haptic(10);
      sfx("tap");
      document.getElementById("xrayEn").textContent = rawWord;
      document.getElementById("xrayPron").textContent = entry ? `[${entry[0]}]` : "";
      document.getElementById("xrayRu").textContent = entry ? entry[1] : "технический термин LPIC";
      document.getElementById("xrayAssoc").textContent = entry && entry[2] ? `💡 ${entry[2]}` : "";
      document.getElementById("xrayPopover").classList.remove("hidden");
    },

    speakCurrentXray() {
      if (currentXrayWord) speakEnglish(currentXrayWord);
    },

    hideXray() {
      document.getElementById("xrayPopover").classList.add("hidden");
    },

    // EXAM HUB & SUBNET CALCULATOR ACTIONS
    setExamHubTab(tabId) {
      state.examHubTab = tabId;
      saveState();
      renderExamHub();
    },

    setCidrPrefix(val) {
      state.cidrPrefix = Number(val);
      renderExamHub();
    },

    startExam(filterExam, xrayAllowed) {
      const pool = (C.examBank || []).filter(q => filterExam === "all" || q.exam === filterExam);
      const picked = [...pool].sort(() => Math.random() - 0.5);
      examSession = {
        mode: filterExam,
        xrayAllowed,
        idx: 0,
        questions: picked,
        answers: {},
        finished: false
      };
      sfx("tap");
      renderExamHub();
    },

    answerExamMc(optIdx) {
      if (!examSession) return;
      examSession.answers[examSession.idx] = optIdx;
      sfx("tap");
      renderExamHub();
    },

    answerExamFill(val) {
      if (!examSession) return;
      examSession.answers[examSession.idx] = val;
    },

    stepExam(delta) {
      if (!examSession) return;
      examSession.idx = Math.max(0, Math.min(examSession.questions.length - 1, examSession.idx + delta));
      renderExamHub();
    },

    finishExam() {
      if (!examSession) return;
      examSession.finished = true;
      let correctCnt = 0;
      examSession.questions.forEach((qObj, idx) => {
        const a = examSession.answers[idx];
        if (qObj.kind === "mc" && a === qObj.ans) correctCnt++;
        if (qObj.kind === "fill" && qObj.accepted.some(acc => acc.toLowerCase() === String(a || "").trim().toLowerCase())) correctCnt++;
      });
      const score = Math.round(200 + (correctCnt / examSession.questions.length) * 600);
      if (score > (state.bestExamScore || 0)) state.bestExamScore = score;
      if (score >= 500) {
        state.examBonusMatter = (state.examBonusMatter || 0) + 40;
        recalcMatter(state);
        sfx("ok");
        haptic(50);
        toast(`🎓 Экзамен сдан (${score}/800)! +⚫ 40 материи!`);
      } else {
        sfx("fail");
        toast(`Балл: ${score}/800 (нужно 500+). Изучи разбор ниже!`);
      }
      saveState();
      updateGlobalBars();
      renderExamHub();
      document.getElementById("view_exam").scrollTop = 0;
    },

    closeExamSession() {
      examSession = null;
      renderExamHub();
    },

    // =========================================================================
    // SMART NON-RANDOM REVIEW & 5-ARENA SKILL DOJO ACTIONS
    // =========================================================================
    startReviewSession(mode, filterLvl) {
      let pool = buildSmartReviewPool(mode === "level" ? filterLvl : null);
      if (pool.length === 0) {
        toast("Пока нет открытых карточек для повторения!");
        return;
      }
      let picked = [];
      if (mode === "weak") {
        const weakOnly = pool.filter(x => x.isWeak);
        if (weakOnly.length === 0) {
          toast("✨ Ошибок и шпор сейчас 0! Запускаем актуальные точки по приоритету памяти.");
          picked = pool.slice(0, Math.min(pool.length, 8));
        } else {
          picked = weakOnly; // Ровно столько ошибок/шпор, сколько реально накопилось!
        }
      } else if (mode === "level") {
        // Индивидуальный объём конкретной темы: все карточки уровня, требующие повтора (или вся тема целиком)
        const dueInLvl = pool.filter(x => x.isDueNow || x.isWeak);
        picked = dueInLvl.length > 0 ? dueInLvl : pool;
      } else {
        const dueInAll = pool.filter(x => x.isDueNow || x.isWeak);
        const targetLen = Math.min(pool.length, Math.max(6, Math.min(16, dueInAll.length || pool.length)));
        picked = pool.slice(0, targetLen);
      }
      reviewSession = {
        mode,
        filterLvl,
        cards: picked,
        idx: 0,
        checked: false,
        chosenIdx: -1,
        typedVal: "",
        lastOk: false,
        results: [],
        earnedMatter: 0,
        finished: false
      };
      sfx("tap");
      haptic(12);
      renderReviewView();
      const vEl = document.getElementById("view_review");
      if (vEl) vEl.scrollTop = 0;
    },

    submitReviewMc(optIdx) {
      if (!reviewSession || reviewSession.checked) return;
      const card = reviewSession.cards[reviewSession.idx];
      const ok = optIdx === card.ans;
      reviewSession.checked = true;
      reviewSession.chosenIdx = optIdx;
      reviewSession.lastOk = ok;
      sfx(ok ? "ok" : "fail");
      haptic(ok ? 20 : 35);
      renderReviewView();
    },

    setReviewFill(val) {
      if (reviewSession) reviewSession.typedVal = val;
    },

    submitReviewFill() {
      if (!reviewSession || reviewSession.checked) return;
      const card = reviewSession.cards[reviewSession.idx];
      const norm = normalizeFillAns(reviewSession.typedVal);
      if (!norm) {
        toast("Введи ответ перед проверкой!");
        return;
      }
      const ok = (card.accepted || []).some(a => normalizeFillAns(a) === norm);
      reviewSession.checked = true;
      reviewSession.lastOk = ok;
      sfx(ok ? "ok" : "fail");
      haptic(ok ? 20 : 35);
      renderReviewView();
    },

    nextReviewCard(keepShortInterval) {
      if (!reviewSession || !reviewSession.checked) return;
      const card = reviewSession.cards[reviewSession.idx];
      recordSrsOutcome(card.key, reviewSession.lastOk, Boolean(keepShortInterval));
      reviewSession.results.push({ key: card.key, ok: reviewSession.lastOk });

      if (reviewSession.idx + 1 < reviewSession.cards.length) {
        reviewSession.idx += 1;
        reviewSession.checked = false;
        reviewSession.chosenIdx = -1;
        reviewSession.typedVal = "";
        reviewSession.lastOk = false;
        saveState();
        updateGlobalBars();
        renderReviewView();
        const vEl = document.getElementById("view_review");
        if (vEl) vEl.scrollTop = 0;
      } else {
        reviewSession.finished = true;
        const okCnt = reviewSession.results.filter(r => r.ok).length;
        const threshold = Math.max(1, Math.ceil(reviewSession.cards.length * 0.5));
        if (okCnt >= threshold) {
          reviewSession.earnedMatter = 12;
          state.reviewBonusMatter = (state.reviewBonusMatter || 0) + 12;
          recalcMatter(state);
          sfx("ok");
          haptic(45);
          toast(`🎯 Сессия закрыта (${okCnt}/${reviewSession.cards.length})! +⚫ 12 материи!`);
        } else {
          toast(`Сессия завершена: ${okCnt}/${reviewSession.cards.length}. Ошибки подняты в топ Радара!`);
        }
        saveState();
        updateGlobalBars();
        renderReviewView();
        const vEl = document.getElementById("view_review");
        if (vEl) vEl.scrollTop = 0;
      }
    },

    closeReviewSession() {
      reviewSession = null;
      renderReviewView();
      updateGlobalBars();
    },

    startDojoArena(arenaId) {
      const st = getDojoArenaStat(arenaId);
      const stepIdx = st.solved;
      const q = DOJO.generateArenaQuestion(arenaId, stepIdx);
      if (!q) return;
      dojoSession = {
        arenaId,
        stepIdx,
        streak: 0,
        currentQ: q,
        checked: false,
        chosenIdx: -1,
        typedVal: "",
        lastOk: false
      };
      sfx("tap");
      haptic(12);
      renderDojoView();
      const vEl = document.getElementById("view_dojo");
      if (vEl) vEl.scrollTop = 0;
    },

    _applyDojoResult(ok) {
      if (!dojoSession) return;
      if (!state.dojoStats || typeof state.dojoStats !== "object") state.dojoStats = {};
      const cur = getDojoArenaStat(dojoSession.arenaId);
      cur.solved += 1;
      if (ok) {
        cur.correct += 1;
        dojoSession.streak += 1;
        if (dojoSession.streak > cur.bestStreak) cur.bestStreak = dojoSession.streak;
        if (dojoSession.streak > 0 && dojoSession.streak % 3 === 0) {
          state.dojoBonusMatter = (state.dojoBonusMatter || 0) + 4;
          recalcMatter(state);
          toast(`🔥 Комбо ${dojoSession.streak} подряд! +⚫ 4 чёрной материи!`);
        }
        sfx("ok");
        haptic(22);
      } else {
        dojoSession.streak = 0;
        sfx("fail");
        haptic(35);
      }
      state.dojoStats[dojoSession.arenaId] = cur;
      saveState();
      updateGlobalBars();
    },

    submitDojoMc(optIdx) {
      if (!dojoSession || dojoSession.checked) return;
      const ok = optIdx === dojoSession.currentQ.ans;
      dojoSession.checked = true;
      dojoSession.chosenIdx = optIdx;
      dojoSession.lastOk = ok;
      this._applyDojoResult(ok);
      renderDojoView();
    },

    setDojoFill(val) {
      if (dojoSession) dojoSession.typedVal = val;
    },

    submitDojoFill() {
      if (!dojoSession || dojoSession.checked) return;
      const norm = normalizeFillAns(dojoSession.typedVal);
      if (!norm) {
        toast("Введи ответ перед проверкой!");
        return;
      }
      const ok = (dojoSession.currentQ.accepted || []).some(a => normalizeFillAns(a) === norm);
      dojoSession.checked = true;
      dojoSession.lastOk = ok;
      this._applyDojoResult(ok);
      renderDojoView();
    },

    nextDojoQuestion() {
      if (!dojoSession) return;
      dojoSession.stepIdx += 1;
      dojoSession.currentQ = DOJO.generateArenaQuestion(dojoSession.arenaId, dojoSession.stepIdx);
      dojoSession.checked = false;
      dojoSession.chosenIdx = -1;
      dojoSession.typedVal = "";
      dojoSession.lastOk = false;
      sfx("tap");
      renderDojoView();
      const vEl = document.getElementById("view_dojo");
      if (vEl) vEl.scrollTop = 0;
    },

    closeDojoArena() {
      dojoSession = null;
      renderDojoView();
    },

    // SETTINGS, FREE ACCESS & CROSS-DEVICE SYNC (PC <-> ANDROID)
    openModal(title, html) {
      document.getElementById("modalTitle").textContent = title;
      document.getElementById("modalBody").innerHTML = html;
      document.getElementById("modalBackdrop").classList.remove("hidden");
    },

    closeModal() {
      document.getElementById("modalBackdrop").classList.add("hidden");
    },

    dismissRestoreBanner() {
      state.restoreBannerClosed = true;
      saveState();
      if (currentView === "map") renderMap();
    },

    restoreUpToLevel(targetLvl) {
      const maxLevelIdx = Math.max(0, C.levels.length - 1);
      const maxL = Math.max(0, Math.min(maxLevelIdx, Number(targetLvl) || 0));
      const newUnlocked = [];
      const newSolved = new Set(state.solvedTasks || []);
      C.levels.forEach(lvl => {
        if (lvl.level <= maxL) newUnlocked.push(lvl.level);
        if (lvl.level < maxL) {
          lvl.tasks.forEach(t => newSolved.add(t.id));
        }
      });
      state.unlockedLevels = Array.from(new Set([...(state.unlockedLevels || []), ...newUnlocked])).sort((a, b) => a - b);
      state.solvedTasks = Array.from(newSolved);
      state.currentLevel = maxL;
      const targetObj = C.levels.find(l => l.level === maxL) || C.levels[0];
      state.currentQuestId = targetObj.questId;
      state.restoreBannerClosed = true;
      state.crdtMatterCalibrated = true;
      state.v4Migrated = true;
      recalcMatter(state);
      if (state.matter < 50) {
        state.matterBase = (state.matterBase || 30) + (50 - state.matter);
        recalcMatter(state);
      }
      saveState();
      updateGlobalBars();
      this.closeModal();
      this.nav("map");
      sfx("ok");
      haptic(40);
      toast(`⚡ Прогресс восстановлен до Уровня ${maxL} и отправлен в синхронизацию!`);
    },

    openSettings() {
      const syncPayload = "SR2-" + btoa(unescape(encodeURIComponent(JSON.stringify({
        m: state.matter,
        mb: state.matterBase || 30,
        u: state.unlockedLevels,
        s: state.solvedTasks,
        v: state.vocabCorrectTotal || 0,
        e: state.bestExamScore || 0,
        d: state.streakDays || 1
      }))));

      const statusBadge = syncStatus.mode === "lan"
        ? "🟢 Прямая связка Ноут ↔ Телефон (LAN + Облако)"
        : (syncStatus.mode === "cloud"
          ? "🔵 Облачная авто-синхронизация (4G / Wi-Fi)"
          : "🟡 Локальный режим (синхронизируется при появлении сети)");

      const restoreOptions = C.levels.map(l =>
        `<option value="${l.level}" ${l.level === state.currentLevel ? "selected" : ""}>Уровень ${l.level}: ${escapeHtml(l.title)}</option>`
      ).join("");

      const curLan = state.customLanUrl || localStorage.getItem("sysrush_discovered_lan") || CFG.defaultLanUrl || "http://127.0.0.1:8765";
      const activeChannel = SyncEngine.getChannel();
      const activeKey = (state.customApiKey || CFG.geminiApiKey || "").trim();

      this.openModal("⚙️ Авто-Синхронизация 24/7 (Облако + GitHub Pages)", `
        <div class="sim-widget" style="padding:12px;border-color:rgba(34,197,94,0.45);">
          <div style="font-size:13px;font-weight:900;color:#4ADE80;">${statusBadge}</div>
          <div style="font-size:12px;color:#CBD5E1;margin-top:4px;line-height:1.45;">
            Устройство: <strong>${DEVICE_NAME}</strong> • Последнее обновление с: <strong>${escapeHtml(state.lastDevice || DEVICE_NAME)}</strong><br/>
            Уровней открыто: <strong>${state.freeAccessMode ? `Все ${C.levels.length}` : `${state.unlockedLevels.length} / ${C.levels.length}`}</strong> • Решено задач: <strong>${state.solvedTasks.length} / ${getAllTasks().length}</strong><br/>
            ИИ-ключ Gemini: <strong>${activeKey ? "✅ привязан локально" : "⚠️ не задан"}</strong>
          </div>
          <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap;">
            <button class="jr-btn-cta" style="flex:1;" onclick="App.syncNowManual()">🔄 Синхронизировать сейчас</button>
            <button class="jr-btn-cta purple" style="flex:1;" onclick="App.copyPhoneSetupLink()">📲 Ссылка привязки для Телефона</button>
          </div>
          <details style="margin-top:8px;font-size:12px;color:#94A3B8;">
            <summary style="cursor:pointer;font-weight:700;">🔑 Настройки облачного канала и Gemini API ключа</summary>
            <div style="display:flex;flex-direction:column;gap:6px;margin-top:8px;">
              <label style="font-size:11.5px;color:#CBD5E1;">Секретный канал облачной синхронизации (ntfy):</label>
              <input class="sim-text-in" id="customSyncChIn" value="${escapeAttr(activeChannel)}" placeholder="sr_..." />
              <label style="font-size:11.5px;color:#CBD5E1;">Ключ Gemini API (хранится только локально в браузере):</label>
              <input class="sim-text-in" type="password" id="customApiKeyIn" value="${escapeAttr(activeKey)}" placeholder="AIza... / AQ..." />
              <label style="font-size:11.5px;color:#CBD5E1;">Локальный сервер ноутбука (опционально):</label>
              <input class="sim-text-in" id="customLanIn" value="${escapeAttr(curLan)}" placeholder="http://127.0.0.1:8765" />
              <button class="jr-btn-cta" onclick="App.saveCloudCreds()">💾 Сохранить настройки на устройстве</button>
            </div>
          </details>
        </div>

        <div class="sim-widget" style="padding:12px;border-color:rgba(245,158,11,0.45);">
          <div style="font-size:13px;font-weight:900;color:#FBBF24;">⚡ Быстрое восстановление прогресса (1 клик)</div>
          <div style="font-size:12px;color:#94A3B8;margin-bottom:6px;">Если прогресс сбился — выбери свой уровень, и все предыдущие уровни и задачи сразу зачтутся на обоих устройствах:</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <select class="ai-engine-select" id="restoreLvlSelect" style="flex:1;padding:8px;">${restoreOptions}</select>
            <button class="jr-btn-cta orange" onclick="App.restoreUpToLevel(document.getElementById('restoreLvlSelect').value)">Восстановить</button>
          </div>
        </div>

        <details class="sim-widget" style="padding:10px;">
          <summary style="font-size:12.5px;font-weight:800;color:#38BDF8;cursor:pointer;">📋 Ручной офлайн-код резервной копии (SR2-...)</summary>
          <div style="margin-top:8px;display:flex;flex-direction:column;gap:6px;">
            <input class="sim-text-in" id="syncExportBox" readonly value="${syncPayload}" onclick="this.select()" />
            <button class="jr-btn-cta" onclick="App.copySyncCode()">📋 Скопировать резервный код</button>
            <div style="display:flex;gap:8px;margin-top:4px;">
              <input class="sim-text-in" id="syncImportBox" placeholder="Вставь код SR2-..." style="flex:1;" />
              <button class="jr-btn-cta purple" onclick="App.importSyncCode()">Загрузить</button>
            </div>
          </div>
        </details>

        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button class="jr-btn-cta ${state.freeAccessMode ? "" : "purple"}" style="flex:1;" onclick="App.toggleFreeAccess()">
            ${state.freeAccessMode ? "🔒 Вернуть открытие за материю" : `🔓 Открыть сразу все ${C.levels.length} уровней`}
          </button>
          <button class="jr-btn-cta orange" onclick="App.confirmResetProgress()">🗑️ Сброс</button>
        </div>
      `);
    },

    async syncNowManual() {
      await SyncEngine.fullSyncNow(true);
      if (!document.getElementById("modalBackdrop").classList.contains("hidden")) {
        this.openSettings();
      }
    },

    saveCustomLan() {
      const val = (document.getElementById("customLanIn")?.value || "").trim().replace(/\/+$/, "");
      state.customLanUrl = val;
      saveState();
      SyncEngine.fullSyncNow(true);
      toast("Сохранено! Проверяю связь с ноутбуком...");
    },

    saveCloudCreds() {
      const ch = (document.getElementById("customSyncChIn")?.value || "").trim();
      const key = (document.getElementById("customApiKeyIn")?.value || "").trim();
      const lan = (document.getElementById("customLanIn")?.value || "").trim().replace(/\/+$/, "");
      if (ch) state.customSyncChannel = ch;
      state.customApiKey = key;
      state.customLanUrl = lan;
      persistStateLocally();
      if (SyncEngine.cloudEs) {
        try { SyncEngine.cloudEs.close(); } catch (e) {}
        SyncEngine.cloudEs = null;
      }
      SyncEngine.connectCloudSse();
      SyncEngine.fullSyncNow(true);
      this.openSettings();
      toast("✅ Ключ ИИ и канал облачной синхронизации сохранены!");
    },

    copyPhoneSetupLink() {
      const ch = SyncEngine.getChannel();
      const key = (state.customApiKey || CFG.geminiApiKey || "").trim();
      const base = CFG.githubPagesUrl || (window.location.origin + window.location.pathname);
      const token = btoa(unescape(encodeURIComponent(JSON.stringify({ ch, key }))));
      const cleanBase = base.endsWith("/") || base.endsWith(".html") ? base : (base + "/");
      const url = `${cleanBase}#setup=${encodeURIComponent(token)}`;
      copyTextCrossPlatform(url);
      toast("📲 Смарт-ссылка скопирована! Открой её 1 раз на телефоне — привяжутся и Облако, и ИИ!");
    },

    copySyncCode() {
      const el = document.getElementById("syncExportBox");
      if (!el) return;
      el.select();
      copyTextCrossPlatform(el.value);
      toast("📋 Код сохранения скопирован в буфер!");
    },

    importSyncCode() {
      const el = document.getElementById("syncImportBox");
      const raw = (el?.value || "").trim();
      if (!raw.startsWith("SR2-")) {
        toast("❌ Неверный формат кода (должен начинаться с SR2-)");
        return;
      }
      try {
        const data = JSON.parse(decodeURIComponent(escape(atob(raw.slice(4)))));
        if (Array.isArray(data.u)) state.unlockedLevels = Array.from(new Set([0, ...(state.unlockedLevels || []), ...data.u])).sort((a, b) => a - b);
        if (Array.isArray(data.s)) state.solvedTasks = Array.from(new Set([...(state.solvedTasks || []), ...data.s]));
        state.vocabCorrectTotal = Math.max(state.vocabCorrectTotal || 0, Number(data.v) || 0);
        state.bestExamScore = Math.max(state.bestExamScore || 0, Number(data.e) || 0);
        state.streakDays = Math.max(state.streakDays || 1, Number(data.d) || 1);
        if (data.mb) state.matterBase = Math.max(state.matterBase || 30, Number(data.mb));
        state.crdtMatterCalibrated = false;
        state.matter = Math.max(state.matter || 30, Number(data.m) || 30);
        recalcMatter(state);
        saveState();
        updateGlobalBars();
        this.closeModal();
        this.nav(currentView);
        sfx("ok");
        toast("✅ Прогресс объединён и синхронизирован!");
      } catch (e) {
        toast("❌ Не удалось прочитать код синхронизации");
      }
    },

    toggleFreeAccess() {
      state.freeAccessMode = !state.freeAccessMode;
      saveState();
      updateGlobalBars();
      this.openSettings();
      if (currentView === "map") renderMap();
      if (currentView === "roadmap") renderRoadmapView();
      toast(state.freeAccessMode ? `🔓 Все ${C.levels.length} уровней открыты!` : "🔒 Включён классический режим JavaRush!");
    },

    confirmResetProgress() {
      this.openModal("⚠️ Точно сбросить весь прогресс?", `
        <div style="font-size:14px;color:#E2E8F0;line-height:1.5;">
          Это обнулит решённые задачи и уровни <strong>и на ноутбуке, и на телефоне</strong>. Если хочешь просто перерешать задачу — открой её и нажми «↺ Сброс» внутри стенда!
        </div>
        <div style="display:flex;gap:8px;margin-top:12px;">
          <button class="jr-btn-cta" style="flex:1;" onclick="App.openSettings()">Отмена</button>
          <button class="jr-btn-cta orange" style="flex:1;" onclick="App.resetAllProgress()">Да, обнулить всё</button>
        </div>
      `);
    },

    resetAllProgress() {
      const nextEpoch = (state.resetEpoch || 0) + 1;
      state = defaultState();
      state.resetEpoch = nextEpoch;
      state.v1MigratedV3 = true;
      state.v4Migrated = true;
      state.crdtMatterCalibrated = true;
      saveState();
      this.closeModal();
      this.nav("map");
      toast("Прогресс сброшен — начинаем с Уровня 0!");
    },

    // =========================================================================
    // CONTEXT-AWARE AI MENTOR (GEMINI 2.5 FLASH API + LOCAL ANTIGRAVITY CLI)
    // =========================================================================
    openAiDrawer(prefillPrompt) {
      const bd = document.getElementById("aiBackdrop");
      if (!bd) return;
      if (currentView === "ide" && activeTask && !state.solvedTasks.includes(activeTask.id)) {
        recordSrsHint(`task:${activeTask.id}`);
        saveState();
        updateGlobalBars();
      }
      bd.classList.remove("hidden");
      const sel = document.getElementById("aiEngineSelect");
      if (sel) sel.value = state.aiEngine || "gemini";
      renderAiContextAndChips();
      renderAiMessages();
      if (prefillPrompt) {
        this.askQuickAi(prefillPrompt);
      } else {
        setTimeout(() => document.getElementById("aiChatInput")?.focus(), 80);
      }
    },

    closeAiDrawer() {
      document.getElementById("aiBackdrop")?.classList.add("hidden");
    },

    setAiEngine(eng) {
      state.aiEngine = eng;
      persistStateLocally();
      toast(eng === "agy" ? "🧠 Выбран локальный движок Antigravity (через Ноутбук)" : "⚡ Выбран быстрый Gemini 2.5 Flash API");
    },

    clearAiChat() {
      aiChatHistory = [];
      renderAiMessages();
      toast("Диалог с ИИ очищен");
    },

    askQuickAi(promptText) {
      const inp = document.getElementById("aiChatInput");
      if (inp) inp.value = promptText;
      this.sendAiMessage();
    },

    async sendAiMessage() {
      if (aiBusy) return;
      const inp = document.getElementById("aiChatInput");
      const text = (inp?.value || "").trim();
      if (!text) return;
      inp.value = "";

      aiChatHistory.push({ role: "user", text });
      aiBusy = true;
      renderAiMessages();

      const ctx = buildAiContextString();
      const historySlice = aiChatHistory.slice(-7, -1);
      const replyObj = await requestAiReply(text, ctx, historySlice, state.aiEngine || "gemini");

      aiBusy = false;
      if (replyObj.ok) {
        aiChatHistory.push({ role: "assistant", text: replyObj.reply, model: replyObj.model });
      } else {
        aiChatHistory.push({ role: "assistant", text: `⚠️ ${replyObj.error}`, model: "Система" });
      }
      renderAiMessages();
    },

    onAppResume() {
      SyncEngine.fullSyncNow(false);
    },

    handleBack() {
      const aiBd = document.getElementById("aiBackdrop");
      if (aiBd && !aiBd.classList.contains("hidden")) {
        this.closeAiDrawer();
        return true;
      }
      if (!document.getElementById("xrayPopover").classList.contains("hidden")) {
        this.hideXray();
        return true;
      }
      if (!document.getElementById("modalBackdrop").classList.contains("hidden")) {
        this.closeModal();
        return true;
      }
      if (currentView === "ide") {
        this.exitIde();
        return true;
      }
      if (currentView !== "map") {
        this.nav("map");
        return true;
      }
      return false;
    }
  };

  function buildAiContextString() {
    if (currentView === "ide" && activeTask) {
      const reqList = activeTask.requirements || activeTask.reqs || [];
      const lines = [
        `Экран: Лаборатория WebLab IDE (Задача уровня ${activeTask.levelNum})`,
        `Название задачи: ${activeTask.title} (тип: ${activeTask.type})`,
        `Легенда: ${String(activeTask.story || "").replace(/<[^>]+>/g, "")}`,
        `Требования к решению: ${reqList.map((r, i) => `${i + 1}) ${String(r).replace(/<[^>]+>/g, "")}`).join("; ")}`
      ];
      if (labState) {
        if (activeTask.type === "terminal") {
          const recentCmds = (labState.history || []).slice(-8).map(c => `$ ${typeof c === "string" ? c : c.cmd}`).join(" | ");
          lines.push(`Текущая папка: ${labState.cwd}; Последние команды ученика: ${recentCmds || "ещё ничего не вводил"}`);
          if (labState.answerInput) lines.push(`Поле ответа в стенде: "${labState.answerInput}"`);
        } else if (activeTask.type === "builder") {
          lines.push(`Выбранные поля конструктора: ${JSON.stringify(labState.builderValues || {})}`);
        } else if (activeTask.type === "lpic_en") {
          lines.push(`Вопрос LPIC (EN): ${String(activeTask.enQuestion || "").replace(/<[^>]+>/g, "")}; Выбранный вариант: ${labState.selectedLpicOpt ?? "не выбран"}`);
        } else if (activeTask.type === "lpic_fill") {
          lines.push(`Вопрос LPIC (EN): ${String(activeTask.enQuestion || "").replace(/<[^>]+>/g, "")}; Введённый ответ ученика: "${labState.fillInput || ""}"`);
        }
      }
      if (lastValidation && !lastValidation.allPassed) {
        const failed = (lastValidation.results || [])
          .map((ok, idx) => ok ? null : reqList[idx])
          .filter(Boolean)
          .map(txt => String(txt).replace(/<[^>]+>/g, ""));
        lines.push(`Не пройдены пункты проверки: ${failed.join("; ")}`);
      }
      return lines.join("\n");
    }

    if (currentView === "lecture") {
      const lvl = C.levels.find(l => l.level === state.currentLevel) || C.levels[0];
      const words = (lvl.vocab || []).map(v => `${v.en} (${v.ru})`).join(", ");
      const steps = (lvl.blocks || []).filter(b => b.type === "step_head").map(b => b.title).join(" | ");
      return `Экран: Лекция Уровня ${lvl.level} из ${C.levels.length - 1} — «${lvl.title}». Шаги урока: ${steps}. Описание: ${lvl.shortDesc}. Английские слова урока: ${words}`;
    }

    if (currentView === "review" && reviewSession && !reviewSession.finished) {
      const card = reviewSession.cards[reviewSession.idx];
      if (card) {
        return `Экран: Умное повторение (Уровень ${card.level} — ${card.sourceLabel}). Причина показа: ${card.reasonText}. Вопрос: ${card.qPlain || String(card.qHtml || "").replace(/<[^>]+>/g, "")}. Варианты/ответ: ${card.opts ? card.opts.join(" | ") : (card.accepted || []).join(", ")}`;
      }
    }

    if (currentView === "dojo" && dojoSession && dojoSession.currentQ) {
      const q = dojoSession.currentQ;
      const lines = [
        `Экран: Полигон скиллов (${q.badge || dojoSession.arenaId})`,
        `Задание: ${q.q}`
      ];
      if (q.alertText) lines.push(`Алерт мониторинга: ${q.alertText}`);
      if (q.dumpCmd) lines.push(`Дамп терминала:\n${q.dumpCmd}`);
      if (q.opts) lines.push(`Варианты: ${q.opts.join(" | ")}`);
      return lines.join("\n");
    }

    if (currentView === "exam" && examSession && !examSession.finished) {
      const q = examSession.questions[examSession.idx];
      if (q) {
        return `Экран: Пробный экзамен LPIC-1 (${q.exam}). Вопрос на английском: ${String(q.q || "").replace(/<[^>]+>/g, "")}. Варианты: ${(q.opts || []).join(" | ")}`;
      }
    }

    return `Экран: Карта курса SysRush v5 (roadmap.sh/linux + LPIC-1 + Умное повторение + Полигон скиллов). Текущий уровень ученика: ${state.currentLevel}/${C.levels.length - 1}, решено задач: ${state.solvedTasks.length}/${getAllTasks().length}.`;
  }

  function renderAiContextAndChips() {
    const badge = document.getElementById("aiContextBadge");
    const chipsBox = document.getElementById("aiQuickChips");
    if (!badge || !chipsBox) return;

    let chips = [];
    if (currentView === "ide" && activeTask) {
      badge.textContent = `Задача: ${activeTask.title}`;
      chips = [
        { lbl: "🧐 Подскажи без спойлера", q: "Посмотри на мои действия в этой задаче и подскажи без прямого спойлера, в какую сторону копать и где ошибка?" },
        { lbl: "🇬🇧 Переведи слова и флаги", q: "Переведи все английские слова, команды и флаги из этой задачи простыми русскими ассоциациями!" },
        { lbl: "💡 Объясни на пальцах", q: "Объясни простыми словами на бытовом примере теорию, которая нужна для этой задачи." },
        { lbl: "💻 Покажи точное решение", q: "Покажи точное пошаговое решение этой задачи и объясни каждую команду." }
      ];
    } else if (currentView === "dojo" && dojoSession && dojoSession.currentQ) {
      badge.textContent = `Полигон: ${dojoSession.currentQ.badge || dojoSession.arenaId}`;
      chips = [
        { lbl: "🧠 Алгоритм счёта в уме", q: "Покажи самый быстрый лайфхак, как решать такие задачи в уме за 5 секунд без калькулятора!" },
        { lbl: "🚨 Разбор логов по строчкам", q: "Разбери построчно вывод терминала и объясни, куда смотреть первым делом на реальном сервере." }
      ];
    } else if (currentView === "review" && reviewSession && !reviewSession.finished) {
      const card = reviewSession.cards[reviewSession.idx];
      badge.textContent = `Повторение • Ур. ${card ? card.level : 0}`;
      chips = [
        { lbl: "💡 Мнемоника для памяти", q: "Придумай яркую ассоциацию или мнемонику, чтобы я запомнил этот концепт/команду с первого раза и навсегда!" },
        { lbl: "🧐 Почему другие варианты неверны?", q: "Разбери коротко, почему остальные варианты здесь не подходят." }
      ];
    } else if (currentView === "exam" && examSession && !examSession.finished) {
      badge.textContent = `Экзамен LPIC-1 • Вопрос ${examSession.idx + 1}`;
      chips = [
        { lbl: "🇬🇧 Переведи вопрос", q: "Переведи этот экзаменационный вопрос LPIC-1 на русский и разбери ключевые английские слова, не называя сразу ответ." },
        { lbl: "🧐 Наведи на мысль", q: "Дай подсказку по этому вопросу LPIC-1: какие варианты точно отпадают и почему?" }
      ];
    } else {
      const lvl = C.levels.find(l => l.level === state.currentLevel) || C.levels[0];
      badge.textContent = `Уровень ${lvl.level}: ${lvl.title}`;
      chips = [
        { lbl: "💡 Суть лекции за 1 минуту", q: "Перескажи самую главную выжимку текущего уровня за 1 минуту простыми словами!" },
        { lbl: "🇬🇧 Разбери англ. корни", q: "Помоги запомнить английские слова и флаги команд из этого уровня через смешные/простые ассоциации." },
        { lbl: "🎯 Подвохи на LPIC-1", q: "Какие главные ловушки и частые вопросы по этой теме попадаются на реальном экзамене LPIC-1?" },
        { lbl: "🧪 Проверь меня (1 вопрос)", q: "Задай мне 1 короткий практический вопрос на засыпку по теме этого уровня!" }
      ];
    }

    chipsBox.innerHTML = chips.map(c =>
      `<button class="ai-qchip" onclick="App.askQuickAi('${escapeAttr(c.q)}')">${c.lbl}</button>`
    ).join("");
  }

  function formatAiHtml(raw) {
    let safe = escapeHtml(String(raw || ""));
    // Code blocks ```...```
    safe = safe.replace(/```(?:\w+)?\n?([\s\S]*?)```/g, (_, code) => `<pre>${code.trim()}</pre>`);
    // Inline code `...`
    safe = safe.replace(/`([^`\n]+)`/g, "<code>$1</code>");
    // Bold **...**
    safe = safe.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    // Line breaks (outside pre)
    const parts = safe.split(/(<pre>[\s\S]*?<\/pre>)/g);
    return parts.map(p => p.startsWith("<pre>") ? p : p.replace(/\n/g, "<br/>")).join("");
  }

  function renderAiMessages() {
    const box = document.getElementById("aiChatList");
    const btn = document.getElementById("aiSendBtn");
    if (!box) return;
    if (btn) btn.disabled = aiBusy;

    if (aiChatHistory.length === 0 && !aiBusy) {
      box.innerHTML = `
        <div class="ai-msg assistant">
          <div class="ai-msg-meta">🤖 ИИ-Напарник • Готов к бою</div>
          Йо! Я вижу, какую лекцию или задачу ты сейчас открыл 👀<br/><br/>
          Жми на быстрые кнопки выше или пиши любой вопрос своими словами — разберём любую команду Linux, железо, маску подсети или английский термин LPIC-1 на пальцах!
        </div>
      `;
      return;
    }

    let html = aiChatHistory.map(m => {
      if (m.role === "user") {
        return `<div class="ai-msg user">${escapeHtml(m.text)}</div>`;
      }
      return `
        <div class="ai-msg assistant">
          <div class="ai-msg-meta">🤖 ИИ-Напарник ${m.model ? `• ${escapeHtml(m.model)}` : ""}</div>
          ${formatAiHtml(m.text)}
        </div>
      `;
    }).join("");

    if (aiBusy) {
      html += `
        <div class="ai-msg assistant">
          <div class="ai-msg-meta">🤖 Думаю...</div>
          ⏳ Разбираю контекст задачи...
        </div>
      `;
    }
    box.innerHTML = html;
    box.scrollTop = box.scrollHeight;
  }

  const AI_CLIENT_SYSTEM_PROMPT =
    "Ты — встроенный ИИ-напарник платформы SysRush (подготовка к Linux LPIC-1, сетям и железу в стиле JavaRush). " +
    "Общайся с учеником на «ты», живо, бодро, коротко и по-дружески («слушай», «смотри», «короче», «всё чётко»), без канцелярита. " +
    "Ученик плохо знает английский, поэтому всегда расшифровывай английские слова, корни и флаги команд простыми ассоциациями и русской транскрипцией! " +
    "Отвечай ёмко, структурно, команды пиши в `обратных кавычках`.";

  async function requestAiReply(prompt, context, history, engine) {
    const apiKey = (state.customApiKey || CFG.geminiApiKey || "").trim();

    // 1. Try Laptop Daemon (/api/ai) first when reachable or when `agy` CLI engine is selected
    const lanCandidates = syncStatus.lanBase ? [syncStatus.lanBase] : SyncEngine.getCandidateLanUrls();
    if (syncStatus.lanBase || engine === "agy") {
      for (const base of lanCandidates) {
        try {
          const timeoutMs = engine === "agy" ? 38000 : 16000;
          const r = await SyncEngine.fetchWithTimeout(`${base}/api/ai`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt, context, history, engine, apiKey })
          }, timeoutMs);
          const d = await r.json();
          if (d && d.ok && d.reply) return d;
          if (engine === "agy" && d && d.error) return { ok: false, error: d.error };
        } catch (e) {
          if (engine === "agy") {
            // Fall through to direct Gemini API if laptop is unreachable on 4G!
          }
        }
      }
    }

    // 2. Direct HTTPS call to Google Gemini API (works on Phone over 4G/LTE anywhere, even when laptop is off!)
    if (!apiKey) {
      return { ok: false, error: "Не найден Gemini API ключ, а локальный сервер ноутбука недоступен." };
    }

    const fullUserPrompt = context ? `${context}\n\nВопрос ученика: ${prompt}` : prompt;
    const contents = (history || []).slice(-6).map(h => ({
      role: h.role === "assistant" ? "model" : "user",
      parts: [{ text: String(h.text || "") }]
    }));
    contents.push({ role: "user", parts: [{ text: fullUserPrompt }] });

    const models = [CFG.geminiModel || "gemini-2.5-flash", CFG.geminiFallbackModel || "gemini-2.0-flash"];
    let lastErr = "";
    for (const model of models) {
      try {
        const genCfg = { temperature: 0.35, maxOutputTokens: 2200 };
        if (model.includes("2.5")) genCfg.thinkingConfig = { thinkingBudget: 128 };
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
        const r = await SyncEngine.fetchWithTimeout(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: AI_CLIENT_SYSTEM_PROMPT }] },
            contents,
            generationConfig: genCfg
          })
        }, 20000);
        const d = await r.json();
        const txt = d?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (txt) {
          return { ok: true, reply: txt.trim(), model };
        }
        lastErr = d?.error?.message || `HTTP ${r.status}`;
      } catch (e) {
        lastErr = e.message || String(e);
      }
    }
    return { ok: false, error: `Ошибка связи с ИИ: ${lastErr}` };
  }

  // Global keyboard shortcut on Desktop: Ctrl+Enter runs task verification inside WebLab IDE
  document.addEventListener("keydown", e => {
    if (e.ctrlKey && e.key === "Enter" && currentView === "ide") {
      e.preventDefault();
      window.App.verifyCurrentTask();
    } else if (e.key === "Escape") {
      window.App.handleBack();
    }
  });

  document.addEventListener("DOMContentLoaded", () => {
    try {
      if (localStorage.getItem("sysrush_theme") === "light" && document.body && document.body.classList) {
        document.body.classList.add("jr-light-theme");
      }
    } catch (e) {}

    let h = window.location.hash || "";
    if (h.startsWith("#setup=")) {
      try {
        const rawTok = decodeURIComponent(h.slice(7));
        const parsed = JSON.parse(decodeURIComponent(escape(atob(rawTok))));
        if (parsed && typeof parsed === "object") {
          if (parsed.ch) state.customSyncChannel = String(parsed.ch).trim();
          if (parsed.key) state.customApiKey = String(parsed.key).trim();
          persistStateLocally();
        }
        if (window.history && window.history.replaceState) {
          window.history.replaceState(null, "", window.location.pathname + window.location.search);
        }
        h = "";
        setTimeout(() => toast("🔗 Телефон/браузер привязан к облаку 24/7 и Gemini AI!"), 350);
      } catch (e) {}
    }

    if (!window.SYSRUSH_TEST_MODE && navigator && "serviceWorker" in navigator && window.location && /^https?:$/.test(window.location.protocol)) {
      navigator.serviceWorker.register("./sw.js").catch(() => {});
    }

    renderMap();
    updateGlobalBars();
    SyncEngine.start();
    if (h.startsWith("#task=")) {
      window.App.openTask(h.slice(6));
    } else if (h.startsWith("#lecture=")) {
      const n = parseInt(h.slice(9), 10);
      if (!isNaN(n)) {
        if (!state.unlockedLevels.includes(n)) state.unlockedLevels.push(n);
        window.App.openLecture(n);
      }
    } else if (h === "#roadmap") {
      window.App.nav("roadmap");
    } else if (h === "#review") {
      window.App.nav("review");
    } else if (h === "#dojo") {
      window.App.nav("dojo");
    } else if (h === "#vocab") {
      window.App.nav("vocab");
    } else if (h === "#tasks") {
      window.App.nav("tasks");
    } else if (h === "#exam") {
      window.App.nav("exam");
    }
  });
})();
