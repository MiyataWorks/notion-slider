const form = document.getElementById('config-form');
const track = document.getElementById('track');
const prevBtn = document.getElementById('prev');
const nextBtn = document.getElementById('next');

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
  const dbId = document.getElementById('dbId').value.trim();
  const limit = Number(document.getElementById('limit').value) || 10;
  if(!dbId){
    alert('Database ID を入力してください');
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
    if(!res.ok) throw new Error('failed');
    const data = await res.json();
    render(data.items || []);
  }catch(err){
    console.error(err);
    alert('取得に失敗しました');
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
