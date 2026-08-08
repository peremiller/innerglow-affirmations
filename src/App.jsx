import { useEffect, useMemo, useRef, useState } from "react";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/cormorant-garamond/500.css";
import "@fontsource/cormorant-garamond/600.css";
import { AURORA_ASSET, BREATHING_ASSET, MARK_ASSET } from "./generated-assets";
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  BookOpen,
  BookmarkSimple,
  Briefcase,
  CalendarBlank,
  Check,
  Clock,
  DownloadSimple,
  Heart,
  House,
  Notebook as JournalIcon,
  Leaf,
  FlowerLotus as Lotus,
  MusicNotes,
  Pause,
  Play,
  Plus,
  ShareNetwork,
  Smiley,
  SmileyMeh,
  SmileySad,
  SmileyWink,
  SmileyXEyes,
  Sparkle,
  SpeakerHigh,
  SpeakerSlash,
  Star,
  Trash,
  Trophy,
} from "@phosphor-icons/react";
import { AMBIENT_TRACKS, createAmbientSoundscape } from "./ambient-audio";

const CATEGORIES = ["Prosperity", "Confidence", "Health", "Career", "Love", "Gratitude", "Calm", "Sleep"];

const AFFIRMATIONS = [
  ["Prosperity", "I am grateful that my income is increasing through meaningful opportunities and wise action.", "Gratitude helps you notice possibilities while steady action turns them into progress."],
  ["Prosperity", "Money flows to me through the value I create and the care I give my craft.", "Abundance follows usefulness. Keep sharpening what you offer."],
  ["Prosperity", "I release scarcity thinking and make decisions from possibility, not fear.", "Fear shrinks options; calm expands them."],
  ["Prosperity", "Every peso I manage wisely today builds the freedom I want tomorrow.", "Small, consistent stewardship compounds quietly."],
  ["Prosperity", "I am open to receiving help, ideas, and opportunities from unexpected places.", "Openness multiplies luck."],
  ["Prosperity", "My worth is not my net worth; from that security, I build wealth patiently.", "Detachment makes better investors."],
  ["Confidence", "I trust myself to make thoughtful decisions and meet today with courage.", "Confidence grows through small promises kept consistently."],
  ["Confidence", "I speak clearly, take up space, and let my work be seen.", "Visibility is a skill, practiced daily."],
  ["Confidence", "I have survived every hard day so far — I can handle this one too.", "Your track record is 100%."],
  ["Confidence", "I am allowed to be a work in progress and proud at the same time.", "Growth and self-respect are not rivals."],
  ["Confidence", "I choose progress over perfection in everything I ship today.", "Done teaches more than perfect."],
  ["Confidence", "Rejection redirects me; it does not define me.", "Every no narrows the path to the right yes."],
  ["Health", "I care for my body with patience, nourishment, movement, and rest.", "Well-being is built through supportive choices, not perfection."],
  ["Health", "Each deep breath returns me to my body and to this moment.", "The breath is the fastest door back to now."],
  ["Health", "I honor rest as productive: my body repairs while I recover.", "Recovery is training too."],
  ["Health", "I move today, even a little, because my future self will thank me.", "Ten minutes counts. Consistency wins."],
  ["Health", "I listen to what my body needs instead of what my habits demand.", "Signals over cravings."],
  ["Health", "My energy is precious; I spend it on what truly matters.", "Guard the mornings. Protect the sleep."],
  ["Career", "My skills create value, and I am ready for opportunities that match my growth.", "Prepare well, communicate clearly, and let your work speak."],
  ["Career", "I build things that help people, and that purpose steadies me.", "Purpose outlasts motivation."],
  ["Career", "I learn fast, adapt faster, and turn feedback into fuel.", "Feedback is data, not judgment."],
  ["Career", "Today I focus deeply on one important thing before anything else.", "One finished thing beats five started ones."],
  ["Career", "I collaborate generously; lifting others lifts my work too.", "Generosity is a career strategy."],
  ["Career", "I am building a portfolio of proof, one shipped project at a time.", "Proof compounds. Keep shipping."],
  ["Love", "I give and receive love freely, starting with how I speak to myself.", "Self-talk sets the tone for every other relationship."],
  ["Love", "I am present with the people I love — attention is my gift.", "Presence is the rarest currency."],
  ["Love", "I forgive quickly, because I would rather be close than right.", "Connection over scorekeeping."],
  ["Love", "I attract relationships that are honest, warm, and mutual.", "You teach people how to treat you."],
  ["Love", "My family feels my care through small, consistent acts.", "Love is a verb repeated daily."],
  ["Love", "I am worthy of deep, steady, unconditional love.", "Receive as generously as you give."],
  ["Gratitude", "I notice three good things in this ordinary day.", "Attention turns ordinary days into rich ones."],
  ["Gratitude", "I am thankful for the people who believed in me before I did.", "Gratitude honors the shoulders you stand on."],
  ["Gratitude", "Even challenges carry gifts I will understand later.", "Perspective ripens with time."],
  ["Gratitude", "I appreciate my body, my mind, and this one precious life.", "You already have the essentials."],
  ["Gratitude", "Every meal, every roof, every friend — none is guaranteed; all of it is a gift.", "Entitlement fades where gratitude grows."],
  ["Gratitude", "I end today naming what went right, not replaying what went wrong.", "Close the day on purpose."],
  ["Calm", "I release what I cannot control and give my energy to what I can.", "Serenity is a decision made hourly."],
  ["Calm", "Peace is my default; stress is a visitor, not a resident.", "Notice the visitor. Show it the door."],
  ["Calm", "I respond with intention instead of reacting with urgency.", "The pause is the power."],
  ["Calm", "Right now, in this breath, I am safe and I am enough.", "The present moment is rarely the problem."],
  ["Calm", "I let silence and stillness restore what noise has taken.", "Stillness is not empty; it is full."],
  ["Calm", "One thing at a time, done with full attention, is my superpower.", "Multitasking is divided living."],
  ["Sleep", "I release today completely; tomorrow will take care of itself.", "You cannot solve tonight what belongs to tomorrow."],
  ["Sleep", "My mind slows, my body softens, and rest comes easily to me.", "Ease is the way into sleep, not effort."],
  ["Sleep", "I deserve deep rest, and I welcome it without guilt.", "Rest is not laziness; it is maintenance for your life."],
  ["Sleep", "Every exhale sinks me deeper into comfort and safety.", "Ride the breath down like a slow tide."],
  ["Sleep", "I did enough today. I am enough tonight.", "Enough is a decision, not a measurement."],
  ["Sleep", "Grateful, calm, and heavy-eyed, I drift into healing sleep.", "End with gratitude; wake with energy."],
].map(([category, text, note], index) => ({ id: `a${index}`, category, text, note }));

