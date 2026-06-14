import { motion } from "framer-motion";
import { visualGrammarCards } from "../data/systemData.js";

export default function VisualGrammar() {
  return (
    <section id="visual-grammar" className="section-shell">
      <div className="section-heading">
        <p>Poster Logic</p>
        <h2>Visual Grammar</h2>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {visualGrammarCards.map((card, index) => (
          <motion.article
            key={card.title}
            className="grammar-card"
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ delay: index * 0.035, duration: 0.45 }}
          >
            <div className="grammar-tag">{card.tag}</div>
            <h3>{card.title}</h3>
            <p>{card.copy}</p>
          </motion.article>
        ))}
      </div>
    </section>
  );
}
