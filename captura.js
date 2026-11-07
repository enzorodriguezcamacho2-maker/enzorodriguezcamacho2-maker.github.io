// Procesador de audio: corta el micro en trozos de 1280 muestras (80 ms a 16 kHz) en escala de int16.
class CapturaJarvis extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buf = new Float32Array(1280);
    this.n = 0;
  }
  process(entradas) {
    const canal = entradas[0] && entradas[0][0];
    if (!canal) return true;
    for (let i = 0; i < canal.length; i++) {
      const s = canal[i] > 1 ? 1 : canal[i] < -1 ? -1 : canal[i];
      this.buf[this.n++] = s * 32767;
      if (this.n === 1280) {
        this.port.postMessage(this.buf.slice());
        this.n = 0;
      }
    }
    return true;
  }
}
registerProcessor("captura-jarvis", CapturaJarvis);
