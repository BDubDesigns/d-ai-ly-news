import { useEffect, useMemo, useRef, useState } from 'react';
import { articleSpeechText, flattenArticles, sortEditions } from './lib/edition.js';

const DATA_BASE = `${import.meta.env.BASE_URL}data/`;

function Glyph({ name, size = 18 }) {
  const shapes = {
    play: <path d="M7 5.6c0-.8.9-1.3 1.6-.9l10.1 6.1a1.4 1.4 0 0 1 0 2.4l-10.1 6.1c-.7.4-1.6-.1-1.6-.9V5.6Z" />,
    pause: <path d="M7 5.5A1.5 1.5 0 0 1 8.5 4h1A1.5 1.5 0 0 1 11 5.5v13a1.5 1.5 0 0 1-1.5 1.5h-1A1.5 1.5 0 0 1 7 18.5v-13Zm6 0A1.5 1.5 0 0 1 14.5 4h1A1.5 1.5 0 0 1 17 5.5v13a1.5 1.5 0 0 1-1.5 1.5h-1a1.5 1.5 0 0 1-1.5-1.5v-13Z" />,
    stop: <path d="M6.5 6.5h11v11h-11z" />,
    archive: <><path d="M4 5h16v4H4z" /><path d="M5.5 9v10h13V9M9 13h6" /></>,
    arrow: <><path d="M7 17 17 7M8 7h9v9" /></>,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
    sparkle: <><path d="m12 2 1.6 6.4L20 10l-6.4 1.6L12 18l-1.6-6.4L4 10l6.4-1.6L12 2Z" /><path d="m19 15 .7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7L19 15Z" /></>,
    headphones: <><path d="M4 13v-2a8 8 0 0 1 16 0v2" /><path d="M4 12h3v7H6a2 2 0 0 1-2-2v-5Zm16 0h-3v7h1a2 2 0 0 0 2-2v-5Z" /></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">{shapes[name] ?? null}</svg>;
}

function formatDate(date, options = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) {
  return date ? new Date(`${date}T12:00:00`).toLocaleDateString('en-US', options) : '';
}

function SampleFlag({ isSample }) {
  return isSample ? <span className="sample-flag">Layout preview · sample copy</span> : null;
}

function SourceLinks({ sources = [] }) {
  if (!sources.length) return <span className="source-note">Sources pending</span>;
  return <div className="source-links" aria-label="Sources">{sources.map((source, index) => (
    <a key={`${source.url}-${index}`} href={source.url} target="_blank" rel="noreferrer"><span className="source-number">{index + 1}</span>{source.title}<Glyph name="arrow" size={13} /></a>
  ))}</div>;
}

function ArticleCard({ article, reader, onListen }) {
  const active = reader.articleId === article.id && ['speaking', 'paused'].includes(reader.status);
  const label = active ? (reader.status === 'paused' ? 'Resume story' : 'Pause story') : 'Listen to story';
  return <article className={`story-card${active ? ' is-reading' : ''}`}>
    <div className="story-card-topline"><span>{article.kicker || 'FIELD NOTES'}</span><span className="story-time">{article.readingMinutes || 2} min read</span></div>
    <h3>{article.title}</h3>{article.dek && <p className="story-dek">{article.dek}</p>}
    <p className="story-summary">{article.summary}</p>
    {article.whyItMatters && <div className="why-box"><span>WHY IT MATTERS</span><p>{article.whyItMatters}</p></div>}
    <div className="story-card-footer"><SourceLinks sources={article.sources} /><button className="listen-link" onClick={() => onListen(article)} aria-label={label}>
      <Glyph name={active && reader.status === 'speaking' ? 'pause' : 'play'} size={15} />{active ? (reader.status === 'paused' ? 'Resume' : 'Playing') : 'Listen'}
    </button></div>
  </article>;
}

function App() {
  const [manifest, setManifest] = useState(null);
  const [activeDate, setActiveDate] = useState('');
  const [edition, setEdition] = useState(null);
  const [loadState, setLoadState] = useState('loading');
  const [loadError, setLoadError] = useState('');
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [voiceMessage, setVoiceMessage] = useState('');
  const [reader, setReader] = useState({ mode: '', status: 'idle', articleId: '', articleTitle: '', index: 0, total: 0 });
  const playbackRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${DATA_BASE}manifest.json`)
      .then((response) => {
        if (!response.ok) throw new Error('The edition index could not be loaded.');
        return response.json();
      })
      .then((data) => {
        if (cancelled) return;
        const ordered = sortEditions(data.editions ?? []);
        if (!ordered.length) throw new Error('No editions have been added yet.');
        setManifest({ ...data, editions: ordered });
        setActiveDate(ordered[0].date);
      })
      .catch((error) => {
        if (!cancelled) { setLoadError(error.message || 'Could not load the archive.'); setLoadState('error'); }
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!manifest || !activeDate) return undefined;
    const selected = manifest.editions.find((item) => item.date === activeDate);
    if (!selected) return undefined;
    let cancelled = false;
    setEdition(null);
    setLoadError('');
    setLoadState('loading');
    fetch(`${DATA_BASE}${selected.file}`)
      .then((response) => {
        if (!response.ok) throw new Error(`The ${selected.label || selected.date} edition could not be loaded.`);
        return response.json();
      })
      .then((data) => { if (!cancelled) { setEdition(data); setLoadState('ready'); } })
      .catch((error) => {
        if (!cancelled) { setLoadError(error.message || 'Could not load this edition.'); setLoadState('error'); }
      });
    return () => { cancelled = true; };
  }, [manifest, activeDate]);

  useEffect(() => () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
  }, []);

  const editions = useMemo(() => sortEditions(manifest?.editions ?? []), [manifest]);
  const articles = useMemo(() => flattenArticles(edition), [edition]);
  const lead = articles.find((article) => article.id === edition?.leadArticleId) ?? articles[0];

  function startPlayback(items, mode) {
    if (!('speechSynthesis' in window) || typeof window.SpeechSynthesisUtterance !== 'function') {
      setVoiceMessage('Speech playback is not available in this browser. Try opening the newspaper in Chrome.');
      return;
    }
    if (!items.length) return;
    setVoiceMessage('');
    window.speechSynthesis.cancel();
    const session = { mode, items, index: 0, utterance: null };
    playbackRef.current = session;
    const speakAt = (index) => {
      if (playbackRef.current !== session) return;
      if (index >= items.length) { setReader((current) => ({ ...current, status: 'finished' })); return; }
      const article = items[index];
      session.index = index;
      setReader({ mode, status: 'speaking', articleId: article.id, articleTitle: article.title, index: index + 1, total: items.length });
      const utterance = new window.SpeechSynthesisUtterance(articleSpeechText(article));
      utterance.rate = 0.96;
      utterance.onend = () => { if (playbackRef.current === session) speakAt(index + 1); };
      utterance.onerror = (event) => {
        if (playbackRef.current !== session || ['canceled', 'interrupted'].includes(event.error)) return;
        setVoiceMessage('Playback stopped. Tap Listen to try again.');
        setReader((current) => ({ ...current, status: 'idle' }));
        playbackRef.current = null;
      };
      session.utterance = utterance;
      window.speechSynthesis.speak(utterance);
    };
    speakAt(0);
  }

  function togglePause() {
    if (!playbackRef.current) return;
    if (reader.status === 'paused') { window.speechSynthesis.resume(); setReader((current) => ({ ...current, status: 'speaking' })); }
    else if (reader.status === 'speaking') { window.speechSynthesis.pause(); setReader((current) => ({ ...current, status: 'paused' })); }
  }

  function stopPlayback() {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    playbackRef.current = null;
    setReader({ mode: '', status: 'idle', articleId: '', articleTitle: '', index: 0, total: 0 });
  }

  function toggleArticle(article) {
    const isCurrent = reader.articleId === article.id && ['speaking', 'paused'].includes(reader.status);
    if (isCurrent) togglePause(); else startPlayback([article], 'article');
  }

  function toggleEditionPlayback() {
    if (reader.mode === 'edition' && ['speaking', 'paused'].includes(reader.status)) togglePause();
    else startPlayback(articles, 'edition');
  }

  function selectEdition(date) {
    stopPlayback();
    setActiveDate(date);
    setArchiveOpen(false);
  }

  const editionIsSample = Boolean(edition?.isSample);
  const sectionContent = edition?.sections?.map((section) => ({
    ...section,
    articles: (section.articles ?? []).filter((article) => article.id !== lead?.id),
  })).filter((section) => section.articles.length) ?? [];

  if (loadState === 'loading' && !edition) {
    return <div className="loading-screen"><div className="brand-mark"><Glyph name="sparkle" size={24} /></div><p>Setting the paper on your desk…</p></div>;
  }
  if (loadState === 'error') {
    return <main className="error-screen"><div className="brand-mark"><Glyph name="sparkle" size={24} /></div><p className="eyebrow">THE ARCHIVE</p><h1>We couldn’t open this edition.</h1><p>{loadError}</p><button className="button button-primary" onClick={() => window.location.reload()}>Try again</button></main>;
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Daymark home"><span className="brand-mark"><Glyph name="sparkle" size={19} /></span><span className="brand-word">DAYMARK<span className="brand-dot">.</span><small>THE DAILY BRIEF</small></span></a>
        <div className="topbar-right"><span className="issue-date">{formatDate(edition?.date, { month: 'short', day: 'numeric', year: 'numeric' })}</span><button className="archive-button" onClick={() => setArchiveOpen(true)}><Glyph name="archive" size={17} /><span>Archive</span><span className="archive-count">{editions.length}</span></button></div>
      </header>

      <main id="top" className="page-wrap">
        <div className="edition-kicker"><span className="eyebrow"><span className="live-dot" /> YOUR EDITION</span><span className="edition-date">{formatDate(edition?.date)}</span><SampleFlag isSample={editionIsSample} /></div>
        {editionIsSample && <div className="sample-notice" role="note"><span className="sample-notice-icon"><Glyph name="sparkle" size={16} /></span><p><strong>Preview edition.</strong> This sample copy is only here to show the layout; it is not current reporting.</p></div>}

        {lead && <section className="opening-grid" aria-label="Edition introduction">
          <article className="lead-panel">
            <div className="lead-art" aria-hidden="true"><div className="art-sun" /><div className="art-ring art-ring-one" /><div className="art-ring art-ring-two" /><div className="art-card"><span>DAYMARK</span><i /><i /><i /></div><div className="art-spark">✳</div></div>
            <div className="lead-content">
              <div className="lead-label"><span>THE LEAD</span><span className="lead-label-line" /><span>{lead.sectionTitle}</span></div>
              <h1>{lead.title}</h1>{lead.dek && <p className="lead-dek">{lead.dek}</p>}<p className="lead-summary">{lead.summary}</p>
              <div className="lead-actions"><button className="button button-light" onClick={() => toggleArticle(lead)}><Glyph name={reader.articleId === lead.id && reader.status === 'speaking' ? 'pause' : 'play'} size={16} />{reader.articleId === lead.id && reader.status === 'paused' ? 'Resume story' : reader.articleId === lead.id && reader.status === 'speaking' ? 'Pause story' : 'Listen to lead'}</button><span className="lead-read-time">{lead.readingMinutes || 2} MIN READ</span></div>
            </div>
            <div className="lead-bottom"><span>01 / {String(articles.length).padStart(2, '0')}</span><span>Read the story, then follow the sources</span></div>
          </article>
          <aside className="edition-card">
            <div className="edition-card-top"><span className="eyebrow">A LITTLE CONTEXT</span><Glyph name="headphones" size={19} /></div>
            <div className="edition-count"><strong>{String(articles.length).padStart(2, '0')}</strong><span>stories selected<br />for your morning</span></div>
            <p className="edition-note">Two desks. One clear-eyed read. Every article links back to its sources.</p><div className="edition-rule" />
            <button className="button button-primary full-width" onClick={toggleEditionPlayback}><Glyph name={reader.mode === 'edition' && reader.status === 'speaking' ? 'pause' : reader.mode === 'edition' && reader.status === 'paused' ? 'play' : 'headphones'} size={17} />{reader.mode === 'edition' && reader.status === 'speaking' ? 'Pause the paper' : reader.mode === 'edition' && reader.status === 'paused' ? 'Resume the paper' : 'Listen to the paper'}</button>
            <span className="audio-caption">Use the voice on your device · no audio service required</span>{voiceMessage && <p className="voice-message" role="status">{voiceMessage}</p>}
          </aside>
        </section>}

        <div className="desk-heading"><div><span className="eyebrow">THE DAY, IN TWO DESKS</span><h2>What matters today</h2></div><span className="desk-date">{formatDate(edition?.date, { month: 'long', day: 'numeric' })}</span></div>
        <div className="coverage-layout"><div className="coverage-main">
          {sectionContent.map((section, index) => <section className="coverage-section" key={section.id}>
            <div className="section-heading"><div className={`section-marker marker-${index % 2}`}><span>{index === 0 ? 'A' : 'U'}</span></div><div><span className="eyebrow">{section.kicker || (index === 0 ? 'THE FRONTIER' : 'THE REPUBLIC')}</span><h2>{section.title}</h2></div><span className="section-total">{String(section.articles.length).padStart(2, '0')} STORIES</span></div>
            <div className="story-grid">{section.articles.map((article) => <ArticleCard key={article.id} article={{ ...article, sectionTitle: section.title }} reader={reader} onListen={toggleArticle} />)}</div>
          </section>)}
          {!sectionContent.length && <p className="empty-section">This edition is ready for its first stories.</p>}
        </div>
        <aside className="reading-note"><span className="eyebrow">OUR PROMISE</span><div className="promise-mark"><Glyph name="sparkle" size={20} /></div><h3>Curious, not breathless.</h3><p>We keep the important details, show the sources, and leave the spin at the door.</p><button className="archive-text-button" onClick={() => setArchiveOpen(true)}>Visit the archive <Glyph name="arrow" size={14} /></button></aside>
        </div>
        <footer className="site-footer"><span>DAYMARK<span className="brand-dot">.</span></span><span>Made to read. Built to cite.</span><button onClick={() => setArchiveOpen(true)}>Past editions <Glyph name="arrow" size={13} /></button></footer>
      </main>

      {reader.mode && <div className="audio-dock" role="region" aria-label="Audio player" aria-live="polite">
        <div className="dock-icon"><Glyph name="headphones" size={19} /></div>
        <div className="dock-copy"><span>{reader.status === 'paused' ? 'PAUSED' : reader.status === 'finished' ? (reader.mode === 'article' ? 'STORY COMPLETE' : 'EDITION COMPLETE') : reader.mode === 'edition' ? 'READING THE PAPER' : 'READING THIS STORY'}</span><strong>{reader.articleTitle || 'Daymark edition'}</strong><small>{reader.index} of {reader.total} stories{reader.mode === 'edition' ? ' · full paper' : ' · individual story'}</small></div>
        <div className="dock-progress"><span style={{ width: `${reader.total ? reader.index * 100 * Math.pow(reader.total, -1) : 0}%` }} /></div>
        {reader.status === 'finished'
          ? <button className="dock-control" onClick={() => startPlayback(playbackRef.current?.items ?? articles, playbackRef.current?.mode ?? 'edition')} aria-label="Replay"><Glyph name="play" size={17} /><span className="dock-control-label">Replay</span></button>
          : <button className="dock-control" onClick={togglePause} aria-label={reader.status === 'paused' ? 'Resume audio' : 'Pause audio'}><Glyph name={reader.status === 'paused' ? 'play' : 'pause'} size={18} /><span className="dock-control-label">{reader.status === 'paused' ? 'Resume' : 'Pause'}</span></button>}
        <button className="dock-stop" onClick={stopPlayback} aria-label="Stop audio"><Glyph name="stop" size={17} /></button>
      </div>}

      {archiveOpen && <div className="archive-overlay">
        <button className="archive-backdrop" aria-label="Close archive" onClick={() => setArchiveOpen(false)} />
        <aside className="archive-sheet" role="dialog" aria-modal="true" aria-labelledby="archive-title">
          <div className="archive-sheet-head"><div><span className="eyebrow">THE LIBRARY</span><h2 id="archive-title">Past editions</h2></div><button className="icon-button" onClick={() => setArchiveOpen(false)} aria-label="Close archive"><Glyph name="close" size={20} /></button></div>
          <p className="archive-intro">Every paper stays here, ready when you are.</p>
          <div className="archive-list">{editions.map((item) => <button key={item.date} className={`archive-item${activeDate === item.date ? ' is-selected' : ''}`} onClick={() => selectEdition(item.date)}>
            <span className="archive-item-date">{formatDate(item.date, { month: 'short', day: 'numeric', year: 'numeric' })}</span><strong>{item.title || 'Daily edition'}</strong><span className="archive-item-meta">{item.storyCount ?? '—'} stories{item.isSample ? ' · sample' : ''}</span><Glyph name="arrow" size={15} />
          </button>)}</div>
          <div className="archive-footnote"><Glyph name="archive" size={16} /><span>New editions are added as dated JSON files. Nothing in the archive is replaced by tomorrow’s paper.</span></div>
        </aside>
      </div>}
    </div>
  );
}

export default App;
