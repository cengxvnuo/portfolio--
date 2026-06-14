import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { brandMoods, sceneTypes, sports } from "../data/systemData.js";

function getExpression(scene, sport, mood) {
  const lowerScene = scene.toLowerCase();
  const lowerSport = sport.toLowerCase();
  const lowerMood = mood.toLowerCase();

  if (lowerScene.includes("celebration")) {
    return {
      mode: "Victory Celebration",
      reason: "The scene is built around a winning moment, so the face can open into cheering, high-five energy, and group release.",
    };
  }

  if (lowerScene.includes("technical") || ["track", "soccer"].includes(lowerSport)) {
    return {
      mode: "Focused & Composed",
      reason: "Technical athletic actions read best when the athlete looks locked in, controlled, and precise at the decisive instant.",
    };
  }

  if (lowerScene.includes("team") || lowerMood.includes("youthful") || lowerMood.includes("retro")) {
    return {
      mode: "Youthful & Energetic",
      reason: "Club and campus scenes benefit from after-class social charge, playful movement, and brighter facial rhythm.",
    };
  }

  return {
    mode: "Cool & Aloof",
    reason: "Solo heroic campaign framing, low-angle pressure, and street-sport styling favor calm confidence over obvious emotion.",
  };
}

function SegmentedControl({ label, options, value, onChange }) {
  return (
    <fieldset className="router-group">
      <legend>{label}</legend>
      <div className="router-options">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            className={value === option ? "active" : ""}
            onClick={() => onChange(option)}
          >
            {option}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export default function ExpressionRouter() {
  const [scene, setScene] = useState("Solo Hero");
  const [sport, setSport] = useState("Basketball");
  const [mood, setMood] = useState("Cool Attitude");
  const expression = useMemo(() => getExpression(scene, sport, mood), [scene, sport, mood]);

  return (
    <section className="section-shell">
      <div className="grid gap-7 lg:grid-cols-[.9fr_1.1fr] lg:items-start">
        <div className="section-heading sticky-heading">
          <p>Expression Router</p>
          <h2>Choose the face before the frame.</h2>
        </div>

        <motion.div
          className="router-panel"
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
        >
          <SegmentedControl label="Scene Type" options={sceneTypes} value={scene} onChange={setScene} />
          <SegmentedControl label="Sport" options={sports} value={sport} onChange={setSport} />
          <SegmentedControl label="Brand Mood" options={brandMoods} value={mood} onChange={setMood} />

          <div className="expression-output">
            <span>Recommended Expression</span>
            <strong>{expression.mode}</strong>
            <p>{expression.reason}</p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
