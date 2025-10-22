const form = document.getElementById('config-form');
const track = document.getElementById('track');
const prevBtn = document.getElementById('prev');
const nextBtn = document.getElementById('next');

function extractDatabaseId(value){
  const input = String(value || '').trim();
  // Try parsing as URL and extract 32-hex or UUID from path
  try{
    const u = new URL(input);
    const path = u.pathname || '';
    const m32 = path.match(/[0-9a-f]{32}/i);
    if(m32) return m32[0];
    const muuid = path.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    if(muuid) return muuid[0];
  }catch(_e){/* not a URL, fall through */}
  // Not a URL, return raw
  return input;
}

function normalizeDatabaseId(value){
  const raw = String(value || '').trim();
  if(!raw) return null;
  // If already UUID with hyphens
  if(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(raw)) return raw;
  // Strip non-hex and hyphenate if length is 32
  const hex = raw.toLowerCase().replace(/[^0-9a-f]/g, '');
  if(hex.length === 32){
    return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
  }
  return null;
}

function cardTemplate(item){
  const cover = item.coverUrl || '';
  const title = item.title || '(no title)';
  const url = item.url || '#';
  const subtitle = item.subtitle || '';
  return `
  <article class="card">
    ${cover ? `<img src="${cover}" alt="">` : ''}
    <div class="content">
      <div class="title"><a href="${url}" target="_blank" rel="noopener noreferrer">${title}</a></div>
      <div class="subtitle">${subtitle}</div>
    </div>
  </article>`
}

function render(items){
  track.innerHTML = items.map(cardTemplate).join('');
}

function scrollByCards(dir=1){
  const cardWidth = track.querySelector('.card')?.getBoundingClientRect().width || 280;
  track.scrollBy({ left: dir * (cardWidth + 12) * 1, behavior: 'smooth' });
}

prevBtn.addEventListener('click', ()=>scrollByCards(-1));
nextBtn.addEventListener('click', ()=>scrollByCards(1));

form.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const input = document.getElementById('dbId').value.trim();
  const extracted = extractDatabaseId(input);
  const dbId = normalizeDatabaseId(extracted);
  const limit = Number(document.getElementById('limit').value) || 10;
  if(!dbId){
    alert('Database ID の形式が正しくありません。NotionのURLまたはID(32桁/UUID)を入力してください。');
    return;
  }
  const btn = form.querySelector('button');
  btn.disabled = true; btn.textContent = 'Loading…';
  try{
    const qs = new URLSearchParams({ databaseId: dbId, limit: String(limit) });
    // pass-through extra query params from current URL (e.g., subtitleProp, urlProp, coverProp, filter, sorts, ttlMs)
    const current = new URLSearchParams(location.search);
    for (const [k, v] of current.entries()){
      if (k === 'databaseId' || k === 'limit') continue;
      if (!qs.has(k)) qs.set(k, v);
    }
    const res = await fetch(`/api/gallery?${qs}`);
    if(!res.ok){
      let detail = '';
      try{
        const text = await res.text();
        try{
          const j = JSON.parse(text);
          detail = j.error || j.message || text;
        }catch(_e){
          detail = text;
        }
      }catch(_e){ /* ignore */ }
      throw new Error(detail || 'failed');
    }
    const data = await res.json();
    render(data.items || []);
  }catch(err){
    console.error(err);
    alert(`取得に失敗しました: ${err?.message || err}`);
  }finally{
    btn.disabled = false; btn.textContent = 'Load';
  }
});

// Support loading by URL params for embedding convenience
(function initFromQuery(){
  const sp = new URLSearchParams(location.search);
  const dbId = sp.get('databaseId');
  const limit = sp.get('limit');
  if(dbId){
    document.getElementById('dbId').value = dbId;
    if(limit) document.getElementById('limit').value = limit;
    form.dispatchEvent(new Event('submit'));
  }
})();
