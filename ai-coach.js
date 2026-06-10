const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json; charset=utf-8'
};
const json=(status,payload)=>({statusCode:status,headers,body:JSON.stringify(payload)});
function cleanMessages(messages){
  return (Array.isArray(messages)?messages:[]).slice(-24).map(m=>({
    role: m.role === 'ai' ? 'assistant' : 'user',
    content: String(m.text||'').slice(0,2500)
  })).filter(m=>m.content && m.content !== 'Thinking...' && m.content !== 'Preparing your feedback...');
}
exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return json(405,{error:'Method not allowed'});
  const apiKey=process.env.OPENAI_API_KEY;
  if(!apiKey) return json(501,{setupRequired:true,error:'OPENAI_API_KEY no está configurada en Netlify.'});
  try{
    const body=JSON.parse(event.body||'{}');
    const scenario=body.scenario||'Natural English conversation';
    const level=body.level||'B2';
    const studentName=body.studentName||'student';
    const finalFeedback=!!body.finalFeedback;
    const model=process.env.OPENAI_MODEL||'gpt-4o-mini';
    const system=`You are Fluentia IA, a real-time English conversation coach for a Spanish-speaking learner named ${studentName}. Current level: ${level}. Scenario: ${scenario}.

Behavior rules:
1. Reply to the student's actual message naturally, like a person. Never force a preset script.
2. If the student says hello, simply greet them and ask what they want to practice.
3. If the student asks for tips, give the tips directly.
4. If the student asks to simulate an interview, say yes and immediately become the interviewer. Ask one interview question at a time.
5. If the student answers an interview question, briefly react to their content, give one quick improvement, then ask the next realistic interview question.
6. Correct gently and selectively. Use: "Quick correction:" and "Better phrase:" only when there is a useful correction.
7. Keep the conversation in English. If Spanish clarification is necessary, add one short Spanish note only.
8. Do not repeat the same question. Use the conversation history.
9. Sound warm, practical, specific, and human.
10. For normal replies, use 60-140 words. For requested lists, use concise numbered lists.

If finalFeedback is true, do not continue the role-play. Give structured feedback: score /100, fluency, grammar, vocabulary, pronunciation focus, corrected phrases, and the next practice task.`;
    const messages=cleanMessages(body.messages);
    if(finalFeedback){
      messages.push({role:'user',content:'Please finish this speaking session and give me final feedback.'});
    }
    if(messages.length===0){
      messages.push({role:'user',content:'Hello'});
    }
    const response=await fetch('https://api.openai.com/v1/chat/completions',{
      method:'POST',
      headers:{'Authorization':`Bearer ${apiKey}`,'Content-Type':'application/json'},
      body:JSON.stringify({
        model,
        messages:[{role:'system',content:system},...messages],
        temperature:0.85,
        max_tokens: finalFeedback ? 900 : 450,
        presence_penalty:0.25,
        frequency_penalty:0.35
      })
    });
    const data=await response.json().catch(()=>({}));
    if(!response.ok) return json(response.status,{error:data.error?.message||'OpenAI request failed',details:data});
    const reply=data.choices?.[0]?.message?.content?.trim();
    return json(200,{reply:reply||'I heard you. Could you say that again?',provider:'openai',model});
  }catch(err){
    return json(500,{error:err.message||'Unexpected server error'});
  }
};
