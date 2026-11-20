"""One-time migration from the existing V04 HTML. Not required to build books."""
import re
import sys
from pathlib import Path

source=Path(sys.argv[1]).read_text(encoding='utf-8')
source=re.sub(r'const originalEpisode = .*?;\s*const originalStory =', 'const originalEpisode = __EPISODE_JSON__;\n        const originalStory =', source, flags=re.S)
source=re.sub(r'        const emotionNotes = \{.*?        function parseTurns', '        function parseTurns',source,flags=re.S)
source=re.sub(r'        async function telephoneFilter\(.*?        function appendPause', '        function appendPause',source,flags=re.S)
source=source.replace('파우스트 · 1장 · 드라마 TTS','__TITLE_HTML__').replace('FAUST_C01_V04','__FILE_STEM__')
source=source.replace('FAUST_EFFECTS','STORY_EFFECTS').replace('faustProcess','storyProcess').replace('faustWav','storyWav')
source=source.replace('한국어 드라마 오디오북. 중학생 청자에게 친절하고 선명한 낭독.', '드라마 오디오북. 낭독 언어: ${originalEpisode.language}. 청자에게 친절하고 선명하게.')
source=source.replace('새로 쓴 한국어 웹소설만 포함 · 독일어 원문과 대응 번역 제외','선택한 낭독 본문과 화자별 연기 지침')
source=source.replace('models/gemini-2.5-flash-preview-tts:generateContent','models/${encodeURIComponent(originalEpisode.model)}:generateContent')
source=source.replace('model: "gemini-2.5-flash-preview-tts"','model: originalEpisode.model')
source=source.replace('if (!inlineData) throw new Error("데이터를 받지 못했습니다.");','if (!inlineData) throw new Error("음성 데이터가 없습니다. Canvas 실행 환경의 음성 생성 지원과 모델을 확인하세요.");\n            if (!/audio\\/(?:L16|pcm)/i.test(inlineData.mimeType || "")) throw new Error("이 템플릿은 raw PCM 응답용입니다. 모델의 WAV/MP3 응답을 PCM으로 오해해 변환하지 마세요.");')
source=source.replace("throw new Error(err.error?.message || \"음성 생성 실패\");", "throw new Error(`HTTP ${response.status}: ${err.error?.message || '음성 생성 실패'}. Canvas의 생성 권한·모델·네트워크를 확인하세요.`);")
source=source.replace('/* Shared, deterministic mono DSP. No network or external dependencies. */','/* Shared deterministic mono DSP. Generation still requires host/network support. */')
source=source.replace('const apiKey = "";', '// Canvas host may supply credentials; blank key alone does not grant access.\nconst apiKey = "";')
assert not any(word in source for word in ('파우스트','FAUST','원장','진행자','치과','Heo'))
target=Path(__file__).resolve().parents[1]/'assets/canvas-template.html'
target.write_text(source,encoding='utf-8')
print('Template saved:',target)
