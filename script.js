const form = document.getElementById('predict-form');
const textInput = document.getElementById('text');
const subjectInput = document.getElementById('subject');
const senderInput = document.getElementById('sender');
const output = document.getElementById('output');
const statusEl = document.getElementById('status');
const testBackendBtn = document.getElementById('test-backend');

let lastResult = null;

function setStatus(msg, level = 'ok') {
  statusEl.textContent = msg;
  statusEl.className = 'status ' + (level === 'ok' ? 'ok' : level === 'warn' ? 'warn' : 'err');
}

function safeParseJson(res) {
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) return res.json().catch(() => null);
  return res.text().catch(() => null).then(t => {
    try { return JSON.parse(t); } catch (e) { return null; }
  });
}

function setOutput(data, metaText = '') {
  output.innerHTML = '';

  if (metaText) {
    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.textContent = metaText;
    output.appendChild(meta);
  }

  const label = data && data.label ? data.label : 'unknown';
  const badge = document.createElement('div');
  badge.className = 'badge ' + (label === 'spam' ? 'spam' : 'ham');
  badge.textContent = (label || 'unknown').toUpperCase();
  output.appendChild(badge);

  if (data && data.proba && typeof data.proba === 'object') {
    const probs = document.createElement('div');
    probs.className = 'probs';
    Object.keys(data.proba).sort().forEach(k => {
      const item = document.createElement('div');
      item.className = 'prob-item';
      const name = document.createElement('div');
      name.textContent = k;
      const valNum = Number(data.proba[k]);
      const val = document.createElement('div');
      val.textContent = Number.isFinite(valNum)
        ? (valNum * 100).toFixed(1) + '%'
        : String(data.proba[k]);
      item.appendChild(name);
      item.appendChild(val);
      probs.appendChild(item);
    });
    output.appendChild(probs);
  }

  const raw = document.createElement('pre');
  raw.style.marginTop = '8px';
  raw.style.whiteSpace = 'pre-wrap';
  raw.style.fontSize = '12px';
  raw.textContent = JSON.stringify(data || {}, null, 2);
  output.appendChild(raw);

  lastResult = data || null;
}

