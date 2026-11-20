# Gemini Canvas 드라마 TTS 스킬

원문 또는 선택한 각색 원고를 장별 TTS HTML과 음성 파일명 색인으로 제작합니다. 기존 파우스트 V04 제작기의 다운로드·검증·재시도·MP3 합치기 기능을 다른 작품에도 사용할 수 있게 분리했습니다.

## 설치

이 저장소를 내려받아 폴더 이름을 `gemini-canvas-tts`로 바꾸고 `~/.codex/skills/` 아래에 넣습니다. Codex를 다시 열고 다음처럼 요청합니다.

```text
$gemini-canvas-tts 이 원문으로 장별 TTS HTML을 만들어 줘.
```

저장소 설치 도구를 사용하는 경우 저장소 루트의 `SKILL.md`를 포함하는 폴더를 설치 대상으로 지정합니다. 전체 지침은 [SKILL.md](SKILL.md)에 있습니다.

## 바로 만들기

Python 3 및 검증용 Node.js가 필요합니다. 추가 Python 패키지는 필요 없습니다.

```shell
python scripts/build.py assets/example-book.json --out output
python scripts/build.py source.txt --prefix MYBOOK --title "작품명" --out output
node scripts/verify.cjs output
python scripts/self_test.py
```

완성 HTML 예제: [BOOKSHOP_C01_V01_GEMINI_CANVAS_TTS.html](assets/demo/BOOKSHOP_C01_V01_GEMINI_CANVAS_TTS.html). GitHub 파일 보기에서는 소스이므로 파일을 다운로드하거나 Raw 내용을 복사해 Canvas에서 실행합니다.

TXT 모드는 원문을 그대로 나레이션으로 보존합니다. 대사·독백과 고정 화자를 지정하려면 [예제 JSON](assets/example-book.json)을 사용합니다. 사용자 원고를 요약하거나 임의 각색하지 않습니다.

## 포함 기능

- 화자별 고정 목소리·페르소나와 구간별 감정·호흡·쉼 지시
- 정상 발성의 나직한 독백과 짧은 에코·리버브 후처리
- 구간별 WAV 저장, 전체 처리, 폴더·선택 파일 검증, 누락 재시도
- 색인 순서로 WAV를 합치는 MP3 출력
- 본문 SHA-256, 장·장면·화자·voice·정확한 파일명을 담은 JSON/CSV

## 실행 조건

키 입력란 없이 기존 Canvas 호스트의 음성 생성 지원을 이용하는 방식입니다. **빈 API 키가 인증을 제공하지는 않습니다.** 일반 로컬 HTML이나 GitHub Pages에서 무조건 음성이 생성되는 파일이 아니며, 실제 Canvas 호스트에서 한 구간 생성과 수동 저장을 먼저 시험해야 합니다. HTML 내부에는 Gemini 음성 생성 네트워크 요청이 있습니다.

기본 모델은 기존 설정인 `gemini-2.5-flash-preview-tts`이며 JSON으로 변경 가능합니다. 응답 포맷이 다른 모델로 자동 전환하지 않습니다. Tailwind와 MP3 인코더에는 외부 CDN을 사용합니다.

자동 검증은 JS 문법·본문과 색인 일치·DSP·일괄 처리 모의 실행을 확인합니다. 실제 음성 생성·청취·Canvas 다운로드 시험은 별도입니다. 상세 사용·진단은 [실행과 다운로드 지침](references/runtime-and-download.md)을 참고하세요.
