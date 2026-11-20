"""Regression checks on actual generated artifacts, without model calls."""
import copy
import json
import subprocess
import tempfile
from pathlib import Path
from build import generate, ROOT

example=json.loads((ROOT/'assets/example-book.json').read_text(encoding='utf-8'))
with tempfile.TemporaryDirectory() as temp:
    out=Path(temp)/'output'
    book=copy.deepcopy(example)
    book['title']='다른 작품 <테스트>'
    book['prefix']='SECOND'
    book['chapters'][0]['segments'][0]['text']='원문 보존: </script> & 한글\n줄바꿈도 남는다.'
    book['chapters'].append(copy.deepcopy(book['chapters'][0]))
    book['chapters'][1]['number']=2
    index=generate(book,out)
    assert len(index['segments'])==6
    for chapter in book['chapters']:
        text=(out/f"SECOND_C{chapter['number']:02}_V01_SCRIPT.json").read_text(encoding='utf-8')
        episode=json.loads(text)
        assert [s['text'] for s in episode['scenes'][0]['segments']]==[s['text'] for s in chapter['segments']]
    subprocess.run(['node',str(ROOT/'scripts/verify.cjs'),str(out)],check=True)
    bad=copy.deepcopy(example);bad['chapters'][0]['segments'][0]['cast_id']='missing'
    try:generate(bad,Path(temp)/'bad')
    except KeyError:pass
    else:raise AssertionError('Missing cast silently accepted')
    source=Path(temp)/'source.txt';raw='첫 문단.\n\n둘째 문단.\n줄바꿈.\n';source.write_text(raw,encoding='utf-8')
    subprocess.run(['python',str(ROOT/'scripts/build.py'),str(source),'--out',str(Path(temp)/'plain')],check=True)
    plain=json.loads((Path(temp)/'plain/BOOK_C01_V01_SCRIPT.json').read_text(encoding='utf-8'))
    assert ''.join(s['text'] for s in plain['scenes'][0]['segments'])==raw
print('PASS: two-chapter generalization, script escaping, text preservation, missing cast refusal, TXT roundtrip')
