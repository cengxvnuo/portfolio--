import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { floatingObjects } from "../data/systemData.js";

function FloatingObject({ item, pointer }) {
  const [hasImage, setHasImage] = useState(true);
  const transform = {
    x: pointer.x * (item.depth / 38),
    y: pointer.y * (item.depth / 38),
    rotate: pointer.x * (item.depth / 260),
  };

  return (
    <motion.div
      aria-label={item.label}
      className={`floating-object ${item.type}`}
      style={{ left: item.x, top: item.y }}
      animate={transform}
      transition={{ type: "spring", stiffness: 45, damping: 20 }}
    >
      {hasImage && (
        // Floating object image: /public/objects/{object-name}.png
        <img src={item.image} alt={`Floating ${item.label}`} onError={() => setHasImage(false)} />
      )}
      <span>{item.label}</span>
    </motion.div>
  );
}

export default function Hero() {
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const lines = useMemo(() => Array.from({ length: 12 }, (_, index) => index), []);

  function handlePointerMove(event) {
    const rect = event.currentTarget.getBoundingClientRect();
    setPointer({
      x: event.clientX - rect.left - rect.width / 2,
      y: event.clientY - rect.top - rect.height / 2,
    });
  }

  return (
    <section
      className="relative flex min-h-screen items-center overflow-hidden px-5 py-20 sm:px-8 lg:px-12"
      onPointerMove={handlePointerMove}
    >
      <div className="spotlight" aria-hidden="true" />
      <div className="motion-lines" aria-hidden="true">
        {lines.map((line) => (
          <span key={line} style={{ "--line": line }} />
        ))}
      </div>

      <div className="mx-auto grid w-full max-w-7xl items-center gap-10 lg:grid-cols-[1.05fr_.95fr]">
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative z-20"
        >
          <p className="mb-4 font-mono text-xs uppercase tracking-[.32em] text-campus">
            AI Campus Sports Poster System
          </p>
          <h1 className="max-w-5xl font-display text-[clamp(4rem,12vw,11.5rem)] uppercase leading-[.75] tracking-normal">
            Campus
            <span className="block text-orange">Gravity</span>
            <span className="block text-cream">Break</span>
          </h1>
          <p className="mt-7 max-w-xl text-base leading-7 text-muted sm:text-lg">
            Hyper-real campus action photography, floating equipment systems,
            glossy court reflections, and decisive sports-brand tension built
            for a premium poster campaign.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <a className="campaign-button primary" href="#visual-grammar">
              Explore System
            </a>
            <a className="campaign-button secondary" href="#prompt-generator">
              Generate Prompt
            </a>
          </div>
        </motion.div>

        <div className="relative z-10 mx-auto h-[600px] w-full max-w-[520px] lg:h-[720px]">
          <motion.div
            className="poster-shell"
            style={{
              x: pointer.x * -0.025,
              y: pointer.y * -0.025,
              rotateY: pointer.x * 0.012,
              rotateX: pointer.y * -0.01,
            }}
          >
            {/* Hero poster image: /public/posters/basketball-gravity-break.png */}
            <div className="poster-placeholder">
              <img
                className="poster-real-image"
                src="/posters/basketball-gravity-break.png"
                alt="Basketball Gravity Break campus sports poster"
              />
            </div>
          </motion.div>

          {floatingObjects.map((item) => (
            <FloatingObject key={item.label} item={item} pointer={pointer} />
          ))}
        </div>
      </div>
    </section>
  );
}
