export const visualGrammarCards = [
  {
    title: "Lens Impact",
    tag: "ULTRA WIDE",
    copy: "Fisheye pressure, enlarged foreground limbs, and a court-level angle create immediate sports-ad impact.",
  },
  {
    title: "Character",
    tag: "ANCHOR",
    copy: "A young campus athlete carries the whole system through pose, wardrobe, gaze, and attitude.",
  },
  {
    title: "Styling Anchor",
    tag: "BLUE/YELLOW",
    copy: "Retro varsity uniform details lock the palette to a recognizable campus sports language.",
  },
  {
    title: "Decisive Action",
    tag: "FROZEN",
    copy: "One peak-moment gesture makes the image feel captured, not staged.",
  },
  {
    title: "Props",
    tag: "7 GROUPS",
    copy: "Basketball objects are treated as suspended campaign ingredients with clear hierarchy.",
  },
  {
    title: "Scene",
    tag: "GYM FLOOR",
    copy: "Glossy court reflections and campus architecture add realism beneath the impossible motion.",
  },
  {
    title: "Expression",
    tag: "ROUTED",
    copy: "Mood is selected by scene, sport, action, and brand attitude instead of generic smiling.",
  },
  {
    title: "Motion Blur",
    tag: "CONTROLLED",
    copy: "Objects streak at the edges while the athlete remains sharp and commercially polished.",
  },
  {
    title: "Lighting",
    tag: "SPOT/EDGE",
    copy: "Hard rim light, glossy highlights, and orange-blue accents create campaign contrast.",
  },
  {
    title: "Background Layers",
    tag: "POSTER DEPTH",
    copy: "Court lines, banners, floating ribbons, and soft gym structures stack into a poster system.",
  },
  {
    title: "Texture",
    tag: "90S FILM",
    copy: "Grain, dust, tape, sweat, and rubber particles add analog sports-film bite.",
  },
];

export const sceneTypes = ["Solo Hero", "Team Club", "Technical Action", "Celebration"];
export const sports = ["Basketball", "Soccer", "Volleyball", "Track", "Flying Disc"];
export const brandMoods = [
  "Cool Attitude",
  "Youthful Energy",
  "Retro Campus",
  "Street Sport",
];

export const promptDefaults = {
  character: "young East Asian female basketball athlete",
  sport: "basketball",
  actionMoment: "crouches low on the glossy reflective court floor in a dramatic ultra-wide-angle pose",
  scene: "modern campus basketball gym",
  floatingObjectSet:
    "1 hero basketball, 1 silver whistle, 1 transparent sports water bottle, 1 white high-top basketball shoe, 1 grouped set of wristbands and headband, 1 tactical clipboard or scoreboard card, and 1 stretched fragment of basketball net",
  expressionMode: "cool, focused, and self-possessed",
  lighting: "dramatic lighting, glossy floor reflections, frozen motion, cinematic fisheye perspective, shallow depth of field",
  posterStyle:
    "vivid orange, blue, white, and yellow palette, nostalgic 90s sports film energy, and modern youth sportswear campaign style",
};

export const defaultPrompt =
  "Create a hyper-realistic vertical campus sports brand advertisement photograph inside a modern campus basketball gym, filled with explosive youth basketball energy. A young East Asian female basketball athlete crouches low on the glossy reflective court floor in a dramatic ultra-wide-angle pose, one hand thrust toward the camera in extreme foreground and the other arm reaching outward and upward, wearing a retro blue and yellow campus basketball uniform, striped white socks, and basketball sneakers. Her expression is cool, focused, and self-possessed, with sharp eyes, neutral mouth, calm confidence, and controlled athletic intensity. Around her, a large spinning basketball floats diagonally in the upper left, surrounded by exactly 7 prominent suspended basketball-related object groups: 1 hero basketball, 1 silver whistle, 1 transparent sports water bottle, 1 white high-top basketball shoe, 1 grouped set of wristbands and headband, 1 tactical clipboard or scoreboard card, and 1 stretched fragment of basketball net. Add sweat droplets, rubber dust, tape strips, blue-and-yellow fabric ribbons, and kicked-up court particles. Use glossy floor reflections, frozen motion, cinematic fisheye perspective, shallow depth of field, dramatic lighting, realistic skin and fabric texture, vivid orange, blue, white, and yellow palette, nostalgic 90s sports film energy, and modern youth sportswear campaign style. No real brand logos. Do not copy any exact reference composition, typography layout, pose, or final visual result.";

export const galleryItems = [
  {
    title: "Basketball Gravity Break",
    image: "/posters/basketball-gravity-break.png",
    expression: "Cool & Aloof",
    objects: "Ball, whistle, bottle, shoe, wristbands, board, net",
    action: "Low-angle court reach",
    excerpt: "hyper-realistic campus basketball campaign with floating equipment system...",
    accent: "orange",
  },
  {
    title: "Soccer Impact Field",
    image: "/posters/soccer-impact-field.png",
    expression: "Focused & Composed",
    objects: "Ball, cones, tape, cleat, captain band, card, goal net",
    action: "Extreme foreground strike",
    excerpt: "wide-angle campus field frame with decisive kicking motion...",
    accent: "electric",
  },
  {
    title: "Volleyball Air Burst",
    image: "/posters/volleyball-air-burst.png",
    expression: "Youthful & Energetic",
    objects: "Ball, knee pads, bottle, sneakers, ribbon, tactic card, net",
    action: "Mid-air spike",
    excerpt: "campus club energy suspended around a glossy gym scene...",
    accent: "campus",
  },
  {
    title: "Track Velocity Frame",
    image: "/posters/track-velocity-frame.png",
    expression: "Focused & Composed",
    objects: "Baton, spikes, lane tags, tape, towel, stopwatch, chalk dust",
    action: "Explosive hurdle drive",
    excerpt: "cinematic running poster with speed objects and analog film grain...",
    accent: "cream",
  },
];

export const floatingObjects = [
  { label: "basketball", type: "ball", image: "/objects/basketball.png", x: "8%", y: "22%", depth: 22 },
  { label: "whistle", type: "whistle", image: "/objects/whistle.png", x: "74%", y: "18%", depth: -14 },
  { label: "sports water bottle", type: "bottle", image: "/objects/water-bottle.png", x: "83%", y: "58%", depth: 18 },
  { label: "high-top shoe", type: "shoe", image: "/objects/high-top-shoe.png", x: "11%", y: "68%", depth: -18 },
  { label: "wristbands", type: "band", image: "/objects/wristbands.png", x: "66%", y: "78%", depth: 10 },
  { label: "tactical board", type: "board", image: "/objects/tactical-board.png", x: "29%", y: "14%", depth: -10 },
  { label: "net fragment", type: "net", image: "/objects/net-fragment.png", x: "30%", y: "82%", depth: 16 },
];
