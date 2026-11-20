# 검증과 배포

미확정 화자가 들어 있는 HTML을 완성본처럼 전달하면 생성 중간에 차단된다. 이는 다운로드 오류가 아니라 미완성 편집 입력을 배포한 오류다. 행동 주체를 대사 화자로 오인하거나, 따옴표 없는 옛이야기 대사를 나레이션으로 처리하는 경우도 함께 확인한다.

JSON 최상위에는 `editorial_status: "reviewed"`를 기록하고, 각 구간에는 아래 검토 기록을 둔다. 실제 문맥 확인 없이 일괄 채우면 안 된다.

```json
"review": {
  "attribution": "confirmed",
  "classification": "confirmed",
  "performance": "confirmed",
  "evidence": "직전 행동과 다음 응답을 함께 읽어 실제 화자를 확인한 근거"
}
```

`detailed_performance_required: true`이면 `performance.design`에 `addressee_intention`, `outer_inner`, `pivot`, `prosody`, `nonverbal`, `continuation`을 기록한다. 비언어 연기가 필요 없을 때도 그 판단을 명시한다.

수정 뒤에는 최종 HTML을 다시 생성하고 `node scripts/verify.cjs OUTPUT`, `python scripts/self_test.py`를 실행한다. 개별 생성, 성공 후 재실행, 실패 재시도, 선택 재시도, 일괄 생성 경로를 모의 검사한다. HTML을 고친 뒤 이전 검사 결과를 재사용하지 않는다. 원문↔대본↔HTML↔색인의 누락·중복, 고정 voice/persona, 본문과 연기 지침의 분리, 독백 전용 DSP를 확인한다.

다운로드 코드를 수정하면 ZIP을 새 폴더에 풀어 파일명·순서·내용 지문을 재검사한다. 실제 Canvas 생성·청취·수동 저장은 자동 검증과 별도로 기록하며, 실행하지 않은 항목을 성공으로 표시하지 않는다. 외부 API나 키 입력 방식으로 우회하지 않는다.

공개 배포 전에는 배포될 파일 자체를 새 디렉터리에서 다시 검사하고 커밋 SHA, 공개 URL, Pages 상태를 확인한다. 스킬 저장소에는 사용자 작품 원문을 넣지 않는다.
