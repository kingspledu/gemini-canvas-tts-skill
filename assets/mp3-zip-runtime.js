// No audio leaves this browser during conversion or ZIP packaging.
const zipPanel=document.createElement('section');
zipPanel.style.cssText='margin:16px;padding:16px;border:2px solid #2563eb;border-radius:12px;background:#eff6ff';
const singleModeStyle=document.createElement('style');
singleModeStyle.textContent='button:not(#generatePackMp3Zip), a, input, select, textarea, #controls, #resultsContainer > div:first-child { display:none !important; } #generatePackMp3Zip { display:inline-block !important; font-size:16px; font-weight:700; padding:12px 20px; border-radius:10px; background:#15803d; color:white; border:0; cursor:pointer; } #zipProgress { margin-top:12px; font-weight:600; }';
document.head.appendChild(singleModeStyle);
zipPanel.innerHTML='<h2>전체 생성 → MP3 ZIP</h2><p>한 번 누르면 미생성 구간을 순서대로 생성하고, 브라우저에 보관한 뒤 MP3 ZIP으로 저장합니다.</p><button id="generatePackMp3Zip" type="button">전체 생성 후 MP3 ZIP 다운로드</button> <button id="packMp3Zip" type="button">생성된 음성만 ZIP</button> <button id="importZipWavs" type="button">기존 WAV 선택 → MP3 ZIP</button><input id="zipWavInput" type="file" accept=".wav,audio/wav" multiple hidden><p id="zipProgress" role="status"></p><a id="zipDownload" hidden>ZIP 저장</a>';
document.body.prepend(zipPanel);
const zipButton=document.getElementById('packMp3Zip'),generateZipButton=document.getElementById('generatePackMp3Zip'),zipImport=document.getElementById('importZipWavs'),zipProgress=document.getElementById('zipProgress');
let zipBusy=false,zipResultUrl=null;
function zipCrc32(bytes){let crc=0xffffffff;for(const b of bytes){crc^=b;for(let k=0;k<8;k++)crc=(crc>>>1)^((crc&1)?0xedb88320:0)}return (crc^0xffffffff)>>>0}
function zipRecord(size,values){const bytes=new Uint8Array(size),v=new DataView(bytes.buffer);for(const [offset,value,width] of values){if(width===2)v.setUint16(offset,value,true);else v.setUint32(offset,value,true)}return bytes}
async function makeStoredZip(files){
 const chunks=[],central=[];let offset=0,centralSize=0;
 for(const file of files){const name=new TextEncoder().encode(file.name),data=new Uint8Array(await file.blob.arrayBuffer());if(data.length>0xffffffff)throw new Error('ZIP32 파일 크기 초과');const crc=zipCrc32(data);
  const local=zipRecord(30,[[0,0x04034b50,4],[4,20,2],[6,0x800,2],[8,0,2],[14,crc,4],[18,data.length,4],[22,data.length,4],[26,name.length,2]]);
  chunks.push(local,name,data);
  const header=zipRecord(46,[[0,0x02014b50,4],[4,20,2],[6,20,2],[8,0x800,2],[10,0,2],[16,crc,4],[20,data.length,4],[24,data.length,4],[28,name.length,2],[42,offset,4]]);
  central.push(header,name);centralSize+=header.length+name.length;offset+=local.length+name.length+data.length;
 }
 if(offset+centralSize>0xffffffff||files.length>65535)throw new Error('ZIP32 한도 초과; 더 적은 파일로 나누세요');
 return new Blob([...chunks,...central,zipRecord(22,[[0,0x06054b50,4],[8,files.length,2],[10,files.length,2],[12,centralSize,4],[16,offset,4]])],{type:'application/zip'});
}
async function packageMp3Zip(imported=null){
 if(zipBusy||batchRunning||activeRequests||mergingAudio||folderChecking)return showMessage('현재 작업이 끝난 뒤 ZIP 저장을 눌러 주세요.');
 zipBusy=true;zipButton.disabled=zipImport.disabled=true;mergingAudio=true;lockControls();let context;
 try{
  const inputs=[],missing=[];
  if(imported){const seen=new Set();for(const file of imported){if(!/\.wav$/i.test(file.name))continue;if(seen.has(file.name))throw new Error('중복 파일명: '+file.name);seen.add(file.name);const i=turns.findIndex(t=>t.filename===file.name);if(i<0)throw new Error('현재 장 색인과 일치하지 않는 파일: '+file.name);inputs.push({file,index:i})}inputs.sort((a,b)=>a.index-b.index)}
  else{for(let i=0;i<fileEntries.length;i++){const url=fileEntries[i].getUrl();if(!url){missing.push(turns[i].filename);continue}const response=await fetch(url);if(!response.ok)throw new Error('브라우저 보관 음성을 읽을 수 없습니다');inputs.push({file:new File([await response.blob()],turns[i].filename,{type:'audio/wav'}),index:i})}}
  if(!inputs.length)throw new Error('변환할 음성이 없습니다. 먼저 음성을 생성하거나 현재 장 WAV를 선택하세요.');
  const library=await loadMp3Encoder();context=new (window.AudioContext||window.webkitAudioContext)({sampleRate:44100});const files=[],rows=[];
  const bitrate=Number(document.getElementById('mp3Bitrate').value)||128;
  const conversionStarted=performance.now();
  for(let n=0;n<inputs.length;n++){const input=inputs[n],turn=turns[input.index];const elapsed=(performance.now()-conversionStarted)/1000;const eta=n?Math.max(0,(elapsed/n)*(inputs.length-n)):0;const fmt=s=>s<60?`${Math.ceil(s)}초`:`${Math.floor(s/60)}분 ${Math.ceil(s%60)}초`;zipProgress.textContent=`MP3 변환 ${n+1}/${inputs.length} · ${Math.round((n+1)/inputs.length*100)}% · 예상 남은 시간 ${fmt(eta)} · ${input.file.name}`;
   const encoder=new library.Mp3Encoder(1,44100,bitrate);
   const blob=await encodeMergedWavs([input.file],encoder,context,()=>{});if(!blob.size)throw new Error('빈 MP3: '+input.file.name);
   const name=input.file.name.replace(/\.wav$/i,'.mp3');files.push({name,blob});rows.push({order:input.index,filename:name,speaker:turn.speaker,voice:turn.voice,kind:turn.kind,text_sha256:await sha256(new TextEncoder().encode(turn.text)),text:turn.text,bitrate_kbps:bitrate,source:imported?'user_selected_wav_unverified_audio_content':'browser_generated_cache'});
  }
  const included=new Set(inputs.map(x=>x.index));for(let i=0;i<turns.length;i++)if(!included.has(i)&&!missing.includes(turns[i].filename))missing.push(turns[i].filename);
  const stem=turns[0].filename.replace(/_\d{4}_.*$/,'');
  const manifest={schema:'mp3-zip-index-1',chapter:originalEpisode.chapter,complete:missing.length===0,missing,segments:rows,audioListeningVerified:false};
  files.push({name:stem+'_MP3_INDEX.json',blob:new Blob([JSON.stringify(manifest,null,2)],{type:'application/json'})});
  const escapeCsv=v=>'"'+String(v??'').replaceAll('"','""')+'"';const keys=['order','filename','speaker','voice','kind','text_sha256','text','bitrate_kbps'];
  files.push({name:stem+'_MP3_INDEX.csv',blob:new Blob(['\ufeff'+keys.join(',')+'\r\n'+rows.map(r=>keys.map(k=>escapeCsv(r[k])).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'})});
  zipProgress.textContent='ZIP 作成中…';const zip=await makeStoredZip(files);if(zipResultUrl)URL.revokeObjectURL(zipResultUrl);zipResultUrl=URL.createObjectURL(zip);
  const link=document.getElementById('zipDownload');link.href=zipResultUrl;link.download=stem+(missing.length?'_PARTIAL':'')+'_MP3.zip';link.hidden=false;link.textContent=`ZIP 保存 (${rows.length} MP3, ${(zip.size/1048576).toFixed(1)} MB)`;link.click();
  zipProgress.textContent=`MP3 ${rows.length}개를 ZIP 하나로 묶었습니다. ${missing.length?'미생성 '+missing.length+'개: PARTIAL ZIP입니다.':'현재 장 전체 포함.'} 자동 저장이 안 되면 ZIP 링크를 직접 누르세요. 저장 완료 자체는 확인하지 못합니다.`;
 }catch(e){zipProgress.textContent='ZIP 실패: '+e.message;showMessage(e.message)}finally{if(context)await context.close().catch(()=>{});zipBusy=false;mergingAudio=false;lockControls();zipButton.disabled=zipImport.disabled=false}
}
async function generateThenPackage(){
 if(zipBusy||batchRunning||activeRequests)return;
 generateZipButton.disabled=true;zipProgress.textContent='전체 구간 순차 생성 중…';
 batchProcessBtn.click();
 while(batchRunning||activeRequests) await new Promise(r=>setTimeout(r,500));
 await packageMp3Zip();
}
zipButton.onclick=()=>packageMp3Zip();generateZipButton.onclick=()=>generateThenPackage().catch(e=>{zipProgress.textContent='전체 생성 실패: '+e.message;showMessage(e.message)});zipImport.onclick=()=>document.getElementById('zipWavInput').click();document.getElementById('zipWavInput').onchange=e=>{const files=Array.from(e.target.files);e.target.value='';if(files.length)packageMp3Zip(files)};
