/* Static, DSP and mocked batch validation; no network or paid generation. */
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert'),crypto=require('crypto');
async function verify(dir){
 const htmls=fs.readdirSync(dir).filter(f=>f.endsWith('_GEMINI_CANVAS_TTS.html'));
 assert(htmls.length,'No generated HTML');
 const allRows=fs.readdirSync(dir).filter(f=>f.endsWith('.json')&&f.includes('_AUDIO_INDEX_')).flatMap(f=>JSON.parse(fs.readFileSync(path.join(dir,f),'utf8')).segments);
 assert.equal(new Set(allRows.map(x=>x.filename.toLowerCase())).size,allRows.length);
 for(const file of htmls){
  const html=fs.readFileSync(path.join(dir,file),'utf8');
  assert(!/__EPISODE_JSON__|__FILE_STEM__|__TITLE_HTML__/.test(html),'Unfilled tokens');
  const scripts=[...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]).filter(Boolean);
  scripts.forEach(s=>new vm.Script(s));
  const js=scripts.find(s=>s.includes('const originalEpisode ='));
  const episode=JSON.parse(js.match(/const originalEpisode = (.*?);\s*const originalStory =/s)[1]);
  const sidecar=JSON.parse(fs.readFileSync(path.join(dir,file.replace('_GEMINI_CANVAS_TTS.html','_SCRIPT.json')),'utf8'));
  assert.deepStrictEqual(episode,sidecar);
  const turns=episode.scenes.flatMap(s=>s.segments);
  const rows=allRows.filter(r=>r.chapter===episode.chapter&&r.filename.startsWith(file.split('_GEMINI_')[0]+'_'));
  assert.equal(rows.length,turns.length);
  for(let i=0;i<turns.length;i++){
   const t=turns[i],row=rows.find(r=>r.filename===t.filename);
   assert(row&&t.voice&&t.performance.character_persona);
   assert.equal(row.text,t.text);assert.equal(row.voice,t.voice);
   assert.equal(row.text_sha256,crypto.createHash('sha256').update(t.text).digest('hex'));
   assert.equal(t.performance.audio_effect,t.kind==='monologue'?'echo-v4':'dry');
  }
  assert(js.includes("turn.kind==='monologue')"),'Monologue routing missing');
  assert(js.includes('innerVoice ? storyProcess(resampledData,44100,STORY_EFFECTS.echo)'),'DSP route missing');
  assert(js.includes('encodeURIComponent(originalEpisode.model)'),'Model not configurable');
  assert(/const apiKey = ""/.test(js),'Key must be empty');
  // Extract real DSP and exercise actual impulse response and clipping.
  const dsp=js.slice(js.indexOf('const STORY_EFFECTS'),js.indexOf('const apiKey'));
  const context={Float32Array,ArrayBuffer,DataView,Math,Number,Error};vm.createContext(context);
  vm.runInContext(dsp+';this.fx=STORY_EFFECTS;this.process=storyProcess;',context);
  const signal=new Float32Array(44100);signal[0]=.5;
  const dry=context.process(signal,44100,context.fx.dry);
  assert.deepStrictEqual(Array.from(dry),Array.from(signal));
  const wet=context.process(signal,44100,context.fx.echo);
  assert(wet.length>signal.length&&wet.every(Number.isFinite));
  assert(wet.slice(100).some(x=>x!==0),'No reverb tail');
  assert.deepStrictEqual(Array.from(wet),Array.from(context.process(signal,44100,context.fx.echo)));
  // Exercise the real batch handler with mocked generation and download.
  const start=js.indexOf("batchProcessBtn.addEventListener('click', async () => {");
  assert(start>=0);let body=js.slice(start,js.indexOf('function currentVoice',start));body=body.slice(0,body.lastIndexOf('});')+3);
  let handler,called=0;const status={textContent:'',classList:{remove(){},add(){}}};
  const ctx={batchProcessBtn:{addEventListener:(n,f)=>handler=f},batchRunning:false,activeRequests:0,folderChecking:false,turns:[{filename:'TEST.wav',speaker:'Narrator',voice:'Charon'}],directoryHandle:null,retrySelection:null,downloadStates:[{requested:false,failed:false,voice:null}],fileEntries:[{getUrl:()=>null}],hostVoiceSelect:{value:'Charon'},batchStatus:status,lockControls(){},previewAudio:null,progressBarContainer:status,progressBar:{style:{}},document:{getElementById:()=>({scrollIntoView(){}})},sentenceHandlers:[async()=>{called++;return 'blob:test'}],setTimeout:f=>f(),showMessage:m=>{throw Error(m)}};
  vm.createContext(ctx);vm.runInContext(body,ctx);await handler();assert.equal(called,1);
  console.log('PASS',file,turns.length,'segments; syntax, index, DSP, mocked batch');
 }
 console.log('Actual generation/listening/Canvas download: NOT tested');
}
verify(process.argv[2]||'assets/demo').catch(e=>{console.error(e);process.exit(1)});