const MOODS = [
  { value: 1, label: "Very low", Icon: SmileyXEyes },
  { value: 2, label: "Low", Icon: SmileySad },
  { value: 3, label: "Steady", Icon: SmileyMeh },
  { value: 4, label: "Good", Icon: Smiley },
  { value: 5, label: "Wonderful", Icon: SmileyWink },
];

const PROMPTS = [
  "What made you smile recently?",
  "Who are you thankful for today, and why?",
  "What small comfort did you enjoy today?",
  "What ability or skill are you grateful to have?",
  "What is something beautiful you saw lately?",
  "What challenge taught you something valuable?",
  "What about today would have amazed you five years ago?",
];

const NAV = [
  { id: "today", label: "Today", Icon: House },
  { id: "library", label: "Library", Icon: BookOpen },
  { id: "journal", label: "Journal", Icon: JournalIcon },
  { id: "wishes", label: "Wishes", Icon: Star },
];

const THEMES = ["aurora", "sunrise", "forest", "midnight"];

function readStore(key, fallback) {
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function useStoredState(key, fallback) {
  const [value, setValue] = useState(() => readStore(key, fallback));
  useEffect(() => {
    window.localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);
  return [value, setValue];
}

function manilaDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type) => parts.find((part) => part.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function Header({ view, setView, theme, setTheme }) {
  const now = new Date();
  const date = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(now);
  const hour = Number(new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Manila", hour: "2-digit", hour12: false }).format(now));
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <header className="topbar">
      <button className="brand" onClick={() => setView("today")} aria-label="InnerGlow home">
        <img src={MARK_ASSET} alt="" />
        <span><strong>InnerGlow</strong><small>Affirmations & mindfulness</small></span>
      </button>
      <nav className="desktop-nav" aria-label="Primary navigation">
        {NAV.map(({ id, label }) => (
          <button key={id} className={view === id ? "active" : ""} onClick={() => setView(id)}>{label}</button>
        ))}
      </nav>
      <div className="header-actions">
        <div className="themes" aria-label="Color theme">
          {THEMES.map((name) => (
            <button key={name} className={`theme-${name} ${theme === name ? "active" : ""}`} aria-label={`${name} theme`} onClick={() => setTheme(name)} />
          ))}
        </div>
        <div className="welcome"><span><CalendarBlank size={16} /> {date}</span><strong>{greeting}, Miller.</strong></div>
      </div>
    </header>
  );
}

function AffirmationHero({ affirmation, isSaved, onPrevious, onNext, onListen, onSave, onShare }) {
  return (
    <section className="affirmation-hero" aria-labelledby="affirmation-heading">
      <div className="hero-shade" />
      <div className="hero-content">
        <p className="eyebrow" id="affirmation-heading">Affirmation of the day</p>
        <p className="category"><Briefcase size={22} /> {affirmation.category}</p>
        <blockquote>“{affirmation.text}”</blockquote>
        <p className="note">{affirmation.note}</p>
        <div className="affirmation-actions">
          <button className="icon-button" onClick={onPrevious} aria-label="Previous affirmation"><ArrowLeft size={20} /></button>
          <button className="primary-button" onClick={onListen}><Play size={19} weight="fill" /> Listen</button>
          <button className="icon-button" onClick={onNext} aria-label="Next affirmation"><ArrowRight size={20} /></button>
          <span className="action-divider" />
          <button className={`text-button ${isSaved ? "selected" : ""}`} onClick={onSave}><Heart size={22} weight={isSaved ? "fill" : "regular"} /> {isSaved ? "Saved" : "Save"}</button>
          <button className="text-button" onClick={onShare}><ShareNetwork size={22} /> Share</button>
        </div>
      </div>
    </section>
  );
}

function Ritual({ minutes, setMinutes, practiceDays, setPracticeDays, notify }) {
  const [mode, setMode] = useState("breathe");
  const [duration, setDuration] = useState(3);
  const [remaining, setRemaining] = useState(duration * 60);
  const [running, setRunning] = useState(false);
  const [musicEnabled, setMusicEnabled] = useStoredState("igRitualMusicEnabled", true);
  const [musicTrack, setMusicTrack] = useStoredState("igRitualMusicTrack", "celestial");
  const [musicVolume, setMusicVolume] = useStoredState("igRitualMusicVolume", 45);
  const [reminderTime, setReminderTime] = useStoredState("igReminderTime", "07:30");
  const completionLock = useRef(false);
  const ambientAudio = useRef(null);

  const stopMusic = () => {
    ambientAudio.current?.stop();
    ambientAudio.current = null;
  };

  const startMusic = async (track = musicTrack) => {
    stopMusic();
    if (!musicEnabled) return;
    ambientAudio.current = createAmbientSoundscape(track, musicVolume / 100);
    try {
      await ambientAudio.current?.start();
    } catch {
      stopMusic();
      notify("Music needs audio permission in this browser");
    }
  };

  useEffect(() => () => stopMusic(), []);

  useEffect(() => {
    ambientAudio.current?.setVolume(musicVolume / 100);
  }, [musicVolume]);

  useEffect(() => {
    if (!running) return undefined;
    const interval = window.setInterval(() => setRemaining((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(interval);
  }, [running]);

  useEffect(() => {
    if (!running || remaining !== 0 || completionLock.current) return;
    completionLock.current = true;
    setRunning(false);
    stopMusic();
    setMinutes((value) => value + duration);
    const today = manilaDateKey();
    if (!practiceDays.includes(today)) setPracticeDays([...practiceDays, today]);
    notify(`${duration} mindful minutes added`);
  }, [duration, notify, practiceDays, remaining, running, setMinutes, setPracticeDays]);

  const start = () => {
    if (remaining === 0 || remaining === duration * 60) {
      completionLock.current = false;
      setRemaining(duration * 60);
    }
    if (running) stopMusic();
    else startMusic();
    setRunning((value) => !value);
  };

  const chooseDuration = (value) => {
    setDuration(value);
    setRemaining(value * 60);
    setRunning(false);
    stopMusic();
    completionLock.current = false;
  };

  const chooseMusicTrack = (track) => {
    setMusicTrack(track);
    if (running && musicEnabled) startMusic(track);
  };

  const toggleMusic = () => {
    const nextEnabled = !musicEnabled;
    setMusicEnabled(nextEnabled);
    if (!nextEnabled) stopMusic();
    else if (running) {
      ambientAudio.current = createAmbientSoundscape(musicTrack, musicVolume / 100);
      ambientAudio.current?.start().catch(() => notify("Music needs audio permission in this browser"));
    }
  };

  const elapsed = duration * 60 - remaining;
  const inhale = Math.floor(elapsed / 4) % 2 === 0;
  const phrase = mode === "breathe" ? (inhale ? "Inhale" : "Exhale") : (inhale ? "May I be well" : "May I live with ease");

  const downloadReminder = () => {
    const [hour, minute] = reminderTime.split(":");
    const date = manilaDateKey().replaceAll("-", "");
    const content = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//InnerGlow//EN", "BEGIN:VEVENT",
      "UID:innerglow-daily@vercel.app", `DTSTART:${date}T${hour}${minute}00`, "RRULE:FREQ=DAILY",
      "SUMMARY:InnerGlow daily affirmation and ritual",
      "DESCRIPTION:Open https://innerglow-affirmations.vercel.app for your daily affirmation",
      "BEGIN:VALARM", "ACTION:DISPLAY", "TRIGGER:PT0M", "DESCRIPTION:InnerGlow", "END:VALARM",
      "END:VEVENT", "END:VCALENDAR",
    ].join("\r\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([content], { type: "text/calendar" }));
    link.download = "innerglow-daily.ics";
    link.click();
    notify("Daily reminder downloaded");
  };

  return (
    <aside className="ritual-panel" aria-labelledby="ritual-heading">
      <div className="ritual-heading-row"><p className="eyebrow" id="ritual-heading">Daily ritual</p><span className="streak"><Sparkle size={15} weight="fill" /> 1 day</span></div>
      <div className={`breathing-visual ${running ? "running" : ""} ${inhale ? "inhale" : "exhale"}`}>
        <img src={BREATHING_ASSET} alt="Luminous breathing ring" />
        <div><small>{mode === "breathe" ? "Breathe" : "Loving-kindness"}</small><strong>{phrase}</strong></div>
      </div>
      <p className="ritual-copy">{mode === "breathe" ? "Slow down, settle in, and repeat today’s affirmation with intention." : "Send goodwill inward, then outward — one phrase per breath."}</p>
      <div className="segmented" aria-label="Practice type">
        <button className={mode === "breathe" ? "active" : ""} onClick={() => setMode("breathe")}>Breathe</button>
        <button className={mode === "kindness" ? "active" : ""} onClick={() => setMode("kindness")}>Loving-kindness</button>
      </div>
      <div className="duration-label"><span><Clock size={17} /> Choose duration</span><small>Recommended: 3 minutes.</small></div>
      <div className="duration-options">
        {[1, 2, 3, 5].map((value) => <button key={value} className={duration === value ? "active" : ""} onClick={() => chooseDuration(value)}>{value} min</button>)}
      </div>
      <div className="soundscape-control">
        <div className="soundscape-heading">
          <span><MusicNotes size={16} /> Calming music</span>
          <button className={musicEnabled ? "enabled" : ""} onClick={toggleMusic} aria-pressed={musicEnabled}>
            {musicEnabled ? <SpeakerHigh size={16} /> : <SpeakerSlash size={16} />} {musicEnabled ? "On" : "Off"}
          </button>
        </div>
        <div className="soundscape-options" aria-label="Calming music track">
          {AMBIENT_TRACKS.map((track) => <button key={track.id} className={musicTrack === track.id ? "active" : ""} onClick={() => chooseMusicTrack(track.id)} title={track.detail}>{track.label}</button>)}
        </div>
        <label className="volume-control">
          <SpeakerHigh size={15} />
          <input type="range" min="0" max="100" step="5" value={musicVolume} onChange={(event) => setMusicVolume(Number(event.target.value))} aria-label="Calming music volume" disabled={!musicEnabled} />
          <output>{musicVolume}%</output>
        </label>
        <small className="music-status">{running && musicEnabled ? `${AMBIENT_TRACKS.find((track) => track.id === musicTrack)?.label} is playing softly` : "Music fades in when your practice begins"}</small>
      </div>
      <button className="practice-button" onClick={start}>{running ? <Pause size={20} weight="fill" /> : <Lotus size={21} />} {running ? `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")} · Pause` : remaining < duration * 60 ? "Resume practice" : "Begin guided practice"}<ArrowRight size={20} /></button>
      <div className="reminder-row"><Bell size={17} /><input aria-label="Daily reminder time" type="time" value={reminderTime} onChange={(event) => setReminderTime(event.target.value)} /><button onClick={downloadReminder}><DownloadSimple size={17} /> Reminder</button></div>
    </aside>
  );
}

function CheckIn({ mood, setMood, gratitude, setGratitude }) {
  return (
    <div className="checkin-grid">
      <section className="checkin-card mood-card">
        <p className="eyebrow"><Smiley size={18} /> Mood check-in</p>
        <p>How are you feeling right now?</p>
        <div className="mood-options">
          {MOODS.map(({ value, label, Icon }) => <button key={value} className={mood === value ? "selected" : ""} onClick={() => setMood(value)} aria-label={label} title={label}><Icon size={29} /></button>)}
        </div>
      </section>
      <section className="checkin-card gratitude-card">
        <p className="eyebrow"><JournalIcon size={18} /> Gratitude prompt</p>
        <p>{PROMPTS[new Date().getDay()]}</p>
        <textarea value={gratitude} onChange={(event) => setGratitude(event.target.value)} placeholder="Write your gratitude…" aria-label="Write your gratitude" />
      </section>
    </div>
  );
}

function Stats({ minutes, savedCount, consistency }) {
  const items = [
    { Icon: Clock, value: minutes, label: "Mindful minutes", detail: "Goal: 30 min daily" },
    { Icon: BookmarkSimple, value: savedCount, label: "Saved affirmations", detail: "Favorites close at hand" },
    { Icon: Trophy, value: `${consistency}%`, label: "Weekly consistency", detail: `${Math.round((consistency / 100) * 7)} of 7 days` },
  ];
  return <section className="stats-panel">{items.map(({ Icon, value, label, detail }) => <div className="stat" key={label}><span className="stat-icon"><Icon size={27} /></span><div><strong>{value}</strong><span>{label}</span><small>{detail}</small></div></div>)}</section>;
}

function TodayView(props) {
  return (
    <div className="today-layout">
      <AffirmationHero {...props.hero} />
      <div className="right-rail">
        <Ritual {...props.ritual} />
        <CheckIn {...props.checkin} />
      </div>
      <Stats {...props.stats} />
    </div>
  );
}

function LibraryView({ custom, setCustom, favorites, toggleFavorite, selectAffirmation, notify }) {
  const [filter, setFilter] = useState("All");
  const [draft, setDraft] = useState("");
  const all = useMemo(() => [...AFFIRMATIONS, ...custom], [custom]);
  const filtered = all.filter((item) => filter === "All" || (filter === "Mine" ? item.id.startsWith("m") : filter === "Favorites" ? favorites.includes(item.id) : item.category === filter));
  const add = () => {
    if (!draft.trim()) return;
    setCustom([...custom, { id: `m${Date.now()}`, category: "Mine", text: draft.trim(), note: "Words you chose to live by." }]);
    setDraft("");
    setFilter("Mine");
    notify("Your affirmation was added");
  };
  return (
    <section className="page-view">
      <div className="page-heading"><div><p className="eyebrow">Your affirmation library</p><h1>Words for every season.</h1><p>Save the ones that steady you, or write your own.</p></div><BookOpen size={42} /></div>
      <div className="filter-row">{["All", ...CATEGORIES, "Mine", "Favorites"].map((name) => <button key={name} className={filter === name ? "active" : ""} onClick={() => setFilter(name)}>{name}</button>)}</div>
      <div className="composer"><Sparkle size={20} /><input value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => event.key === "Enter" && add()} placeholder="Write your own affirmation… (I am…)" /><button onClick={add}><Plus size={18} /> Add</button></div>
      <div className="affirmation-grid">
        {filtered.map((item) => <article className="library-card" key={item.id} onClick={() => selectAffirmation(item)}><small>{item.category}</small><p>“{item.text}”</p><div><button onClick={(event) => { event.stopPropagation(); toggleFavorite(item.id); }} aria-label={favorites.includes(item.id) ? "Remove from favorites" : "Save affirmation"}><Heart size={21} weight={favorites.includes(item.id) ? "fill" : "regular"} /></button>{item.id.startsWith("m") && <button onClick={(event) => { event.stopPropagation(); setCustom(custom.filter((entry) => entry.id !== item.id)); }} aria-label="Delete affirmation"><Trash size={20} /></button>}</div></article>)}
        {!filtered.length && <div className="empty-state"><Sparkle size={28} /><h2>Nothing here yet</h2><p>{filter === "Favorites" ? "Save an affirmation you love and it will appear here." : "Write your first personal affirmation above."}</p></div>}
      </div>
    </section>
  );
}

function JournalView({ moods, gratitudes, practiceDays }) {
  const today = new Date();
  const week = Array.from({ length: 7 }, (_, index) => { const date = new Date(today); date.setDate(today.getDate() - (6 - index)); return date; });
  const gratitudeEntries = Object.entries(gratitudes).filter(([, value]) => value?.trim()).sort(([a], [b]) => b.localeCompare(a));
  return (
    <section className="page-view">
      <div className="page-heading"><div><p className="eyebrow">Your journal</p><h1>Notice your inner weather.</h1><p>A gentle record of moods, practice, and gratitude.</p></div><JournalIcon size={42} /></div>
      <div className="journal-grid">
        <article className="journal-card"><p className="eyebrow">Mood · last 7 days</p><div className="mood-chart">{week.map((date) => { const value = moods[manilaDateKey(date)] || 0; const MoodIcon = MOODS.find((entry) => entry.value === value)?.Icon || SmileyMeh; return <div key={date.toISOString()}><span className={value ? "has-value" : ""}><MoodIcon size={24} /></span><i style={{ height: `${Math.max(8, value * 18)}%` }} /><small>{date.toLocaleDateString("en-US", { weekday: "short" })}</small></div>; })}</div></article>
        <article className="journal-card"><p className="eyebrow">Practice calendar</p><div className="practice-history">{practiceDays.slice(-8).reverse().map((day) => <div key={day}><Check size={17} /> <strong>{day}</strong><span>Mindful practice</span></div>)}{!practiceDays.length && <p className="muted">Your completed practices will gather here.</p>}</div></article>
        <article className="journal-card gratitude-history"><p className="eyebrow">Gratitude history</p>{gratitudeEntries.map(([day, text]) => <div key={day}><time>{day}</time><p>{text}</p></div>)}{!gratitudeEntries.length && <div className="empty-state"><Leaf size={28} /><h2>Your gratitude begins here.</h2><p>Write your first reflection on the Today tab.</p></div>}</article>
      </div>
    </section>
  );
}

function WishesView({ wishes, setWishes, notify }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    if (!draft.trim() || wishes.length >= 100) return;
    setWishes([...wishes, { id: Date.now(), text: draft.trim(), done: false }]);
    setDraft("");
    notify("A new wish was added");
  };
  const complete = (id) => setWishes(wishes.map((wish) => wish.id === id ? { ...wish, done: !wish.done } : wish));
  const done = wishes.filter((wish) => wish.done).length;
  return (
    <section className="page-view wishes-view">
      <div className="page-heading"><div><p className="eyebrow">100 wishes & intentions</p><h1>Name what you’re calling in.</h1><p>Give your hopes a place to live, then celebrate them as they arrive.</p></div><Star size={42} /></div>
      <div className="wish-progress"><div><span style={{ width: `${wishes.length}%` }} /></div><p><strong>{wishes.length}</strong> / 100 wishes · <strong>{done}</strong> came true</p></div>
      <div className="composer"><Star size={20} /><input value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => event.key === "Enter" && add()} placeholder="I wish for…" /><button onClick={add}><Plus size={18} /> Add wish</button></div>
      <div className="wish-list">{wishes.map((wish) => <article key={wish.id} className={wish.done ? "done" : ""}><button className="wish-check" onClick={() => complete(wish.id)} aria-label={wish.done ? "Mark wish incomplete" : "Mark wish complete"}>{wish.done && <Check size={17} weight="bold" />}</button><span>{wish.text}</span><button className="delete-button" onClick={() => setWishes(wishes.filter((item) => item.id !== wish.id))} aria-label="Delete wish"><Trash size={19} /></button></article>)}{!wishes.length && <div className="empty-state"><Sparkle size={30} /><h2>A hundred blank pages.</h2><p>What do you wish for first?</p></div>}</div>
    </section>
  );
}

function BottomNav({ view, setView }) {
  return <nav className="bottom-nav" aria-label="Mobile navigation">{NAV.map(({ id, label, Icon }) => <button key={id} className={view === id ? "active" : ""} onClick={() => setView(id)}><Icon size={22} weight={view === id ? "fill" : "regular"} /><span>{label}</span></button>)}</nav>;
}

export function App() {
  const [view, setView] = useState("today");
  const [theme, setTheme] = useStoredState("igTheme", "aurora");
  const [favorites, setFavorites] = useStoredState("igFavs2", []);
  const [custom, setCustom] = useStoredState("igMine", []);
  const [moods, setMoods] = useStoredState("igMood", {});
  const [gratitudes, setGratitudes] = useStoredState("igGrat", {});
  const [wishes, setWishes] = useStoredState("igWishes", []);
  const [practiceDays, setPracticeDays] = useStoredState("igDays", []);
  const [minutes, setMinutes] = useStoredState("igMinutes", 0);
  const [selectedId, setSelectedId] = useState("a20");
  const [toast, setToast] = useState("");
  const toastTimer = useRef();
  const allAffirmations = useMemo(() => [...AFFIRMATIONS, ...custom], [custom]);
  const affirmation = allAffirmations.find((item) => item.id === selectedId) || allAffirmations[20] || AFFIRMATIONS[0];
  const today = manilaDateKey();

  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);
  useEffect(() => {
    if (!practiceDays.includes(today)) setPracticeDays([...practiceDays, today]);
  }, []); // The original app treats a mindful daily visit as practice continuity.

  const notify = (message) => {
    setToast(message);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(""), 2600);
  };

  const move = (direction) => {
    const index = allAffirmations.findIndex((item) => item.id === affirmation.id);
    const next = (index + direction + allAffirmations.length) % allAffirmations.length;
    setSelectedId(allAffirmations[next].id);
  };

  const listen = () => {
    window.speechSynthesis?.cancel();
    const utterance = new SpeechSynthesisUtterance(affirmation.text);
    utterance.rate = 0.86;
    window.speechSynthesis?.speak(utterance);
    notify("Reading your affirmation aloud");
  };

  const toggleFavorite = (id) => {
    const saved = favorites.includes(id);
    setFavorites(saved ? favorites.filter((item) => item !== id) : [...favorites, id]);
    notify(saved ? "Removed from saved affirmations" : "Saved to your library");
  };

  const share = async () => {
    const text = `“${affirmation.text}” — InnerGlow`;
    try {
      if (navigator.share) await navigator.share({ title: "InnerGlow affirmation", text, url: window.location.href });
      else { await navigator.clipboard.writeText(`${text} ${window.location.href}`); notify("Affirmation copied to clipboard"); }
    } catch (error) {
      if (error?.name !== "AbortError") notify("Sharing is not available in this browser");
    }
  };

  const consistency = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(); date.setDate(date.getDate() - index); return practiceDays.includes(manilaDateKey(date));
  }).filter(Boolean).length;

  const moodToday = moods[today] || 0;
  const gratitudeToday = gratitudes[today] || "";

  const selectAffirmation = (item) => { setSelectedId(item.id); setView("today"); window.scrollTo({ top: 0, behavior: "smooth" }); };

  return (
    <div className="app-shell" style={{ "--aurora-image": `url(${AURORA_ASSET})` }}>
      <Header view={view} setView={setView} theme={theme} setTheme={setTheme} />
      <main>
        {view === "today" && <TodayView
          hero={{ affirmation, isSaved: favorites.includes(affirmation.id), onPrevious: () => move(-1), onNext: () => move(1), onListen: listen, onSave: () => toggleFavorite(affirmation.id), onShare: share }}
          ritual={{ minutes, setMinutes, practiceDays, setPracticeDays, notify }}
          checkin={{ mood: moodToday, setMood: (value) => setMoods({ ...moods, [today]: moodToday === value ? 0 : value }), gratitude: gratitudeToday, setGratitude: (value) => setGratitudes({ ...gratitudes, [today]: value }) }}
          stats={{ minutes, savedCount: favorites.length, consistency: Math.round((consistency / 7) * 100) }}
        />}
        {view === "library" && <LibraryView custom={custom} setCustom={setCustom} favorites={favorites} toggleFavorite={toggleFavorite} selectAffirmation={selectAffirmation} notify={notify} />}
        {view === "journal" && <JournalView moods={moods} gratitudes={gratitudes} practiceDays={practiceDays} />}
        {view === "wishes" && <WishesView wishes={wishes} setWishes={setWishes} notify={notify} />}
      </main>
      <BottomNav view={view} setView={setView} />
      <div className={`toast ${toast ? "show" : ""}`} role="status"><Check size={18} weight="bold" /> {toast}</div>
    </div>
  );
}
