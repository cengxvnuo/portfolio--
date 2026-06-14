import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { defaultPrompt, promptDefaults } from "../data/systemData.js";

const fields = [
  ["character", "Character"],
  ["sport", "Sport"],
  ["actionMoment", "Action Moment"],
  ["scene", "Scene"],
  ["floatingObjectSet", "Floating Object Set"],
  ["expressionMode", "Expression Mode"],
  ["lighting", "Lighting"],
  ["posterStyle", "Poster Style"],
];

function buildPrompt(values) {
  return `Create a hyper-realistic vertical campus sports brand advertisement photograph inside a ${values.scene}, filled with explosive youth ${values.sport} energy. A ${values.character} ${values.actionMoment}, wearing a retro blue and yellow campus sports uniform, striped white socks, and performance sneakers. Her expression is ${values.expressionMode}, with sharp eyes, calm confidence, and controlled athletic intensity. Around her, a large spinning ${values.sport} ball floats diagonally in the upper left, surrounded by exactly 7 prominent suspended sport-related object groups: ${values.floatingObjectSet}. Add sweat droplets, rubber dust, tape strips, blue-and-yellow fabric ribbons, and kicked-up court particles. Use ${values.lighting}, realistic skin and fabric texture, ${values.posterStyle}. No real brand logos. Do not copy any exact reference composition, typography layout, pose, or final visual result.`;
}

export default function PromptGenerator() {
  const [values, setValues] = useState(promptDefaults);
  const [useDefault, setUseDefault] = useState(true);
  const [copied, setCopied] = useState(false);
  const prompt = useMemo(() => (useDefault ? defaultPrompt : buildPrompt(values)), [values, useDefault]);

  function updateField(key, value) {
    setUseDefault(false);
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function copyPrompt() {
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  function setVersion(version) {
    setUseDefault(false);
    setValues((current) => ({
      ...current,
      expressionMode:
        version === "cool"
          ? "cool, aloof, focused, and self-possessed"
          : "youthful, energetic, bright, and emotionally open",
      posterStyle:
        version === "cool"
          ? "graphite shadows, electric blue edge light, basketball orange impact accents, premium street-sport campaign style"
          : "sunlit campus yellow, vivid blue, bright orange motion accents, playful retro youth club campaign style",
    }));
  }

  function resetPrompt() {
    setValues(promptDefaults);
    setUseDefault(true);
  }

  return (
    <section id="prompt-generator" className="section-shell">
      <div className="section-heading">
        <p>Live Generator</p>
        <h2>Prompt Construction Deck</h2>
      </div>

      <div className="grid gap-6 lg:grid-cols-[.9fr_1.1fr]">
        <motion.div
          className="prompt-form"
          initial={{ opacity: 0, x: -28 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-70px" }}
        >
          {fields.map(([key, label]) => (
            <label key={key}>
              <span>{label}</span>
              <textarea
                rows={key === "floatingObjectSet" || key === "posterStyle" ? 3 : 2}
                value={values[key]}
                onChange={(event) => updateField(key, event.target.value)}
              />
            </label>
          ))}
        </motion.div>

        <motion.div
          className="prompt-output"
          initial={{ opacity: 0, x: 28 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-70px" }}
        >
          <div className="prompt-toolbar">
            <span>campus_gravity_break.prompt</span>
            <div>
              <button type="button" onClick={copyPrompt}>
                {copied ? "Copied" : "Copy Prompt"}
              </button>
              <button type="button" onClick={() => setVersion("cool")}>
                Cool Version
              </button>
              <button type="button" onClick={() => setVersion("youthful")}>
                Youthful Version
              </button>
              <button type="button" onClick={resetPrompt}>
                Reset
              </button>
            </div>
          </div>
          <pre>{prompt}</pre>
        </motion.div>
      </div>
    </section>
  );
}
