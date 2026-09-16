import {sha256Text} from './analyzer.js';

export async function buildLifecycleManifest({mode,source,envelopeHash,deltaHash,existingTemplateId=null,semanticSummary=null,dependencyCount=0}){
  const kind=String(mode||'fetch-create');
  if(!['fetch-create','template-update'].includes(kind))throw new Error('Lifecycle mode tidak dikenal.');
  if(kind==='template-update'&&!String(existingTemplateId||'').trim())throw new Error('Template Edit membutuhkan existing template UUID.');
  const core={
    schema:'dini-engine-v3-lifecycle-manifest',
    version:'3.0.0',
    renderer:'source-native-fidelity-v3-final',
    source_of_truth:'immutable-envelope+edit-delta',
    mode:kind,
    source:String(source||''),
    envelope_hash:String(envelopeHash||''),
    delta_hash:String(deltaHash||''),
    semantic_summary:semanticSummary||null,
    dependency_count:Number(dependencyCount||0),
    persistence:kind==='fetch-create'?{operation:'INSERT',requires_new_uuid:true,preserve_existing_uuid:false}:{operation:'UPDATE',requires_new_uuid:false,preserve_existing_uuid:true,template_id:String(existingTemplateId)},
    generated_at:new Date().toISOString()
  };
  return {...core,manifest_hash:await sha256Text(JSON.stringify(core))};
}
