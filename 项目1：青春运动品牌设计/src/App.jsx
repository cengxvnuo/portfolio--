import { useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Hero from "./components/Hero.jsx";
import VisualGrammar from "./components/VisualGrammar.jsx";
import ExpressionRouter from "./components/ExpressionRouter.jsx";
import PromptGenerator from "./components/PromptGenerator.jsx";
import PosterGallery from "./components/PosterGallery.jsx";
import SystemCard from "./components/SystemCard.jsx";

gsap.registerPlugin(ScrollTrigger);

export default function App() {
  useEffect(() => {
    gsap.utils.toArray("[data-speed]").forEach((item) => {
      gsap.to(item, {
        yPercent: Number(item.dataset.speed) * -18,
        ease: "none",
        scrollTrigger: {
          trigger: item,
          start: "top bottom",
          end: "bottom top",
          scrub: true,
        },
      });
    });

    return () => ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
  }, []);

  return (
    <main className="relative min-h-screen overflow-hidden bg-graphite text-cream">
      <div className="noise-overlay" aria-hidden="true" />
      <Hero />
      <VisualGrammar />
      <ExpressionRouter />
      <PromptGenerator />
      <PosterGallery />
      <SystemCard />
    </main>
  );
}
