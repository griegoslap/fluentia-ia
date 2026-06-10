const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json; charset=utf-8'
};
const json=(status,payload)=>({statusCode:status,headers,body:JSON.stringify(payload)});

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
  const apiKey=process.env.GROQ_API_KEY;
  if(!apiKey) return json(501,{setupRequired:true,error:'GROQ_API_KEY no está configurada. Para transcripción gratis usa primero el dictado del navegador; Groq es fallback opcional.'});
  try{
    const body=JSON.parse(event.body||'{}');
    const base64=String(body.audio||'').replace(/^data:audio\/\w+;base64,/,'');
    if(!base64) return json(400,{error:'Audio vacío'});
    const mimeType=body.mimeType||'audio/webm';
    const ext=mimeType.includes('mp4')?'mp4':mimeType.includes('ogg')?'ogg':mimeType.includes('wav')?'wav':'webm';
    const buffer=Buffer.from(base64,'base64');
    if(buffer.length<1000) return json(400,{error:'Audio demasiado corto'});
    const form=new FormData();
    form.append('file', new Blob([buffer],{type:mimeType}), `speech.${ext}`);
    form.append('model', process.env.GROQ_TRANSCRIBE_MODEL || 'whisper-large-v3-turbo');
    form.append('response_format','json');
    form.append('language','en');
    form.append('prompt','English practice conversation. Speaker may have a Spanish accent. Transcribe clearly in English.');
    const response=await fetch('https://api.groq.com/openai/v1/audio/transcriptions',{method:'POST',headers:{Authorization:`Bearer ${apiKey}`},body:form});
    const data=await response.json().catch(()=>({}));
    if(!response.ok) return json(response.status,{error:data.error?.message||'Groq transcription failed',details:data});
    return json(200,{text:data.text||'',provider:'groq',model:process.env.GROQ_TRANSCRIBE_MODEL||'whisper-large-v3-turbo'});
  }catch(err){return json(500,{error:err.message||'Unexpected server error'});}
};
