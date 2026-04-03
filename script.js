const STORAGE_KEY = "it-start-lab-state-v1";
const PASS_SCORE = 75;

document.addEventListener("DOMContentLoaded", () => {
  if (!window.TRAINER_APP) return;
  initTrainer();
});

function initTrainer() {
  const app = window.TRAINER_APP;
  const topics = app.topics;
  const lessons = flattenLessons(topics);
  const lessonMap = Object.fromEntries(lessons.map((lesson) => [lesson.id, lesson]));
  const topicMap = Object.fromEntries(topics.map((topic) => [topic.id, topic]));
  const ui = app.ui;

  const elements = {
    brandTitle: document.querySelector("#brandTitle"),
    brandSubtitle: document.querySelector("#brandSubtitle"),
    heroKicker: document.querySelector("#heroKicker"),
    heroTitle: document.querySelector("#heroTitle"),
    heroLead: document.querySelector("#heroLead"),
    continueBtn: document.querySelector("#continueBtn"),
    randomLessonBtn: document.querySelector("#randomLessonBtn"),
    topicsCount: document.querySelector("#topicsCount"),
    lessonsCount: document.querySelector("#lessonsCount"),
    completedCount: document.querySelector("#completedCount"),
    topicsStatLabel: document.querySelector("#topicsStatLabel"),
    lessonsStatLabel: document.querySelector("#lessonsStatLabel"),
    completedStatLabel: document.querySelector("#completedStatLabel"),
    topicsKicker: document.querySelector("#topicsKicker"),
    topicsTitle: document.querySelector("#topicsTitle"),
    topicsLead: document.querySelector("#topicsLead"),
    progressKicker: document.querySelector("#progressKicker"),
    progressTitle: document.querySelector("#progressTitle"),
    progressLead: document.querySelector("#progressLead"),
    overallProgressTitle: document.querySelector("#overallProgressTitle"),
    overallProgressText: document.querySelector("#overallProgressText"),
    overallProgressRing: document.querySelector("#overallProgressRing"),
    overallProgressValue: document.querySelector("#overallProgressValue"),
    savedPill: document.querySelector("#savedPill"),
    topicCards: document.querySelector("#topicCards"),
    topicProgressList: document.querySelector("#topicProgressList"),
    lessonKicker: document.querySelector("#lessonKicker"),
    activePath: document.querySelector("#activePath"),
    lessonTitle: document.querySelector("#lessonTitle"),
    lessonMeta: document.querySelector("#lessonMeta"),
    miniLessonTitle: document.querySelector("#miniLessonTitle"),
    lessonTypeBadge: document.querySelector("#lessonTypeBadge"),
    lessonSummary: document.querySelector("#lessonSummary"),
    lessonPoints: document.querySelector("#lessonPoints"),
    lessonTags: document.querySelector("#lessonTags"),
    practiceTitle: document.querySelector("#practiceTitle"),
    practiceStatus: document.querySelector("#practiceStatus"),
    lessonTask: document.querySelector("#lessonTask"),
    starterNote: document.querySelector("#starterNote"),
    editorLabel: document.querySelector("#editorLabel"),
    answerEditor: document.querySelector("#answerEditor"),
    runPreviewBtn: document.querySelector("#runPreviewBtn"),
    checkAnswerBtn: document.querySelector("#checkAnswerBtn"),
    resetLessonBtn: document.querySelector("#resetLessonBtn"),
    prevLessonBtn: document.querySelector("#prevLessonBtn"),
    nextLessonBtn: document.querySelector("#nextLessonBtn"),
    previewTitle: document.querySelector("#previewTitle"),
    previewStatus: document.querySelector("#previewStatus"),
    previewEmpty: document.querySelector("#previewEmpty"),
    previewWrap: document.querySelector("#previewWrap"),
    previewFrame: document.querySelector("#previewFrame"),
    aiTitle: document.querySelector("#aiTitle"),
    lastCheckLabel: document.querySelector("#lastCheckLabel"),
    feedbackEmpty: document.querySelector("#feedbackEmpty"),
    feedbackContent: document.querySelector("#feedbackContent"),
    scoreBadge: document.querySelector("#scoreBadge"),
    scoreValue: document.querySelector("#scoreValue"),
    feedbackState: document.querySelector("#feedbackState"),
    feedbackHeadline: document.querySelector("#feedbackHeadline"),
    feedbackSummary: document.querySelector("#feedbackSummary"),
    checklistTitle: document.querySelector("#checklistTitle"),
    tipsTitle: document.querySelector("#tipsTitle"),
    feedbackChecklist: document.querySelector("#feedbackChecklist"),
    feedbackTips: document.querySelector("#feedbackTips"),
    footerNote: document.querySelector("#footerNote"),
    resetProgressBtn: document.querySelector("#resetProgressBtn"),
    qrLabel: document.querySelector("#qrLabel"),
    qrHint: document.querySelector("#qrHint"),
    qrImage: document.querySelector("#qrImage"),
  };

  let state = loadState(lessons);
  let previewTimer = null;

  bindEvents();
  renderApp();

  function bindEvents() {
    document.querySelectorAll("[data-lang-option]").forEach((button) => {
      button.addEventListener("click", () => {
        if (button.dataset.langOption === state.lang) return;
        state.lang = button.dataset.langOption;
        saveState(state);
        renderApp();
      });
    });

    elements.continueBtn.addEventListener("click", () => {
      const lessonId = findFirstIncompleteLessonId() || state.activeLessonId;
      selectLesson(lessonId);
    });

    elements.randomLessonBtn.addEventListener("click", () => {
      const pool = lessons.filter((lesson) => lesson.id !== state.activeLessonId);
      const choice = pool[Math.floor(Math.random() * pool.length)] || lessons[0];
      selectLesson(choice.id);
    });

    elements.resetProgressBtn.addEventListener("click", () => {
      if (!window.confirm(t(ui.resetProgressConfirm))) return;
      state = {
        lang: state.lang,
        activeLessonId: lessons[0].id,
        progress: {},
      };
      saveState(state);
      renderApp();
    });

    elements.prevLessonBtn.addEventListener("click", () => {
      const index = lessons.findIndex((lesson) => lesson.id === state.activeLessonId);
      if (index > 0) selectLesson(lessons[index - 1].id);
    });

    elements.nextLessonBtn.addEventListener("click", () => {
      const index = lessons.findIndex((lesson) => lesson.id === state.activeLessonId);
      if (index < lessons.length - 1) selectLesson(lessons[index + 1].id);
    });

    elements.answerEditor.addEventListener("input", () => {
      const lesson = getActiveLesson();
      const record = getProgressRecord(lesson.id);
      record.answer = elements.answerEditor.value;
      record.completed = false;
      record.lastFeedback = null;
      record.checkedAt = null;
      ensureProgressContainer(lesson.id, record);
      saveState(state);
      renderPracticeStatus(lesson);
      renderTopicCards();
      renderProgressPanel();
      renderFeedback(lesson);
      schedulePreviewRefresh(lesson);
    });

    elements.runPreviewBtn.addEventListener("click", () => {
      renderPreview(getActiveLesson(), true);
    });

    elements.checkAnswerBtn.addEventListener("click", () => {
      const lesson = getActiveLesson();
      const answer = elements.answerEditor.value;
      const feedback = evaluateLesson(lesson, answer);
      const record = getProgressRecord(lesson.id);

      record.answer = answer;
      record.bestScore = Math.max(record.bestScore || 0, feedback.score);
      record.completed = feedback.score >= PASS_SCORE;
      record.lastFeedback = feedback;
      record.checkedAt = Date.now();

      ensureProgressContainer(lesson.id, record);
      saveState(state);

      renderTopicCards();
      renderProgressPanel();
      renderPracticeStatus(lesson);
      renderFeedback(lesson);
    });

    elements.resetLessonBtn.addEventListener("click", () => {
      const lesson = getActiveLesson();
      const record = getProgressRecord(lesson.id);
      record.answer = lesson.task.starterCode;
      record.completed = false;
      record.lastFeedback = null;
      record.checkedAt = null;
      ensureProgressContainer(lesson.id, record);
      saveState(state);
      elements.answerEditor.value = lesson.task.starterCode;
      renderPracticeStatus(lesson);
      renderTopicCards();
      renderProgressPanel();
      renderFeedback(lesson);
      renderPreview(lesson, true);
    });

    elements.topicCards.addEventListener("click", (event) => {
      const lessonButton = event.target.closest("[data-lesson-select]");
      if (lessonButton) {
        selectLesson(lessonButton.dataset.lessonSelect);
        return;
      }

      const topicButton = event.target.closest("[data-topic-select]");
      if (topicButton) {
        const topic = topicMap[topicButton.dataset.topicSelect];
        const nextLesson = findFirstIncompleteLessonInTopic(topic) || topic.lessons[0];
        selectLesson(nextLesson.id);
      }
    });
  }

  function renderApp() {
    renderStaticCopy();
    renderLangSwitch();
    renderTopicCards();
    renderProgressPanel();
    renderLesson();
    renderFeedback(getActiveLesson());
  }

  function renderStaticCopy() {
    document.documentElement.lang = state.lang;
    document.title = t(ui.brandTitle) + " | " + t(ui.heroTitle);

    elements.brandTitle.textContent = t(ui.brandTitle);
    elements.brandSubtitle.textContent = t(ui.brandSubtitle);
    elements.heroKicker.textContent = t(ui.heroKicker);
    elements.heroTitle.textContent = t(ui.heroTitle);
    elements.heroLead.textContent = t(ui.heroLead);
    elements.continueBtn.textContent = t(ui.continueBtn);
    elements.randomLessonBtn.textContent = t(ui.randomLessonBtn);
    elements.topicsStatLabel.textContent = t(ui.statTopics);
    elements.lessonsStatLabel.textContent = t(ui.statLessons);
    elements.completedStatLabel.textContent = t(ui.statCompleted);
    elements.topicsKicker.textContent = t(ui.topicsKicker);
    elements.topicsTitle.textContent = t(ui.topicsTitle);
    elements.topicsLead.textContent = t(ui.topicsLead);
    elements.progressKicker.textContent = t(ui.progressKicker);
    elements.progressTitle.textContent = t(ui.progressTitle);
    elements.progressLead.textContent = t(ui.progressLead);
    elements.overallProgressTitle.textContent = t(ui.overallProgressTitle);
    elements.savedPill.textContent = t(ui.savedPill);
    elements.lessonKicker.textContent = t(ui.lessonKicker);
    elements.miniLessonTitle.textContent = t(ui.miniLessonTitle);
    elements.practiceTitle.textContent = t(ui.practiceTitle);
    elements.editorLabel.textContent = t(ui.editorLabel);
    elements.runPreviewBtn.textContent = t(ui.runPreviewBtn);
    elements.checkAnswerBtn.textContent = t(ui.checkAnswerBtn);
    elements.resetLessonBtn.textContent = t(ui.resetLessonBtn);
    elements.prevLessonBtn.textContent = t(ui.prevLessonBtn);
    elements.nextLessonBtn.textContent = t(ui.nextLessonBtn);
    elements.previewTitle.textContent = t(ui.previewTitle);
    elements.previewEmpty.textContent = t(ui.previewEmpty);
    elements.aiTitle.textContent = t(ui.aiTitle);
    elements.feedbackEmpty.textContent = t(ui.feedbackEmpty);
    elements.checklistTitle.textContent = t(ui.checklistTitle);
    elements.tipsTitle.textContent = t(ui.tipsTitle);
    elements.qrLabel.textContent = t(ui.qrLabel);
    elements.qrHint.textContent = t(ui.qrHint);
    elements.qrImage.alt = t(ui.qrAlt);
    elements.footerNote.textContent = t(ui.footerNote);
    elements.resetProgressBtn.textContent = t(ui.resetProgressBtn);
  }

  function renderLangSwitch() {
    document.querySelectorAll("[data-lang-option]").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.langOption === state.lang);
      button.setAttribute(
        "aria-pressed",
        button.dataset.langOption === state.lang ? "true" : "false"
      );
    });
  }

  function renderTopicCards() {
    const activeLesson = getActiveLesson();

    elements.topicCards.innerHTML = topics
      .map((topic) => {
        const completed = countCompletedLessons(topic.lessons);
        const total = topic.lessons.length;
        const isActive = topic.id === activeLesson.topicId;

        return `
          <article class="topic-card${isActive ? " is-active" : ""}" style="--topic-accent:${topic.accent}">
            <button class="topic-card__head" type="button" data-topic-select="${topic.id}">
              <span class="topic-icon">${topic.icon}</span>
              <span class="topic-card__copy">
                <strong>${escapeHtml(t(topic.title))}</strong>
                <small>${escapeHtml(t(topic.blurb))}</small>
              </span>
              <span class="topic-card__count">${completed}/${total}</span>
            </button>
            <div class="topic-card__lessons">
              ${topic.lessons
                .map((lesson, index) => {
                  const status = getLessonStatus(lesson.id);
                  const isCurrent = lesson.id === activeLesson.id;

                  return `
                    <button
                      class="lesson-pill lesson-pill--${status}${isCurrent ? " is-current" : ""}"
                      type="button"
                      data-lesson-select="${lesson.id}"
                    >
                      <span class="lesson-pill__number">${String(index + 1).padStart(2, "0")}</span>
                      <span class="lesson-pill__text">${escapeHtml(t(lesson.title))}</span>
                    </button>
                  `;
                })
                .join("")}
            </div>
          </article>
        `;
      })
      .join("");
  }

  function renderProgressPanel() {
    const totalLessons = lessons.length;
    const completedLessons = lessons.filter((lesson) => getProgressRecord(lesson.id).completed).length;
    const progressValue = Math.round((completedLessons / totalLessons) * 100);

    elements.topicsCount.textContent = String(topics.length);
    elements.lessonsCount.textContent = String(totalLessons);
    elements.completedCount.textContent = String(completedLessons);
    elements.overallProgressValue.textContent = `${progressValue}%`;
    elements.overallProgressText.textContent = `${completedLessons}/${totalLessons} ${t(
      ui.completedFromTotal
    )}`;
    elements.overallProgressRing.style.setProperty("--progress", `${progressValue}%`);

    elements.topicProgressList.innerHTML = topics
      .map((topic) => {
        const completed = countCompletedLessons(topic.lessons);
        const total = topic.lessons.length;
        const ratio = Math.round((completed / total) * 100);

        return `
          <div class="topic-progress-row">
            <div class="topic-progress-row__top">
              <span>${escapeHtml(t(topic.title))}</span>
              <strong>${completed}/${total}</strong>
            </div>
            <div class="topic-progress-row__bar">
              <span style="width:${ratio}%; background:${topic.accent};"></span>
            </div>
          </div>
        `;
      })
      .join("");
  }

  function renderLesson() {
    const lesson = getActiveLesson();
    const answer = getDraft(lesson);
    const lessonIndex = lessons.findIndex((item) => item.id === lesson.id);

    elements.activePath.textContent = `${t(lesson.topicTitle)} / ${t(lesson.title)}`;
    elements.lessonTitle.textContent = t(lesson.title);
    elements.lessonMeta.textContent = `${t(ui.levelLabel)}: ${t(lesson.difficulty)} • ${t(
      ui.durationLabel
    )}: ${lesson.duration} ${t(ui.minutes)} • ${t(ui.languageLabel)}: ${formatTrackLabel(
      lesson.language
    )}`;
    elements.lessonTypeBadge.textContent = formatTrackLabel(lesson.language);
    elements.lessonSummary.textContent = t(lesson.summary);
    elements.lessonPoints.innerHTML = t(lesson.points)
      .map((point) => `<li>${escapeHtml(point)}</li>`)
      .join("");
    elements.lessonTags.innerHTML = t(lesson.tags)
      .map((tag) => `<span>${escapeHtml(tag)}</span>`)
      .join("");
    elements.lessonTask.textContent = t(lesson.task.instruction).replace(/`/g, "");
    elements.answerEditor.value = answer;

    renderStarterNote(lesson);
    renderPracticeStatus(lesson);
    renderPreview(lesson, false);

    elements.prevLessonBtn.disabled = lessonIndex <= 0;
    elements.nextLessonBtn.disabled = lessonIndex >= lessons.length - 1;
  }

  function renderStarterNote(lesson) {
    const noteParts = [];
    if (lesson.task.note) {
      noteParts.push(`<p>${escapeHtml(t(lesson.task.note))}</p>`);
    }

    if (lesson.task.referenceCode) {
      noteParts.push(`
        <div class="starter-reference">
          <strong>${escapeHtml(t(lesson.task.referenceTitle))}</strong>
          <pre><code>${escapeHtml(lesson.task.referenceCode)}</code></pre>
        </div>
      `);
    }

    elements.starterNote.innerHTML = noteParts.join("");
    elements.starterNote.hidden = noteParts.length === 0;
  }

  function renderPracticeStatus(lesson) {
    const record = getProgressRecord(lesson.id);
    const hasDraft = hasCustomDraft(lesson.id);
    let text = t(ui.practicePending);

    if (record.completed) {
      text = t(ui.practiceDone);
    } else if (hasDraft) {
      text = t(ui.practiceDraft);
    }

    elements.practiceStatus.textContent = text;
  }

  function renderPreview(lesson, forceStatus) {
    const previewMode = lesson.preview?.mode || "none";
    const hasPreview = previewMode !== "none";
    elements.runPreviewBtn.disabled = !hasPreview;

    if (!hasPreview) {
      elements.previewWrap.hidden = true;
      elements.previewEmpty.hidden = false;
      elements.previewStatus.textContent = t(ui.previewUnavailable);
      elements.previewFrame.srcdoc = "";
      return;
    }

    const answer = elements.answerEditor.value || lesson.task.starterCode;
    elements.previewWrap.hidden = false;
    elements.previewEmpty.hidden = true;
    elements.previewFrame.srcdoc = buildPreviewDocument(lesson, answer);
    if (forceStatus || !elements.previewStatus.textContent) {
      elements.previewStatus.textContent = t(ui.previewReady);
    } else {
      elements.previewStatus.textContent = t(ui.previewReady);
    }
  }

  function renderFeedback(lesson) {
    const record = getProgressRecord(lesson.id);
    const feedback = record.lastFeedback;

    if (!feedback) {
      elements.feedbackEmpty.hidden = false;
      elements.feedbackContent.hidden = true;
      elements.lastCheckLabel.textContent = "";
      return;
    }

    elements.feedbackEmpty.hidden = true;
    elements.feedbackContent.hidden = false;
    elements.scoreValue.textContent = `${feedback.score}%`;
    elements.scoreBadge.style.setProperty("--score", `${feedback.score}%`);
    elements.feedbackState.textContent = getFeedbackStateLabel(feedback.status);
    elements.feedbackHeadline.textContent = getFeedbackHeadline(lesson, feedback.status);
    elements.feedbackSummary.textContent = t(feedback.summary);
    elements.lastCheckLabel.textContent = `${t(ui.lastCheckPrefix)}: ${formatDate(record.checkedAt)}`;

    elements.feedbackChecklist.innerHTML = feedback.checks
      .map(
        (check) => `
          <article class="feedback-item feedback-item--${check.passed ? "pass" : "fail"}">
            <span class="feedback-item__marker">${check.passed ? t(ui.markerPass) : t(ui.markerFix)}</span>
            <div>
              <strong>${escapeHtml(t(check.label))}</strong>
              <p>${escapeHtml(t(check.hint))}</p>
            </div>
          </article>
        `
      )
      .join("");

    elements.feedbackTips.innerHTML = feedback.tips
      .map(
        (tip) => `
          <article class="feedback-item feedback-item--tip">
            <span class="feedback-item__marker">${t(ui.markerTip)}</span>
            <div>
              <p>${escapeHtml(t(tip))}</p>
            </div>
          </article>
        `
      )
      .join("");
  }

  function selectLesson(lessonId) {
    if (!lessonMap[lessonId]) return;
    state.activeLessonId = lessonId;
    saveState(state);
    renderTopicCards();
    renderLesson();
    renderFeedback(getActiveLesson());
  }

  function getActiveLesson() {
    return lessonMap[state.activeLessonId] || lessons[0];
  }

  function getProgressRecord(lessonId) {
    return state.progress[lessonId] || {
      answer: "",
      bestScore: 0,
      completed: false,
      lastFeedback: null,
      checkedAt: null,
    };
  }

  function ensureProgressContainer(lessonId, record) {
    state.progress[lessonId] = {
      answer: record.answer || "",
      bestScore: record.bestScore || 0,
      completed: Boolean(record.completed),
      lastFeedback: record.lastFeedback || null,
      checkedAt: record.checkedAt || null,
    };
  }

  function getDraft(lesson) {
    const saved = getProgressRecord(lesson.id).answer;
    return saved || lesson.task.starterCode;
  }

  function hasCustomDraft(lessonId) {
    const lesson = lessonMap[lessonId];
    const saved = getProgressRecord(lessonId).answer;
    return Boolean(saved && saved.trim() && saved !== lesson.task.starterCode);
  }

  function findFirstIncompleteLessonId() {
    const next = lessons.find((lesson) => !getProgressRecord(lesson.id).completed);
    return next ? next.id : lessons[0].id;
  }

  function findFirstIncompleteLessonInTopic(topic) {
    return topic.lessons.find((lesson) => !getProgressRecord(lesson.id).completed);
  }

  function getLessonStatus(lessonId) {
    const record = getProgressRecord(lessonId);
    if (record.completed) return "done";
    if (hasCustomDraft(lessonId)) return "draft";
    return "start";
  }

  function countCompletedLessons(topicLessons) {
    return topicLessons.filter((lesson) => getProgressRecord(lesson.id).completed).length;
  }

  function schedulePreviewRefresh(lesson) {
    if (!lesson.preview || lesson.preview.mode === "none") return;
    window.clearTimeout(previewTimer);
    previewTimer = window.setTimeout(() => {
      renderPreview(lesson, false);
    }, 240);
  }

  function t(value) {
    if (Array.isArray(value)) return value;
    if (value && typeof value === "object") return value[state.lang] || value.ru || value.en || "";
    return value || "";
  }

  function formatTrackLabel(language) {
    const labels = {
      logic: { ru: "Логика", en: "Logic" },
      html: { ru: "HTML", en: "HTML" },
      css: { ru: "CSS", en: "CSS" },
      javascript: { ru: "JavaScript", en: "JavaScript" },
      python: { ru: "Python", en: "Python" },
      java: { ru: "Java", en: "Java" },
    };
    return t(labels[language]);
  }

  function getFeedbackStateLabel(status) {
    if (status === "strong") return t(ui.feedbackStrong);
    if (status === "almost") return t(ui.feedbackAlmost);
    return t(ui.feedbackRetry);
  }

  function getFeedbackHeadline(lesson, status) {
    if (status === "strong") {
      return state.lang === "ru"
        ? `${t(lesson.title)}: решение принято`
        : `${t(lesson.title)}: accepted`;
    }

    if (status === "almost") {
      return state.lang === "ru"
        ? `${t(lesson.title)}: осталось немного`
        : `${t(lesson.title)}: almost done`;
    }

    return state.lang === "ru"
      ? `${t(lesson.title)}: нужно усилить основу`
      : `${t(lesson.title)}: strengthen the basics`;
  }
}

function flattenLessons(topics) {
  return topics.flatMap((topic) =>
    topic.lessons.map((lesson) => ({
      ...lesson,
      topicId: topic.id,
      topicTitle: topic.title,
      topicAccent: topic.accent,
    }))
  );
}

function loadState(lessons) {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return {
      lang: raw.lang === "en" ? "en" : "ru",
      activeLessonId: lessons.some((lesson) => lesson.id === raw.activeLessonId)
        ? raw.activeLessonId
        : lessons[0].id,
      progress: raw.progress && typeof raw.progress === "object" ? raw.progress : {},
    };
  } catch (_error) {
    return {
      lang: "ru",
      activeLessonId: lessons[0].id,
      progress: {},
    };
  }
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildPreviewDocument(lesson, answer) {
  const preview = lesson.preview || { mode: "none" };
  const baseCss = preview.baseCss || "";
  const safeAnswer = answer || "";

  if (preview.mode === "html") {
    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>${baseCss}</style>
  </head>
  <body>
    ${safeAnswer}
  </body>
</html>`;
  }

  if (preview.mode === "css") {
    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>${baseCss}
${safeAnswer}</style>
  </head>
  <body>
    ${preview.baseHtml || ""}
  </body>
</html>`;
  }

  if (preview.mode === "javascript") {
    const safeScript = sanitizeScript(safeAnswer);
    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>${baseCss}</style>
  </head>
  <body>
    ${preview.baseHtml || ""}
    <script>
      const __consoleTarget = document.getElementById("__preview_console");
      const __writeConsole = (message) => {
        if (__consoleTarget) __consoleTarget.textContent = String(message);
      };
      const console = {
        log: (...args) => __writeConsole(args.join(" "))
      };
      window.onerror = function(message) {
        __writeConsole("Error: " + message);
      };
      try {
        ${safeScript}
        __writeConsole("Script executed");
      } catch (error) {
        __writeConsole("Error: " + error.message);
      }
    </script>
  </body>
</html>`;
  }

  return "";
}

