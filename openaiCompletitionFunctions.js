import admin from 'firebase-admin';
import fetch from 'node-fetch';
import { getOpenAIKey } from './openaiAuth.js';


async function saveTokenUsage(usage, userId, type, db) {
    try {
      // Crear un nuevo documento en la colección "Tokenusage"
      await db.collection('Tokenusage').add({
        prompt_tokens: usage.prompt_tokens,
        completion_tokens: usage.completion_tokens,
        total_tokens: usage.total_tokens,
        type: type,
        userId: userId,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });
      
      console.log('Token usage guardado exitosamente en Firebase.');
    } catch (error) {
      console.error('Error al guardar token usage en Firebase:', error);
      throw error; // Puedes optar por lanzar el error para manejarlo en un nivel superior
    }
  }

export async function callOpenAI(apiKey, systemPrompt, userPrompt, userId, db) {
    const url = "https://api.openai.com/v1/chat/completions";
    const options = {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        "model": "gpt-3.5-turbo",
        "messages": [
          {"role": "system", "content": systemPrompt},
          {"role": "user", "content": userPrompt}
        ],
        "temperature": 0.9
      })
    };
  
    const fetch = (await import("node-fetch")).default;
    try {
      const response = await fetch(url, options);
      const data = await response.json();
      await saveTokenUsage(data.usage, userId, "blog-post", db);
  
      if (data.choices && data.choices.length > 0 && data.choices[0].message) {
        return data.choices[0].message.content.trim();
      } else {
        console.error('Respuesta inesperada de OpenAI:', data);
        return '';
      }
    } catch (error) {
      console.error('Error al llamar a OpenAI:', error);
      return '';
    }
  }

export async function callOpenAIExtra(apiKey, systemPrompt, userPrompt, userId, db) {
    const url = "https://api.openai.com/v1/chat/completions";
    const options = {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        "model": "gpt-3.5-turbo-1106",
        "messages": [
          {"role": "system", "content": systemPrompt},
          {"role": "user", "content": userPrompt}
        ],
        "temperature": 0.9
      })
    };

    const fetch = (await import("node-fetch")).default;
    try {
      const response = await fetch(url, options);
      const data = await response.json();
      // Check if data.usage exists before trying to save token usage
      if (data.usage) {
        await saveTokenUsage(data.usage, userId, "blog-post", db);
      } else {
        console.log(data);
        console.error('No usage data in OpenAI response:', data);
      }
  
      if (data.choices && data.choices.length > 0 && data.choices[0].message) {
        return data.choices[0].message.content.trim();
      } else {
        console.error('Respuesta inesperada de OpenAI:', data);
        return '';
      }
    } catch (error) {
      console.error('Error al llamar a OpenAI:', error);
      return '';
    }
  }

  export async function contentEditor(openaiKey, userPrompt, userId, db) {
    try {
      const systemPrompt = "Eres un editor SEO, te voy a dar un contenido de blog y quiero que me regreses el mismo contenido pero con etiquetas HTML <h2> y <h3>. También quiero que agregues negritas y itálicas para resaltar los textos importantes";
      const response = await callOpenAIExtra(openaiKey, systemPrompt, userPrompt, userId, db);
      return response;
    } catch (error) {
      console.error("Error al mejorar el contenido:", error);
      throw error; // Re-throw the error after logging it
    }
  }


  export async function CallOpenAIOutline(title, keyword, buyerpersona_prompt, userId, db)  {
    const systemPrompt = buyerpersona_prompt;
    const userPrompt = `Crea un outline de por lo menos 5 subtitulos para un contenido con el título: ${title}. La keyword principal es: ${keyword}. No pongas nada relacionado a ejemplos que requieran de información especifica del negocio ni casos de éxito particulares ni de ejemplos particulares.`;
      const apiKey = await getOpenAIKey(db, userId);
      const url = "https://api.openai.com/v1/chat/completions";
      const schema = {
        type: "object",
        properties: {
            subtitles: {
                type: "array",
                description: "Lista de 5 subtítulos optimizados para SEO",
                items: {
                    type: "object",
                    properties: {
                        h2: { type: "string", description: "Texto del subtítulo" },
                        description: { type: "string", description: "Descripción del contenido que puede contener el subtitulo para apoyar al SEO" },
                        h3_1: { type: "string", description: "Posible subtitulo secundario para SEO" },
                        h3_2: { type: "string", description: "Posible subtitulo secundario para SEO" },
                        h3_3: { type: "string", description: "Posible subtitulo secundario para SEO" },
                    },
                    required: ["text", "description", "h3_1", "h3_2", "h3_3"]
                }
            }
        },
        required: ["subtitles"]
    };
    
    
  
      const options = {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          "model": "gpt-3.5-turbo",
          "messages": [
            {"role": "system", "content": systemPrompt},
            {"role": "user", "content": userPrompt}
          ],
          functions: [
            {name: "get_movie_data", "parameters": schema}
  
          ],
          function_call: {name: "get_movie_data"},
          "temperature": 0.7
        })
      };
    
      try {
        const response = await fetch(url, options);
        const data = await response.json();
        let outline = data.choices[0].message.function_call.arguments;
        console.log(outline);
        console.log(data.usage);
        await saveTokenUsage(data.usage, userId, "outline", db);
  
      
  
  
      return outline;
      } catch (error) {
        console.error('Error al llamar a OpenAI:', error);
        return [];
      }
  };