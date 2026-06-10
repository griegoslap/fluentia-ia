Fluentia IA v13 - Modelos gratuitos/free tier

Proveedor principal recomendado:
AI_PROVIDER=gemini
GEMINI_API_KEY=tu_clave_de_Google_AI_Studio
GEMINI_MODEL=gemini-2.5-flash-lite

Fallback opcional:
GROQ_API_KEY=tu_clave_de_Groq
GROQ_MODEL=llama-3.1-8b-instant
GROQ_TRANSCRIBE_MODEL=whisper-large-v3-turbo

Micrófono:
- Primero usa Web Speech API del navegador.
- Si no está disponible, usa transcribe.js con Groq Whisper si GROQ_API_KEY existe.

Prueba:
/.netlify/functions/ai-health
