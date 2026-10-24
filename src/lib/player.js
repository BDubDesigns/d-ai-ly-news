import { chunkText } from './speech.js';
import { articleSpeechText } from './edition.js';

const EMPTY = { status: 'idle', mode: '', articleIndex: 0, total: 0, articleId: '', articleTitle: '' };

export function createPlayer(options) {
  const {
    speech,
    Utterance,
    keepAlive = { start() {}, stop() {} },
    schedule = (run) => setTimeout(run, 90),
    onChange = () => {},
    onArticle = () => {},
  } = options;

  let status = 'idle';
  let session = null;
  let pausedSession = null;

  function snapshot() {
    const current = session ?? pausedSession;
    if (!current) return { ...EMPTY, status };
    const article = current.items[current.articleIndex] ?? {};
    return {
      status,
      mode: current.mode,
      articleIndex: current.articleIndex + 1,
      total: current.items.length,
      articleId: article.id ?? '',
      articleTitle: article.title ?? '',
    };
  }

  function emit(extra = {}) {
    onChange({ ...snapshot(), ...extra });
  }

  function loadArticle(index) {
    const article = session.items[index];
    const chunks = chunkText(articleSpeechText(article));
    session.articleIndex = index;
    session.chunks = chunks.length ? chunks : [article.title || 'This story has no text to read.'];
    session.chunkIndex = 0;
    session.charOffset = 0;
    onArticle(article, session.mode);
  }

  function finish() {
    status = 'finished';
    const last = session;
    session = null;
    pausedSession = null;
    keepAlive.stop();
    if (last) {
      const article = last.items[last.articleIndex] ?? {};
      onChange({ ...EMPTY, status, mode: last.mode, total: last.items.length, articleId: article.id ?? '', articleTitle: article.title ?? '' });
    } else {
      onChange({ ...EMPTY, status });
    }
  }

  function speak() {
    if (!session) return;
    if (session.chunkIndex >= session.chunks.length) {
      if (session.articleIndex + 1 < session.items.length) {
        loadArticle(session.articleIndex + 1);
        emit();
        speak();
        return;
      }
      finish();
      return;
    }
    const chunk = session.chunks[session.chunkIndex];
    const text = chunk.slice(session.charOffset);
    if (!text.trim()) {
      session.chunkIndex += 1;
      session.charOffset = 0;
      speak();
      return;
    }
    const base = session.charOffset;
    const current = session;
    const utterance = new Utterance(text);
    utterance.onboundary = (event) => {
      if (session !== current) return;
      if (typeof event.charIndex === 'number') session.charOffset = base + event.charIndex;
    };
    utterance.onend = () => {
      if (session !== current) return;
      session.chunkIndex += 1;
      session.charOffset = 0;
      speak();
    };
    utterance.onerror = (event) => {
      if (session !== current) return;
      if (event && ['canceled', 'interrupted'].includes(event.error)) return;
      interrupt('The device voice stopped. Tap Resume to pick up from here.');
    };
    speech.speak(utterance);
  }

  function play(items, mode, startAt = 0) {
    if (!items || !items.length) return false;
    const start = Math.min(Math.max(startAt, 0), items.length - 1);
    speech.cancel();
    keepAlive.start();
    const next = { mode, items, articleIndex: start, chunks: [], chunkIndex: 0, charOffset: 0 };
    session = next;
    pausedSession = null;
    status = 'speaking';
    loadArticle(start);
    emit();
    schedule(speak);
    return true;
  }

  function pause() {
    if (status !== 'speaking' || !session) return false;
    return interrupt();
  }

  function interrupt(message) {
    if (!session) return false;
    session.position = {
      articleIndex: session.articleIndex,
      chunkIndex: session.chunkIndex,
      charOffset: session.charOffset,
    };
    pausedSession = session;
    session = null;
    speech.cancel();
    keepAlive.stop();
    status = 'paused';
    emit(message ? { message } : {});
    return true;
  }

  function resume() {
    if (status !== 'paused' || !pausedSession) return false;
    const next = pausedSession;
    const position = next.position ?? { articleIndex: next.articleIndex, chunkIndex: next.chunkIndex, charOffset: next.charOffset };
    pausedSession = null;
    next.articleIndex = position.articleIndex;
    next.chunkIndex = position.chunkIndex;
    next.charOffset = position.charOffset;
    session = next;
    speech.cancel();
    keepAlive.start();
    status = 'speaking';
    emit();
    schedule(speak);
    return true;
  }

  function toggle() {
    if (status === 'speaking') return pause();
    if (status === 'paused') return resume();
    return false;
  }

  function stop() {
    speech.cancel();
    keepAlive.stop();
    session = null;
    pausedSession = null;
    status = 'idle';
    onChange({ ...EMPTY });
  }

  function skip(delta) {
    const current = session ?? pausedSession;
    if (!current) return false;
    const target = current.articleIndex + delta;
    if (target < 0 || target >= current.items.length) return false;
    return play(current.items, current.mode, target);
  }

  return {
    play,
    pause,
    resume,
    toggle,
    stop,
    skip,
    interrupt,
    snapshot: () => snapshot(),
    getStatus: () => status,
  };
}
