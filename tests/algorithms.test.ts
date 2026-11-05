import { test } from 'node:test';
import assert from 'node:assert/strict';
import { algorithms, buildTree, COLS, GOAL, initialMaze, makeMaze, mazeFrames, neighbors, parseValues, ROWS, searchFrames, sortFrames, START, treeFrames } from '../src/algorithms.ts';
import type { AlgorithmId } from '../src/algorithms.ts';

const arrayIds: AlgorithmId[] = ['linear','binary','jump','interpolation'];
for (const id of arrayIds) {
  test(`${id}: every existing and absent target, duplicates, empty and single arrays`,()=>{
    for(const data of [[],[5],[5,5,5],[-20,-3,-3,0,1,7,7,23,90],Array.from({length:32},(_,i)=>i*3)]) {
      for(let target=-23;target<=100;target++) {
        const frames=searchFrames(id,data,target),last=frames.at(-1)!;
        assert.equal(last.result,data.includes(target)?'found':'missing',`${id}: [${data}] target=${target}`);
        if(last.result==='found') assert.equal(data[last.found[0]],target);
        for(let i=0;i<frames.length;i++) {assert.ok(frames[i].active.every(n=>n>=0&&n<data.length));if(i)assert.ok(frames[i].comparisons>=frames[i-1].comparisons);}
      }
    }
  });
}

test('binary search trace narrows the correct inclusive interval',()=>{
  const frames=searchFrames('binary',[3,8,12,17,23,28,34,42,49,56,63,71,78,85,92],71);
  assert.deepEqual(frames.slice(1).map(f=>[f.left,f.mid,f.right]),[[0,7,14],[8,11,14]]);
  assert.equal(frames.at(-1)?.comparisons,2);
});

for(const id of ['bubble','selection','insertion','quick'] as AlgorithmId[]) {
  test(`${id}: sorts arbitrary, reversed, duplicate and signed inputs without mutating snapshots`,()=>{
    for(const input of [[],[1],[2,2,2],[-4,6,0,-4,7,1],[7,6,5,4,3,2,1],Array.from({length:32},(_,i)=>(i*17)%32)]) {
      const copy=[...input],frames=sortFrames(id,input),last=frames.at(-1)!;
      assert.deepEqual(last.array,[...input].sort((a,b)=>a-b));assert.equal(last.result,'complete');assert.deepEqual(input,copy);assert.deepEqual(frames[0].array,copy);
      assert.equal(last.found.length,input.length);
    }
  });
}

test('tree structure respects the BST invariant and each strategy finds all targets',()=>{
  for(const input of [[],[5],[42,23,71,12,34,56,85,42],[1,2,3,4,5,6],[-2,-7,0,-5,3]]) {
    const nodes=buildTree(input);assert.equal(nodes.length,new Set(input).size);
    for(const n of nodes) {if(n.left!==null)assert.ok(nodes[n.left].value<n.value);if(n.right!==null)assert.ok(nodes[n.right].value>n.value);}
    for(const id of ['bst','tree-bfs','tree-dfs','inorder'] as AlgorithmId[]) for(const target of [...input,999]) {
      const last=treeFrames(id,input,target).at(-1)!;assert.equal(last.result,input.includes(target)?'found':'missing');
      if(last.result==='found')assert.equal(nodes[last.found[0]].value,target);
    }
  }
  const frames=treeFrames('inorder',[4,2,6,1,3,5,7],999);
  assert.deepEqual(frames.slice(1,-1).map(f=>f.array[f.active[0]]),[1,2,3,4,5,6,7]);
});

test('maze: no horizontal edge wrapping and all paths consist of adjacent open cells',()=>{
  assert.ok(!neighbors(COLS-1).includes(COLS));
  const grid=initialMaze();
  for(const id of ['bfs','dfs','dijkstra','astar'] as AlgorithmId[]) {
    const last=mazeFrames(id,grid,START,GOAL).at(-1)!;assert.equal(last.result,'found');
    assert.equal(last.path?.[0],START);assert.equal(last.path?.at(-1),GOAL);
    for(let i=1;i<last.path!.length;i++) {assert.ok(neighbors(last.path![i-1]).includes(last.path![i]));assert.notEqual(grid[last.path![i]],1);}
  }
});

