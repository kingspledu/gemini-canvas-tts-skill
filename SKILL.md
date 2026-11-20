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
- 기본 모델은 요청 이력을 보존한 `gemini-2.5-flash-preview-tts`다. 모델의 설명·음성 목록은 [공식 모델·음성 안내](references/model-and-voices.md)를 먼저 읽는다. 모델명은 입력 JSON으로 바꿀 수 있지만 실행은 언제나 키를 입력하지 않는 Gemini Canvas HTML 경로로만 한다. API 키·REST·SDK·CLI·서버 프록시로 우회하지 않는다. 모델이 Canvas 호스트에서 지원되지 않으면 실패 원인을 기록하고 멈춘다.
- HTML은 API 키 입력란과 자격 증명을 포함하지 않는다. `const apiKey = ""`는 인증이 아니며, 이 스킬이 키를 요청하거나 생성·저장·공개하지 않는다. 일반 로컬/Pages 실행만으로 음성 생성이 보장되지 않는다. 실행 시험 없이 Canvas 다운로드·음성 품질을 완료했다고 말하지 않는다.

## 완성 판정과 오류 재검증

- 대사·독백은 따옴표나 인접한 이름만으로 확정하지 않는다. 앞뒤 문단, 대명사, 회상·이야기 속 인물, 말하지 않고 생각한 문장을 대조한다. 같은 문단 안의 화자 전환도 확인한다.
- 미확정 화자·발화 종류·미검토 연기 지침이 남으면 완성본을 만들거나 생성·재시도를 안내하지 않는다. 차단문을 삭제하거나 임시 목소리를 넣어 통과시키지 말고 원문 판별을 먼저 고친다.
- 생성기는 전체 입력을 먼저 검사한다. JSON에는 `editorial_status: reviewed`, 각 구간에는 `review`의 `attribution/classification/performance: confirmed`와 근거 `evidence`가 필요하다. 이는 편집 검토 기록이며 자동 검증이 화자 판별의 진실성을 증명하지는 않는다. 세부 연기 요청에는 `detailed_performance_required: true`와 여섯 항목의 `performance.design`을 기록한다.
- 오류 수정 후에는 실패 사례를 회귀검사로 추가하고 **최종 배포 파일을 다시** 검사한다. 개별 생성 프롬프트, 재시도 대상 선택, 전체 일괄 생성, 저장·MP3 ZIP 경로를 확인한다. 검증 뒤 HTML을 수정했다면 검사 결과를 재사용하지 말고 다시 실행한다.
- 원문↔대본↔HTML↔색인의 누락·중복, 화자·고정 voice·persona, 본문과 연기 지침 분리, 독백 전용 DSP를 검사한다. 배포 전에는 GitHub에 올라갈 파일과 ZIP을 새 디렉터리에 풀어 재검증하고 최종 커밋과 공개 URL도 대조한다.
- 자동 검사, 모의 실행, 실제 Canvas 생성·저장, 실제 청취를 따로 보고한다. 실행·청취하지 않았다면 반드시 미실시로 기록한다. 기존 음성은 변경된 원고·목소리·연기 지문 검증 없이 재사용하지 않는다. 상세 기준은 [검증과 배포](references/verification-and-release.md)를 따른다.
- revision을 올리면 같은 prefix의 이전 생성 산출물(HTML·대본 JSON·WAV·MP3·색인)을 먼저 삭제하고 새 버전만 작성한다. 원문·검토 기록·제작 스크립트처럼 prefix가 다른 편집 자료는 보존한다.

## 제작 순서

1. [제작·연기·추출 절차](references/workflow.md)를 읽고 낭독 대상, 장, 장면, 화자, 본문을 정리한다.
2. [입력 스키마와 파일명](references/input-and-index.md)에 따라 book JSON을 만든다. 재현 가능한 최소 예시는 `assets/example-book.json`이다. 장마다 narration / dialogue / monologue를 구분하고 감정·속도·쉼·비언어 연기를 작성한다.
3. [모델·음성·감정 연기 지침](references/model-and-voices.md)을 읽고 구간마다 지속 감정과 순간 효과를 분리한다. 독백은 가까운 사람에게 나직하게 말하듯 **정상 발성**으로 생성한다. 속삭임·과한 숨소리를 피한다. 생성 음성은 원음으로 요청하고, 독백에만 승인된 짧은 에코·리버브를 후처리한다. 나레이션과 대사는 원음이다. 상세 값은 [오디오·Canvas 운영](references/runtime-and-download.md).
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