function sanitizeScript(code) {
  return String(code).replace(/<\/script/gi, "<\\/script");
}

function evaluateLesson(lesson, answer) {
  const evaluators = {
    "basics-variables": evaluateBasicsVariables,
    "basics-condition": evaluateBasicsCondition,
    "html-card": evaluateHtmlCard,
    "html-form": evaluateHtmlForm,
    "css-button": evaluateCssButton,
    "css-layout": evaluateCssLayout,
    "js-greeting": evaluateJsGreeting,
    "js-function": evaluateJsFunction,
    "python-loop": evaluatePythonLoop,
    "python-function": evaluatePythonFunction,
    "java-main": evaluateJavaMain,
    "java-condition": evaluateJavaCondition,
  };

  const checks = (evaluators[lesson.id] || evaluateFallback)(answer);
  const passedCount = checks.filter((check) => check.passed).length;
  const score = Math.round((passedCount / checks.length) * 100);
  const status = score >= PASS_SCORE ? "strong" : score >= 50 ? "almost" : "retry";

  return {
    score,
    status,
    checks,
    tips: buildTips(checks, status),
    summary:
      status === "strong"
        ? {
            ru: "AI видит ключевые конструкции. Можно переходить дальше или улучшить стиль по желанию.",
            en: "The AI checker sees the key pieces. You can move on or polish the style if you want.",
          }
        : status === "almost"
          ? {
              ru: "Основа уже есть, но не хватает нескольких обязательных элементов.",
              en: "The base is there, but a few required elements are still missing.",
            }
          : {
              ru: "Сейчас в решении не хватает базовых частей. Исправь пункты ниже и проверь ещё раз.",
              en: "The solution is still missing core parts. Fix the items below and run the check again.",
            },
  };
}

