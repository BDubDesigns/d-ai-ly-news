const sherpa = require('sherpa-onnx');
const fs = require('fs');
const path = require('path');

const modelDir = path.resolve('models/vits-piper-en_US-trump-high');
const espeakDir = path.resolve(process.env.ESPEAK_DIR || 'espeak-ng-data');
const outFile = path.resolve(process.env.OUT_FILE || 'samples/sample.wav');

try {
  const tts = sherpa.createOfflineTts({
    offlineTtsModelConfig: {
      offlineTtsVitsModelConfig: {
        model: path.join(modelDir, 'model.onnx'),
        tokens: path.join(modelDir, 'tokens.txt'),
        dataDir: espeakDir,
        noiseScale: 0.667,
        noiseScaleW: 0.8,
        lengthScale: 1.0,
      },
      numThreads: 4,
      debug: 0,
      provider: 'cpu',
    },
    maxNumSentences: 1,
  });
  const text = process.env.SAY_TEXT;
  const t0 = Date.now();
  const audio = tts.generate({ text, sid: 0, speed: 1.0 });
  const ms = Date.now() - t0;
  const pcm = audio.samples;
  const rate = audio.sampleRate;
  const n = pcm.length;
  const buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVE', 8);
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(rate, 24); buf.writeUInt32LE(rate * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i += 1) {
    const s = Math.max(-1, Math.min(1, pcm[i]));
    buf.writeInt16LE(Math.round(s * 32767), 44 + i * 2);
  }
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, buf);
  console.log(JSON.stringify({ ok: true, rate, seconds: Number((n / rate).toFixed(2)), renderMs: ms, kb: Math.round(buf.length / 1024) }));
} catch (err) {
  console.log(JSON.stringify({ ok: false, msg: String((err && err.message) || err).slice(0, 240) }));
}
