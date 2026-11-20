"""Build chapter TTS HTMLs and audio indexes. Python standard library only."""
import argparse
import csv
import hashlib
import html
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def digest(value):
    return hashlib.sha256(value.encode('utf-8')).hexdigest()

def token(value, label):
    if not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_-]{0,63}', value):
        raise ValueError(f'{label}: use 1–64 ASCII letters, digits, _ or -')
    return value

def generate(book, output):
    prefix = token(book['prefix'], 'prefix')
    revision = token(book.get('revision', 'V01'), 'revision')
    cast = book['cast']
    cast_hash = digest(json.dumps(cast, ensure_ascii=False, sort_keys=True))
    model = book.get('model', 'gemini-2.5-flash-preview-tts')
    template = (ROOT/'assets/canvas-template.html').read_text(encoding='utf-8')
    rows, used, chapters_seen = [], set(), set()
    output = Path(output); output.mkdir(parents=True, exist_ok=True)
    for chapter in book['chapters']:
        number = chapter['number']
        if not isinstance(number, int) or number < 1 or number in chapters_seen:
            raise ValueError('Chapter numbers must be unique positive integers')
        chapters_seen.add(number)
        stem = f'{prefix}_C{number:02}_{revision}'
        units = []
        for order, segment in enumerate(chapter['segments']):
            role = segment.get('kind', 'narration')
            if role not in ('narration', 'dialogue', 'monologue'):
                raise ValueError(f'Unknown segment kind: {role}')
            cid = token(segment.get('cast_id', 'narrator'), 'cast_id')
            profile = cast[cid]  # Missing actors must never fall back silently.
            if not profile.get('voice') or not profile.get('persona'):
                raise ValueError(f'Actor {cid} needs voice and persona')
            text = segment['text']
            if not isinstance(text, str) or not text.strip():
                raise ValueError('Empty spoken text')
            scene = token(segment.get('scene_id', f'C{number:02}'), 'scene_id')
            filename = f'{stem}_{order:04}_{scene}_{cid.upper()}.wav'
            if filename.casefold() in used:
                raise ValueError(f'Duplicate filename {filename}')
            used.add(filename.casefold())
            performance = dict(
                emotion='장면에 맞춘 자연스러운 감정', intensity=.42 if role=='narration' else .55,
                pace='medium', delivery='natural voiced speech',
                pause_after_ms=500 if role=='monologue' else 280 if role=='dialogue' else 450,
                character_persona=profile['persona'], character_state='same identity',
                acting_notes='앞뒤 상황을 연결하고 본문 단어를 추가하거나 생략하지 않는다.',
                mic_direction=('가까운 사람에게 나직하게 말하되 정상 발성을 유지한다. 속삭임·ASMR·과한 숨소리 금지. 잔향 없는 원음 생성.' if role=='monologue' else '또렷한 보통 발성. 잔향 없는 원음 생성.'),
                nonverbal='웃음·울음·기침·숨 고르기는 장면 근거가 있을 때만 짧게 연기한다. 지시문을 읽지 않는다.',
                cough_rule='원문에 없는 기침·울음·비명·노래·음악을 임의로 넣지 않는다.',
                audio_effect='echo-v4' if role=='monologue' else 'dry')
            overrides = segment.get('performance', {})
            if not 0 <= float(overrides.get('intensity', performance['intensity'])) <= 1:
                raise ValueError('Intensity must be between 0 and 1')
            performance.update(overrides)
            performance['character_persona'] = profile['persona']
            performance['audio_effect'] = 'echo-v4' if role=='monologue' else 'dry'
            unit = dict(id=f'C{number:02}_{order:04}', speaker=profile.get('name', cid),
                        kind=role, cast_id=cid, text=text, scene_id=scene, filename=filename,
                        voice=profile['voice'], model=model, cast_revision=revision,
                        cast_sha256=cast_hash, performance=performance)
            units.append(unit)
            rows.append(dict(chapter=number, order=order, scene_id=scene, segment_id=unit['id'],
                             speaker=unit['speaker'], kind=role, cast_id=cid, filename=filename,
                             voice=unit['voice'], model=model, cast_revision=revision,
                             text_sha256=digest(text), text=text))
        if not units:
            raise ValueError('Each chapter needs at least one segment')
        episode = dict(schema_version='canvas-tts-1', chapter=number, title=chapter['title'],
                       language=book.get('language', 'ko-KR'), revision=revision, model=model,
                       cast_revision=revision, cast_sha256=cast_hash,
                       voices={p.get('name', c):p['voice'] for c,p in cast.items()},
                       scenes=[dict(scene_id=f'C{number:02}', title=chapter['title'], segments=units)])
        encoded = json.dumps(episode, ensure_ascii=False).replace('<', '\\u003c').replace('\u2028','\\u2028').replace('\u2029','\\u2029')
        page = template.replace('__EPISODE_JSON__', encoded).replace('__FILE_STEM__', stem).replace('__TITLE_HTML__', html.escape(book['title']+' · '+chapter['title']))
        (output/f'{stem}_GEMINI_CANVAS_TTS.html').write_text(page, encoding='utf-8')
        (output/f'{stem}_SCRIPT.json').write_text(json.dumps(episode,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    index = dict(schema='audio-index-1', prefix=prefix, revision=revision, segments=rows,
                 full_mp3=[f'{prefix}_C{c:02}_{revision}_FULL.mp3' for c in sorted(chapters_seen)])
    (output/f'{prefix}_AUDIO_INDEX_{revision}.json').write_text(json.dumps(index,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    with (output/f'{prefix}_AUDIO_INDEX_{revision}.csv').open('w',encoding='utf-8-sig',newline='') as stream:
        writer=csv.DictWriter(stream,fieldnames=list(rows[0]));writer.writeheader();writer.writerows(rows)
    return index

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source',type=Path)
    parser.add_argument('--out',required=True,type=Path)
    parser.add_argument('--prefix',default='BOOK')
    parser.add_argument('--title',default='이야기')
    args=parser.parse_args()
    if args.source.suffix.lower()=='.txt':
        raw=args.source.read_text(encoding='utf-8-sig')
        # Preserve every character; paragraphs are not discarded or rewritten.
        parts=re.split(r'(?<=\n)(?=\n)',raw)
        parts=[p for p in parts if p] if raw.strip() else []
        if not parts or any(not p.strip() for p in parts): parts=[raw] if raw.strip() else []
        book=dict(prefix=args.prefix,title=args.title,cast={'narrator':dict(name='나레이터',voice='Charon',persona='친절하고 또렷한 이야기 서술자')},chapters=[dict(number=1,title='1장',segments=[dict(text=p,cast_id='narrator') for p in parts])])
    else:
        book=json.loads(args.source.read_text(encoding='utf-8-sig'))
    index=generate(book,args.out)
    print(f"Built {len(book['chapters'])} chapters, {len(index['segments'])} segments")

if __name__=='__main__': main()
