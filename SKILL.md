---
name: gemini-canvas-tts
description: 원문이나 각색 원고를 Gemini Canvas용 장별 드라마 TTS HTML로 제작한다. 고정 성우·페르소나, 감정과 독백 효과, WAV 다운로드·검증·재시도·MP3 합치기와 파일명 색인이 필요한 경우 사용한다.
---

# Gemini Canvas 드라마 TTS

텍스트를 장별로 낭독하는 HTML과 음성 파일 색인을 만든다. Python 3 표준 라이브러리와 검증용 Node.js를 사용한다. 원문 HTML의 모든 글을 무작정 낭독하지 말고 사용자가 지정한 본문 층을 추출한다.

## 기본 결정

- 기존 각색본을 요청했다면 각색본만 포함하고 원문·대응 번역·메뉴·접기 설명·화자 라벨은 제외한다. 원문 낭독 요청이면 원문을 그대로 사용한다. 별도 요청 없이 요약·번역·웹소설 재각색을 하지 않는다.
- 사용자에게 주어진 장 구분과 작품명·출력 경로를 따른다. 텍스트만 있다면 우선 `.txt` 입력 모드로 누락 없는 나레이션 버전을 만들 수 있다. 대사·독백이 있는 작품은 문맥으로 화자를 확정해 JSON 모드로 작성한다.
- 기존 고정 성우표가 있으면 이어 쓰고, 없으면 배역별 voice와 persona를 먼저 지정해 입력 JSON에 고정한다. 익명 인물은 장면별로 구분한다. 비슷한 이름을 한 인물로 임의 병합하지 않는다. 목소리 누락은 실패로 처리한다.
- 기본 모델은 요청 이력을 보존한 `gemini-2.5-flash-preview-tts`다. 모델명은 입력 JSON으로 바꿀 수 있다. 모델 변경 전 공식 문서와 샘플 응답의 PCM/WAV 형식을 확인한다. 자동 모델 대체는 하지 않는다.
- HTML은 API 키를 포함하지 않는다. Canvas 호스트가 해당 요청을 지원하는 환경을 전제로 한다. 빈 키가 인증을 제공하지 않으며 일반 로컬/Pages 실행만으로 음성 생성이 보장되지 않는다. 실행 시험 없이 Canvas 다운로드·음성 품질을 완료했다고 말하지 않는다.

## 제작 순서

1. [제작·연기·추출 절차](references/workflow.md)를 읽고 낭독 대상, 장, 장면, 화자, 본문을 정리한다.
2. [입력 스키마와 파일명](references/input-and-index.md)에 따라 book JSON을 만든다. 재현 가능한 최소 예시는 `assets/example-book.json`이다. 장마다 narration / dialogue / monologue를 구분하고 감정·속도·쉼·비언어 연기를 작성한다.
3. 독백은 가까운 사람에게 나직하게 말하듯 **정상 발성**으로 생성한다. 속삭임·과한 숨소리를 피한다. 생성 음성은 원음으로 요청하고, 독백에만 승인된 짧은 에코·리버브를 후처리한다. 나레이션과 대사는 원음이다. 상세 값은 [오디오·Canvas 운영](references/runtime-and-download.md).
4. 제공된 실제 HTML 템플릿을 사용해 생성한다. 여러 정규식 치환을 작품마다 새로 만들지 않는다.

```shell
python scripts/build.py assets/example-book.json --out output
python scripts/build.py source.txt --prefix MYBOOK --title "작품명" --out output
```

5. `node scripts/verify.cjs output`으로 JS 문법, 임베디드 대본/JSON 일치, 파일명 중복과 본문 SHA, 배역·효과 경로, 독백 DSP를 검증한다. `python scripts/self_test.py`는 다른 입력의 보존 및 누락 배역 거부를 시험한다.
6. 사용자에게 HTML, 대본 JSON, 색인 JSON/CSV를 전달한다. Canvas에 HTML 전체를 올려 음성 생성·미리듣기 1개 → 수동 WAV 저장 → 필요하면 전체 생성 순으로 시험한다. 실패하면 [다운로드 진단](references/runtime-and-download.md)의 단계별 분류로 확인한다.
7. 사용자가 받은 파일을 정리하라고 하면 색인과 `.verified.json`으로 장·장면·화자·본문 지문을 맞춘다. `(1)` 파일, 다른 장·버전, 누락·중복을 구분하고 검증되지 않은 파일을 임의 교체하지 않는다. 공개 배포는 요청된 저장소·범위에서만 수행한다.

## 포함 자산

- `assets/canvas-template.html`: 기존 파우스트 V04 제작기에서 작품 정보를 분리한 실제 HTML. 개별 생성, 일괄 처리, 수동 저장, 폴더/선택 파일 검사, 재시도 보고서, MP3 합치기 포함.
- `assets/demo/*.html`: 예제 원고로 이미 생성된 실행용 HTML. 템플릿 토큰이 없는 파일을 Canvas에 사용한다.
- `scripts/build.py`: 다른 작품용 HTML 및 색인을 만드는 재사용 생성기.
- `scripts/verify.cjs`, `scripts/self_test.py`: 자동 검증. 실제 모델 생성·사람의 청취·Canvas 호스트 기능을 대신하지 않는다.
- `references/provenance.md`: 제작 계기, 원본 파일, 공식 문서와 제약.