test('weighted maze: Dijkstra and A* choose a cheaper detour while BFS ignores weights',()=>{
  const grid=[0,5,5,5,0, 0,0,0,0,0];
  const bfs=mazeFrames('bfs',grid,0,4,2,5).at(-1)!;
  const dijkstra=mazeFrames('dijkstra',grid,0,4,2,5).at(-1)!;
  const astar=mazeFrames('astar',grid,0,4,2,5).at(-1)!;
  assert.equal(bfs.path!.length-1,4);assert.equal(bfs.cost,4);
  assert.equal(dijkstra.cost,6);assert.equal(astar.cost,6);
  assert.ok(dijkstra.path!.every(i=>grid[i]!==5));
});

test('maze: blocked goal and identical start/goal terminate correctly',()=>{
  for(const id of ['bfs','dfs','dijkstra','astar'] as AlgorithmId[]) {
    assert.equal(mazeFrames(id,[0,1,0],0,2,1,3).at(-1)!.result,'missing');
    const same=mazeFrames(id,[0],0,0,1,1).at(-1)!;assert.equal(same.result,'found');assert.equal(same.cost,0);assert.deepEqual(same.path,[0]);
  }
});

test('generated mazes always connect the start and goal',()=>{
  for(let i=0;i<15;i++){const grid=makeMaze();assert.equal(grid.length,ROWS*COLS);assert.equal(mazeFrames('bfs',grid,START,GOAL).at(-1)!.result,'found');}
});

test('input validation: Japanese separators, limits, invalid tokens and signed integers',()=>{
  assert.deepEqual(parseValues('1、2， -3\n4 5'),[1,2,-3,4,5]);
  for(const invalid of ['', '1, NaN','1.5,2','Infinity','1000','1;2'])assert.throws(()=>parseValues(invalid));
  assert.throws(()=>parseValues('1,2,3',2));
});

test('IDDFS: matches BFS shortest routes on every 3x3 wall layout, including cycles and disconnection',()=>{
  for(let mask=0;mask<128;mask++) {
    const grid=[0,...Array.from({length:7},(_,i)=>(mask>>i)&1),0];
    const bfs=mazeFrames('bfs',grid,0,8,3,3).at(-1)!;
    const frames=mazeFrames('iddfs',grid,0,8,3,3),last=frames.at(-1)!;
    assert.equal(last.result,bfs.result,`walls=${mask}`);
    if(last.path)assert.equal(last.path.length,bfs.path!.length);
    for(let i=1;i<frames.length;i++) {
      assert.ok(frames[i].comparisons>=frames[i-1].comparisons);
      if(frames[i].depth!==undefined)assert.ok(frames[i].depth!<=frames[i].depthLimit!);
    }
  }
});

test('IDDFS: resets depth history between iterations and records cumulative visits',()=>{
  const frames=mazeFrames('iddfs',[0,0,0,0],0,3,1,4);
  const starts=frames.filter(f=>f.line===0&&f.depthLimit!==undefined).slice(1);
  assert.deepEqual(starts.map(f=>f.depthLimit),[0,1,2,3]);
  assert.ok(starts.every(f=>f.visited.length===0));
  assert.equal(frames.at(-1)!.comparisons,10);
  assert.deepEqual(frames.at(-1)!.path,[0,1,2,3]);
  const weighted=mazeFrames('iddfs',[0,5,0],0,2,1,3).at(-1)!;
  assert.equal(weighted.cost,2);
});

test('IDDFS: depth and visit limits never masquerade as an unreachable goal',()=>{
  assert.equal(mazeFrames('iddfs',[0,0,0,0],0,3,1,4,{maxDepth:2}).at(-1)!.result,'limited');
  const budget=mazeFrames('iddfs',[0,0,0,0],0,3,1,4,{maxExpansions:3}).at(-1)!;
  assert.equal(budget.result,'limited');assert.equal(budget.comparisons,3);
  assert.equal(mazeFrames('iddfs',[0,1,0],0,2,1,3).at(-1)!.result,'missing');
  const same=mazeFrames('iddfs',[0],0,0,1,1).at(-1)!;
  assert.equal(same.result,'found');assert.equal(same.cost,0);assert.deepEqual(same.path,[0]);
});

