import { useEffect, useRef, useState } from 'react';
import { MUSIC } from './meeting-data';
import './healing-music.css';

export default function HealingMusic() {
  const [track, setTrack] = useState('1');
  const [repeat, setRepeat] = useState(true);
  const [volume, setVolume] = useState(35);
  const [error, setError] = useState('');
  const player = useRef(null);
  const tracks = MUSIC.filter(item => item.id !== 'none');
  const selected = tracks.find(item => item.id === track);
  useEffect(() => { if (player.current) player.current.volume = volume / 100; }, [volume]);
  useEffect(() => {
    const stop = () => player.current?.pause();
    const observer = new MutationObserver(() => {
      if (document.documentElement.dataset.presenting === 'true') stop();
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-presenting'] });
    window.addEventListener('pagehide', stop);
    return () => { observer.disconnect(); window.removeEventListener('pagehide', stop); };
  }, []);
  async function choose(id) {
    setTrack(id);
    setError('');
    const audio = player.current;
    audio.src = `/wellness/audio/music-${id}.mp3`;
    try { await audio.play(); } catch { if (audio.getAttribute('src') === `/wellness/audio/music-${id}.mp3`) setError('Playback could not start. Press play to retry.'); }
  }
  return <section className="healing-music" id="healing-music" aria-labelledby="healing-title">
    <div className="section-heading"><div><p className="eyebrow">SOUND FOR YOUR STILLNESS</p><h2 id="healing-title">Healing music.</h2></div><p>Press play. Let the day soften.</p></div>
    <div className="healing-tracks">{tracks.map((item, i) => <button key={item.id} aria-pressed={track === item.id} onClick={() => choose(item.id)}><span className="healing-number">0{i + 1}</span><span><strong>{item.name}</strong><small>{item.description}</small></span><span aria-hidden="true">♫</span></button>)}</div>
    <div className="healing-player"><div><strong>{selected.name}</strong><p>{selected.listeningNote || 'Instrumental music for relaxation, reflection, or a quiet break.'}</p></div>
      <audio ref={player} controls preload="none" loop={repeat} src={`/wellness/audio/music-${track}.mp3`} onVolumeChange={e => setVolume(Math.round(e.currentTarget.volume * 100))} onError={() => setError('This track could not load. Select a track to retry, or reconnect if the offline copy is still saving.')} onPlaying={() => setError('')} aria-label={`Music player: ${selected.name}`} />
      <label className="healing-volume">Volume <input type="range" min="0" max="100" value={volume} onChange={e => setVolume(Number(e.target.value))} aria-label="Music volume" aria-valuetext={`${volume}%`} /><span>{volume}%</span></label>
      <label><input type="checkbox" checked={repeat} onChange={e => setRepeat(e.target.checked)} /> Repeat track</label>
    </div>
    {error && <p role="alert">{error}</p>}
    <small className="healing-note">Listen here, with no account required. Tracks are included in the automatic offline copy. “Healing” describes the mood of the music.</small>
  </section>;
}
