import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { AnimatePresence, motion } from "framer-motion";
import { records as starterRecords } from "./data/records.js";
import { GestureInput } from "./input/GestureInput.jsx";
import { ParticleTree } from "./scene/ParticleTree.jsx";
import "./styles.css";

const STORAGE_KEY = "mentor-cognition-tree-records-v1";
const isEditorMode = new URLSearchParams(window.location.search).get("edit") === "1";

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function loadRecords() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return isEditorMode && Array.isArray(stored) && stored.length ? stored : starterRecords;
  } catch {
    return starterRecords;
  }
}

function App() {
  const [records, setRecords] = useState(loadRecords);
  const [entered, setEntered] = useState(false);
  const [settledCount, setSettledCount] = useState(0);
  const [readingIndex, setReadingIndex] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [gestureEnabled, setGestureEnabled] = useState(false);
  const [finaleStage, setFinaleStage] = useState("idle");
  const [keyword, setKeyword] = useState("");
  const [insight, setInsight] = useState("");
  const [seedSignal, setSeedSignal] = useState(null);

  const activeIndex = readingIndex ?? selectedIndex ?? Math.max(0, settledCount - 1);
  const activeRecord = readingIndex !== null || selectedIndex !== null || settledCount > 0
    ? records[activeIndex]
    : null;
  const progress = settledCount / records.length;
  const isFinale = settledCount === records.length && readingIndex === null;

  const cognitionNodes = useMemo(
    () => records.flatMap((record) => record.nodes.map((node) => ({ node, keyword: record.keyword }))),
    [records]
  );

  useEffect(() => {
    if (!isFinale) {
      setFinaleStage("idle");
      return undefined;
    }
    setFinaleStage("ascending");
    const timer = window.setTimeout(() => setFinaleStage("nodes"), 5300);
    return () => window.clearTimeout(timer);
  }, [isFinale]);

  useEffect(() => {
    function onGestureConfirm() {
      if (readingIndex === null) return;
      setReadingIndex(null);
      setSelectedIndex(readingIndex);
    }

    window.addEventListener("mentor:gestureselect", onGestureConfirm);
    return () => window.removeEventListener("mentor:gestureselect", onGestureConfirm);
  }, [readingIndex]);

  const harvestFruit = useCallback(() => {
    if (readingIndex !== null || settledCount >= records.length) return;
    const nextIndex = settledCount;
    setSettledCount(nextIndex + 1);
    setReadingIndex(nextIndex);
    setSelectedIndex(nextIndex);
  }, [readingIndex, settledCount, records.length]);

  const selectFruit = useCallback((index) => {
    if (index === settledCount && readingIndex === null && settledCount < records.length) {
      setSettledCount(index + 1);
      setReadingIndex(index);
      setSelectedIndex(index);
      return;
    }
    if (index < settledCount) setSelectedIndex(index);
  }, [readingIndex, settledCount, records.length]);

  function settleFruit() {
    if (readingIndex === null) return;
    setReadingIndex(null);
    setSelectedIndex(readingIndex);
  }

  function reset() {
    setSettledCount(0);
    setReadingIndex(null);
    setSelectedIndex(null);
    setFinaleStage("idle");
  }

  function submitMemory(event) {
    event.preventDefault();
    const cleanInsight = insight.trim();
    if (!cleanInsight) return;

    const cleanKeyword = keyword.trim() || "新识";
    const newRecord = {
      date: `Day ${String(records.length + 1).padStart(2, "0")}`,
      keyword: cleanKeyword.slice(0, 6),
      short: cleanKeyword.slice(0, 1),
      scene: cleanInsight,
      collision: "这段刚刚写下的思维碰撞，正在成为树的一部分。",
      cognition: cleanInsight,
      nodes: [cleanKeyword.slice(0, 4), "碰撞", "沉淀"]
    };
    const nextRecords = [
      ...records.slice(0, settledCount),
      newRecord,
      ...records.slice(settledCount)
    ];
    setRecords(nextRecords);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextRecords));
    setReadingIndex(null);
    setSelectedIndex(null);
    setSeedSignal({ id: Date.now(), word: cleanKeyword.slice(0, 6) });
    setKeyword("");
    setInsight("");
    setComposerOpen(false);
  }

  const phaseLabel = isFinale
    ? finaleStage === "nodes" ? "COGNITION" : "ASCENDING"
    : readingIndex !== null ? "LIT · READING"
      : settledCount ? "GROWING" : "DORMANT";
  const primaryLabel = readingIndex !== null ? "读完，归入树冠" : "摘取下一颗";

  return (
    <main className={[
      "experience",
      entered ? "has-entered" : "",
      readingIndex !== null ? "is-reading" : "",
      isFinale ? "is-finale" : "",
      finaleStage === "nodes" ? "is-nodes" : ""
    ].join(" ")}>
      <ParticleTree
        records={records}
        settledCount={settledCount}
        readingIndex={readingIndex}
        selectedIndex={selectedIndex}
        onFruitSelect={selectFruit}
      />

      <AnimatePresence>
        {!entered && (
          <motion.section
            className="gift-cover"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, filter: "blur(18px)" }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="gift-mark" aria-hidden="true"><i /><span /></div>
            <p>FOR MY MENTOR</p>
            <h1>一棵因你<br />生长的树</h1>
            <div className="gift-entry-actions">
              <button type="button" className="click-entry" onClick={() => setEntered(true)}>
                <span>点击进入</span><i aria-hidden="true">↗</i>
              </button>
              <button
                type="button"
                className="gesture-entry"
                onClick={() => {
                  setEntered(true);
                  setGestureEnabled(true);
                }}
              >
                <i aria-hidden="true" /><span>手势进入</span>
              </button>
            </div>
            <small>桌面端或横屏观看更完整</small>
          </motion.section>
        )}
      </AnimatePresence>

      <section className="hud" aria-label="带教认知树内容">
        <div className="brand-row">
          <p className="kicker">MENTOR COGNITION TREE</p>
          <span className="phase-label">{phaseLabel}</span>
        </div>
        <h1>带教认知树</h1>

        <div className="meter" aria-label="成长进度">
          <span style={{ transform: `scaleX(${clamp(progress, 0.025, 1)})` }} />
          <i style={{ left: `${clamp(progress, 0.025, 1) * 100}%` }} />
        </div>

        <AnimatePresence mode="wait">
          {activeRecord ? (
            <motion.article
              key={`${activeRecord.keyword}-${readingIndex !== null ? "reading" : "settled"}`}
              className={`memory ${readingIndex !== null ? "reading" : ""}`}
              initial={{ opacity: 0, y: 22, filter: "blur(12px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -14, filter: "blur(8px)" }}
              transition={{ duration: 0.52, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="memory-meta">
                <span className="date">{activeRecord.date}</span>
                <span>{readingIndex !== null ? "已点亮 · 阅读中" : "已沉淀"}</span>
              </div>
              <h2>{activeRecord.keyword}</h2>
              <p>{activeRecord.cognition}</p>
              <AnimatePresence>
                {readingIndex !== null && (
                  <motion.dl
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ delay: 0.18, duration: 0.45 }}
                  >
                    <div><dt>场景</dt><dd>{activeRecord.scene}</dd></div>
                    <div><dt>碰撞</dt><dd>{activeRecord.collision}</dd></div>
                  </motion.dl>
                )}
              </AnimatePresence>
            </motion.article>
          ) : (
            <motion.article key="intro" className="memory intro" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <span className="date">BEGIN · 01</span>
              <h2>待唤醒</h2>
              <p>树上只有一颗果实醒着。点击它，让第一段记忆开始生长。</p>
            </motion.article>
          )}
        </AnimatePresence>

        <div className="actions">
          <button
            type="button"
            className="primary-action"
            onClick={readingIndex !== null ? settleFruit : harvestFruit}
            disabled={isFinale}
          >
            <span>{primaryLabel}</span>
            <i aria-hidden="true">{readingIndex !== null ? "↗" : "＋"}</i>
          </button>
          <button
            type="button"
            className={`gesture-action ${gestureEnabled ? "active" : ""}`}
            onClick={() => setGestureEnabled((value) => !value)}
            aria-pressed={gestureEnabled}
          >
            <i aria-hidden="true" />
            <span>{gestureEnabled ? "手势开启" : "手势模式"}</span>
          </button>
          <button type="button" className="ghost-action" onClick={reset} aria-label="重新生长">↺</button>
        </div>
      </section>

      {isEditorMode && entered && !isFinale && (
        <section className={`memory-input ${composerOpen ? "open" : ""}`}>
          <AnimatePresence mode="wait">
            {composerOpen ? (
              <motion.form key="composer" onSubmit={submitMemory} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}>
                <div className="input-heading">
                  <span>NEW MEMORY</span>
                  <button type="button" onClick={() => setComposerOpen(false)} aria-label="关闭">×</button>
                </div>
                <label>
                  <span>一个性格关键词</span>
                  <input value={keyword} onChange={(event) => setKeyword(event.target.value)} maxLength={6} placeholder="例如：清醒" />
                </label>
                <label>
                  <span>今天哪句话改变了你的思考？</span>
                  <textarea value={insight} onChange={(event) => setInsight(event.target.value)} maxLength={180} placeholder="写下一次真实的思维碰撞…" required />
                </label>
                <button type="submit" className="seed-button">凝成果实 <span>→</span></button>
              </motion.form>
            ) : (
              <motion.button key="opener" type="button" className="input-opener" onClick={() => setComposerOpen(true)} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <span className="input-plus">＋</span>
                <span><small>INPUT A NEW MEMORY</small>写下今天的思维碰撞</span>
              </motion.button>
            )}
          </AnimatePresence>
        </section>
      )}

      <AnimatePresence>
        {seedSignal && (
          <motion.div key={seedSignal.id} className="seed-stream" onAnimationEnd={() => setSeedSignal(null)}>
            {Array.from({ length: 34 }, (_, index) => (
              <i key={index} style={{ "--i": index, "--scatter": `${(index % 7 - 3) * 9}px`, "--delay": `${(index % 11) * 22}ms` }}>
                {index % 6 === 0 ? seedSignal.word : "·"}
              </i>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <nav className="timeline" aria-label="感悟顺序">
        {records.map((record, index) => (
          <button
            key={`${record.date}-${record.keyword}-${index}`}
            type="button"
            className={["timeline-dot", index < settledCount ? "lit" : "", readingIndex === index ? "reading" : "", selectedIndex === index ? "active" : ""].join(" ")}
            aria-label={record.keyword}
            onClick={() => selectFruit(index)}
          />
        ))}
        <span>{String(settledCount).padStart(2, "0")} / {String(records.length).padStart(2, "0")}</span>
      </nav>

      <AnimatePresence>
        {isFinale && (
          <motion.section className={`finale-copy ${finaleStage}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: finaleStage === "nodes" ? 0.42 : 1 }}>ALL MEMORIES ARE LIT</motion.p>
            <AnimatePresence mode="wait">
              {finaleStage === "nodes" ? (
                <motion.div key="nodes" className="cognition-cloud" initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.2 }}>
                  <span>我所理解的你</span>
                  <h2>由每一次碰撞<br />慢慢凝结而成</h2>
                  <div>{cognitionNodes.slice(0, 18).map((item, index) => <i key={`${item.keyword}-${item.node}-${index}`}>{item.node}</i>)}</div>
                  <button type="button" onClick={reset}>再看一次</button>
                </motion.div>
              ) : (
                <motion.h2 key="ascending" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -18 }}>光正在穿过树冠</motion.h2>
              )}
            </AnimatePresence>
          </motion.section>
        )}
      </AnimatePresence>

      <GestureInput
        enabled={gestureEnabled && entered && !isFinale}
        reading={readingIndex !== null}
        onClose={() => setGestureEnabled(false)}
      />
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
