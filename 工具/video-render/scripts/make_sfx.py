"""合成一套基础音效（无版权问题）：whoosh 嗖、pop 弹出、thud 盖章、tick 计数、ding 叮、riser 上扬、swoosh 翻页。"""
import numpy as np, wave, os
SR = 48000
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "public", "sfx")
os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(7)

def save(name, x):
    x = x / (np.max(np.abs(x)) + 1e-9) * 0.9
    st = np.stack([x, x], 1)
    with wave.open(f"{OUT}/{name}.wav", "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((st * 32767).astype(np.int16).tobytes())

def env(n, a, r):
    t = np.arange(n) / SR
    e = np.minimum(1, t / a) * np.exp(-np.maximum(0, t - a) / r)
    return e

def lowpass(x, k):
    # 简单滑动平均低通
    k = max(1, int(k)); c = np.convolve(x, np.ones(k) / k, mode="same"); return c

def sweep_noise(dur, k0, k1):
    n = int(SR * dur); noise = rng.standard_normal(n); out = np.zeros(n); seg = 480
    for i in range(0, n, seg):
        k = k0 + (k1 - k0) * i / n
        out[i:i + seg] = lowpass(noise[max(0, i - 200):i + seg + 200], k)[200 if i else 0:][:len(out[i:i + seg])]
    return out

n = int(SR * 0.45); t = np.arange(n) / SR
save("whoosh", sweep_noise(0.45, 40, 4) * np.sin(np.pi * t / 0.45) ** 2)
n = int(SR * 0.12); t = np.arange(n) / SR
f = 950 - 450 * t / 0.12
save("pop", np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.003, 0.03))
n = int(SR * 0.4); t = np.arange(n) / SR
save("thud", (np.sin(2 * np.pi * 70 * t) * env(n, 0.002, 0.12) + 0.5 * lowpass(rng.standard_normal(n), 6) * env(n, 0.001, 0.02)))
n = int(SR * 0.03); t = np.arange(n) / SR
save("tick", np.sin(2 * np.pi * 2400 * t) * env(n, 0.0005, 0.006))
n = int(SR * 1.2); t = np.arange(n) / SR
save("ding", (np.sin(2 * np.pi * 1318 * t) + 0.4 * np.sin(2 * np.pi * 2636 * t) + 0.2 * np.sin(2 * np.pi * 3954 * t)) * env(n, 0.002, 0.35))
n = int(SR * 1.0); t = np.arange(n) / SR
save("riser", sweep_noise(1.0, 30, 3) * (t / 1.0) ** 2 * 0.8 + 0.3 * np.sin(2 * np.pi * np.cumsum(200 + 600 * t) / SR) * (t / 1.0) ** 2)
n = int(SR * 0.3); t = np.arange(n) / SR
save("swoosh", sweep_noise(0.3, 10, 2) * np.sin(np.pi * t / 0.3))
print("sfx:", sorted(os.listdir(OUT)))
