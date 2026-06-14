import { motion } from "framer-motion";

const rules = [
  "Wide-angle impact",
  "Character styling anchor",
  "Decisive sports action",
  "Floating object system",
  "Expression router",
  "Brand typography",
  "Anti-copy constraints",
];

export default function SystemCard() {
  return (
    <section className="section-shell pb-24">
      <motion.div
        className="system-card"
        initial={{ opacity: 0, scale: 0.96 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, margin: "-90px" }}
      >
        <p>Campaign Rule Card</p>
        <h2>Campus Athletic Poster =</h2>
        <div className="rule-stack">
          {rules.map((rule, index) => (
            <span key={rule}>
              {index > 0 && <b>+</b>}
              {rule}
            </span>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
