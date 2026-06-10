const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json; charset=utf-8'
};
const json=(status,payload)=>({statusCode:status,headers,body:JSON.stringify(payload)});

async function testGemini(){
  const apiKey=process.env.GEMINI_API_KEY;
  const model=process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';
  if(!apiKey) return {ok:false,setupRequired:true,error:'GEMINI_API_KEY no está configurada en Netlify.',provider:'gemini',model};
  const url=`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contents:[{role:'user',parts:[{text:'Reply exactly: FLUENTIA_AI_OK'}]}],generationConfig:{maxOutputTokens:20,temperature:0}})});
  const data=await r.json().catch(()=>({}));
  if(!r.ok) return {ok:false,error:data.error?.message||'Gemini request failed',details:data,provider:'gemini',model};
  return {ok:true,reply:(data.candidates?.[0]?.content?.parts||[]).map(p=>p.text||'').join('').trim(),provider:'gemini',model};
}

async function testGroq(){
  const apiKey=process.env.GROQ_API_KEY;
  const model=process.env.GROQ_MODEL || 'llama-3.1-8b-instant';
  if(!apiKey) return {ok:false,setupRequired:true,error:'GROQ_API_KEY no está configurada en Netlify.',provider:'groq',model};
  const r=await fetch('https://api.groq.com/openai/v1/chat/completions',{method:'POST',headers:{'Authorization':`Bearer ${apiKey}`,'Content-Type':'application/json'},body:JSON.stringify({model,messages:[{role:'user',content:'Reply exactly: FLUENTIA_AI_OK'}],max_tokens:20,temperature:0})});
  const data=await r.json().catch(()=>({}));
  if(!r.ok) return {ok:false,error:data.error?.message||'Groq request failed',details:data,provider:'groq',model};
  return {ok:true,reply:data.choices?.[0]?.message?.content||'',provider:'groq',model};
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  try{
    const provider=(process.env.AI_PROVIDER||'gemini').toLowerCase();
    const primary = provider === 'groq' ? await testGroq() : await testGemini();
    if(primary.ok) return json(200, primary);
    const fallback = provider === 'groq' ? await testGemini() : await testGroq();
    if(fallback.ok) return json(200, {...fallback, fallback:true, primaryError:primary.error});
    return json(primary.setupRequired && fallback.setupRequired ? 501 : 502, {ok:false,setupRequired:primary.setupRequired&&fallback.setupRequired,provider,primary,fallback});
  }catch(err){
    return json(500,{ok:false,error:err.message||'Unexpected error'});
  }
};
