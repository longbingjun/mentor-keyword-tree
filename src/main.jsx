import React, { useCallback, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { AnimatePresence, motion } from "framer-motion";
import { records } from "./data/records.js";
import { ParticleTree } from "./scene/ParticleTree.jsx";
import "./styles.css";

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function App() {
  const [litCount, setLitCount] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(null);

  const activeIndex = selectedIndex ?? Math.max(0, litCount - 1);
  const activeRecord = litCount > 0 ? records[activeIndex] : null;
  const progress = litCount / records.length;
  const isFinale = litCount === records.length;

  const cognitionNodes = useMemo(
    () => records.flatMap((record) => record.nodes.map((node) => ({ node, keyword: record.keyword }))),
    []
  );

  const lightNext = useCallback(() => {
    if (litCount >= records.length) return;
    const next = litCount + 1;
    setLitCount(next);
    setSelectedIndex(next - 1);
  }, [litCount]);

  function reset() {
    setLitCount(0);
    setSelectedIndex(null);
  }

  const selectFruit = useCallback((index) => {
    if (index === litCount && litCount < records.length) {
      const next = litCount + 1;
      setLitCount(next);
      setSelectedIndex(next - 1);
      return;
    }
    if (index < litCount) setSelectedIndex(index);
  }, [litCount]);

  return (
    <main className="experience">
      <ParticleTree
        records={records}
        litCount={litCount}
        selectedIndex={selectedIndex}
        onFruitSelect={selectFruit}
      />

      <section className="hud" aria-label="带教认知树内容">
        <p className="kicker">MENTOR COGNITION TREE</p>
        <h1>带教认知树</h1>

        <div className="meter" aria-label="成长进度">
          <span style={{ transform: `scaleX(${clamp(progress, 0.04, 1)})` }} />
        </div>

        <AnimatePresence mode="wait">
          {activeRecord ? (
            <motion.article
              key={activeRecord.keyword}
              className="memory"
              initial={{ opacity: 0, y: 18, filter: "blur(10px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -12, filter: "blur(8px)" }}
              transition={{ duration: 0.55, ease: "easeOut" }}
            >
              <span className="date">{activeRecord.date}</span>
              <h2>{activeRecord.keyword}</h2>
              <p>{activeRecord.cognition}</p>
              <dl>
                <div>
                  <dt>场景</dt>
                  <dd>{activeRecord.scene}</dd>
                </div>
                <div>
                  <dt>碰撞</dt>
                  <dd>{activeRecord.collision}</dd>
                </div>
              </dl>
            </motion.article>
          ) : (
            <motion.article
              key="intro"
              className="memory intro"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <span className="date">START</span>
              <h2>未点亮</h2>
              <p>从第一颗果实开始，让树从根部向上生长。</p>
            </motion.article>
          )}
        </AnimatePresence>

        <div className="actions">
          <button type="button" onClick={lightNext} disabled={isFinale}>
            {isFinale ? "已凝结" : "点亮下一颗"}
          </button>
          <button type="button" onClick={reset}>重生长</button>
        </div>
      </section>

      <nav className="timeline" aria-label="感悟顺序">
        {records.map((record, index) => (
          <button
            key={record.keyword}
            type="button"
            className={[
              "timeline-dot",
              index < litCount ? "lit" : "",
              selectedIndex === index ? "active" : ""
            ].join(" ")}
            aria-label={record.keyword}
            onClick={() => selectFruit(index)}
          />
        ))}
        <span>{String(litCount).padStart(2, "0")} / {String(records.length).padStart(2, "0")}</span>
      </nav>

      <AnimatePresence>
        {isFinale && (
          <motion.aside
            className="node-panel"
            initial={{ opacity: 0, x: 28 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 28 }}
            transition={{ delay: 1.1, duration: 0.8 }}
          >
            <strong>认知节点</strong>
            <div>
              {cognitionNodes.slice(0, 14).map((item) => (
                <span key={`${item.keyword}-${item.node}`}>{item.node}</span>
              ))}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
