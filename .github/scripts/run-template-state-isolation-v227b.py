from pathlib import Path

src_path=Path('.github/scripts/fix-template-state-isolation-v227.py')
src=src_path.read_text(encoding='utf-8')
needle="old = \"\"\"if(!els.length){const handoffMode=new URLSearchParams(location.search).get('handoff')==='1';const sourceGraphReady="
replacement="old = \"\"\"if(!els.length){const handoffMode=editorParams.get('handoff')==='1';const sourceGraphReady="
if needle not in src:
    raise SystemExit('Runner repair anchor not found')
src=src.replace(needle,replacement,1)
code=compile(src,'fix-template-state-isolation-v227b.py','exec')
exec(code,{'__name__':'__main__'})