function localPredict(payload) {
  const text = (
    (payload.subject || '') +
    ' ' +
    (payload.sender || '') +
    ' ' +
    (payload.text || '')
  ).toLowerCase();

  const keywords = [
    'free', 'win', 'winner', 'prize', 'click', 'claim', 'urgent',
    'buy now', 'buy', 'cheap', 'cheap meds', 'prescription',
    'congrat', 'selected', 'limited time', 'offer',
    'http', 'bit.ly', 'visit'
  ];

  let score = 0;
  for (const k of keywords) {
    if (text.includes(k)) score += 1;
  }

  if (text.match(/https?:\/\//) || text.match(/www\./)) score += 2;

  const txt = payload.text || '';
  const digitCount = (txt.match(/\d/g) || []).length;
  const digitRatio = txt.length ? digitCount / txt.length : 0;
  if (digitRatio > 0.2) score += 1;

  const proba_spam = Math.min(0.99, Math.tanh(score / 3));
  const proba_ham = Math.max(0.01, 1 - proba_spam);

  return {
    label: proba_spam > 0.5 ? 'spam' : 'ham',
    proba: {
      spam: Number(proba_spam.toFixed(3)),
      ham: Number(proba_ham.toFixed(3))
    }
  };
}

async function tryPost(url, payload) {
  try {
    return await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (e) {
    return { ok: false, status: 0, _error: e };
  }
}

async function tryGet(url, payload) {
  try {
    const qp = new URLSearchParams(payload).toString();
    return await fetch(url + (qp ? ('?' + qp) : ''), { method: 'GET' });
  } catch (e) {
    return { ok: false, status: 0, _error: e };
  }
}

async function predictWithFallback(payload) {
  setStatus('Attempting POST /predict...', 'ok');
  try {
    let res = await tryPost('/predict', payload);

    if (!res || res.status === 405 || res.status === 0) {
      if (res && res.status === 405)
        setStatus('POST /predict returned 405 — trying GET /predict...', 'warn');
      else if (res && res.status === 0)
        setStatus('POST /predict failed (network) — trying GET /predict...', 'warn');
      else
        setStatus('POST /predict failed — trying GET /predict...', 'warn');

      try {
        res = await tryGet('/predict', payload);

        if (res && res.ok) {
          const data = await safeParseJson(res) || {};
          setStatus('GET /predict succeeded', 'ok');
          return { data, used: 'GET /predict' };
        }

        if (res && res.status === 405) {
          setStatus('GET /predict returned 405 — trying POST /api/predict...', 'warn');
          const res2 = await tryPost('/api/predict', payload);
          if (res2 && res2.ok) {
            const data = await safeParseJson(res2) || {};
            setStatus('POST /api/predict succeeded', 'ok');
            return { data, used: 'POST /api/predict' };
          }
          setStatus('All network attempts failed. Falling back to local heuristic.', 'err');
          return { data: localPredict(payload), used: 'local_fallback' };
        }

        if (res && !res.ok) {
          setStatus(
            'GET /predict failed with status ' + res.status + '. Falling back to local.',
            'warn'
          );
          return { data: localPredict(payload), used: 'local_fallback' };
        }
      } catch (e) {
        setStatus('GET attempt failed. Falling back to local.', 'err');
        return { data: localPredict(payload), used: 'local_fallback' };
      }
    }

    if (res && res.ok) {
      const data = await safeParseJson(res) || {};
      setStatus('POST /predict succeeded', 'ok');
      return { data, used: 'POST /predict' };
    }

    setStatus(
      'POST /predict failed with status ' + (res && res.status ? res.status : 'unknown') +
      '. Trying POST /api/predict...',
      'warn'
    );

    const r2 = await tryPost('/api/predict', payload);
    if (r2 && r2.ok) {
      const data = await safeParseJson(r2) || {};
      setStatus('POST /api/predict succeeded', 'ok');
      return { data, used: 'POST /api/predict' };
    }

    return { data: localPredict(payload), used: 'local_fallback' };
  } catch (err) {
    return { data: localPredict(payload), used: 'local_fallback' };
  }
}

form.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const payload = {
    subject: subjectInput.value || '',
    sender: senderInput.value || '',
    text: textInput.value || ''
  };
  output.innerHTML = '<div class="meta">Predicting…</div>';
  const out = await predictWithFallback(payload);
  const meta = 'Used: ' + (out.used || 'local_fallback') +
    ((out.used === 'local_fallback')
      ? ' (heuristic). Backend may be missing or reject POST.'
      : '');
  setOutput(out.data, meta);
});

testBackendBtn.addEventListener('click', async () => {
  setStatus('Testing backend endpoints...', 'ok');
  const sample = { subject: 'Test', sender: 'test@example.com', text: 'hello' };
  try {
    const p = await tryPost('/predict', sample);
    if (p && p.ok) {
      setStatus('POST /predict OK (status ' + p.status + ')', 'ok');
      const dd = await (safeParseJson(p).then(j => j ? JSON.stringify(j) : p.text()));
      alert('POST /predict returned: ' + dd);
      return;
    }

    if (p && p.status === 405) {
      setStatus('POST /predict returned 405 — server forbids POST to this route', 'warn');
    }

    const g = await tryGet('/predict', sample);
    if (g && g.ok) {
      setStatus('GET /predict OK (status ' + g.status + ')', 'ok');
      const dd = await (safeParseJson(g).then(j => j ? JSON.stringify(j) : g.text()));
      alert('GET /predict returned: ' + dd);
      return;
    }

    if (g && g.status === 405) {
      setStatus('GET /predict returned 405 as well', 'warn');
    }

    const p2 = await tryPost('/api/predict', sample);
    if (p2 && p2.ok) {
      setStatus('POST /api/predict OK', 'ok');
      const dd = await (safeParseJson(p2).then(j => j ? JSON.stringify(j) : p2.text()));
      alert('POST /api/predict returned: ' + dd);
      return;
    }

    setStatus('No backend endpoints responded OK. Using local fallback for predictions.', 'err');
  } catch (e) {
    setStatus('Network error testing backend', 'err');
    alert('Network error: ' + (e && e.message ? e.message : String(e)));
  }
});

document.getElementById('clear-btn').addEventListener('click', () => {
  textInput.value = '';
  subjectInput.value = '';
  senderInput.value = '';
  output.innerHTML = '<div class="meta">Cleared — enter text and click Predict.</div>';
  setStatus('Backend status unknown');
});

document.getElementById('demo-btn').addEventListener('click', () => {
  subjectInput.value = 'Claim your prize';
  senderInput.value = 'promo@scam.example';
  textInput.value = 'Congratulations! You have been selected to receive a free gift card. Click the link to claim: http://bit.ly/fake';
});

document.querySelectorAll('.chip').forEach(c =>
  c.addEventListener('click', () => {
    textInput.value = c.dataset.example;
  })
);

/* Note: original JS referenced copy-res and open-dev elements,
   but they are not present in the HTML you provided, so those
   listeners are omitted here to avoid errors. */

(async function checkOnLoad() {
  try {
    const r = await fetch('/predict', { method: 'OPTIONS' });
    if (r && r.ok) setStatus('Backend /predict exists (OPTIONS ok)', 'ok');
    else if (r && r.status === 400)
      setStatus('Backend reachable — OPTIONS returned 400 (server may not allow OPTIONS)', 'warn');
    else
      setStatus('/predict exists but OPTIONS returned ' +
        (r && r.status ? r.status : 'unknown'), 'warn');
  } catch (e) {
    setStatus('Unable to reach /predict on load', 'warn');
  }
})();
