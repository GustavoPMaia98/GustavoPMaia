/* ask-worker.js: runs the search model for "Ask my research" (ask.js) in a background
   thread, so loading and running it never freezes the page. The model (bge-small-en-v1.5,
   MIT licence) and transformers.js (Apache 2.0) are self-hosted in vendor/.
   Messages in:  { id, type: "embed", texts: [...], model, pooling, prefix }
   Messages out: { id, vectors: [Float32Array...] } or { id, error } */
let pipeP = null;
async function load(model) {
  if (pipeP) return pipeP;
  pipeP = (async () => {
    const base = new URL("./", self.location.href).href;
    const tf = await import(base + "vendor/transformers-3.8.1/transformers.min.js");
    tf.env.allowRemoteModels = false;
    tf.env.allowLocalModels = true;
    tf.env.localModelPath = base + "vendor/models/";
    tf.env.backends.onnx.wasm.wasmPaths = base + "vendor/transformers-3.8.1/";
    tf.env.backends.onnx.wasm.numThreads = 1;          // light on memory and CPU
    return tf.pipeline("feature-extraction", model, { dtype: "q8", device: "wasm" });
  })();
  pipeP.catch(() => { pipeP = null; });
  return pipeP;
}
self.onmessage = async e => {
  const { id, texts, model, pooling, prefix } = e.data || {};
  try {
    const ex = await load(model);
    const out = [];
    for (let i = 0; i < texts.length; i += 8) {        // small batches: low peak memory
      const r = await ex(texts.slice(i, i + 8).map(t => (prefix || "") + t), { pooling: pooling || "mean", normalize: true });
      const d = r.dims[1];
      for (let k = 0; k < r.dims[0]; k++) out.push(Float32Array.from(r.data.subarray(k * d, (k + 1) * d)));
    }
    self.postMessage({ id, vectors: out });
  } catch (err) {
    self.postMessage({ id, error: String(err && err.message || err) });
  }
};