function buildTips(checks, status) {
  const missing = checks.filter((check) => !check.passed).map((check) => check.hint);
  if (missing.length > 0) return missing.slice(0, 3);

  if (status === "strong") {
    return [
      {
        ru: "Можно переходить к следующему уроку.",
        en: "You can move to the next lesson.",
      },
      {
        ru: "Если хочешь, улучши читаемость имён и отступов.",
        en: "If you want, improve the readability of names and spacing.",
      },
    ];
  }

  return [
    {
      ru: "Добавь больше конкретики и проверь решение ещё раз.",
      en: "Add a bit more detail and run the check again.",
    },
  ];
}

function createCheck(passed, label, hint) {
  return { passed, label, hint };
}

function evaluateFallback(answer) {
  const hasContent = Boolean(answer.trim());
  return [
    createCheck(
      hasContent,
      {
        ru: "Ответ не пустой",
        en: "The answer is not empty",
      },
      {
        ru: "Добавь решение в редактор.",
        en: "Add a solution in the editor.",
      }
    ),
  ];
}

function evaluateBasicsVariables(answer) {
  const normalized = answer;
  return [
    createCheck(
      /\bname\s*=\s*["'`][^"'`]+["'`]/i.test(normalized),
      {
        ru: "Есть переменная `name` с данными",
        en: "A `name` variable with data is present",
      },
      {
        ru: "Создай `name` и запиши в неё строку.",
        en: "Create `name` and store a string inside it.",
      }
    ),
    createCheck(
      /\bgoal\s*=\s*["'`][^"'`]+["'`]/i.test(normalized),
      {
        ru: "Есть переменная `goal` с данными",
        en: "A `goal` variable with data is present",
      },
      {
        ru: "Создай `goal` и запиши в неё строку.",
        en: "Create `goal` and store a string inside it.",
      }
    ),
    createCheck(
      /(print|console\.log|System\.out\.println)\s*\(\s*name\s*\)/i.test(normalized),
      {
        ru: "Имя выводится отдельно",
        en: "The name is output separately",
      },
      {
        ru: "Добавь вывод `name` через `print`, `console.log` или `System.out.println`.",
        en: "Output `name` with `print`, `console.log`, or `System.out.println`.",
      }
    ),
    createCheck(
      /(print|console\.log|System\.out\.println)\s*\(\s*goal\s*\)/i.test(normalized),
      {
        ru: "Цель выводится отдельно",
        en: "The goal is output separately",
      },
      {
        ru: "Добавь отдельный вывод `goal`.",
        en: "Add a separate output for `goal`.",
      }
    ),
  ];
}

function evaluateBasicsCondition(answer) {
  const normalized = answer;
  return [
    createCheck(
      /\bscore\s*=\s*75\b/i.test(normalized),
      {
        ru: "Переменная `score` создана",
        en: "The `score` variable is created",
      },
      {
        ru: "Добавь строку `score = 75`.",
        en: "Add the line `score = 75`.",
      }
    ),
    createCheck(
      /\bif\b/i.test(normalized),
      {
        ru: "Есть ветка `if`",
        en: "There is an `if` branch",
      },
      {
        ru: "Добавь условие `if`.",
        en: "Add an `if` condition.",
      }
    ),
    createCheck(
      /score\s*>=\s*60/i.test(normalized),
      {
        ru: "Порог `60` использован",
        en: "The `60` threshold is used",
      },
      {
        ru: "Проверь сравнение `score >= 60`.",
        en: "Use the comparison `score >= 60`.",
      }
    ),
    createCheck(
      /\belse\b/i.test(normalized),
      {
        ru: "Есть ветка `else`",
        en: "There is an `else` branch",
      },
      {
        ru: "Добавь ветку `else` для второго сценария.",
        en: "Add an `else` branch for the second scenario.",
      }
    ),
    createCheck(
      /(pass).*(try again)|(try again).*(pass)/i.test(normalized),
      {
        ru: "Оба текста вывода присутствуют",
        en: "Both output messages are present",
      },
      {
        ru: "Нужны строки `pass` и `try again`.",
        en: "Include both `pass` and `try again`.",
      }
    ),
  ];
}

function evaluateHtmlCard(answer) {
  const doc = new DOMParser().parseFromString(answer, "text/html");
  return [
    createCheck(
      Boolean(doc.querySelector("section, article, div")),
      {
        ru: "Есть контейнер карточки",
        en: "A card container is present",
      },
      {
        ru: "Добавь контейнер: `section`, `article` или `div`.",
        en: "Add a container: `section`, `article`, or `div`.",
      }
    ),
    createCheck(
      Boolean(doc.querySelector("h1")),
      {
        ru: "Есть заголовок `h1`",
        en: "An `h1` heading is present",
      },
      {
        ru: "Добавь заголовок `h1`.",
        en: "Add an `h1` heading.",
      }
    ),
    createCheck(
      Boolean(doc.querySelector("p")),
      {
        ru: "Есть абзац `p`",
        en: "A `p` paragraph is present",
      },
      {
        ru: "Добавь абзац `p` с коротким текстом.",
        en: "Add a `p` paragraph with short text.",
      }
    ),
    createCheck(
      Boolean(doc.querySelector("button")),
      {
        ru: "Есть кнопка `button`",
        en: "A `button` is present",
      },
      {
        ru: "Добавь кнопку `button`.",
        en: "Add a `button`.",
      }
    ),
  ];
}

function evaluateHtmlForm(answer) {
  const doc = new DOMParser().parseFromString(answer, "text/html");
  return [
    createCheck(
      Boolean(doc.querySelector("form")),
      {
        ru: "Есть форма `form`",
        en: "A `form` is present",
      },
      {
        ru: "Добавь тег `form`.",
        en: "Add a `form` tag.",
      }
    ),
    createCheck(
      Boolean(doc.querySelector("label")),
      {
        ru: "Есть `label` для подписи",
        en: "A `label` is present",
      },
      {
        ru: "Добавь `label` для поля ввода.",
        en: "Add a `label` for the input.",
      }
    ),
    createCheck(
      Boolean(doc.querySelector('input[type="email"]')),
      {
        ru: "Есть `input type=\"email\"`",
        en: "An `input type=\"email\"` is present",
      },
      {
        ru: "Добавь `input` с типом `email`.",
        en: "Add an `input` with the `email` type.",
      }
    ),
    createCheck(
      Boolean(doc.querySelector("button")),
      {
        ru: "Есть кнопка отправки",
        en: "A submit button is present",
      },
      {
        ru: "Добавь кнопку для отправки формы.",
        en: "Add a button to submit the form.",
      }
    ),
  ];
}

function evaluateCssButton(answer) {
  const normalized = answer;
  return [
    createCheck(
      /\.cta-button\s*\{/i.test(normalized),
      {
        ru: "Стили применяются к `.cta-button`",
        en: "Styles target `.cta-button`",
      },
      {
        ru: "Начни правило с `.cta-button { ... }`.",
        en: "Start the rule with `.cta-button { ... }`.",
      }
    ),
    createCheck(
      /background(-color)?\s*:/i.test(normalized),
      {
        ru: "Есть цвет или фон кнопки",
        en: "A button background is set",
      },
      {
        ru: "Добавь `background` или `background-color`.",
        en: "Add `background` or `background-color`.",
      }
    ),
    createCheck(
      /color\s*:/i.test(normalized),
      {
        ru: "Есть цвет текста",
        en: "A text color is set",
      },
      {
        ru: "Добавь свойство `color`.",
        en: "Add the `color` property.",
      }
    ),
    createCheck(
      /padding\s*:/i.test(normalized),
      {
        ru: "Есть внутренний отступ",
        en: "Padding is set",
      },
      {
        ru: "Добавь `padding`, чтобы кнопка выглядела лучше.",
        en: "Add `padding` to improve the button shape.",
      }
    ),
    createCheck(
      /border-radius\s*:/i.test(normalized),
      {
        ru: "Есть скругление",
        en: "Border radius is set",
      },
      {
        ru: "Добавь `border-radius` для более мягкой формы.",
        en: "Add `border-radius` for a softer shape.",
      }
    ),
  ];
}

function evaluateCssLayout(answer) {
  const normalized = answer;
  return [
    createCheck(
      /\.cards\s*\{/i.test(normalized),
      {
        ru: "Есть правило для `.cards`",
        en: "There is a rule for `.cards`",
      },
      {
        ru: "Добавь CSS-правило для `.cards`.",
        en: "Add a CSS rule for `.cards`.",
      }
    ),
    createCheck(
      /display\s*:\s*flex/i.test(normalized),
      {
        ru: "Используется `display: flex`",
        en: "`display: flex` is used",
      },
      {
        ru: "Сделай контейнер flex через `display: flex`.",
        en: "Turn the container into flex with `display: flex`.",
      }
    ),
    createCheck(
      /gap\s*:/i.test(normalized),
      {
        ru: "Задан `gap` между карточками",
        en: "`gap` is set between cards",
      },
      {
        ru: "Добавь `gap` между карточками.",
        en: "Add `gap` between the cards.",
      }
    ),
    createCheck(
      /\.cards\s+article\s*\{/i.test(normalized),
      {
        ru: "Есть правило для `.cards article`",
        en: "There is a rule for `.cards article`",
      },
      {
        ru: "Добавь правило для `.cards article`.",
        en: "Add a rule for `.cards article`.",
      }
    ),
    createCheck(
      /padding\s*:|background(-color)?\s*:/i.test(normalized),
      {
        ru: "Карточки получили базовое оформление",
        en: "The cards have basic styling",
      },
      {
        ru: "Добавь хотя бы `padding` и фон карточкам.",
        en: "Add at least `padding` and a background to the cards.",
      }
    ),
  ];
}

function evaluateJsGreeting(answer) {
  const normalized = answer;
  return [
    createCheck(
      /\b(const|let|var)\s+userName\s*=\s*["'`][^"'`]+["'`]/i.test(normalized),
      {
        ru: "Есть переменная `userName` со строкой",
        en: "A `userName` string variable is present",
      },
      {
        ru: "Создай `userName` и запиши в неё имя.",
        en: "Create `userName` and store a name inside it.",
      }
    ),
    createCheck(
      /document\.querySelector\s*\(\s*["']#output["']\s*\)/i.test(normalized) ||
        /document\.getElementById\s*\(\s*["']output["']\s*\)/i.test(normalized),
      {
        ru: "Элемент `#output` найден",
        en: "The `#output` element is selected",
      },
      {
        ru: "Найди элемент `#output` через DOM.",
        en: "Select the `#output` element through the DOM.",
      }
    ),
    createCheck(
      /(textContent|innerText|innerHTML)\s*=\s*.*userName/i.test(normalized),
      {
        ru: "Имя выводится в интерфейс",
        en: "The name is rendered in the UI",
      },
      {
        ru: "Запиши приветствие в `textContent`, `innerText` или `innerHTML`.",
        en: "Write the greeting into `textContent`, `innerText`, or `innerHTML`.",
      }
    ),
    createCheck(
      /(hello|hi|привет)/i.test(normalized),
      {
        ru: "Есть само приветствие",
        en: "A greeting is present",
      },
      {
        ru: "Добавь слово `Hello`, `Hi` или `Привет` в текст.",
        en: "Add `Hello`, `Hi`, or `Привет` to the text.",
      }
    ),
  ];
}

function evaluateJsFunction(answer) {
  const normalized = answer;
  return [
    createCheck(
      /function\s+checkAge\s*\(\s*age\s*\)/i.test(normalized) ||
        /(const|let|var)\s+checkAge\s*=\s*\(\s*age\s*\)\s*=>/i.test(normalized),
      {
        ru: "Функция `checkAge(age)` создана",
        en: "The `checkAge(age)` function is created",
      },
      {
        ru: "Создай функцию с именем `checkAge` и параметром `age`.",
        en: "Create a function named `checkAge` with the `age` parameter.",
      }
    ),
    createCheck(
      /\bif\s*\(\s*age\s*>=\s*18\s*\)/i.test(normalized),
      {
        ru: "Есть условие `age >= 18`",
        en: "The `age >= 18` condition is present",
      },
      {
        ru: "Добавь проверку `if (age >= 18)`.",
        en: "Add the `if (age >= 18)` check.",
      }
    ),
    createCheck(
      /return\s+["'`]adult["'`]/i.test(normalized),
      {
        ru: "Функция возвращает `adult`",
        en: "The function returns `adult`",
      },
      {
        ru: "В одной ветке верни строку `adult`.",
        en: "Return the string `adult` in one branch.",
      }
    ),
    createCheck(
      /return\s+["'`]junior["'`]/i.test(normalized),
      {
        ru: "Функция возвращает `junior`",
        en: "The function returns `junior`",
      },
      {
        ru: "Во второй ветке верни строку `junior`.",
        en: "Return the string `junior` in the other branch.",
      }
    ),
  ];
}

function evaluatePythonLoop(answer) {
  const normalized = answer;
  const stringItems = normalized.match(/["'][^"']+["']/g) || [];
  return [
    createCheck(
      /\btopics\s*=\s*\[.*\]/is.test(normalized),
      {
        ru: "Список `topics` создан",
        en: "The `topics` list is created",
      },
      {
        ru: "Создай список `topics = [...]`.",
        en: "Create a `topics = [...]` list.",
      }
    ),
    createCheck(
      stringItems.length >= 3,
      {
        ru: "В списке как минимум три темы",
        en: "The list contains at least three topics",
      },
      {
        ru: "Добавь в список три строковых элемента.",
        en: "Add three string items to the list.",
      }
    ),
    createCheck(
      /\bfor\s+\w+\s+in\s+topics\s*:/i.test(normalized),
      {
        ru: "Есть цикл `for` по списку",
        en: "A `for` loop iterates through the list",
      },
      {
        ru: "Используй цикл `for item in topics:`.",
        en: "Use the `for item in topics:` pattern.",
      }
    ),
    createCheck(
      /print\s*\(\s*\w+\s*\)/i.test(normalized),
      {
        ru: "Элементы выводятся через `print()`",
        en: "Items are printed with `print()`",
      },
      {
        ru: "Внутри цикла добавь `print(item)`.",
        en: "Add `print(item)` inside the loop.",
      }
    ),
  ];
}

function evaluatePythonFunction(answer) {
  const normalized = answer;
  return [
    createCheck(
      /\bdef\s+calculate_total\s*\(/i.test(normalized),
      {
        ru: "Есть функция `calculate_total`",
        en: "The `calculate_total` function is present",
      },
      {
        ru: "Начни решение с `def calculate_total(...):`.",
        en: "Start with `def calculate_total(...):`.",
      }
    ),
    createCheck(
      /\bdef\s+calculate_total\s*\(\s*price\s*,\s*quantity\s*\)\s*:/i.test(normalized),
      {
        ru: "Параметры `price` и `quantity` указаны",
        en: "`price` and `quantity` parameters are present",
      },
      {
        ru: "Добавь параметры `price, quantity`.",
        en: "Add the `price, quantity` parameters.",
      }
    ),
    createCheck(
      /\breturn\b/i.test(normalized),
      {
        ru: "Есть `return`",
        en: "A `return` statement is present",
      },
      {
        ru: "Верни результат через `return`.",
        en: "Return the result with `return`.",
      }
    ),
    createCheck(
      /return\s+price\s*\*\s*quantity/i.test(normalized),
      {
        ru: "Функция возвращает `price * quantity`",
        en: "The function returns `price * quantity`",
      },
      {
        ru: "Используй `return price * quantity`.",
        en: "Use `return price * quantity`.",
      }
    ),
  ];
}

function evaluateJavaMain(answer) {
  const normalized = answer;
  return [
    createCheck(
      /public\s+class\s+Main/i.test(normalized),
      {
        ru: "Есть класс `Main`",
        en: "A `Main` class is present",
      },
      {
        ru: "Добавь `public class Main`.",
        en: "Add `public class Main`.",
      }
    ),
    createCheck(
      /public\s+static\s+void\s+main\s*\(\s*String\[\]\s+args\s*\)/i.test(normalized),
      {
        ru: "Есть метод `main`",
        en: "The `main` method is present",
      },
      {
        ru: "Добавь `public static void main(String[] args)`.",
        en: "Add `public static void main(String[] args)`.",
      }
    ),
    createCheck(
      /System\.out\.println\s*\(/i.test(normalized),
      {
        ru: "Есть вывод через `System.out.println`",
        en: "`System.out.println` is used",
      },
      {
        ru: "Выведи строку через `System.out.println(...)`.",
        en: "Print the text with `System.out.println(...)`.",
      }
    ),
    createCheck(
      /Hello,\s*coder!/i.test(normalized),
      {
        ru: "Выводит `Hello, coder!`",
        en: "It prints `Hello, coder!`",
      },
      {
        ru: "Нужна строка `Hello, coder!`.",
        en: "Use the string `Hello, coder!`.",
      }
    ),
  ];
}

function evaluateJavaCondition(answer) {
  const normalized = answer;
  return [
    createCheck(
      /int\s+age\s*=\s*18\s*;/i.test(normalized),
      {
        ru: "Переменная `age` создана",
        en: "The `age` variable is created",
      },
      {
        ru: "Добавь строку `int age = 18;`.",
        en: "Add the line `int age = 18;`.",
      }
    ),
    createCheck(
      /if\s*\(\s*age\s*>=\s*18\s*\)/i.test(normalized),
      {
        ru: "Есть проверка `age >= 18`",
        en: "The `age >= 18` check is present",
      },
      {
        ru: "Добавь условие `if (age >= 18)`.",
        en: "Add the `if (age >= 18)` condition.",
      }
    ),
    createCheck(
      /\belse\b/i.test(normalized),
      {
        ru: "Есть ветка `else`",
        en: "There is an `else` branch",
      },
      {
        ru: "Добавь ветку `else`.",
        en: "Add an `else` branch.",
      }
    ),
    createCheck(
      /System\.out\.println\s*\(\s*["'`]Access granted["'`]\s*\)\s*;/i.test(normalized),
      {
        ru: "Есть вывод `Access granted`",
        en: "`Access granted` is printed",
      },
      {
        ru: "В первой ветке выведи `Access granted`.",
        en: "Print `Access granted` in the first branch.",
      }
    ),
    createCheck(
      /System\.out\.println\s*\(\s*["'`]Too early["'`]\s*\)\s*;/i.test(normalized),
      {
        ru: "Есть вывод `Too early`",
        en: "`Too early` is printed",
      },
      {
        ru: "Во второй ветке выведи `Too early`.",
        en: "Print `Too early` in the second branch.",
      }
    ),
  ];
}

function formatDate(timestamp) {
  if (!timestamp) return "";
  const locale = document.documentElement.lang === "ru" ? "ru-RU" : "en-US";
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
}
