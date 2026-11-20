# 제작 계기와 출처

2026-11-20 업데이트: 실행은 사용자가 키를 입력하지 않는 Canvas 호스트만 사용한다. 외부 인증 경로로 전환하지 않는다. [모델·음성·감정 안내](model-and-voices.md)에 공식 자료와 모델별 제약을 구분했다. 최신 가이드의 새 모델 태그를 기존 2.5의 보장된 기능으로 간주하지 않는다.

이 스킬은 파우스트 리더에서 장별 웹소설만 추출해 Gemini Canvas에서 낭독 파일을 만드는 V04 작업을 다른 작품에도 적용하기 위해 만들었다. 출발점은 사용자가 제공한 `gemini_tts.html`, 장별 `FAUST_C01_V04_GEMINI_CANVAS_TTS.html`, `build_tts_canvas.py`, `tts-effects.js`다. 템플릿은 V04 HTML의 실제 기능을 가져오되 파우스트 원고·성우표와 이전 전화 인터뷰의 미사용 지시를 제거했다.

새 입력 스키마·생성기·검증 스크립트·예제는 이 패키지에 포함된다. 기존 프로젝트의 본문이나 사적인 API 키는 포함하지 않는다. `prepare_template.py`는 원본에서 한 번 마이그레이션한 과정을 남긴 도구이며 일반 사용에는 필요 없다.

공식 기술 참고:

- [Gemini API speech generation](https://ai.google.dev/gemini-api/docs/speech-generation): 모델·음성 설정과 응답 형식 확인.
- [Google Cloud Gemini-TTS 문서](https://docs.cloud.google.com/text-to-speech/docs/gemini-tts): 음성 생성과 PCM/WAV 형식 참고. Cloud와 Gemini API의 엔드포인트·인증은 서로 바꿔 쓰지 않는다.
- [Google Gemini TTS 업데이트](https://blog.google/innovation-and-ai/technology/developers-tools/gemini-2-5-text-to-speech/): 자연어 연기 지시의 배경.

문서의 최신 모델 소개가 달라져도 요청된 `gemini-2.5-flash-preview-tts`를 자동으로 다른 모델로 바꾸지 않는다. Canvas의 키 없는 요청 지원은 이 문서들만으로 보증되지 않으므로 실제 사용 환경에서 확인한다.