test('IDDFS: the supplied initial maze completes with the default budget',()=>{
  const result=mazeFrames('iddfs',initialMaze(),START,GOAL).at(-1)!;
  const bfs=mazeFrames('bfs',initialMaze(),START,GOAL).at(-1)!;
  assert.equal(result.result,'found');assert.equal(result.path!.length,bfs.path!.length);
});

test('Greedy best-first uses only h for selection and reports real weighted route cost',()=>{
  const grid=[0,5,5,5,0,0,0,0,0,0];
  const frames=mazeFrames('greedy',grid,0,4,2,5),last=frames.at(-1)!;
  assert.equal(last.result,'found');assert.deepEqual(last.path,[0,1,2,3,4]);assert.equal(last.cost,16);
  assert.equal(mazeFrames('dijkstra',grid,0,4,2,5).at(-1)!.cost,6);
  for(const f of frames.filter(f=>f.f!==undefined))assert.equal(f.f,f.h);
});

test('A: alpha 0 matches Dijkstra, alpha 1 matches A*, larger alpha may be suboptimal',()=>{
  const grid=[0,5,5,5,0,0,0,0,0,0];
  for(const [weight,reference] of [[0,'dijkstra'],[1,'astar']] as const) {
    const a=mazeFrames('a-search',grid,0,4,2,5,{heuristicWeight:weight});
    const ref=mazeFrames(reference,grid,0,4,2,5);
    assert.deepEqual(a.at(-1)!.path,ref.at(-1)!.path);assert.equal(a.at(-1)!.cost,6);
    assert.deepEqual(a.map(f=>f.active),ref.map(f=>f.active));
    for(const f of a.filter(f=>f.f!==undefined))assert.equal(f.f,f.g!+f.h!);
  }
  const fast=mazeFrames('a-search',grid,0,4,2,5,{heuristicWeight:5}).at(-1)!;
  assert.equal(fast.result,'found');assert.equal(fast.cost,16);
});

test('A: better g reopens expanded nodes; frames retain the correct cost and valid paths',()=>{
  const grid=[0,0,5,5,5,0,1,0,1,5,0,5,5,0,5,0,5,0,0,1,1,5,1,1,0,0,0,0,5,0];
  const frames=mazeFrames('a-search',grid,0,29,5,6,{heuristicWeight:2});
  const visits=frames.slice(1).flatMap(f=>f.active);
  assert.ok(visits.length>new Set(visits).size,'at least one closed node must be reopened');
  const last=frames.at(-1)!;assert.equal(last.result,'found');
  const path=last.path!;assert.equal(new Set(path).size,path.length);
  assert.equal(path.slice(1).reduce((cost,i)=>cost+(grid[i]===5?5:1),0),last.cost);
  for(let i=1;i<path.length;i++)assert.ok(neighbors(path[i-1],5,6).includes(path[i]));
});

test('new maze strategies: blocked goals, identical endpoints and immutable snapshots',()=>{
  for(const id of ['greedy','a-search'] as AlgorithmId[]) {
    assert.equal(mazeFrames(id,[0,1,0],0,2,1,3).at(-1)!.result,'missing');
    const same=mazeFrames(id,[0],0,0,1,1).at(-1)!;assert.equal(same.cost,0);assert.equal(same.result,'found');
    const input=[0,0,0],frames=mazeFrames(id,input,0,2,1,3);input[1]=1;
    assert.equal(frames[0].array[1],0);assert.equal(frames.at(-1)!.array[1],0);
  }
  assert.equal(algorithms.length,24);assert.equal(algorithms.filter(a=>a.category==='maze').length,7);
});

test('A with an admissible heuristic matches minimum costs on deterministic weighted mazes',()=>{
  let seed=1731;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<50;i++) {
    const grid=Array.from({length:30},()=>{const r=random();return r<.2?1:r<.5?5:0;});grid[0]=0;grid[29]=0;
    const ref=mazeFrames('dijkstra',grid,0,29,5,6).at(-1)!;
    for(const weight of [0,.5,1]) {
      const result=mazeFrames('a-search',grid,0,29,5,6,{heuristicWeight:weight}).at(-1)!;
      assert.equal(result.result,ref.result);assert.equal(result.cost,ref.cost);
    }
  }
});
