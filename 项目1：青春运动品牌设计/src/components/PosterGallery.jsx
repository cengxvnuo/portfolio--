import { motion } from "framer-motion";
import { galleryItems } from "../data/systemData.js";

export default function PosterGallery() {
  return (
    <section className="section-shell">
      <div className="section-heading">
        <p>Concept Set</p>
        <h2>Poster Gallery</h2>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {galleryItems.map((item, index) => (
          <motion.article
            key={item.title}
            className="gallery-card"
            initial={{ opacity: 0, y: 26 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ delay: index * 0.06 }}
          >
            {/* Gallery poster image: /public/posters/{concept-file}.png */}
            <div className={`gallery-poster accent-${item.accent}`}>
              <img className="gallery-real-image" src={item.image} alt={`${item.title} poster concept`} />
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{item.title.split(" ")[0]}</strong>
            </div>
            <div className="gallery-meta">
              <h3>{item.title}</h3>
              <p>
                <span>Expression</span>
                {item.expression}
              </p>
              <p>
                <span>Objects</span>
                {item.objects}
              </p>
              <p>
                <span>Moment</span>
                {item.action}
              </p>
              <blockquote>{item.excerpt}</blockquote>
            </div>
          </motion.article>
        ))}
      </div>
    </section>
  );
}
