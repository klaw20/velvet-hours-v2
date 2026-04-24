import { useState, useEffect, useRef } from "react";

// ── Constants ────────────────────────────────────────────────────────────────

const ARCHETYPES = [
  { id: "brooding",  label: "The Brooding Stranger",  desc: "Dark, mysterious, speaks little but means everything" },
  { id: "charming",  label: "The Charming Rogue",      desc: "Quick-witted, irreverent, dangerously magnetic" },
  { id: "gentle",    label: "The Tender Protector",    desc: "Strong, patient, devastatingly gentle" },
  { id: "rival",     label: "The Reluctant Rival",     desc: "Tension-soaked history, undeniable pull" },
  { id: "builder",   label: "The Quiet Builder",       desc: "Calloused hands, few words — shows up every single time" },
  { id: "schoolrun", label: "The School Run",          desc: "Single dad, slightly chaotic, never meant to notice you" },
  { id: "rancher",   label: "The Rancher",             desc: "Sun-weathered, unhurried, unshakeable — knows what matters" },
  { id: "storm",     label: "The Quiet Storm",         desc: "Reads everything, feels deeply, dangerous when pushed" },
];

const SETTINGS = [
  { id: "paris",     label: "Paris, 1920s",          desc: "Jazz, candlelight, streets that keep secrets" },
  { id: "tuscany",   label: "Tuscany Villa",          desc: "Golden hills, slow evenings, nowhere to be" },
  { id: "london",    label: "Rainy London",           desc: "Grey skies, warm pubs, accidental eye contact" },
  { id: "newyork",   label: "New York Rooftop",       desc: "City lights, borrowed time, electric air" },
  { id: "coastal",   label: "Coastal Estate",         desc: "Salt air, old money, ghosts of summers past" },
  { id: "shoreline", label: "The Shoreline",          desc: "Your town's beach, off-season, familiar and dangerous" },
  { id: "resort",    label: "Sun, Sand & Strangers",  desc: "A holiday where nobody knows your name or history" },
  { id: "gates",     label: "The School Gates",       desc: "8am, every morning — you told yourself it was nothing" },
  { id: "bar",       label: "Last Orders",            desc: "A bar where the night always goes longer than planned" },
  { id: "market",    label: "The Sunday Market",      desc: "Slow mornings, fresh coffee, conversations that last too long" },
];

const HAIR   = ["Blonde", "Brunette", "Red", "Dark", "Silver"];
const EYES   = ["Blue", "Green", "Brown", "Hazel", "Dark"];
const VIBES  = ["Elegant", "Casual", "Edgy", "Bohemian", "Classic"];
const TRAITS = ["Guarded", "Warm", "Fierce", "Dreamy", "Witty"];

const LOADING_MSGS = [
  "Lighting the candles…",
  "Setting the scene…",
  "The story stirs…",
  "He's already there, waiting…",
  "Turning the page…",
  "Your choice echoes forward…",
  "Something's about to happen…",
];

const FREE_CHAPTERS = 3;

// ── Storage ──────────────────────────────────────────────────────────────────

function save(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} }
function load(key) { try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : null; } catch { return null; } }
function remove(key) { try { localStorage.removeItem(key); } catch {} }

const PROGRESS_KEY  = "vo_progress";
const UNLOCKED_KEY  = "vo_unlocked";

// ── System prompt ─────────────────────────────────────────────────────────────

