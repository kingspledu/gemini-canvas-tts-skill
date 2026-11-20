# 제작 계기와 출처

이 스킬은 파우스트 리더에서 장별 웹소설만 추출해 Gemini Canvas에서 낭독 파일을 만드는 V04 작업을 다른 작품에도 적용하기 위해 만들었다. 출발점은 사용자가 제공한 `gemini_tts.html`, 장별 `FAUST_C01_V04_GEMINI_CANVAS_TTS.html`, `build_tts_canvas.py`, `tts-effects.js`다. 템플릿은 V04 HTML의 실제 기능을 가져오되 파우스트 원고·성우표와 이전 전화 인터뷰의 미사용 지시를 제거했다.

새 입력 스키마·생성기·검증 스크립트·예제는 이 패키지에 포함된다. 기존 프로젝트의 본문이나 사적인 API 키는 포함하지 않는다. `prepare_template.py`는 원본에서 한 번 마이그레이션한 과정을 남긴 도구이며 일반 사용에는 필요 없다.

공식 기술 참고:

- [Gemini API speech generation](https://ai.google.dev/gemini-api/docs/speech-generation): 모델·음성 설정과 응답 형식 확인.
- [Google Cloud Gemini-TTS 문서](https://docs.cloud.google.com/text-to-speech/docs/gemini-tts): 음성 생성과 PCM/WAV 형식 참고. Cloud와 Gemini API의 엔드포인트·인증은 서로 바꿔 쓰지 않는다.
- [Google Gemini TTS 업데이트](https://blog.google/innovation-and-ai/technology/developers-tools/gemini-2-5-text-to-speech/): 자연어 연기 지시의 배경.

문서의 최신 모델 소개가 달라져도 요청된 `gemini-2.5-flash-preview-tts`를 자동으로 다른 모델로 바꾸지 않는다. Canvas의 키 없는 요청 지원은 이 문서들만으로 보증되지 않으므로 실제 사용 환경에서 확인한다.
