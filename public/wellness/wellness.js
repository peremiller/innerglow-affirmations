import { PATTERNS, breathAt, remainingSeconds } from './breathwork.js';

const prefix = location.hostname.includes('tribe') || document.title.includes('Tribe') ? 'trWellness' : 'igWellness';
function read(key, fallback) { try { return JSON.parse(localStorage.getItem(prefix + key)) ?? fallback; } catch { return fallback; } }
function save(key, value) { try { localStorage.setItem(prefix + key, JSON.stringify(value)); } catch {} }
const settings = { mode: read('Mode', matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'), music: read('Music', true), track: read('Track', 2), volume: read('Volume', 25), voice: read('Voice', 'warm'), speed: read('Speed', 1), voiceVolume: read('VoiceVolume', 90), effects: read('Effects', true), cues: read('Cues', true) };
const root = document.documentElement;
root.dataset.appearance = settings.mode;
root.dataset.visualEffects = settings.effects;
const manifestPromise = fetch('/wellness/voice-manifest.json').then(r => r.ok ? r.json() : {}).catch(() => ({}));
let manifest = {};
manifestPromise.then(value => { manifest = value; });
const normalize = text => text.replace(/\s+/g, ' ').trim();

// Shared audio output: real music files and voice clips have independent volume controls.
let context, musicGain, musicSource, loadedTrack = -1, musicWanted = false, musicVersion = 0, ducked = false;
const buffers = new Map();
function audioContext() {
  const Class = window.AudioContext || window.webkitAudioContext;
  if (!context && Class) { context = new Class(); musicGain = context.createGain(); musicGain.gain.value = 0; musicGain.connect(context.destination); }
  return context;
}
function adjustMusic() {
  if (!musicGain) return;
  const volume = settings.music && musicWanted ? (settings.volume / 100) * (ducked ? 0.3 : 1) : 0;
  musicGain.gain.setTargetAtTime(volume, context.currentTime, 0.35);
}
async function playMusic() {
  musicWanted = true;
  if (!settings.music) return;
  const ctx = audioContext(); if (!ctx) return;
  const version = ++musicVersion;
  try {
    await ctx.resume();
    if (loadedTrack !== settings.track || !musicSource) {
      const track = settings.track;
      if (!buffers.has(track)) {
        const response = await fetch(`/wellness/audio/music-${track}.mp3`);
        if (!response.ok) throw Error('Music unavailable');
        buffers.set(track, await ctx.decodeAudioData(await response.arrayBuffer()));
      }
      if (version !== musicVersion || !musicWanted) return;
      musicSource?.stop(); musicSource?.disconnect();
      musicSource = ctx.createBufferSource(); musicSource.buffer = buffers.get(track); musicSource.loop = true;
      musicSource.connect(musicGain); musicSource.start(); loadedTrack = track;
    }
    adjustMusic();
    setStatus('Music playing softly');
  } catch { setStatus('Music could not start. Tap Preview music to try again.'); }
}
function stopMusic() { musicWanted = false; musicVersion++; adjustMusic(); setStatus('Music starts with your session'); }
function duck(value) { ducked = value; adjustMusic(); }

// Preserve each app's countdown, repetition, and pause logic while substituting neural voice clips.
const synth = window.speechSynthesis;
let currentSpeech = null, speechVersion = 0, virtualPaused = false;
const spokenVisual = { active: false, paused: false, text: '' };
let nativeSpeaking = () => false, nativePaused = () => false;
if (synth) {
  const proto = Object.getPrototypeOf(synth);
  const speakingGetter = Object.getOwnPropertyDescriptor(proto, 'speaking')?.get;
  const pausedGetter = Object.getOwnPropertyDescriptor(proto, 'paused')?.get;
  nativeSpeaking = () => speakingGetter?.call(synth) || false;
  nativePaused = () => pausedGetter?.call(synth) || false;
  const original = Object.fromEntries(['speak','cancel','pause','resume'].map(name => [name, synth[name].bind(synth)]));
  try {
    Object.defineProperties(synth, {
      speaking: { configurable: true, get: () => Boolean(currentSpeech) || nativeSpeaking() },
      pending: { configurable: true, get: () => Boolean(currentSpeech?.loading) },
      paused: { configurable: true, get: () => virtualPaused || nativePaused() },
    });
  } catch {}
  function cancelVirtual() { speechVersion++; currentSpeech?.audio?.pause(); currentSpeech = null; virtualPaused = false; spokenVisual.active = false; spokenVisual.paused = false; duck(false); }
  function useNative(utterance, version) {
    if (version !== speechVersion) return;
    currentSpeech = null;
    const voices = synth.getVoices();
    const preferred = voices.find(v => v.voiceURI === settings.voice);
    const ranked = voices.filter(v => /^en/i.test(v.lang)).sort((a,b) => score(b) - score(a));
    function score(v) { return (/neural|natural|enhanced|premium|google/i.test(v.name) ? 20 : 0) + (/samantha|ava|serena|sonia/i.test(v.name) ? 10 : 0) + (!v.localService ? 5 : 0); }
    utterance.voice = preferred || ranked[0] || utterance.voice;
    utterance.rate = 0.92 * settings.speed; utterance.pitch = 1; utterance.volume = settings.voiceVolume / 100;
    const end = utterance.onend, error = utterance.onerror, start = utterance.onstart;
    utterance.onstart = event => { duck(true); start?.(event); };
    utterance.onend = event => { if (version === speechVersion) spokenVisual.active = false; duck(false); end?.(event); };
    utterance.onerror = event => { if (version === speechVersion) spokenVisual.active = false; duck(false); error?.(event); };
    original.speak(utterance);
  }
  synth.speak = utterance => {
    const version = ++speechVersion;
    spokenVisual.active = true; spokenVisual.paused = false; spokenVisual.text = normalize(utterance.text);
    stopCue();
    currentSpeech?.audio?.pause();
    currentSpeech = { loading: true, audio: null }; virtualPaused = false;
    audioContext()?.resume().catch(() => {});
    playMusic();
    void manifestPromise.then(() => {
      if (version !== speechVersion) return;
      if (!['warm','grounded'].includes(settings.voice)) return useNative(utterance, version);
      let text = normalize(utterance.text);
      const clips = [], keys = Object.keys(manifest).sort((a,b) => b.length-a.length);
      while (text) {
        const key = keys.find(k => text === normalize(k) || text.startsWith(normalize(k) + ' '));
        if (!key || !manifest[key][settings.voice]) return useNative(utterance, version);
        clips.push(manifest[key][settings.voice]); text = text.slice(normalize(key).length).trim();
      }
      if (!clips.length) return useNative(utterance, version);
      let index = 0;
      const next = () => {
        if (version !== speechVersion) return;
        if (index >= clips.length) { currentSpeech = null; spokenVisual.active = false; duck(false); utterance.onend?.({ type: 'end', utterance }); return; }
        const audio = new Audio(clips[index++]); audio.volume = settings.voiceVolume / 100; audio.playbackRate = settings.speed;
        currentSpeech = { audio, loading: true }; duck(true);
        audio.onplaying = () => { if (version !== speechVersion) return audio.pause(); currentSpeech.loading = false; utterance.onstart?.({ type: 'start', utterance }); };
        audio.onended = next;
        audio.onerror = () => { if (version === speechVersion) useNative(utterance, version); };
        if (!virtualPaused) audio.play().catch(() => { if (version === speechVersion) useNative(utterance, version); });
      };
      next();
    });
  };
  synth.cancel = () => { cancelVirtual(); original.cancel(); };
  synth.pause = () => { virtualPaused = true; spokenVisual.paused = true; currentSpeech?.audio?.pause(); duck(false); original.pause(); };
  synth.resume = () => { virtualPaused = false; spokenVisual.paused = false; currentSpeech?.audio?.play().catch(() => {}); if (currentSpeech) duck(true); original.resume(); };
}

let cueAudio, cueVersion = 0;
async function sayCue(text) {
  if (!settings.cues || currentSpeech || nativeSpeaking()) return;
  const version = ++cueVersion;
  await manifestPromise;
  if (version !== cueVersion) return;
  cueAudio?.pause();
  const url = manifest[text]?.[['warm','grounded'].includes(settings.voice) ? settings.voice : 'warm'];
  if (!url) return;
  const audio = cueAudio = new Audio(url); audio.volume = settings.voiceVolume / 100; audio.playbackRate = settings.speed;
  duck(true); audio.onended = () => { if (cueAudio === audio) { cueAudio = null; duck(false); } };
  audio.onerror = () => { cueAudio = null; duck(false); };
  await audio.play().catch(() => { cueAudio = null; duck(false); });
}
function stopCue() { cueVersion++; cueAudio?.pause(); cueAudio = null; duck(false); }

const toolbar = document.createElement('div'); toolbar.className = 'wellness-toolbar';
toolbar.innerHTML = `<span class="wellness-label">A moment for you</span><div><button data-action="breathwork">◎ Breathwork</button><button data-action="audio">♫ Voice & music</button><button data-action="theme" aria-label="Switch appearance"></button></div>`;
document.body.prepend(toolbar);
const affirmationVisualMarkup = `<div class="wellness-affirmation-visual"><div class="wellness-affirmation-light" aria-hidden="true"><i></i><i></i><i></i></div><div class="wellness-affirmation-copy"><small class="wellness-affirmation-category">Affirmation</small><blockquote class="wellness-affirmation-text"></blockquote><span class="wellness-affirmation-caption">Let these words settle with each breath.</span></div></div>`;
const companion = document.createElement('section'); companion.className = 'wellness-companion'; companion.hidden = true;
companion.setAttribute('aria-label', 'Breathing and affirmation visuals');
companion.innerHTML = `<div class="wellness-companion-heading"><strong>Breathe & affirm</strong><span class="wellness-companion-status"></span><button class="wellness-visual-toggle" aria-expanded="true" aria-controls="wellness-combined-body">Minimize visuals</button></div><div id="wellness-combined-body" class="wellness-combined-body"><div class="wellness-companion-breath"><div class="wellness-companion-orb"><span class="wellness-companion-phase">Inhale</span><strong class="wellness-companion-seconds">4</strong></div><small class="wellness-companion-rhythm"></small></div>${affirmationVisualMarkup}</div>`;
toolbar.after(companion);
const visualToggle = companion.querySelector('.wellness-visual-toggle');
visualToggle.onclick = () => { const body = companion.querySelector('.wellness-combined-body'); body.hidden = !body.hidden; visualToggle.setAttribute('aria-expanded', !body.hidden); visualToggle.textContent = body.hidden ? 'Expand visuals' : 'Minimize visuals'; };
const aura = document.createElement('div'); aura.className = 'wellness-aura'; aura.setAttribute('aria-hidden', 'true'); aura.innerHTML = '<i></i><i></i><i></i>'; document.body.append(aura);
const dialog = document.createElement('dialog'); dialog.className = 'wellness-dialog'; dialog.setAttribute('aria-labelledby','wellness-title');
dialog.innerHTML = `<div class="wellness-dialog-heading"><div><small>Your practice</small><h2 id="wellness-title">Breathe. Settle. Listen.</h2></div><button class="wellness-close" aria-label="Close practice settings">×</button></div>
<nav class="wellness-tabs" aria-label="Practice settings"><button data-tab="breathwork">Breathwork</button><button data-tab="audio">Voice & music</button></nav>
<section data-pane="breathwork"><div class="wellness-orb-wrap"><svg viewBox="0 0 220 220" aria-hidden="true"><circle class="wellness-ring-base" cx="110" cy="110" r="104"/><circle class="wellness-ring-progress" cx="110" cy="110" r="104"/></svg><div class="wellness-orb"><span class="wellness-phase">Ready to breathe</span><strong class="wellness-phase-count">4</strong></div></div><div class="wellness-session-line"><strong class="wellness-countdown" role="timer" aria-live="off">03:00</strong><span class="wellness-state" role="status">Choose a comfortable rhythm</span></div>
<label class="wellness-field">Breathing rhythm<select id="wellness-pattern">${Object.entries(PATTERNS).map(([id,p])=>`<option value="${id}">${p.label} · ${p.detail}</option>`).join('')}</select></label><p class="wellness-guidance">Breathe gently without forcing it. You can skip holds by choosing Gentle breathing.</p>
<div class="wellness-duration" role="group" aria-label="Breathwork duration">${[1,3,5,10].map(n=>`<button data-minutes="${n}">${n} min</button>`).join('')}</div>
<div class="wellness-session-buttons"><button id="wellness-start" class="wellness-primary">Start breathwork</button><button id="wellness-reset">Reset</button></div><label class="wellness-check"><input id="wellness-cues" type="checkbox"> Spoken breathing cues</label></section>
<section data-pane="audio" hidden><h3>A softer voice</h3><label class="wellness-field">Voice<select id="wellness-voice"><option value="warm">Warm · natural female voice</option><option value="grounded">Grounded · natural male voice</option></select></label><p class="wellness-guidance">Natural voice recordings for the included affirmations and breathing cues. Personal affirmations use your selected device voice.</p>
<label class="wellness-field">Voice speed <output id="wellness-speed-output"></output><input id="wellness-speed" type="range" min="0.8" max="1.2" step="0.05"></label><label class="wellness-field">Voice volume <output id="wellness-voice-volume-output"></output><input id="wellness-voice-volume" type="range" min="0" max="100" step="5"></label><button id="wellness-preview-voice">Preview voice</button>
<h3>Music beneath your words</h3><label class="wellness-check"><input id="wellness-music" type="checkbox"> Background music during sessions</label><label class="wellness-field">Soundscape<select id="wellness-track"><option value="0">Calming clouds · soft pads & chimes</option><option value="1">Healing calm · warm ambient piano</option><option value="2">Relaxing flow · piano & strings</option></select></label><label class="wellness-field">Music volume <output id="wellness-volume-output"></output><input id="wellness-volume" type="range" min="0" max="70" step="5"></label><div class="wellness-preview-row"><button id="wellness-preview-music">Preview music</button><span id="wellness-audio-status" role="status">Music starts with your session</span></div><p class="wellness-guidance">Music lowers automatically while the voice speaks.</p>
<label class="wellness-check"><input id="wellness-effects" type="checkbox"> Visual effects during countdowns</label></section>`;
document.body.append(dialog);
dialog.querySelector('.wellness-session-line').insertAdjacentHTML('afterend', affirmationVisualMarkup);
const $ = selector => dialog.querySelector(selector);
function setStatus(message) { const target = $('#wellness-audio-status'); if (target && target.textContent !== message) target.textContent = message; }
function applyAppearance() { root.dataset.appearance = settings.mode; const button = toolbar.querySelector('[data-action="theme"]'); button.textContent = settings.mode === 'dark' ? '☀ Light mode' : '☾ Dark mode'; button.setAttribute('aria-label', `Switch to ${settings.mode === 'dark' ? 'light' : 'dark'} mode`); save('Mode',settings.mode); }
applyAppearance();
function switchTab(tab) { dialog.querySelectorAll('[data-pane]').forEach(p=>p.hidden=p.dataset.pane!==tab); dialog.querySelectorAll('[data-tab]').forEach(b=>b.setAttribute('aria-selected',b.dataset.tab===tab)); }
function open(tab) { switchTab(tab); if (!dialog.open) dialog.showModal(); }
window.wellness = { openAudio: () => open('audio'), openBreathwork: () => open('breathwork') };
toolbar.addEventListener('click', e=>{ const action=e.target.closest('[data-action]')?.dataset.action; if(action==='theme'){settings.mode=settings.mode==='dark'?'light':'dark';applyAppearance();}else if(action)open(action); });
dialog.querySelector('.wellness-close').onclick = () => dialog.close();
dialog.addEventListener('click',e=>{if(e.target===dialog){const b=dialog.getBoundingClientRect();if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom)dialog.close();}const tab=e.target.closest('[data-tab]')?.dataset.tab;if(tab)switchTab(tab);});
function range(id, key, format) { const input=$(`#wellness-${id}`), output=$(`#wellness-${id}-output`); input.value=settings[key];const update=()=>{settings[key]=Number(input.value);save(key[0].toUpperCase()+key.slice(1),settings[key]);output.textContent=format(settings[key]);if(key==='volume')adjustMusic();if(key==='voiceVolume'&&currentSpeech?.audio)currentSpeech.audio.volume=settings[key]/100;if(key==='speed'&&currentSpeech?.audio)currentSpeech.audio.playbackRate=settings[key];};input.oninput=update;update(); }
range('volume','volume',n=>`${n}%`);range('voice-volume','voiceVolume',n=>`${n}%`);range('speed','speed',n=>`${n.toFixed(2)}×`);
$('#wellness-voice').value=settings.voice;$('#wellness-voice').onchange=e=>{settings.voice=e.target.value;save('Voice',settings.voice);};
function addDeviceVoices() { if(!synth)return;const select=$('#wellness-voice');const previous=select.value;select.querySelectorAll('[data-device]').forEach(o=>o.remove());synth.getVoices().filter(v=>/^en/i.test(v.lang)).forEach(v=>{const o=document.createElement('option');o.value=v.voiceURI;o.textContent=`Device · ${v.name}`;o.dataset.device='true';select.append(o);});select.value=previous||settings.voice; }
addDeviceVoices();synth?.addEventListener('voiceschanged',addDeviceVoices);
$('#wellness-track').value=settings.track;$('#wellness-track').onchange=e=>{settings.track=Number(e.target.value);save('Track',settings.track);if(musicWanted)playMusic();};
for(const [id,key] of [['music','music'],['effects','effects'],['cues','cues']]){const input=$(`#wellness-${id}`);input.checked=settings[key];input.onchange=()=>{settings[key]=input.checked;save(key[0].toUpperCase()+key.slice(1),settings[key]);root.dataset.visualEffects=settings.effects;if(key==='music'){if(musicWanted)playMusic();adjustMusic();}if(key==='cues'&&!settings.cues)stopCue();};}
$('#wellness-preview-voice').onclick=()=>{const enabled=settings.cues;settings.cues=true;void sayCue('Take a comfortable seat. Let your shoulders soften. Follow the circle at a pace that feels easy.').finally(()=>{settings.cues=enabled;});};
let previewMusic=false;$('#wellness-preview-music').onclick=()=>{previewMusic=!previewMusic;$('#wellness-preview-music').textContent=previewMusic?'Stop preview':'Preview music';previewMusic?playMusic():stopMusic();};
dialog.addEventListener('close',()=>{previewMusic=false;$('#wellness-preview-music').textContent='Preview music';if(!session.running){stopCue();if(!originalTimerRunning())stopMusic();}});

const session={duration:read('Duration',3)*60000,pattern:read('Pattern','gentle'),elapsed:0,started:0,running:false,lastPhase:''};
$('#wellness-pattern').value=session.pattern;
function refreshDuration(){dialog.querySelectorAll('[data-minutes]').forEach(b=>b.setAttribute('aria-pressed',Number(b.dataset.minutes)*60000===session.duration));}
refreshDuration();
dialog.querySelector('.wellness-duration').onclick=e=>{const n=Number(e.target.closest('[data-minutes]')?.dataset.minutes);if(!n)return;reset();session.duration=n*60000;save('Duration',n);refreshDuration();renderBreath();};
$('#wellness-pattern').onchange=e=>{reset();session.pattern=e.target.value;save('Pattern',session.pattern);renderBreath();};
function elapsedNow(){return session.elapsed+(session.running?performance.now()-session.started:0);}
function reset(){session.running=false;session.elapsed=0;session.lastPhase='';stopCue();if(!originalTimerRunning()&&!previewMusic)stopMusic();renderBreath();}
$('#wellness-reset').onclick=reset;
$('#wellness-start').onclick=()=>{
  if(session.running){session.elapsed=elapsedNow();session.running=false;stopCue();if(!originalTimerRunning())stopMusic();}
  else{if(session.elapsed>=session.duration)session.elapsed=0;session.started=performance.now();session.running=true;session.lastPhase='';playMusic();}
  renderBreath();
};
function renderBreath(){
  let elapsed=elapsedNow();
  if(session.running&&elapsed>=session.duration){session.running=false;session.elapsed=session.duration;elapsed=session.duration;stopCue();sayCue('Return to your natural breath. Your session is complete.');if(!originalTimerRunning()&&!previewMusic)stopMusic();window.dispatchEvent(new CustomEvent('wellness:completed',{detail:{minutes:session.duration/60000}}));}
  const done=elapsed>=session.duration,phase=breathAt(elapsed,session.pattern);
  $('.wellness-orb').style.transform=`scale(${phase.scale})`;
  $('.wellness-phase').textContent=done?'Complete':session.running?phase.label:session.elapsed>0?'Paused':'Ready to breathe';
  $('.wellness-phase-count').textContent=done?'✓':phase.secondsLeft;
  const left=remainingSeconds(session.duration,elapsed);$('.wellness-countdown').textContent=`${String(Math.floor(left/60)).padStart(2,'0')}:${String(left%60).padStart(2,'0')}`;
  toolbar.querySelector('[data-action="breathwork"]').textContent = elapsed>0&&!done ? `◎ ${String(Math.floor(left/60)).padStart(2,'0')}:${String(left%60).padStart(2,'0')} · ${session.running?'Breathwork':'Paused'}` : '◎ Breathwork';
  $('.wellness-ring-progress').style.strokeDashoffset=653.45*(elapsed/session.duration);
  $('.wellness-state').textContent=done?'Carry this calm with you':session.running?PATTERNS[session.pattern].detail:session.elapsed>0?'Paused · resume when ready':'Choose a comfortable rhythm';
  $('#wellness-start').textContent=session.running?'Pause breathwork':done?'Start again':session.elapsed>0?'Resume breathwork':'Start breathwork';
  if(session.running&&phase.phaseKey!==session.lastPhase){session.lastPhase=phase.phaseKey;sayCue(phase.label==='Inhale'?'Breathe in.':phase.label==='Exhale'?'Breathe out.':'Hold gently.');}
}
renderBreath();
function originalTimerRunning(){return Boolean(document.querySelector('.breathing-visual.running, .breath-ring.practicing, .audio-countdown:not(.paused)')||document.querySelector('.audio-playback-status.active .audio-primary-action[aria-label^="Pause"]'));}
const visualClock = { elapsed: 0, started: 0, running: false, active: false };
function narrationVisualState() {
  const inner = document.querySelector('.audio-countdown');
  const tribe = document.querySelector('.audio-playback-status.active');
  const active = Boolean(inner || tribe || spokenVisual.active);
  const paused = inner ? inner.classList.contains('paused') : tribe ? Boolean(tribe.querySelector('[aria-label^="Resume"]')) : spokenVisual.paused;
  return { active, running: active && !paused };
}
function currentAffirmation() {
  const hero = document.querySelector('.affirmation-hero');
  const text = hero?.querySelector('blockquote')?.textContent.trim().replace(/^[“"]|[”"]$/g, '') || spokenVisual.text || 'I give myself permission to pause, breathe, and begin again.';
  return { text, category: hero?.querySelector('.category')?.textContent.trim() || 'Affirmation' };
}
function renderCombinedVisuals() {
  const narration = narrationVisualState();
  const breathActive = session.running || (session.elapsed > 0 && session.elapsed < session.duration);
  const ritualRunning = Boolean(document.querySelector('.breathing-visual.running, .breath-ring.practicing'));
  const active = narration.active || breathActive || ritualRunning;
  const running = narration.running || session.running || ritualRunning;
  const now = performance.now();
  if (!active) { visualClock.elapsed = 0; visualClock.running = false; }
  else if (running !== visualClock.running) {
    if (visualClock.running) visualClock.elapsed += now - visualClock.started;
    else visualClock.started = now;
    visualClock.running = running;
  }
  if (active && !visualClock.active) {
    companion.querySelector('.wellness-combined-body').hidden = false;
    visualToggle.setAttribute('aria-expanded', 'true'); visualToggle.textContent = 'Minimize visuals';
  }
  visualClock.active = active; companion.hidden = !active;
  const elapsed = breathActive ? elapsedNow() : visualClock.elapsed + (visualClock.running ? now - visualClock.started : 0);
  const breathingRunning = breathActive ? session.running : running;
  const phase = breathAt(elapsed, session.pattern);
  companion.querySelector('.wellness-companion-orb').style.transform = `scale(${phase.scale})`;
  companion.querySelector('.wellness-companion-phase').textContent = breathingRunning ? phase.label : 'Paused';
  companion.querySelector('.wellness-companion-seconds').textContent = phase.secondsLeft;
  companion.querySelector('.wellness-companion-rhythm').textContent = PATTERNS[session.pattern].detail;
  companion.querySelector('.wellness-companion-status').textContent = narration.active ? (narration.running ? 'Affirmation playing' : 'Affirmation paused') : (running ? 'Breathwork practice' : 'Practice paused');
  const affirmation = currentAffirmation();
  for (const container of [companion, dialog]) {
    container.dataset.visualRunning = running;
    const quote = container.querySelector('.wellness-affirmation-text');
    if (quote.textContent !== affirmation.text) quote.textContent = affirmation.text;
    container.querySelector('.wellness-affirmation-category').textContent = affirmation.category;
  }
}
renderCombinedVisuals();
let lastRunning=false;
setInterval(()=>{
  renderBreath();
  renderCombinedVisuals();
  const originalRunning=originalTimerRunning(),running=session.running||originalRunning;
  root.dataset.sessionRunning=running;
  if(running!==lastRunning){if(running)playMusic();else if(!previewMusic)stopMusic();lastRunning=running;}
},100);
window.addEventListener('pagehide',()=>{session.running=false;synth?.cancel();stopCue();stopMusic();musicSource?.stop();context?.close();});
