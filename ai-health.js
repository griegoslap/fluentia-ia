const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json; charset=utf-8'
};
const json=(status,payload)=>({statusCode:status,headers,body:JSON.stringify(payload)});
exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  if (!apiKey) return json(501,{ok:false, setupRequired:true, error:'OPENAI_API_KEY no está configurada en Netlify.', model});
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method:'POST',
      headers:{'Authorization':`Bearer ${apiKey}`,'Content-Type':'application/json'},
      body: JSON.stringify({
        model,
        messages:[
          {role:'system',content:'You are a diagnostic endpoint. Reply with exactly: FLUENTIA_AI_OK'},
          {role:'user',content:'test'}
        ],
        max_tokens:10,
        temperature:0
      })
    });
    const data=await response.json().catch(()=>({}));
    if(!response.ok) return json(response.status,{ok:false,error:data.error?.message||'OpenAI request failed',details:data,model});
    return json(200,{ok:true,reply:data.choices?.[0]?.message?.content||'',model});
  } catch(err) {
    return json(500,{ok:false,error:err.message||'Unexpected error',model});
  }
};
