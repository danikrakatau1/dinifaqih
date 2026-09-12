(()=>{
  'use strict';
  if(window.__DINI_FETCH_EDITOR_STORAGE_ISOLATION_1150__)return;
  window.__DINI_FETCH_EDITOR_STORAGE_ISOLATION_1150__=true;

  const ORIGINAL_DB='dini-anif-editor-v150';
  const FETCH_DB='dini-anif-fetch-editor-v1150';
  const originalOpen=indexedDB.open.bind(indexedDB);
  try{
    indexedDB.open=function(name,version){
      return originalOpen(name===ORIGINAL_DB?FETCH_DB:name,version);
    };
  }catch(err){console.warn('FETCH_EDITOR_IDB_ISOLATION',err)}

  const shouldScope=key=>/^(?:diniAnifNative|diniAnifRecovery:|diniAnifPendingB2Upload$|diniAnifCleanPreviewApplied$|artSundaMerahPreview$)/.test(String(key||''));
  const scoped=key=>shouldScope(key)?`fetchEditorV1150:${key}`:String(key||'');
  const proto=Storage.prototype;
  if(!proto.__diniFetchEditorPatched1150){
    const get=proto.getItem,set=proto.setItem,remove=proto.removeItem;
    proto.getItem=function(key){return get.call(this,scoped(key))};
    proto.setItem=function(key,value){return set.call(this,scoped(key),value)};
    proto.removeItem=function(key){return remove.call(this,scoped(key))};
    Object.defineProperty(proto,'__diniFetchEditorPatched1150',{value:true,configurable:true});
  }

  document.documentElement.dataset.editorTool='fetch-editor';
  document.documentElement.dataset.editorStorage='isolated-v1.15.0';
  window.__DINI_FETCH_EDITOR_DB__=FETCH_DB;
})();
