FLUENTIA IA - MODO CONVERSACIÓN REAL

Esta versión incluye Netlify Functions para conectar la app con OpenAI:
- /.netlify/functions/ai-coach
- /.netlify/functions/transcribe

Para que funcione como un coach de IA real necesitas configurar en Netlify:
OPENAI_API_KEY = tu clave de OpenAI

Opcional:
OPENAI_MODEL = gpt-4o-mini
OPENAI_TRANSCRIBE_MODEL = gpt-4o-mini-transcribe

Recomendación de despliegue:
1) Conecta este proyecto a GitHub o usa Netlify CLI.
2) No uses solo drag & drop si quieres functions, porque drag & drop puede no empaquetar funciones correctamente en todos los casos.
3) Sube el sitio a Netlify.
4) Ve a Site configuration > Environment variables.
5) Agrega OPENAI_API_KEY.
6) Redeploy.

El HTML local seguirá abriendo, pero la IA real y la transcripción por servidor solo funcionan cuando Netlify despliega las functions.
