import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowRight, ArrowUpRight, BarChart3, BookOpen, Braces, Check, CheckCircle2, ChevronDown, ChevronRight, CircleHelp, Clock3, Code2, Download, Flag, GitBranch, Layers3, ListFilter, Menu, MousePointer2, Pause, Play, Plus, RotateCcw, Search, Shuffle, SkipForward, Sparkles, StepBack, StepForward, Target, Timer, Workflow, X } from 'lucide-react';
import type { AlgorithmId, Category, Frame, MazeOptions } from './algorithms';
import { algorithms, buildTree, COLS, defaultArray, defaultSort, defaultTree, GOAL, initialMaze, makeMaze, mazeFrames, parseValues, ROWS, searchFrames, sortFrames, START, treeFrames } from './algorithms';

const categories: {id: Category; name: string; en: string; icon: typeof Search; description: string}[] = [
  {id:'array',name:'配列の探索',en:'ARRAY SEARCH',icon:Search,description:'並んだデータから、目的の値を探そう。'},
  {id:'maze',name:'迷路の探索',en:'PATHFINDING',icon:Workflow,description:'道を選び、行き止まりを越えて、ゴールへ。'},
  {id:'tree',name:'木の探索',en:'TREE SEARCH',icon:GitBranch,description:'枝をたどり、データの構造を見つけよう。'},
  {id:'sort',name:'整列アルゴリズム',en:'SORTING',icon:BarChart3,description:'ばらばらの値が、秩序に変わる瞬間。'},
];
const categoryDefault: Record<Category,AlgorithmId> = {array:'binary',maze:'bfs',tree:'bst',sort:'bubble'};
const presetSize = {array:15,tree:15,sort:12};
type Modal = 'help' | 'compare' | null;

