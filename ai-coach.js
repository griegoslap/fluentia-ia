const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json; charset=utf-8'
};
const json=(status,payload)=>({statusCode:status,headers,body:JSON.stringify(payload)});

function cleanMessages(messages){
  return (Array.isArray(messages)?messages:[]).slice(-28).map(m=>({
    role: m.role === 'ai' || m.role === 'assistant' ? 'assistant' : 'user',
    content: String(m.text || m.content || '').slice(0,3000)
  })).filter(m=>m.content && m.content !== 'Thinking...' && m.content !== 'Preparing your feedback...');
}

function buildSystem({studentName, level, scenario}){
  return `You are Fluentia IA, a warm, natural English conversation coach for a Spanish-speaking learner named ${studentName}. Current level: ${level}. Scenario: ${scenario}.

Core behavior:
1. Reply to the student's actual message naturally, like a helpful person. Never use a fixed script.
2. If the student says hello, greet them naturally and ask what they want to practice.
3. If the student asks for tips, answer the request directly with useful tips.
4. If the student asks to simulate an interview, say yes and immediately begin the role-play as the interviewer.
5. If the student answers during a simulation, react to the content, give one concise correction or upgrade, then ask the next realistic question.
6. Correct gently and only when useful. Use: “Quick correction:” and “Better phrase:” for corrections.
7. Keep the conversation mostly in English. Add a short Spanish note only if it helps the learner understand.
8. Do not repeat the same question. Use the conversation history.
9. Sound human, specific, practical, encouraging, and conversational.
10. For normal replies use 70-160 words. For requested lists, answer in a concise numbered list.
11. Use plain text that sounds good when read aloud. Avoid Markdown tables. Avoid excessive asterisks, quotation marks, emojis, or decorative formatting.
12. When you correct, remember corrections and suggested phrases so they can be summarized at the end.

If finalFeedback is true, stop the role-play and give structured feedback with these headings: Score /100, Fluency, Grammar corrections, Better phrases, Vocabulary upgrades, Pronunciation focus, Next practice task. Include every useful correction or suggestion you gave during the conversation, plus any new corrections based on the student transcript. Keep it clear and export-friendly.`;
}

async function callGemini({system, messages, finalFeedback}){
  const apiKey=process.env.GEMINI_API_KEY;
  if(!apiKey) throw Object.assign(new Error('GEMINI_API_KEY no está configurada en Netlify.'),{setupRequired:true,provider:'gemini'});
  const model=process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';
  const contents=messages.map(m=>({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{text:m.content}]
  }));
  const url=`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const response=await fetch(url,{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
      systemInstruction:{parts:[{text:system}]},
      contents,
      generationConfig:{
        temperature:0.85,
        topP:0.9,
        maxOutputTokens: finalFeedback ? 1000 : 520
      }
    })
  });
  const data=await response.json().catch(()=>({}));
  if(!response.ok){
    const msg=data.error?.message || data.message || 'Gemini request failed';
    throw Object.assign(new Error(msg),{status:response.status,details:data,provider:'gemini'});
  }
  const reply=(data.candidates?.[0]?.content?.parts||[]).map(p=>p.text||'').join('').trim();
  return {reply:reply||'I heard you. Could you say that again?',provider:'gemini',model};
}

async function callGroq({system, messages, finalFeedback}){
  const apiKey=process.env.GROQ_API_KEY;
  if(!apiKey) throw Object.assign(new Error('GROQ_API_KEY no está configurada en Netlify.'),{setupRequired:true,provider:'groq'});
  const model=process.env.GROQ_MODEL || 'llama-3.1-8b-instant';
  const response=await fetch('https://api.groq.com/openai/v1/chat/completions',{
    method:'POST',
    headers:{'Authorization':`Bearer ${apiKey}`,'Content-Type':'application/json'},
    body:JSON.stringify({
      model,
      messages:[{role:'system',content:system},...messages],
      temperature:0.85,
      max_tokens: finalFeedback ? 1000 : 520,
      presence_penalty:0.2,
      frequency_penalty:0.25
    })
  });
  const data=await response.json().catch(()=>({}));
  if(!response.ok){
    const msg=data.error?.message || data.message || 'Groq request failed';
    throw Object.assign(new Error(msg),{status:response.status,details:data,provider:'groq'});
  }
  const reply=data.choices?.[0]?.message?.content?.trim();
  return {reply:reply||'I heard you. Could you say that again?',provider:'groq',model};
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return json(405,{error:'Method not allowed'});
  try{
    const body=JSON.parse(event.body||'{}');
    const scenario=body.scenario||'Natural English conversation';
    const level=body.level||'B2';
    const studentName=body.studentName||'student';
    const finalFeedback=!!body.finalFeedback;
    const system=buildSystem({studentName,level,scenario});
    const messages=cleanMessages(body.messages);
    if(finalFeedback) messages.push({role:'user',content:'Please finish this speaking session and give me final feedback.'});
    if(messages.length===0) messages.push({role:'user',content:'Hello'});

    const provider=(process.env.AI_PROVIDER||'gemini').toLowerCase();
    const errors=[];
    const order = provider === 'groq' ? ['groq','gemini'] : ['gemini','groq'];
    for(const p of order){
      try{
        if(p==='gemini') return json(200, await callGemini({system,messages,finalFeedback}));
        if(p==='groq') return json(200, await callGroq({system,messages,finalFeedback}));
      }catch(err){
        errors.push({provider:p,error:err.message,status:err.status,setupRequired:!!err.setupRequired});
      }
    }
    const setupRequired=errors.every(e=>e.setupRequired);
    return json(setupRequired?501:502,{error:'No hay proveedor IA disponible.',setupRequired,errors,provider});
  }catch(err){
    return json(500,{error:err.message||'Unexpected server error'});
  }
};