function buildSystem(profile, chapterNum, isEnding = false, isCliffhanger = false) {
  const arch    = ARCHETYPES.find(a => a.id === profile.archetype);
  const setting = SETTINGS.find(s => s.id === profile.setting);

  return `You are writing a serialized choose-your-own-adventure romance story for adult women. Think Colleen Hoover meets early Fifty Shades — emotionally raw, deeply human, with a slow burn that gets genuinely heated. Sensual and charged without being pornographic. The anticipation, the almost, the charged moment before — that is your currency.

ABOUT HER:
- Name: "${profile.heroine || profile.name}"
- Hair: ${profile.hair}
- Eyes: ${profile.eyes}  
- Style: ${profile.vibe}
- Personality: ${profile.trait}

Weave her appearance into the story naturally — never list features, reveal them through moments. A strand of ${profile.hair.toLowerCase()} hair caught in the wind. Her ${profile.eyes.toLowerCase()} eyes holding his gaze a beat too long.

HIS ARCHETYPE: ${arch?.label} — ${arch?.desc}
Keep him slightly mysterious. Don't over-describe him. Let her — and the reader — fill in the details.

SETTING: ${setting?.label} — ${setting?.desc}

WRITING RULES — READ CAREFULLY:
- Write like a real person, not an AI. Vary your sentences. Short ones hit hard. Longer ones build atmosphere.
- Natural messy dialogue — interruptions, trailing off, saying the wrong thing
- Physical awareness that builds — a hand that lingers, breath that catches, warmth of proximity, a look that says everything
- Heated but tasteful — go further than a closed door. Describe desire, sensation, want. But keep it literary not explicit.
- Real emotions — jealousy, doubt, shame, longing, the specific ache of wanting someone you shouldn't
- Consequences — her choices from previous chapters shape how he treats her now

${isCliffhanger ? `
CRITICAL — CHAPTER 3 CLIFFHANGER:
This chapter must end on the most breathless, heated, irresistible moment you can write. Something physical and emotional is on the edge of happening — a touch, a confession, a moment where everything could change. End it RIGHT THERE. The reader must feel genuinely desperate. This is the chapter that makes someone pay to find out what happens next.
` : ""}

${isEnding ? `
ENDING INSTRUCTIONS:
This is the finale. Write a heated, climactic, deeply satisfying conclusion. The tension that has been building finally breaks open. Give her the moment she has been aching for — emotionally AND physically charged. Sensual, breathless, real. Not a fade to black — let the reader feel it. Then land on something tender and true that makes the whole journey feel worth it.
` : ""}

Always provide exactly 4 choices: bold, soft, wild, dark.
Each choice must feel genuinely different — different direction, different consequence.

Respond ONLY with valid JSON, no markdown fences:
{
  "chapterTitle": "Short poetic title",
  "subtitle": "One evocative line",
  "story": "3-4 paragraphs. Richly written. Separate with \\n",
  "choices": [
    { "type": "bold",  "text": "What she does — present tense feel", "hint": "The energy this carries" },
    { "type": "soft",  "text": "What she does", "hint": "hint" },
    { "type": "wild",  "text": "What she does", "hint": "hint" },
    { "type": "dark",  "text": "What she does", "hint": "hint" }
  ]
}`;
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function VelvetOurs() {
  const [screen,          setScreen]         = useState("onboarding");
  const [profile,         setProfile]        = useState({
    name: "", heroine: "",
    archetype: "brooding", setting: "paris",
    hair: "Brunette", eyes: "Green", vibe: "Casual", trait: "Warm",
  });
  const [chapter,         setChapter]        = useState(null);
  const [displayedText,   setDisplayedText]  = useState("");
  const [isTyping,        setIsTyping]       = useState(false);
  const [selectedChoice,  setSelectedChoice] = useState(null);
  const [chapterNum,      setChapterNum]     = useState(1);
  const [storyHistory,    setStoryHistory]   = useState([]);
  const [choiceHistory,   setChoiceHistory]  = useState([]);
  const [error,           setError]          = useState("");
  const [loadingMsg,      setLoadingMsg]     = useState(LOADING_MSGS[0]);
  const [showPaywall,     setShowPaywall]    = useState(false);
  const [unlocked,        setUnlocked]       = useState(false);
  const [returning,       setReturning]      = useState(false);

  const typingRef  = useRef(null);
  const loadingRef = useRef(null);
  const timeoutRef = useRef(null);

  // Load saved state on mount
  useEffect(() => {
    // Check Stripe redirect
    const params = new URLSearchParams(window.location.search);
    if (params.get("unlocked") === "true") {
      save(UNLOCKED_KEY, true);
      setUnlocked(true);
      setShowPaywall(false);
      window.history.replaceState({}, "", window.location.pathname);
    }

    // Check previously unlocked
    if (load(UNLOCKED_KEY)) setUnlocked(true);

    // Load saved progress
    const saved = load(PROGRESS_KEY);
    if (saved?.profile && saved?.chapterNum > 1) {
      setReturning(true);
      setProfile(saved.profile);
      setChapterNum(saved.chapterNum);
      setStoryHistory(saved.storyHistory || []);
      setChoiceHistory(saved.choiceHistory || []);
    }
  }, []);

  useEffect(() => {
    if (screen === "loading") {
      let i = 0;
      loadingRef.current = setInterval(() => {
        i = (i + 1) % LOADING_MSGS.length;
        setLoadingMsg(LOADING_MSGS[i]);
      }, 1800);
    }
    return () => clearInterval(loadingRef.current);
  }, [screen]);

  function stopLoading() {
    clearInterval(loadingRef.current);
    clearTimeout(timeoutRef.current);
  }

  async function generateChapter(choiceMade = null) {
    // Paywall check — but not if unlocked
    if (chapterNum > FREE_CHAPTERS && !unlocked) {
      setShowPaywall(true);
      return;
    }

    setScreen("loading");
    setError("");
    setLoadingMsg(LOADING_MSGS[0]);

    timeoutRef.current = setTimeout(() => {
      stopLoading();
      setError("Took too long. Please try again.");
      setScreen(chapter ? "story" : "onboarding");
    }, 30000);

    const isCliffhanger = chapterNum === FREE_CHAPTERS;

    try {
      const choiceCtx = choiceHistory.length > 0
        ? `\n\nHer choices so far: ${choiceHistory.map((c, i) => `Ch${i+1} [${c.type}] "${c.text}"`).join(", ")}. These choices have shaped how he sees her.`
        : "";

      const userMsg = storyHistory.length === 0
        ? `Begin Chapter 1. Drop us straight into the moment — atmosphere, tension, him. Make her feel it from the first sentence.`
        : `Story so far:\n${storyHistory.join("\n\n")}${choiceCtx}\n\nChapter ${chapterNum}. She chose [${choiceMade?.type}] "${choiceMade?.text}". Open with the immediate consequence of this choice — in his eyes, in the air between them, in how she feels. Make the choice matter.${isCliffhanger ? " This is the cliffhanger chapter — end on the most breathless heated moment possible." : ""}`;

      const res = await fetch("/.netlify/functions/story", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: buildSystem(profile, chapterNum, false, isCliffhanger),
          messages: [{ role: "user", content: userMsg }],
        }),
      });

      const data = await res.json();
      stopLoading();

      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);

      const text   = data.content.map(b => b.text || "").join("");
      const clean  = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);

      setChapter(parsed);
      const newHistory = [...storyHistory, `Ch${chapterNum} — ${parsed.chapterTitle}: ${parsed.story.substring(0, 180)}…`];
      setStoryHistory(newHistory);
      setSelectedChoice(null);
      setScreen("story");
      typeStory(parsed.story);

      save(PROGRESS_KEY, {
        profile, chapterNum: chapterNum + 1,
        storyHistory: newHistory, choiceHistory,
      });

    } catch (e) {
      stopLoading();
      setError(`Something went wrong: ${e.message}`);
      setScreen(chapter ? "story" : "onboarding");
    }
  }

  async function generateEnding() {
    setScreen("loading");
    setError("");
    setLoadingMsg("Writing your ending…");

    timeoutRef.current = setTimeout(() => {
      stopLoading();
      setError("Took too long. Please try again.");
      setScreen("story");
    }, 30000);

    try {
      const choiceCtx = choiceHistory.length > 0
        ? `Her choices: ${choiceHistory.map((c, i) => `Ch${i+1} [${c.type}] "${c.text}"`).join(", ")}.`
        : "";

      const userMsg = `Story so far:\n${storyHistory.join("\n\n")}\n\n${choiceCtx}\n\nWrite the final chapter. The tension breaks open. Give her what she's been aching for — heated, climactic, real. Sensual and satisfying. End on something tender that makes the whole journey feel worth it.`;

      const res = await fetch("/.netlify/functions/story", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: buildSystem(profile, 99, true, false),
          messages: [{ role: "user", content: userMsg }],
        }),
      });

      const data = await res.json();
      stopLoading();

      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);

      const text   = data.content.map(b => b.text || "").join("");
      const clean  = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      parsed.isEnding = true;

      setChapter(parsed);
      setScreen("story");
      typeStory(parsed.story);
    } catch (e) {
      stopLoading();
      setError(`Something went wrong: ${e.message}`);
      setScreen("story");
    }
  }

  function typeStory(text) {
    clearTimeout(typingRef.current);
    setDisplayedText("");
    setIsTyping(true);
    let i = 0;
    function tick() {
      if (i < text.length) {
        setDisplayedText(text.slice(0, i + 1));
        i++;
        typingRef.current = setTimeout(tick, 15);
      } else {
        setIsTyping(false);
      }
    }
    tick();
  }

  async function handleCheckout() {
    try {
      const res = await fetch("/.netlify/functions/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          successUrl: window.location.origin + "?unlocked=true",
          cancelUrl: window.location.origin,
        }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else alert("Something went wrong. Please try again.");
    } catch { alert("Something went wrong. Please try again."); }
  }

  function handleStart() {
    if (!profile.name.trim()) return;
    setReturning(false);
    setChapterNum(1);
    setStoryHistory([]);
    setChoiceHistory([]);
    setChapter(null);
    setShowPaywall(false);
    generateChapter();
  }

  function handleNextChapter() {
    if (!selectedChoice) return;
    const newChoiceHistory = [...choiceHistory, selectedChoice];
    setChoiceHistory(newChoiceHistory);
    const next = chapterNum + 1;
    setChapterNum(next);

    if (next > FREE_CHAPTERS && !unlocked) {
      setShowPaywall(true);
      return;
    }
    generateChapter(selectedChoice);
  }

  function handleRestart() {
    clearTimeout(typingRef.current);
    stopLoading();
    remove(PROGRESS_KEY);
    setScreen("onboarding");
    setChapter(null);
    setChapterNum(1);
    setStoryHistory([]);
    setChoiceHistory([]);
    setSelectedChoice(null);
    setDisplayedText("");
    setError("");
    setShowPaywall(false);
    setReturning(false);
  }

  const paragraphs    = displayedText.split("\n").filter(p => p.trim());
  const showChoices   = !isTyping && chapter?.choices?.length > 0 && !chapter?.isEnding;
  const showEndingBtn = !isTyping && chapter && !chapter.isEnding && chapterNum >= 2;

  const CHOICE_STYLE = {
    bold: { label: "Bold",      color: "#c4687a" },
    soft: { label: "Tender",    color: "#c9a84c" },
    wild: { label: "Reckless",  color: "#e8a87c" },
    dark: { label: "Walk Away", color: "#777" },
  };

  // ── Styles ────────────────────────────────────────────────────────────────

  const S = {
    app:         { minHeight: "100vh", background: "#120a08", color: "#f0e6d8", fontFamily: "'Palatino Linotype', Palatino, 'Book Antiqua', Georgia, serif" },
    content:     { maxWidth: 700, margin: "0 auto", padding: "0 20px 100px" },
    header:      { textAlign: "center", padding: "52px 0 36px", borderBottom: "1px solid rgba(185,145,60,0.2)", marginBottom: 44 },
    eyebrow:     { fontSize: 10, letterSpacing: 6, color: "#b9913c", textTransform: "uppercase", marginBottom: 18, opacity: 0.75 },
    logo:        { fontSize: "clamp(30px, 7vw, 48px)", letterSpacing: 5, color: "#f0e6d8", marginBottom: 10, fontWeight: 400, textShadow: "0 0 60px rgba(185,145,60,0.25)" },
    logoAccent:  { color: "#b9913c" },
    tagline:     { fontStyle: "italic", fontSize: 16, color: "rgba(240,230,216,0.45)", letterSpacing: 0.5 },
    welcome:     { fontStyle: "italic", fontSize: 19, lineHeight: 1.75, color: "rgba(240,230,216,0.75)", marginBottom: 44, borderLeft: "2px solid rgba(185,145,60,0.3)", paddingLeft: 20 },
    sectionHdr:  { fontSize: 9, letterSpacing: 4, textTransform: "uppercase", color: "#b9913c", opacity: 0.7, marginBottom: 20, marginTop: 36 },
    grid2:       { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 6 },
    fieldGroup:  { marginBottom: 20 },
    label:       { display: "block", fontSize: 9, letterSpacing: 3, textTransform: "uppercase", color: "#b9913c", opacity: 0.65, marginBottom: 8 },
    input:       { width: "100%", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(185,145,60,0.2)", borderRadius: 2, padding: "13px 16px", fontFamily: "inherit", fontSize: 16, color: "#f0e6d8", outline: "none", boxSizing: "border-box" },
    select:      { width: "100%", background: "#1a0e0a", border: "1px solid rgba(185,145,60,0.2)", borderRadius: 2, padding: "13px 16px", fontFamily: "inherit", fontSize: 16, color: "#f0e6d8", outline: "none", boxSizing: "border-box" },
    pillRow:     { display: "flex", flexWrap: "wrap", gap: 8 },
    pill:        { padding: "8px 16px", border: "1px solid rgba(185,145,60,0.2)", borderRadius: 20, fontSize: 14, color: "rgba(240,230,216,0.55)", cursor: "pointer", background: "transparent", fontFamily: "inherit" },
    pillOn:      { padding: "8px 16px", border: "1px solid #b9913c", borderRadius: 20, fontSize: 14, color: "#f0e6d8", cursor: "pointer", background: "rgba(185,145,60,0.12)", fontFamily: "inherit" },
    btnPrimary:  { width: "100%", padding: "18px 0", marginTop: 32, background: "linear-gradient(135deg, #6b1f2a, #8b2535)", border: "1px solid rgba(185,145,60,0.35)", borderRadius: 2, fontSize: 12, letterSpacing: 5, textTransform: "uppercase", color: "#e8c97a", cursor: "pointer", fontFamily: "inherit" },
    btnGhost:    { width: "100%", padding: "14px 0", marginTop: 12, background: "transparent", border: "1px solid rgba(185,145,60,0.2)", borderRadius: 2, fontSize: 11, letterSpacing: 3, textTransform: "uppercase", color: "rgba(185,145,60,0.5)", cursor: "pointer", fontFamily: "inherit" },
    profileBar:  { display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(255,255,255,0.025)", border: "1px solid rgba(185,145,60,0.12)", borderRadius: 2, padding: "11px 18px", marginBottom: 36 },
    chMeta:      { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28, paddingBottom: 18, borderBottom: "1px solid rgba(185,145,60,0.12)" },
    chTitle:     { fontSize: "clamp(24px, 5vw, 34px)", fontWeight: 400, lineHeight: 1.3, color: "#f0e6d8", marginBottom: 8 },
    chSub:       { fontStyle: "italic", fontSize: 16, color: "#c4687a", marginBottom: 40, opacity: 0.85 },
    storyBody:   { fontSize: "clamp(17px, 2.5vw, 20px)", lineHeight: 1.95, color: "rgba(240,230,216,0.88)", letterSpacing: 0.015 },
    storyP:      { marginBottom: 26 },
    cursor:      { display: "inline-block", width: 2, height: "1em", background: "#b9913c", marginLeft: 2, verticalAlign: "text-bottom", animation: "blink 1s step-end infinite" },
    skipHint:    { fontSize: 9, color: "rgba(185,145,60,0.22)", textAlign: "center", marginTop: 20, cursor: "pointer", letterSpacing: 3, textTransform: "uppercase" },
    choiceSect:  { marginTop: 52, paddingTop: 36, borderTop: "1px solid rgba(185,145,60,0.12)" },
    choicePrompt:{ fontStyle: "italic", fontSize: 17, color: "rgba(240,230,216,0.5)", marginBottom: 24, textAlign: "center" },
    ornament:    { textAlign: "center", color: "#b9913c", opacity: 0.35, margin: "0 0 36px", fontSize: 18, letterSpacing: 18 },
    choiceList:  { display: "flex", flexDirection: "column", gap: 12 },
    choiceBtn:   { padding: "16px 20px", background: "rgba(255,255,255,0.025)", border: "1px solid rgba(185,145,60,0.18)", borderRadius: 2, fontSize: 17, fontStyle: "italic", color: "rgba(240,230,216,0.7)", cursor: "pointer", textAlign: "left", lineHeight: 1.5, fontFamily: "inherit" },
    choiceSel:   { padding: "16px 20px", background: "rgba(196,104,122,0.09)", border: "1px solid #c4687a", borderRadius: 2, fontSize: 17, fontStyle: "italic", color: "#f0e6d8", cursor: "pointer", textAlign: "left", lineHeight: 1.5, fontFamily: "inherit" },
    choiceHint:  { fontSize: 12, color: "rgba(240,230,216,0.3)", marginTop: 6, fontStyle: "normal" },
    continueBtn: { marginTop: 28, padding: "15px 36px", background: "transparent", border: "1px solid rgba(185,145,60,0.4)", borderRadius: 2, fontSize: 11, letterSpacing: 4, textTransform: "uppercase", color: "#b9913c", cursor: "pointer", display: "block", marginLeft: "auto", marginRight: "auto", fontFamily: "inherit" },
    endingBtn:   { marginTop: 16, padding: "10px 24px", background: "transparent", border: "1px solid rgba(240,230,216,0.1)", borderRadius: 2, fontSize: 10, letterSpacing: 3, textTransform: "uppercase", color: "rgba(240,230,216,0.28)", cursor: "pointer", display: "block", marginLeft: "auto", marginRight: "auto", fontFamily: "inherit" },
    loadingWrap: { textAlign: "center", padding: "80px 0" },
    candle:      { fontSize: 44, marginBottom: 24, display: "block" },
    loadingTxt:  { fontStyle: "italic", fontSize: 18, color: "rgba(240,230,216,0.45)" },
    errorMsg:    { background: "rgba(107,31,42,0.18)", border: "1px solid rgba(196,104,122,0.3)", borderRadius: 2, padding: "16px 20px", fontStyle: "italic", fontSize: 16, color: "#c4687a", marginTop: 20, textAlign: "center" },
    paywall:     { textAlign: "center", padding: "60px 20px" },
    pwIcon:      { fontSize: 52, marginBottom: 20 },
    pwTitle:     { fontSize: 30, fontWeight: 400, color: "#f0e6d8", marginBottom: 12 },
    pwSub:       { fontStyle: "italic", fontSize: 18, color: "rgba(240,230,216,0.5)", marginBottom: 40, lineHeight: 1.8 },
    pwPerks:     { background: "rgba(185,145,60,0.05)", border: "1px solid rgba(185,145,60,0.15)", borderRadius: 2, padding: "20px", marginBottom: 32, textAlign: "left" },
    perk:        { fontSize: 16, color: "rgba(240,230,216,0.7)", marginBottom: 10 },
    pwBtn:       { padding: "18px 0", background: "linear-gradient(135deg, #6b1f2a, #8b2535)", border: "1px solid rgba(185,145,60,0.4)", borderRadius: 2, fontSize: 12, fontWeight: 400, letterSpacing: 5, textTransform: "uppercase", color: "#e8c97a", cursor: "pointer", fontFamily: "inherit", display: "block", width: "100%", maxWidth: 380, marginLeft: "auto", marginRight: "auto", marginBottom: 16 },
    pwCancel:    { fontSize: 13, color: "rgba(240,230,216,0.25)", cursor: "pointer", fontStyle: "italic" },
    retBox:      { background: "rgba(185,145,60,0.05)", border: "1px solid rgba(185,145,60,0.18)", borderRadius: 2, padding: "24px", marginBottom: 32, textAlign: "center" },
    retTxt:      { fontStyle: "italic", fontSize: 17, color: "rgba(240,230,216,0.7)", marginBottom: 20 },
  };

  const css = `
    @keyframes blink { 50% { opacity: 0; } }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #120a08; }
    select option { background: #1a0e0a; }
  `;

  function Pill({ options, value, onChange }) {
    return (
      <div style={S.pillRow}>
        {options.map(o => (
          <button key={o} style={value === o ? S.pillOn : S.pill} onClick={() => onChange(o)}>{o}</button>
        ))}
      </div>
    );
  }

  return (
    <>
      <style>{css}</style>
      <div style={S.app}>
        <div style={S.content}>

          {/* Header */}
          <header style={S.header}>
            <div style={S.eyebrow}>✦ Your Story ✦</div>
            <div style={S.logo}>Velvet <span style={S.logoAccent}>Ours</span></div>
            <div style={S.tagline}>Where every chapter belongs to you</div>
          </header>

          {/* Onboarding */}
          {screen === "onboarding" && (
            <div>
              <p style={S.welcome}>
                Every chapter, a choice. Every choice, a consequence. Your story — shaped by you, written around you, impossible to put down.
              </p>

              {returning && (
                <div style={S.retBox}>
                  <p style={S.retTxt}>Welcome back, <em>{profile.name}</em>. Your story is waiting.</p>
                  <button style={S.btnPrimary} onClick={() => { setReturning(false); setScreen("story"); if (!chapter) generateChapter(); }}>
                    Continue My Story
                  </button>
                  <button style={S.btnGhost} onClick={() => { setReturning(false); remove(PROGRESS_KEY); }}>
                    Start Something New
                  </button>
                </div>
              )}

              {!returning && (
                <>
                  <div style={S.sectionHdr}>About You</div>

                  <div style={S.grid2}>
                    <div style={S.fieldGroup}>
                      <label style={S.label}>Your Name</label>
                      <input style={S.input} type="text" placeholder="Your name"
                        value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} />
                    </div>
                    <div style={S.fieldGroup}>
                      <label style={S.label}>Her Name (optional)</label>
                      <input style={S.input} type="text" placeholder="Or leave as yours"
                        value={profile.heroine} onChange={e => setProfile(p => ({ ...p, heroine: e.target.value }))} />
                    </div>
                  </div>

                  <div style={S.fieldGroup}>
                    <label style={S.label}>Hair Colour</label>
                    <Pill options={HAIR} value={profile.hair} onChange={v => setProfile(p => ({ ...p, hair: v }))} />
                  </div>

                  <div style={S.fieldGroup}>
                    <label style={S.label}>Eye Colour</label>
                    <Pill options={EYES} value={profile.eyes} onChange={v => setProfile(p => ({ ...p, eyes: v }))} />
                  </div>

                  <div style={S.fieldGroup}>
                    <label style={S.label}>Her Vibe</label>
                    <Pill options={VIBES} value={profile.vibe} onChange={v => setProfile(p => ({ ...p, vibe: v }))} />
                  </div>

                  <div style={S.fieldGroup}>
                    <label style={S.label}>Her Personality</label>
                    <Pill options={TRAITS} value={profile.trait} onChange={v => setProfile(p => ({ ...p, trait: v }))} />
                  </div>

                  <div style={S.sectionHdr}>Your Story</div>

                  <div style={S.grid2}>
                    <div style={S.fieldGroup}>
                      <label style={S.label}>His Archetype</label>
                      <select style={S.select} value={profile.archetype}
                        onChange={e => setProfile(p => ({ ...p, archetype: e.target.value }))}>
                        {ARCHETYPES.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
                      </select>
                    </div>
                    <div style={S.fieldGroup}>
                      <label style={S.label}>Setting</label>
                      <select style={S.select} value={profile.setting}
                        onChange={e => setProfile(p => ({ ...p, setting: e.target.value }))}>
                        {SETTINGS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                      </select>
                    </div>
                  </div>

                  {error && <div style={S.errorMsg}>{error}</div>}

                  <button style={{ ...S.btnPrimary, opacity: profile.name.trim() ? 1 : 0.4 }}
                    onClick={handleStart} disabled={!profile.name.trim()}>
                    Begin My Story
                  </button>
                </>
              )}
            </div>
          )}

          {/* Loading */}
          {screen === "loading" && (
            <div style={S.loadingWrap}>
              <span style={S.candle}>🕯️</span>
              <div style={S.loadingTxt}>{loadingMsg}</div>
            </div>
          )}

          {/* Paywall */}
          {showPaywall && (
            <div style={S.paywall}>
              <div style={S.pwIcon}>🔥</div>
              <h2 style={S.pwTitle}>You've reached the edge</h2>
              <p style={S.pwSub}>
                Chapter {chapterNum} is waiting — and after what just happened,<br />
                you already know you can't stop here.
              </p>
              <div style={S.pwPerks}>
                <div style={S.perk}>✦ Unlimited chapters — your story never stops</div>
                <div style={S.perk}>✦ Unlimited new stories — start fresh anytime</div>
                <div style={S.perk}>✦ Your progress saved forever</div>
                <div style={{ ...S.perk, marginBottom: 0 }}>✦ Cancel anytime</div>
              </div>
              <button style={S.pwBtn} onClick={handleCheckout}>
                Unlock My Story — $2.99/mo
              </button>
              <div style={S.pwCancel} onClick={handleRestart}>Start a different story instead</div>
            </div>
          )}

          {/* Story */}
          {screen === "story" && chapter && !showPaywall && (
            <div>
              <div style={S.profileBar}>
                <div style={{ fontStyle: "italic", fontSize: 15, color: "rgba(240,230,216,0.6)" }}>
                  {profile.name}'s story
                </div>
                <div style={{ fontSize: 9, letterSpacing: 3, color: "#c4687a", textTransform: "uppercase" }}>
                  Chapter {chapterNum}
                </div>
                <button style={{ background: "none", border: "none", fontSize: 9, letterSpacing: 2, color: "rgba(185,145,60,0.3)", cursor: "pointer", textTransform: "uppercase", fontFamily: "inherit" }}
                  onClick={handleRestart}>New Story</button>
              </div>

              <div style={S.chMeta}>
                <span style={{ fontSize: 9, letterSpacing: 4, textTransform: "uppercase", color: "#b9913c", opacity: 0.65 }}>
                  Chapter {chapterNum}
                </span>
                <span style={{ fontStyle: "italic", fontSize: 13, color: "rgba(240,230,216,0.3)" }}>
                  {new Date().toLocaleDateString("en-AU", { month: "long", day: "numeric" })}
                </span>
              </div>

              <h2 style={S.chTitle}>{chapter.chapterTitle}</h2>
              <div style={S.chSub}>{chapter.subtitle}</div>

              <div style={S.storyBody}>
                {paragraphs.map((p, i) => (
                  <p key={i} style={S.storyP}>
                    {p}{isTyping && i === paragraphs.length - 1 && <span style={S.cursor} />}
                  </p>
                ))}
              </div>

              {isTyping && (
                <div style={S.skipHint} onClick={() => {
                  clearTimeout(typingRef.current);
                  setDisplayedText(chapter.story);
                  setIsTyping(false);
                }}>Tap to reveal</div>
              )}

              {error && <div style={S.errorMsg}>{error}</div>}

              {showChoices && (
                <div style={S.choiceSect}>
                  <div style={S.ornament}>· · ·</div>
                  <p style={S.choicePrompt}>The moment is yours. What does she do?</p>
                  <div style={S.choiceList}>
                    {chapter.choices.map((c, i) => {
                      const cs = CHOICE_STYLE[c.type] || CHOICE_STYLE.soft;
                      return (
                        <button key={i}
                          style={selectedChoice?.text === c.text ? S.choiceSel : S.choiceBtn}
                          onClick={() => setSelectedChoice(c)}>
                          <div style={{ fontSize: 8, letterSpacing: 3, textTransform: "uppercase", color: cs.color, marginBottom: 8 }}>
                            {cs.label}
                          </div>
                          {c.text}
                          <div style={S.choiceHint}>{c.hint}</div>
                        </button>
                      );
                    })}
                  </div>

                  {selectedChoice && (
                    <button style={S.continueBtn} onClick={handleNextChapter}>
                      Live with this choice →
                    </button>
                  )}

                  {showEndingBtn && (
                    <button style={S.endingBtn} onClick={generateEnding}>
                      Finish my story
                    </button>
                  )}
                </div>
              )}

              {chapter.isEnding && (
                <div style={{ ...S.choiceSect, textAlign: "center" }}>
                  <div style={S.ornament}>· · ·</div>
                  <p style={{ fontStyle: "italic", fontSize: 18, color: "rgba(240,230,216,0.45)", marginBottom: 32, lineHeight: 1.7 }}>
                    The end of this story.<br />The beginning of the next.
                  </p>
                  <button style={S.continueBtn} onClick={handleRestart}>
                    Begin a New Story
                  </button>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </>
  );
}