function App() {
  const [category,setCategory] = useState<Category>('array');
  const [algorithmId,setAlgorithmId] = useState<AlgorithmId>('binary');
  const [data,setData] = useState<Record<'array'|'tree'|'sort',number[]>>({array:defaultArray,tree:defaultTree,sort:defaultSort});
  const [grid,setGrid] = useState(initialMaze);
  const [heuristicWeight,setHeuristicWeight] = useState(2), [maxDepth,setMaxDepth] = useState(0);
  const mazeOptions = useMemo<MazeOptions>(()=>({heuristicWeight,maxDepth:maxDepth||undefined}),[heuristicWeight,maxDepth]);
  const [start,setStart] = useState(START), [goal,setGoal] = useState(GOAL);
  const [target,setTarget] = useState(63), [targetInput,setTargetInput] = useState('63');
  const [raw,setRaw] = useState(defaultArray.join(', ')), [error,setError] = useState('');
  const [step,setStep] = useState(0), [playing,setPlaying] = useState(false), [speed,setSpeed] = useState(1);
  const [view,setView] = useState<'boxes'|'bars'>('boxes');
  const [codeTab,setCodeTab] = useState<'code'|'about'>('code');
  const [traceTab,setTraceTab] = useState<'table'|'chart'>('table');
  const [modal,setModal] = useState<Modal>(null), [mobileMenu,setMobileMenu] = useState(false);
  const [paint,setPaint] = useState<'wall'|'erase'|'weight'|'start'|'goal'>('wall');
  const [toast,setToast] = useState('');
  const [completed,setCompleted] = useState<AlgorithmId[]>(() => { try { const saved:unknown=JSON.parse(localStorage.getItem('tansaku-completed') || '[]');return Array.isArray(saved)?[...new Set(saved.filter((id):id is AlgorithmId=>algorithms.some(a=>a.id===id)))]:[]; } catch { return []; } });
  const modalContainer = useRef<HTMLElement>(null);
  const dragging = useRef(false), dragValue = useRef(1), currentTrace = useRef<HTMLTableRowElement>(null);
  const algorithm = algorithms.find(a=>a.id===algorithmId)!;
  const categoryInfo = categories.find(c=>c.id===category)!;
  const CategoryIcon = categoryInfo.icon;
  const values = category==='maze' ? grid : data[category];
  const frames = useMemo(() => category==='maze' ? mazeFrames(algorithmId,grid,start,goal,ROWS,COLS,mazeOptions) : category==='tree' ? treeFrames(algorithmId,data.tree,target) : category==='sort' ? sortFrames(algorithmId,data.sort) : searchFrames(algorithmId,data.array,target), [algorithmId,category,data,grid,start,goal,target,mazeOptions]);
  const safeStep = Math.min(step,frames.length-1), frame = frames[safeStep];
  const ended = safeStep===frames.length-1;
  const reset = useCallback(() => { setPlaying(false); setStep(0); },[]);

  useEffect(() => { if (!playing) return; const timer = window.setInterval(()=>setStep(s=>Math.min(s+1,frames.length-1)),650/speed); return ()=>window.clearInterval(timer); },[playing,speed,frames.length]);
  useEffect(() => { if(ended) { setPlaying(false); if(frame.result!=='limited') setCompleted(prev=>prev.includes(algorithmId)?prev:[...prev,algorithmId]); } },[ended,algorithmId,frame.result]);
  useEffect(() => { try { localStorage.setItem('tansaku-completed',JSON.stringify(completed)); } catch { /* Storage can be disabled; the visualizer remains usable. */ } },[completed]);
  useEffect(() => { const row=currentTrace.current,container=row?.closest('.trace-scroll');if(row&&container){const top=row.offsetTop;if(top<container.scrollTop+35)container.scrollTop=Math.max(0,top-35);else if(top+row.offsetHeight>container.scrollTop+container.clientHeight)container.scrollTop=top+row.offsetHeight-container.clientHeight;} },[safeStep]);
  useEffect(() => { const stop=()=>{dragging.current=false;}; window.addEventListener('pointerup',stop); window.addEventListener('blur',stop); return ()=>{window.removeEventListener('pointerup',stop);window.removeEventListener('blur',stop);}; },[]);
  useEffect(() => { if(!toast) return; const timer=window.setTimeout(()=>setToast(''),2600);return ()=>window.clearTimeout(timer); },[toast]);
  useEffect(() => {
    if(!modal)return;
    const previous=document.activeElement as HTMLElement|null,overflow=document.body.style.overflow;
    document.body.style.overflow='hidden';modalContainer.current?.querySelector<HTMLButtonElement>('button')?.focus();
    const onKey=(event:KeyboardEvent)=>{
      if(event.key==='Escape')setModal(null);
      if(event.key!=='Tab')return;
      const controls=modalContainer.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input, select, [tabindex="0"]');
      if(!controls?.length)return;
      const first=controls[0],last=controls[controls.length-1];
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
    };
    document.addEventListener('keydown',onKey);return ()=>{document.body.style.overflow=overflow;document.removeEventListener('keydown',onKey);previous?.focus();};
  },[modal]);

  const togglePlay = useCallback(() => { if(ended) setStep(0);setPlaying(p=>!p); },[ended]);
  useEffect(() => {
    const keydown=(e:KeyboardEvent)=>{
      const el=e.target as HTMLElement;
      if(['INPUT','SELECT','TEXTAREA','BUTTON'].includes(el.tagName)||el.isContentEditable||modal) return;
      if(e.code==='Space') { e.preventDefault(); togglePlay(); }
      if(e.code==='ArrowRight') { e.preventDefault();setPlaying(false);setStep(s=>Math.min(s+1,frames.length-1)); }
      if(e.code==='ArrowLeft') { e.preventDefault();setPlaying(false);setStep(s=>Math.max(s-1,0)); }
      if(e.key.toLowerCase()==='r') reset();
    };
    window.addEventListener('keydown',keydown); return ()=>window.removeEventListener('keydown',keydown);
  },[togglePlay,frames.length,reset,modal]);

  function changeCategory(next: Category) {
    reset();setCategory(next);setAlgorithmId(categoryDefault[next]);setError('');setMobileMenu(false);
    if(next!=='maze') setRaw(data[next].join(', '));
    setView(next==='sort'?'bars':'boxes');
  }
  function changeAlgorithm(id:AlgorithmId) {
    reset();setAlgorithmId(id);
    if(category==='array'&&id!=='linear') {
      const sorted=[...data.array].sort((a,b)=>a-b);
      if(sorted.some((v,i)=>v!==data.array[i])) {setData(prev=>({...prev,array:sorted}));setRaw(sorted.join(', '));setToast('この探索の前提に合わせて、配列を昇順に整列しました。');}
    }
  }
  function updateData() {
    try {
      let numbers=parseValues(raw,category==='tree'?31:32);
      if(category==='tree') numbers=[...new Set(numbers)];
      if(category==='array'&&algorithmId!=='linear') {const sorted=[...numbers].sort((a,b)=>a-b);if(numbers.some((v,i)=>v!==sorted[i])) setToast('入力値を昇順に整列して適用しました。');numbers=sorted;}
      if(category!=='maze') setData(prev=>({...prev,[category]:numbers}));
      setRaw(numbers.join(', '));setError('');reset();
    } catch(e) { setError((e as Error).message); }
  }
  function updateTarget(next: string) {
    setTargetInput(next);
    if(next.trim()!==''&&Number.isInteger(Number(next))&&Math.abs(Number(next))<=999) {setTarget(Number(next));reset();}
  }
  function randomize() {
    reset();setError('');
    if(category==='maze') {setGrid(makeMaze());setStart(START);setGoal(GOAL);return;}
    let next=Array.from({length:presetSize[category]},()=>Math.floor(Math.random()*96)+3);
    if(category==='array'&&algorithmId!=='linear') next.sort((a,b)=>a-b);
    if(category==='tree') {const sorted=[...new Set(next)].sort((a,b)=>a-b);next=[];const balance=(a:number[])=>{if(!a.length)return;const m=Math.floor(a.length/2);next.push(a[m]);balance(a.slice(0,m));balance(a.slice(m+1));};balance(sorted);}
    setData(prev=>({...prev,[category]:next}));setRaw(next.join(', '));
    if(category!=='sort') {const t=next[Math.floor(Math.random()*next.length)];setTarget(t);setTargetInput(String(t));}
  }
  function pickTarget(value:number) {setTarget(value);setTargetInput(String(value));reset();}
  function seek(value:number) {setPlaying(false);setStep(value);}
  function editCell(i:number,first=false) {
    if(!first&&!dragging.current) return;
    if(paint==='start'||paint==='goal') {
      if(!first||i===(paint==='start'?goal:start)) return;
      reset();if(paint==='start')setStart(i);else setGoal(i);setGrid(prev=>prev.map((v,j)=>i===j?0:v));return;
    }
    if(i===start||i===goal)return;
    if(first) {dragging.current=true;dragValue.current=paint==='erase'?0:paint==='weight'?5:grid[i]===1?0:1;}
    reset();setGrid(prev=>prev[i]===dragValue.current?prev:prev.map((v,j)=>i===j?dragValue.current:v));
  }
  function downloadTrace() {
    const rows=[['ステップ','現在位置','値','left','mid','right','深さ','深さ上限','g（実コスト）','h（予測）','f（評価値）','比較・訪問回数','交換回数','移動コスト','説明'],...frames.map((f,i)=>[i,f.active.join(' / '),f.active.map(n=>category==='maze'?`(${Math.floor(n/COLS)},${n%COLS})`:f.array[n]).join(' / '),f.left??'',f.mid??'',f.right??'',f.depth??'',f.depthLimit??'',f.g??'',f.h??'',f.f??'',f.comparisons,f.swaps,f.cost??'',f.message])];
    const csv='\uFEFF'+rows.map(row=>row.map(v=>`"${String(v).replaceAll('"','""')}"`).join(',')).join('\r\n');
    const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'}));const a=document.createElement('a');a.href=url;a.download=`tansaku-${algorithmId}-trace.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setToast('全ステップのトレースを CSV で書き出しました。');
  }

  return <div className="app-shell">
    {mobileMenu&&<div className="sidebar-scrim" onClick={()=>setMobileMenu(false)} />}
    <aside className={`sidebar ${mobileMenu?'open':''}`}>
      <a className="brand" href="#" onClick={e=>{e.preventDefault();changeCategory('array');}} aria-label="探索ラボ ホーム"><span className="brand-mark"><Search size={23}/></span><div>探索ラボ<span>TANSAKU LAB</span></div><span className="version">β</span></a>
      <div className="sidebar-label">ワークスペース</div>
      <nav aria-label="実験室の選択">{categories.map(c=><button key={c.id} className={`nav-item ${category===c.id?'selected':''}`} onClick={()=>changeCategory(c.id)} aria-current={category===c.id?'page':undefined}><c.icon size={18}/><span>{c.name}</span><span className="nav-count">{String(algorithms.filter(a=>a.category===c.id).length).padStart(2,'0')}</span></button>)}</nav>
      <div className="sidebar-separator"/>
      <div className="sidebar-label">学習ツール</div>
      <button className="nav-item" onClick={()=>setModal('compare')}><Layers3 size={18}/><span>アルゴリズム比較</span><ArrowUpRight size={14}/></button>
      <button className="nav-item" onClick={()=>setModal('help')}><BookOpen size={18}/><span>使い方ガイド</span></button>
      <div className="learning-card"><span className="learning-icon"><Sparkles size={18}/></span><strong>小さな一歩が、理解になる。</strong><p>動きを見て、予想して、試して。<br/>自分のペースで学びましょう。</p><div className="learning-progress"><span style={{width:`${completed.length/algorithms.length*100}%`}}/></div><small>体験したアルゴリズム <b>{completed.length} / {algorithms.length}</b></small></div>
      <div className="sidebar-bottom"><span className="online-dot"/>ブラウザで、すべて完結。<button onClick={()=>setModal('help')} aria-label="ヘルプ"><CircleHelp size={17}/></button></div>
    </aside>
    <div className="main-shell">
      <header className="topbar"><div className="breadcrumbs"><button className="mobile-menu icon-button" onClick={()=>setMobileMenu(v=>!v)} aria-label="メニューを開く"><Menu size={20}/></button><span>ワークスペース</span><ChevronRight size={13}/><strong>{categoryInfo.name}</strong></div><div className="topbar-right"><span className="local-badge"><i/>ブラウザー実行</span><button className="guide-button" onClick={()=>setModal('help')}><BookOpen size={15}/>使い方ガイド<ArrowUpRight size={13}/></button></div></header>
      <main>
        <section className="intro"><div><div className="eyebrow"><span/>LEARN BY EXPLORING</div><h1>{category==='sort'?'整列を、':category==='tree'?'構造を、':category==='maze'?'道すじを、':'探索を、'}<span>ひと目で。</span></h1><p>アルゴリズムの「なぜ？」を、動かして理解しよう。</p></div><div className="intro-note"><span className="note-icon"><MousePointer2 size={19}/></span><div><strong>見て、触れて、理解する。</strong><p>{category==='maze'?'マスをなぞって、自分だけの迷路を。':'データも目標も、自由に変えてみよう。'}</p></div><span className="note-spark">✳</span></div></section>
        <div className="category-tabs" role="tablist" aria-label="カテゴリー">{categories.map(c=><button key={c.id} role="tab" aria-selected={category===c.id} className={category===c.id?'active':''} onClick={()=>changeCategory(c.id)}><c.icon size={17}/>{c.name}{category===c.id&&<span className="tab-dot"/>}</button>)}</div>

        <section className="setup-card card" aria-label="アルゴリズムとデータの設定">
          <div className="setup-top"><div className="algorithm-select-wrap"><div className="algorithm-icon"><CategoryIcon size={22}/></div><div><label htmlFor="algorithm">アルゴリズム</label><div className="algorithm-select"><select id="algorithm" value={algorithmId} onChange={e=>changeAlgorithm(e.target.value as AlgorithmId)}>{algorithms.filter(a=>a.category===category).map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select><ChevronDown size={16}/></div></div><span className="english-name">{algorithm.en}</span></div><div className="complexity"><span><Clock3 size={13}/>最悪時間 <b>{algorithm.time}</b></span><span><Layers3 size={13}/>空間 <b>{algorithm.space}</b></span></div></div>
          <div className="setup-description"><p>{algorithm.description}</p><span><CheckCircle2 size={13}/>{algorithm.condition}</span></div>
          {category!=='maze'?<div className="data-controls"><div className="data-input"><label htmlFor="array-input">{category==='tree'?'挿入する値（入力順）':'配列のデータ'}<span>最大 {category==='tree'?'31':'32'} 個</span></label><div className="input-action"><input id="array-input" value={raw} onChange={e=>setRaw(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')updateData();}} aria-invalid={!!error} aria-describedby={error?'data-error':undefined}/><button onClick={updateData}>適用<Check size={13}/></button></div></div>{category!=='sort'&&<div className="target-input"><label htmlFor="target-input"><Target size={13}/>探索する値</label><input id="target-input" type="number" min="-999" max="999" step="1" value={targetInput} onChange={e=>updateTarget(e.target.value)} onBlur={()=>setTargetInput(String(target))}/></div>}<button className="secondary-button randomize" onClick={randomize}><Shuffle size={15}/>ランダム生成</button></div>:<div className="maze-tools"><div className="paint-buttons" aria-label="迷路の編集ツール">{([{id:'wall',name:'壁を描く',icon:Plus},{id:'erase',name:'消しゴム',icon:X},{id:'weight',name:'重み 5',icon:Layers3},{id:'start',name:'スタート',icon:Play},{id:'goal',name:'ゴール',icon:Flag}] as const).map(tool=><button className={paint===tool.id?'selected':''} aria-pressed={paint===tool.id} key={tool.id} onClick={()=>setPaint(tool.id)}><tool.icon size={13}/>{tool.name}</button>)}</div><button className="secondary-button" onClick={()=>{reset();setGrid(Array(ROWS*COLS).fill(0));setStart(START);setGoal(GOAL);}}>壁をクリア</button><button className="secondary-button" onClick={randomize}><Shuffle size={14}/>迷路を生成</button></div>}
          {category==='maze'&&<MazeSettings algorithmId={algorithmId} heuristicWeight={heuristicWeight} maxDepth={maxDepth} onWeight={n=>{reset();setHeuristicWeight(n);}} onDepth={n=>{reset();setMaxDepth(n);}}/>}
          {error&&<p className="input-error" id="data-error" role="alert">{error}</p>}
        </section>

        <div className="workspace-grid">
          <section className="visualizer-card card" aria-label="アルゴリズムの可視化">
            <div className="panel-heading"><div className="panel-title"><span className="tiny-icon"><CategoryIcon size={16}/></span><h2>{categoryInfo.name}</h2><span className="muted">{category==='maze'?`${COLS} × ${ROWS}`:`${category==='tree'?buildTree(values).length:values.length} ${category==='tree'?'ノード':'要素'}`}</span></div>{(category==='array'||category==='sort')?<div className="segmented"><button className={view==='boxes'?'selected':''} onClick={()=>setView('boxes')} aria-label="ボックス表示" title="ボックス表示"><Braces size={15}/></button><button className={view==='bars'?'selected':''} onClick={()=>setView('bars')} aria-label="棒グラフ表示" title="棒グラフ表示"><BarChart3 size={15}/></button></div>:<span className="canvas-hint">{category==='maze'?'クリック・ドラッグで編集':'ノードをクリックして目標に設定'}</span>}</div>
            <div className="legend"><span><i className="legend-range"/>{category==='maze'?'探索待ち':category==='tree'?'未訪問':'探索範囲'}</span><span><i className="legend-current"/>{category==='sort'?'比較中':'現在の位置'}</span><span><i className="legend-visited"/>{category==='sort'?'未確定':'確認済み'}</span><span><i className="legend-found"/>{category==='maze'?'経路':category==='sort'?'整列完了':'発見'}</span></div>
            {category==='maze'&&<MazeEvaluation algorithmId={algorithmId} frame={frame} heuristicWeight={heuristicWeight}/>}
            {category==='maze'?<div className="maze-wrap"><div className="maze-grid" style={{gridTemplateColumns:`repeat(${COLS},1fr)`}} onPointerLeave={()=>{dragging.current=false;}}>{grid.map((cell,i)=><button key={i} className={`maze-cell ${cell===1?'wall':cell===5?'weighted':''} ${frame.visited.includes(i)?'visited':''} ${frame.frontier?.includes(i)?'frontier':''} ${frame.trail?.includes(i)?'trail':''} ${frame.path?.includes(i)?'path':''} ${frame.active.includes(i)?'current':''} ${i===start?'start':''} ${i===goal?'goal':''}`} aria-label={`マス ${Math.floor(i/COLS)}, ${i%COLS}：${i===start?'スタート':i===goal?'ゴール':cell===1?'壁':cell===5?'重み5':'通路'}`} onPointerDown={e=>{e.preventDefault();editCell(i,true);}} onPointerEnter={()=>editCell(i)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();editCell(i,true);dragging.current=false;}}}>{i===start?<Play size={12} fill="currentColor"/>:i===goal?<Flag size={13}/>:cell===5?'5':null}</button>)}</div></div>:category==='tree'?<TreeDiagram values={values} frame={frame} onPick={pickTarget}/>:<ArrayDiagram frame={frame} target={target} view={view} category={category} onPick={pickTarget}/>}
            <div className={`explanation ${frame.result?'result-'+frame.result:''}`} aria-live="polite"><span className="explanation-icon">{frame.result==='found'||frame.result==='complete'?<CheckCircle2 size={18}/>:(frame.result==='missing'||frame.result==='limited')?<CircleHelp size={18}/>:<MousePointer2 size={18}/>}</span><div><strong>{frame.result==='found'?'見つかりました！':frame.result==='complete'?'整列が完了しました':frame.result==='missing'?'探索が終了しました':frame.result==='limited'?'探索の上限に達しました':safeStep===0?'準備完了':`STEP ${String(safeStep).padStart(2,'0')} — ${category==='maze'?'マスを訪問':category==='sort'?'比較・交換':'値を比較'}`}</strong><p>{frame.message}</p></div></div>
            <div className="playback"><div className="playback-top"><div className="transport"><button className="icon-button" onClick={reset} title="リセット (R)" aria-label="リセット"><RotateCcw size={17}/></button><span className="control-divider"/><button className="icon-button" disabled={safeStep===0} onClick={()=>seek(Math.max(0,safeStep-1))} aria-label="1ステップ戻る" title="1ステップ戻る (←)"><StepBack size={19}/></button><button className="play-button" onClick={togglePlay} aria-label={playing?'一時停止':'再生'}>{playing?<Pause size={15} fill="currentColor"/>:<Play size={15} fill="currentColor"/>}{playing?'一時停止':ended?'もう一度':'再生'}</button><button className="icon-button" disabled={ended} onClick={()=>seek(Math.min(frames.length-1,safeStep+1))} aria-label="1ステップ進む" title="1ステップ進む (→)"><StepForward size={19}/></button><button className="icon-button" disabled={ended} onClick={()=>seek(frames.length-1)} aria-label="最後まで進む" title="最後まで進む"><SkipForward size={17}/></button></div><div className="speed-control"><Timer size={14}/><label htmlFor="speed">再生速度</label><select id="speed" value={speed} onChange={e=>setSpeed(Number(e.target.value))}><option value="0.25">0.25×</option><option value="0.5">0.5×</option><option value="1">1×</option><option value="2">2×</option><option value="4">4×</option></select></div></div><div className="timeline"><input type="range" aria-label="実行ステップ" min="0" max={frames.length-1} value={safeStep} onChange={e=>seek(Number(e.target.value))} style={{'--progress':`${safeStep/(frames.length-1)*100}%`} as React.CSSProperties}/><span><b>{String(safeStep).padStart(2,'0')}</b> / {String(frames.length-1).padStart(2,'0')} ステップ</span></div></div>
          </section>
          <section className="code-card card"><div className="code-tabs"><button className={codeTab==='code'?'active':''} onClick={()=>setCodeTab('code')}><Code2 size={16}/>擬似コード</button><button className={codeTab==='about'?'active':''} onClick={()=>setCodeTab('about')}><BookOpen size={15}/>仕組み</button><span>Python</span></div>{codeTab==='code'?<div className="code-content"><div className="code-filename"><i/> {algorithmId.replaceAll('-','_')}_search.py <span>学習用</span></div><div className="code-lines">{algorithm.code.map((line,i)=><div key={i} className={`code-line ${frame.line===i?'highlighted':''}`}><span className="line-indicator">{frame.line===i?'›':''}</span><span className="line-number">{i+1}</span><code>{colorCode(line)}</code></div>)}</div><div className="code-footnote"><span className="code-dot"/>現在のステップに対応する行を表示</div></div>:<div className="about-content"><span className="tag">HOW IT WORKS</span><h3>{algorithm.name}の仕組み</h3><p>{algorithm.description}</p><ul>{algorithm.points.map((point,i)=><li key={point}><span>{i+1}</span>{point}</li>)}</ul><div className="about-complexity"><Clock3 size={15}/>最悪時間 <b>{algorithm.time}</b><Layers3 size={15}/>空間 <b>{algorithm.space}</b></div></div>}<div className="code-tip"><span><Sparkles size={15}/></span><p>{category==='array'?'探索する値を変えると、比較する場所も変わります。配列の値をクリックして試してみましょう。':category==='maze'?'同じ迷路で BFS と DFS を切り替えて、訪問する順番と経路の違いを観察しましょう。':category==='tree'?'挿入順を昇順にしてみると、木が一直線に。木の高さと探索回数の関係を発見できます。':'ほぼ整列された配列では、どの方法が有利でしょう？ データを変えて比較してみましょう。'}</p></div></section>
        </div>

        <div className="stats-row"><Stat icon={category==='maze'?Workflow:Search} label={category==='maze'?'累積訪問回数':'比較回数'} value={frame.comparisons} unit="回" detail={category==='maze'?'再訪問も1回として計算':'値を確認した回数'}/><Stat icon={category==='sort'?Shuffle:Target} label={category==='sort'?'交換回数':category==='maze'?'経路の長さ':'探索する値'} value={category==='sort'?frame.swaps:category==='maze'?(frame.path?frame.path.length-1:'—'):target} unit={category==='sort'?'回':category==='maze'?'歩':''} detail={category==='maze'?(frame.cost!==undefined?`移動コスト：${frame.cost}`:'ゴール到達時に表示'):category==='sort'?'要素を入れ替えた回数':'目標のデータ'}/><Stat icon={Layers3} label={category==='maze'?(algorithmId==='iddfs'?'深さ / 上限':'探索待ち'):category==='tree'?'木の高さ':category==='sort'?'要素数':'残りの探索範囲'} value={category==='maze'?(algorithmId==='iddfs'?`${frame.depth??'—'} / ${frame.depthLimit??0}`:(frame.frontier?.length??0)):category==='tree'?Math.max(0,...buildTree(values).map(n=>n.depth))+1:category==='sort'?values.length:frame.result==='missing'?0:frame.result==='found'?1:frame.left!==undefined&&frame.right!==undefined?frame.right-frame.left+1:Math.max(0,values.length-frame.visited.length)} unit={category==='maze'?(algorithmId==='iddfs'?'':'マス'):category==='tree'?'段':'個'} detail={category==='tree'?'根を1段目として計算':category==='sort'?'昇順に並べ替え':'ステップごとに変化'}/><Stat icon={CheckCircle2} label="実行ステータス" value={frame.result==='found'?'発見':frame.result==='complete'?'完了':frame.result==='missing'?'未発見':frame.result==='limited'?'上限到達':playing?'実行中':safeStep?'一時停止':'待機中'} status detail={frame.result?'別のデータでも試してみよう':playing?'アルゴリズムを実行しています':'自分のペースで進めましょう'}/></div>

        <section className="trace-card card"><div className="panel-heading"><div className="panel-title"><span className="tiny-icon"><ListFilter size={17}/></span><h2>トレース</h2><span className="muted">実行の足あと</span></div><div className="trace-actions"><div className="trace-toggle"><button className={traceTab==='table'?'active':''} onClick={()=>setTraceTab('table')}>トレース表</button><button className={traceTab==='chart'?'active':''} onClick={()=>setTraceTab('chart')}>推移チャート</button></div><button className="secondary-button export-button" onClick={downloadTrace}><Download size={14}/>CSV</button></div></div>{traceTab==='table'?<div className="trace-scroll"><table><thead><tr><th>ステップ</th><th>{category==='maze'?'現在のマス':'現在の位置'}</th><th>{category==='maze'?'コスト':'値'}</th>{category==='array'&&<><th>left</th><th>mid / i</th><th>right</th></>}<th>{category==='maze'?'累積訪問数':'比較数'}</th>{category==='maze'&&<><th>深さ / 上限</th><th>g</th><th>h</th><th>f</th></>}<th>動作・判定</th></tr></thead><tbody>{frames.slice(Math.max(0,safeStep-199),safeStep+1).map((f,offset)=>{const i=Math.max(0,safeStep-199)+offset;return <tr key={i} ref={i===safeStep?currentTrace:undefined} className={`${i===safeStep?'current-row':''} ${f.result==='found'||f.result==='complete'?'success-row':''}`} onClick={()=>seek(i)} tabIndex={0} onKeyDown={e=>{if(e.key==='Enter')seek(i);}} aria-label={`ステップ ${i} に移動`}><td><span className="step-cell">{i===safeStep?<ArrowRight size={12}/>:<span/>}{String(i).padStart(2,'0')}</span></td><td>{f.active.length?f.active.map(n=>category==='maze'?`(${Math.floor(n/COLS)}, ${n%COLS})`:`${category==='tree'?'ノード':'a'}[${n}]`).join(', '):'—'}</td><td className="trace-value">{category==='maze'?(f.cost??'—'):f.active.length?f.active.map(n=>f.array[n]).join(', '):'—'}</td>{category==='array'&&<><td>{f.left??'—'}</td><td>{f.mid??'—'}</td><td>{f.right??'—'}</td></>}<td>{f.comparisons}</td>{category==='maze'&&<><td>{f.depth!==undefined?`${f.depth} / ${f.depthLimit}`:'—'}</td><td>{f.g??'—'}</td><td>{f.h??'—'}</td><td>{f.f??'—'}</td></>}<td className="trace-message">{i===0?'初期状態':f.message}</td></tr>;})}</tbody></table></div>:<TraceChart frames={frames.slice(0,safeStep+1)} category={category} onSeek={seek}/>}<div className="trace-footer"><span><i/>現在までの直近200ステップを表示</span><span>{safeStep+1} 行 <span className="footer-divider">|</span> 行をクリックして、その時点へ</span></div></section>
        <div className="bottom-note"><span><Sparkles size={14}/>試してみよう</span><p>{category==='array'?'存在しない値や配列の端の値を探すと、どんな違いがあるだろう？':category==='maze'?'壁や重いマスを置くと、最短の「距離」と最小の「コスト」は同じになるだろう？':category==='tree'?'同じ値でも、挿入する順番を変えると木の形はどう変わるだろう？':'整列済みのデータと逆順のデータ。比較回数はどう変わるだろう？'}</p><button onClick={()=>setModal('compare')}>比較してみる<ArrowUpRight size={14}/></button></div>
        <footer className="page-footer"><span><Search size={13}/>探索ラボ <span>—</span> アルゴリズムを、見て理解する。</span><span>つくって、試して、学ぼう。<span className="footer-flower">✳</span></span></footer>
      </main>
    </div>
    {toast&&<div className="toast" role="status"><CheckCircle2 size={17}/>{toast}</div>}
    {modal&&<div className="modal-overlay" onClick={()=>setModal(null)}><section ref={modalContainer} className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" onClick={e=>e.stopPropagation()}><button className="modal-close icon-button" onClick={()=>setModal(null)} aria-label="閉じる"><X size={20}/></button>{modal==='help'?<Guide/>:<Comparison category={category} data={data} grid={grid} start={start} goal={goal} target={target} mazeOptions={mazeOptions}/>}</section></div>}
  </div>;
}

function colorCode(line:string) {
  return line.split(/(\b(?:def|for|in|if|elif|else|while|return|and|or|not|is|None|True|False|break)\b|\b\d+\b|\btarget\b)/g).map((part,i)=><span key={i} className={/^(def|for|in|if|elif|else|while|return|and|or|not|is|None|True|False|break)$/.test(part)?'syntax-keyword':/^\d+$/.test(part)?'syntax-number':part==='target'?'syntax-target':''}>{part}</span>);
}

function MazeSettings({algorithmId,heuristicWeight,maxDepth,onWeight,onDepth}:{algorithmId:AlgorithmId;heuristicWeight:number;maxDepth:number;onWeight:(n:number)=>void;onDepth:(n:number)=>void}) {
  if(algorithmId==='iddfs') return <div className="search-options"><label htmlFor="depth-limit">深さの上限<select id="depth-limit" value={maxDepth} onChange={e=>onDepth(Number(e.target.value))}><option value={0}>自動（通路数 − 1）</option>{[8,16,32,64,128].map(n=><option key={n} value={n}>{n}</option>)}</select></label><p>上限を1ずつ広げて再探索。訪問は累積で表示します。30,000回で停止し「上限到達」と表示します。</p></div>;
  if(algorithmId==='a-search') return <div className="search-options"><label htmlFor="heuristic-weight">予測の係数 α<select id="heuristic-weight" value={heuristicWeight} onChange={e=>onWeight(Number(e.target.value))}>{[0,0.5,1,1.5,2,3,5].map(n=><option key={n} value={n}>{n}{n===0?'（ダイクストラ）':n===1?'（A* と同じ）':''}</option>)}</select></label><p>f = g + α × マンハッタン距離。{heuristicWeight<=1?'現在の予測は過大評価しないため、最小コストを保証します。':'α > 1 は予測を強めます。最小コストを保証しません。'}</p></div>;
  if(algorithmId==='greedy') return <div className="search-options"><span className="evaluation-formula">f(n) = h(n)</span><p>ゴールまでの予測だけで次の候補を選びます。g は経路コストとして記録します。</p></div>;
  return null;
}

function MazeEvaluation({algorithmId,frame,heuristicWeight}:{algorithmId:AlgorithmId;frame:Frame;heuristicWeight:number}) {
  if(algorithmId==='iddfs') return <div className="maze-evaluation"><span>今回の探索</span><strong>深さ {frame.depth??'—'} <span>/ 上限 {frame.depthLimit??0}</span></strong><span>累積訪問 <b>{frame.comparisons}</b> 回</span><small>濃い緑：現在たどっている経路</small></div>;
  if(!['greedy','a-search','astar','dijkstra'].includes(algorithmId))return null;
  return <div className="maze-evaluation"><span className="evaluation-formula">{algorithmId==='greedy'?'f = h':algorithmId==='dijkstra'?'f = g':`f = g + ${algorithmId==='a-search'?heuristicWeight:1} × 距離`}</span><span>g <b>{frame.g??'—'}</b></span><span>h <b>{frame.h??'—'}</b></span><span>f <b>{frame.f??'—'}</b></span><small>g：実コスト ／ h：残りの予測</small></div>;
}

function ArrayDiagram({frame,target,view,category,onPick}:{frame:Frame;target:number;view:'boxes'|'bars';category:Category;onPick:(n:number)=>void}) {
  const low=frame.left??0, high=frame.right??frame.array.length-1;
  const min=Math.min(0,...frame.array), max=Math.max(1,...frame.array);
  return <div className={`array-canvas ${view}`}><div className="canvas-topline"><span>{category==='sort'?'ARRAY → ASCENDING':'ARRAY'}<span className="mono">[{frame.array.length}]</span></span>{category!=='sort'&&<span className="target-pill"><Target size={12}/>target <b>{target}</b></span>}</div><div className="array-scroll"><div className="array-track" style={{gridTemplateColumns:`repeat(${frame.array.length}, minmax(${frame.array.length>20?'33':'38'}px, 1fr))`}}>{frame.array.map((value,i)=>{
    const active=frame.active.includes(i),found=frame.found.includes(i),visited=frame.visited.includes(i),inRange=i>=low&&i<=high;
    return <div key={i} className={`array-column ${found?'found':active?'active':visited?'visited':inRange?'in-range':'excluded'}`}><div className="pointer-label">{active&&!found?<><ArrowDown size={15}/><span>{category==='sort'?'比較':frame.mid===i?'mid':'i'}</span></>:found?<><Check size={15}/><span>発見</span></>:category==='array'&&(i===low||i===high)?<><ArrowDown size={12}/><span>{i===low&&i===high?'L / R':i===low?'left':'right'}</span></>:null}</div><button className="array-value" style={view==='bars'?{height:`${48+((value-min)/(max-min))*100}px`}:undefined} onClick={()=>{if(category!=='sort')onPick(value);}} disabled={category==='sort'} title={category==='sort'?`a[${i}] = ${value}`:`${value} を探索対象にする`} aria-label={category==='sort'?`a[${i}] = ${value}`:`${value} を探索対象にする`}><span>{value}</span></button><span className="array-index">{i}</span><div className={`range-line ${category==='array'&&inRange&&!frame.result?'visible':''}`}/></div>;
  })}</div></div><div className="canvas-bottomline"><span>index <ArrowRight size={11}/></span><span>{category==='sort'?'昇順に並べ替えます':'値をクリックして探索対象に設定'}</span></div></div>;
}

function TreeDiagram({values,frame,onPick}:{values:number[];frame:Frame;onPick:(n:number)=>void}) {
  const nodes=buildTree(values), depth=Math.max(...nodes.map(n=>n.depth)), width=Math.max(600,nodes.length*44), height=Math.max(240,(depth+1)*66+22);
  const x=(id:number)=>32+nodes[id].x*(width-64)/Math.max(1,nodes.length-1), y=(id:number)=>32+nodes[id].depth*66;
  return <div className="tree-canvas"><svg viewBox={`0 0 ${width} ${height}`} style={{minWidth:Math.min(width,800),height:Math.min(520,height)}} role="img" aria-label="入力順から構築した二分探索木">{nodes.flatMap(n=>[n.left,n.right].filter((id):id is number=>id!==null).map(id=><line key={`${n.id}-${id}`} x1={x(n.id)} y1={y(n.id)} x2={x(id)} y2={y(id)} className={frame.visited.includes(n.id)&&(frame.visited.includes(id)||frame.active.includes(id))?'tree-edge visited':'tree-edge'}/>))}{nodes.map(n=><g key={n.id} role="button" tabIndex={0} aria-label={`${n.value} を探索対象にする`} onClick={()=>onPick(n.value)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' ')onPick(n.value);}} className={`tree-node ${frame.found.includes(n.id)?'found':frame.active.includes(n.id)?'active':frame.visited.includes(n.id)?'visited':''}`}><circle cx={x(n.id)} cy={y(n.id)} r="21"/><text x={x(n.id)} y={y(n.id)+5} textAnchor="middle">{n.value}</text>{n.id===0&&<text className="root-label" x={x(n.id)+30} y={y(n.id)+4}>root</text>}</g>)}</svg></div>;
}

function Stat({icon:Icon,label,value,unit='',detail,status=false}:{icon:typeof Search;label:string;value:number|string;unit?:string;detail:string;status?:boolean}) {
  return <div className={`stat-card ${status?'status-stat':''}`}><div className="stat-label"><Icon size={15}/>{label}</div><div className="stat-value">{status&&<i/>}{value}<span>{unit}</span></div><p>{detail}</p></div>;
}

function TraceChart({frames,category,onSeek}:{frames:Frame[];category:Category;onSeek:(n:number)=>void}) {
  const max=Math.max(1,...frames.map(f=>f.comparisons)), w=880,h=180,p=32;
  const x=(i:number)=>p+i*(w-2*p)/Math.max(1,frames.length-1),y=(v:number)=>h-p-v*(h-2*p)/max;
  const stride=Math.max(1,Math.ceil(frames.length/300));
  const samples=frames.flatMap((f,i)=>i%stride===0||i===frames.length-1?[{f,i}]:[]);
  return <div className="trace-chart"><span className="chart-axis-label">{category==='maze'?'累積訪問回数':'比較回数'}{stride>1?'（代表点を表示・全件はCSVへ）':''}</span><svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label="ステップごとの累積比較・訪問回数">{[0,0.5,1].map(v=><g key={v}><line x1={p} x2={w-p} y1={y(max*v)} y2={y(max*v)} className="chart-grid"/><text x={p-8} y={y(max*v)+4} textAnchor="end">{Math.round(max*v)}</text></g>)}<path d={`M ${p},${h-p} ${samples.map(({f,i})=>`L ${x(i)},${y(f.comparisons)}`).join(' ')} L ${x(frames.length-1)},${h-p} Z`} fill="#eef5df"/><polyline points={samples.map(({f,i})=>`${x(i)},${y(f.comparisons)}`).join(' ')} fill="none" stroke="#76964a" strokeWidth="2.5"/>{samples.map(({f,i})=><g key={i} role="button" tabIndex={0} aria-label={`ステップ ${i}：${f.comparisons} 回`} onClick={()=>onSeek(i)} onKeyDown={e=>{if(e.key==='Enter')onSeek(i);}}><circle cx={x(i)} cy={y(f.comparisons)} r={frames.length>70?2:4} fill={i===frames.length-1?'#e49c48':'#76964a'}/>{(frames.length<18||i===frames.length-1)&&<text x={x(i)} y={h-8} textAnchor="middle">{i}</text>}</g>)}</svg><span className="chart-bottom-label">ステップ →</span></div>;
}

function Guide() {
  return <><span className="modal-eyebrow"><BookOpen size={16}/>QUICK START</span><h2 id="modal-title">動かして、理解しよう。</h2><p className="modal-description">はじめての探索ラボ。3つのステップで始められます。</p><div className="guide-steps"><div><span>01</span><div><h3>アルゴリズムを選ぶ</h3><p>配列・迷路・木・整列から実験室を選択。同じデータのまま、アルゴリズムを切り替えられます。</p></div></div><div><span>02</span><div><h3>データと目標を設定する</h3><p>整数をカンマで区切って入力し「適用」を押します。探索対象は直接入力するほか、配列や木の値をクリックして設定できます。迷路はマスをなぞって壁を描けます。</p></div></div><div><span>03</span><div><h3>再生し、トレースで確かめる</h3><p>1ステップずつ進めたり、前の状態へ戻ったりできます。「仕組み」で前提と計算量を読み、CSV で全ステップを保存しましょう。</p></div></div></div><div className="keyboard-guide"><strong>キーボードでも操作できます</strong><span><kbd>Space</kbd> 再生 / 停止</span><span><kbd>←</kbd><kbd>→</kbd> ステップ移動</span><span><kbd>R</kbd> リセット</span><small>入力欄やボタンにフォーカスしていないときに使えます。</small></div><p className="guide-note">インデックスと迷路の座標は 0 始まり。配列の最大要素数は32、木は31ノードです。整列が前提の探索では、入力を自動的に昇順にします。学習の進捗だけをこのブラウザに保存します。</p></>;
}

function Comparison({category,data,grid,start,goal,target,mazeOptions}:{category:Category;data:Record<'array'|'tree'|'sort',number[]>;grid:number[];start:number;goal:number;target:number;mazeOptions:MazeOptions}) {
  const results=useMemo(()=>algorithms.filter(a=>a.category===category).map(a=>{
    const sorted=[...data.array].sort((x,y)=>x-y);
    const frames=category==='maze'?mazeFrames(a.id,grid,start,goal,ROWS,COLS,mazeOptions):category==='tree'?treeFrames(a.id,data.tree,target):category==='sort'?sortFrames(a.id,data.sort):searchFrames(a.id,a.id==='linear'?data.array:sorted,target);
    return {algorithm:a,last:frames[frames.length-1],steps:frames.length-1};
  }),[category,data,grid,start,goal,target,mazeOptions]);
  const max=Math.max(1,...results.map(r=>r.last.comparisons));
  return <><span className="modal-eyebrow"><Layers3 size={16}/>COMPARE & DISCOVER</span><h2 id="modal-title">同じデータで、比べてみる。</h2><p className="modal-description">現在の{category==='maze'?'迷路':category==='tree'?'木':'配列'}を使った、実際の実行結果です。{category==='array'||category==='tree'?` 探索する値：${target}`:''}</p><div className="comparison-list">{results.map(({algorithm:a,last,steps})=><div className="comparison-item" key={a.id}><div><strong>{a.name}</strong><span>{a.time}</span><b>{last.comparisons} <small>{category==='maze'?'マス訪問':'回比較'}</small></b></div><div className="comparison-bar"><span style={{width:`${last.comparisons/max*100}%`}}/></div><p>{last.result==='limited'?'上限到達（経路の有無は未確定）':last.result==='missing'?'目標は見つかりませんでした':category==='maze'?`${(last.path?.length??1)-1} 歩 / コスト ${last.cost}`:category==='sort'?`交換 ${last.swaps} 回`:'目標を発見'}<span>{steps} ステップ</span></p></div>)}</div><div className="comparison-note"><Sparkles size={16}/><p>{category==='array'?'線形探索以外には、同じ値を昇順に並べた配列を使います。整列のコストは含みません。比較回数は要素と目標の比較を1回として数えます。':category==='maze'?'BFS / DFS / 反復深化は重みを無視します。最良優先 / A / A* / ダイクストラは重みをコストに加算します。最良優先と α>1 の A は最小コストを保証しません。反復深化は再訪問を累積し、設定した深さ上限を使用します。':category==='tree'?'同じ木と目標値でも、ノードを訪問する順番によって比較回数が変わります。':'交換回数には、同じ位置どうしの交換は含みません。入力の並びを変えると、結果も変わります。'}</p></div></>;
}

export default App;

