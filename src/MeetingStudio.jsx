import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, ArrowsOut, Check, FlowerLotus, MusicNotes, Pause, Play, SpeakerHigh, SpeakerSlash, X } from '@phosphor-icons/react';
import { SCENERIES, INTENTIONS, MUSIC, meetingLines, meetingSlide, clock } from './meeting-data';

export function SceneryPicker({ selected, onChange, compact = false }) {
  return <div className={`scenery-grid ${compact ? 'compact' : ''}`} role="group" aria-label="Calming scenery">
    {SCENERIES.map(scene => <button key={scene.id} className={`scenery-card ${selected === scene.id ? 'selected' : ''}`} aria-pressed={selected === scene.id} onClick={() => onChange(scene.id)}>
      <span className="scenery-image" style={{ backgroundImage: `url(${scene.image.endsWith(".webp") ? scene.image.replace(".webp", "-thumb.webp") : scene.image})` }}><span className="scenery-check"><Check size={13} weight="bold" /></span></span>
      <strong>{scene.name}</strong>{!compact && <small>{scene.mood}</small>}
    </button>)}
  </div>;
}

function readPreferences() {
  try { return JSON.parse(localStorage.getItem('igMeetingPreferences')) || {}; } catch { return {}; }
}

export function MeetingStudio({ open, onClose, scenery, setScenery, onBeforeStart, onComplete, dailyAffirmation, openingIntention }) {
  const [preferences] = useState(readPreferences);
  const [intention, setIntention] = useState(preferences.intention || 'together');
  const [duration, setDuration] = useState(preferences.duration || 2);
  const [music, setMusic] = useState(preferences.music || '1');
  const [volume, setVolume] = useState(preferences.volume ?? 25);
  const [voice, setVoice] = useState(preferences.voice ?? false);
  const [custom, setCustom] = useState(preferences.custom || '');
  const [stage, setStage] = useState(false);
  const [status, setStatus] = useState('ready');
  const [elapsed, setElapsed] = useState(0);
  const [slideOffset, setSlideOffset] = useState(0);
  const [controls, setControls] = useState(true);
  const [muted, setMuted] = useState(false);
  const [audioError, setAudioError] = useState('');
  const dialog = useRef();
  const audio = useRef();
  const started = useRef(0);
  const accumulated = useRef(0);
  const hiddenTimer = useRef();
  const announced = useRef(-1);
  const completion = useRef(false);
  const scene = SCENERIES.find(item => item.id === scenery) || SCENERIES[0];
  const lines = meetingLines(intention, custom, dailyAffirmation);
  const slide = meetingSlide(elapsed, lines.length, slideOffset);
  const line = lines[slide] || 'Take a breath. Make space for a fresh beginning.';
  const total = duration * 60;

  useEffect(() => {
    try { localStorage.setItem('igMeetingPreferences', JSON.stringify({ intention, duration, music, volume, voice, custom })); } catch { /* Private browsing can disable persistence. */ }
  }, [intention, duration, music, volume, voice, custom]);

  useEffect(() => {
    if (open && !dialog.current.open) { if (openingIntention) setIntention(openingIntention); dialog.current.showModal(); }
    if (!open && dialog.current.open) dialog.current.close();
  }, [open]);

  const stopAudio = () => { audio.current?.pause(); window.speechSynthesis?.cancel(); };
  const leaveStage = () => {
    stopAudio(); setStage(false); setStatus('ready');
    document.documentElement.removeAttribute('data-presenting');
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    window.wellness?.endPresentation?.();
  };
  const close = () => { leaveStage(); onClose(); };

  useEffect(() => {
    if (!stage) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const fullscreenChange = () => { if (!document.fullscreenElement) leaveStage(); };
    document.addEventListener('fullscreenchange', fullscreenChange);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('fullscreenchange', fullscreenChange);
      window.clearTimeout(hiddenTimer.current);
    };
  }, [stage]);

  useEffect(() => {
    if (status !== 'playing') return;
    const interval = window.setInterval(() => {
      const next = Math.min(total, accumulated.current + (performance.now() - started.current) / 1000);
      setElapsed(next);
      if (next >= total && !completion.current) {
        completion.current = true; setStatus('complete'); stopAudio(); onComplete(duration);
      }
    }, 200);
    return () => window.clearInterval(interval);
  }, [status, total, duration]);

  useEffect(() => {
    if (!stage || !voice || status !== 'playing' || announced.current === slide || !window.SpeechSynthesisUtterance) return;
    announced.current = slide;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(line);
    utterance.rate = 0.85;
    utterance.onstart = () => { if (audio.current) audio.current.volume = (muted ? 0 : volume / 100) * 0.3; };
    const restore = () => { if (audio.current) audio.current.volume = muted ? 0 : volume / 100; };
    utterance.onend = restore; utterance.onerror = restore;
    window.speechSynthesis.speak(utterance);
  }, [slide, stage, voice, status, line, muted, volume]);

  useEffect(() => { if (audio.current) audio.current.volume = muted ? 0 : volume / 100; }, [volume, muted]);
  useEffect(() => () => { stopAudio(); document.documentElement.removeAttribute('data-presenting'); window.wellness?.endPresentation?.(); }, []);

  const reveal = () => {
    setControls(true); window.clearTimeout(hiddenTimer.current);
    hiddenTimer.current = window.setTimeout(() => { if (!dialog.current?.contains(document.activeElement) || document.activeElement === dialog.current) setControls(false); }, 3500);
  };
  const start = () => {
    onBeforeStart(); window.wellness?.startPresentation?.();
    document.documentElement.dataset.presenting = 'true';
    setStage(true); setElapsed(0); setSlideOffset(0); setMuted(false); setAudioError('');
    accumulated.current = 0; started.current = performance.now(); completion.current = false; announced.current = -1;
    audio.current?.pause();
    if (music !== 'none') {
      const player = audio.current;
      player.src = `/wellness/audio/music-${music}.mp3`;
      player.loop = true; player.volume = volume / 100;
      player.play().catch(() => setAudioError('Music could not play. Use Retry music below.'));
    }
    setStatus('playing'); reveal();
    // Request fullscreen during the button gesture. The immersive dialog is the fallback.
    document.documentElement.requestFullscreen?.().catch(() => {});
    window.setTimeout(() => dialog.current?.focus(), 0);
  };
  const pause = () => {
    if (status === 'playing') {
      accumulated.current += (performance.now() - started.current) / 1000;
      setStatus('paused'); stopAudio();
    } else {
      announced.current = -1; started.current = performance.now(); setStatus('playing');
      if (music !== 'none') audio.current?.play().catch(() => setAudioError('Music could not play. Use Retry music below.'));
    }
    reveal();
  };
  const move = (direction) => {
    if (lines.length <= 1) return;
    setSlideOffset(value => value + direction);
    announced.current = -1; window.speechSynthesis?.cancel(); reveal();
  };
  const keydown = event => {
    if (!stage || /INPUT|SELECT|TEXTAREA/.test(event.target.tagName)) return;
    if (event.code === 'Space' && event.target.tagName !== 'BUTTON' && status !== 'complete') { event.preventDefault(); pause(); }
    if (event.key === 'ArrowRight' && status !== 'complete') move(1);
    if (event.key === 'ArrowLeft' && status !== 'complete') move(-1);
    if (event.key.toLowerCase() === 'm') setMuted(value => !value);
  };

  return <dialog ref={dialog} className={`meeting-dialog ${stage ? 'presenting' : ''} ${controls || status !== 'playing' ? 'controls-visible' : ''}`} aria-labelledby={stage ? undefined : "meeting-title"} aria-label={stage ? "InnerGlow team presentation" : undefined} tabIndex={-1} onKeyDown={keydown} onPointerMove={reveal} onFocusCapture={reveal} onCancel={event => { event.preventDefault(); stage ? leaveStage() : close(); }}>
    <audio ref={audio} preload="none" aria-hidden="true"/>
    {!stage ? <>
      <div className="studio-heading"><div><p className="eyebrow">A moment, together</p><h2 id="meeting-title">Set the tone for your team.</h2><p>A gentle opening for your weekly meeting.</p></div><button className="studio-close" onClick={close} aria-label="Close meeting setup"><X size={22} /></button></div>
      <div className="studio-layout"><div className="studio-settings">
        <label className="studio-label" htmlFor="meeting-intention">01 <span>Choose your intention</span></label>
        <select id="meeting-intention" value={intention} onChange={e => setIntention(e.target.value)}>{Object.entries(INTENTIONS).map(([id, item]) => <option key={id} value={id}>{item.name}</option>)}<option value="daily">Today’s affirmation</option><option value="custom">Your own words</option></select>
        {intention === 'custom' ? <label className="custom-message">Your affirmation<textarea maxLength={280} rows={3} value={custom} onChange={e => setCustom(e.target.value)} placeholder="Write a message for your team…"/><small>{custom.length}/280 · Your message stays on screen throughout.</small></label> : <p className="field-hint">{intention === "daily" ? "A personal affirmation, held on screen for your session" : INTENTIONS[intention]?.description}</p>}
        <p className="studio-label">02 <span>Make a little space</span></p><div className="meeting-durations" role="group" aria-label="Meeting duration">{[1,2,3,5].map(n => <button key={n} onClick={() => setDuration(n)} aria-pressed={duration === n} className={duration === n ? 'active' : ''}>{n}<small>min</small></button>)}</div>
        <label className="studio-label" htmlFor="meeting-music">03 <span>Add a soundtrack</span></label><select id="meeting-music" value={music} onChange={e => setMusic(e.target.value)}>{MUSIC.map(item => <option key={item.id} value={item.id}>{item.name} · {item.description}</option>)}</select>
        <label className="meeting-volume">Music volume <output>{volume}%</output><input type="range" min="0" max="70" step="5" value={volume} disabled={music === 'none'} onChange={e => setVolume(Number(e.target.value))}/></label>
        <label className="meeting-voice"><input type="checkbox" checked={voice} disabled={!('speechSynthesis' in window)} onChange={e => setVoice(e.target.checked)}/><span>Read affirmations aloud<small>{'speechSynthesis' in window ? 'Optional voice, with music lowered underneath' : 'Voice is unavailable in this browser'}</small></span></label>
      </div><div className="studio-visuals"><div className="stage-preview" style={{ backgroundImage: `linear-gradient(0deg,#091b1c99,#091b1c55),url(${scene.image})` }}><span><FlowerLotus size={20}/> INNERGLOW</span><blockquote>{line}</blockquote><small>{duration} MINUTES OF POSSIBILITY</small></div><p className="studio-label">04 <span>Choose a place to pause</span></p><SceneryPicker selected={scenery} onChange={setScenery} compact/></div></div>
      <footer className="studio-footer"><p><SpeakerHigh size={18}/><span>Sharing in Teams or Zoom?<small>Turn on “Include sound” when you share your screen.</small></span></p><button className="meeting-start" disabled={!lines.length} onClick={start}><ArrowsOut size={19}/> Present full screen <ArrowRight size={18}/></button></footer>
    </> : <>
      <div className="presentation-image" style={{ backgroundImage: `url(${scene.image})`, backgroundPosition: scene.position }} /><div className="presentation-shade"/>
      <header className="presentation-top"><span className="presentation-brand"><FlowerLotus size={24}/> InnerGlow<span>A moment, together</span></span><button className="stage-exit" onClick={leaveStage}><X size={18}/> Exit presentation</button></header>
      <div className={`presentation-center ${line.length > 170 ? "long-message" : ""}`}><span className="presentation-kicker">{status === 'complete' ? 'Carry this calm into your week' : status === 'paused' ? 'Take your time' : 'Breathe in. Be here. Begin.'}</span><blockquote key={status === 'complete' ? 'complete' : slide}>{status === 'complete' ? 'A fresh perspective. A shared beginning.' : line}</blockquote><div className={`presentation-breath ${status === 'playing' ? 'running' : ''}`} aria-hidden="true"><i/><i/><i/></div><span className="presentation-caption">{status === 'complete' ? 'Thank you for making a little space, together.' : 'Let these words settle. There is no rush.'}</span></div>
      <footer className="presentation-bottom"><div className="presentation-meta"><span>{INTENTIONS[intention]?.name || (intention === 'daily' ? 'Today’s affirmation' : 'Your own words')} · {scene.name}</span><time role="timer" aria-label="Time remaining">{clock(total - elapsed)}</time></div><div className="presentation-progress"><span style={{ width: `${elapsed / total * 100}%` }}/></div><div className="presentation-controls">
        {status === 'complete' ? <><button onClick={start}><Play size={20}/> Play again</button><button onClick={leaveStage}>Back to setup <ArrowRight size={18}/></button></> : <><button onClick={() => move(-1)} disabled={lines.length <= 1} aria-label="Previous slide"><ArrowLeft size={20}/></button><button className="stage-play" onClick={pause} aria-label={status === 'playing' ? 'Pause presentation' : 'Resume presentation'}>{status === 'playing' ? <Pause size={21} weight="fill"/> : <Play size={21} weight="fill"/>}</button><button onClick={() => move(1)} disabled={lines.length <= 1} aria-label="Next slide"><ArrowRight size={20}/></button><span className="stage-control-divider"/><button onClick={() => setMuted(value => !value)} disabled={music === 'none'} aria-label={muted ? 'Unmute music' : 'Mute music'}>{muted ? <SpeakerSlash size={21}/> : <MusicNotes size={21}/>}</button></>}
      </div>{audioError && <p className="presentation-error">{audioError} <button onClick={() => audio.current?.play().then(() => setAudioError('')).catch(() => {})}>Retry music</button></p>}<p className="presentation-shortcuts">SPACE pause · ← → change words · M music · ESC exit</p></footer>
    </>}
  </dialog>;
}
