import React, { useCallback, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { AnimatePresence, motion } from "framer-motion";
import { records as starterRecords } from "./data/records.js";
import { ParticleTree } from "./scene/ParticleTree.jsx";
import "./styles.css";

const STORAGE_KEY = "mentor-cognition-tree-records-v1";

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function loadRecords() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(stored) && stored.length ? stored : starterRecords;
  } catch {
    return starterRecords;
  }
}

function App() {
  const [records, setRecords] = useState(loadRecords);
  const [settledCount, setSettledCount] = useState(0);
  const [readingIndex, setReadingIndex] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [composerOpen, setComposerOpen] = useState(false);
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

  const harvestFruit = useCallback(() => {
    if (readingIndex !== null || settledCount >= records.length) return;
    setReadingIndex(settledCount);
    setSelectedIndex(settledCount);
  }, [readingIndex, settledCount, records.length]);

  const selectFruit = useCallback((index) => {
    if (index === settledCount && readingIndex === null && settledCount < records.length) {
      setReadingIndex(index);
      setSelectedIndex(index);
      return;
    }
    if (index < settledCount) setSelectedIndex(index);
  }, [readingIndex, settledCount, records.length]);

  function settleFruit() {
    if (readingIndex === null) return;
    const next = Math.max(settledCount, readingIndex + 1);
    setSettledCount(next);
    setReadingIndex(null);
    setSelectedIndex(readingIndex);
  }

  function reset() {
    setSettledCount(0);
    setReadingIndex(null);
    setSelectedIndex(null);
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

  const primaryLabel = readingIndex !== null
    ? "读完，种回树里"
    : isFinale
      ? "已凝结"
      : "摘取下一颗";

  return (
    <main className={`experience ${readingIndex !== null ? "is-reading" : ""}`}>
      <ParticleTree
        records={records}
        settledCount={settledCount}
        readingIndex={readingIndex}
        selectedIndex={selectedIndex}
        seedSignal={seedSignal}
        onFruitSelect={selectFruit}
      />

      <section className="hud" aria-label="带教认知树内容">
        <div className="brand-row">
          <p className="kicker">MENTOR COGNITION TREE</p>
          <span className="phase-label">
            {readingIndex !== null ? "READING" : settledCount ? "GROWING" : "DORMANT"}
          </span>
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
                <span>{readingIndex !== null ? "已摘取 · 阅读中" : "已沉淀"}</span>
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
            <motion.article
              key="intro"
              className="memory intro"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <span className="date">START HERE</span>
              <h2>待唤醒</h2>
              <p>摘下发光的果实。读完之后，再把它种回枝头。</p>
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
          <button type="button" className="ghost-action" onClick={reset} aria-label="重新生长">↺</button>
        </div>
      </section>

      <section className={`memory-input ${composerOpen ? "open" : ""}`}>
        <AnimatePresence mode="wait">
          {composerOpen ? (
            <motion.form
              key="composer"
              onSubmit={submitMemory}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
            >
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
            <motion.button
              key="opener"
              type="button"
              className="input-opener"
              onClick={() => setComposerOpen(true)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <span className="input-plus">＋</span>
              <span><small>INPUT A NEW MEMORY</small>写下今天的思维碰撞</span>
            </motion.button>
          )}
        </AnimatePresence>
      </section>

      <AnimatePresence>
        {seedSignal && (
          <motion.div key={seedSignal.id} className="seed-stream" onAnimationEnd={() => setSeedSignal(null)}>
            {Array.from({ length: 34 }, (_, index) => (
              <i
                key={index}
                style={{
                  "--i": index,
                  "--scatter": `${(index % 7 - 3) * 9}px`,
                  "--delay": `${(index % 11) * 22}ms`
                }}
              >{index % 6 === 0 ? seedSignal.word : "·"}</i>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <nav className="timeline" aria-label="感悟顺序">
        {records.map((record, index) => (
          <button
            key={`${record.date}-${record.keyword}-${index}`}
            type="button"
            className={[
              "timeline-dot",
              index < settledCount ? "lit" : "",
              readingIndex === index ? "reading" : "",
              selectedIndex === index ? "active" : ""
            ].join(" ")}
            aria-label={record.keyword}
            onClick={() => selectFruit(index)}
          />
        ))}
        <span>{String(settledCount).padStart(2, "0")} / {String(records.length).padStart(2, "0")}</span>
      </nav>

      <AnimatePresence>
        {isFinale && (
          <motion.aside className="node-panel" initial={{ opacity: 0, x: 28 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 28 }} transition={{ delay: 1.1, duration: 0.8 }}>
            <strong>认知节点</strong>
            <div>{cognitionNodes.slice(0, 14).map((item) => <span key={`${item.keyword}-${item.node}`}>{item.node}</span>)}</div>
          </motion.aside>
        )}
      </AnimatePresence>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
