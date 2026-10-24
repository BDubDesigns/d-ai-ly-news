// A looping silent <audio> element is what gives the page an Android media
// session and audio focus. Chrome only grants full focus when the media is at
// least 5 seconds long, so default to a 6 second silent WAV.

export function buildSilentWav(seconds = 6, sampleRate = 8000) {
  const samples = Math.round(seconds * sampleRate);
  const buffer = new ArrayBuffer(44 + samples);
  const view = new DataView(buffer);
  const writeAscii = (offset, text) => {
    for (let i = 0; i < text.length; i += 1) view.setUint8(offset + i, text.charCodeAt(i));
  };

  writeAscii(0, 'RIFF');
  view.setUint32(4, 36 + samples, true);
  writeAscii(8, 'WAVE');
  writeAscii(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate, true);
  view.setUint16(32, 1, true);
  view.setUint16(34, 8, true);
  writeAscii(36, 'data');
  view.setUint32(40, samples, true);

  // 8-bit mono PCM silence is 128 (unsigned midpoint), not 0.
  new Uint8Array(buffer, 44).fill(128);
  return new Uint8Array(buffer);
}
