import admin from 'firebase-admin';
import fetch from 'node-fetch';
import { getOpenAIKey } from './openaiAuth.js';
import { LangtailPrompts } from "langtail";
import dotenv from 'dotenv';

dotenv.config();
let LangtailAPIKEY = process.env.LANGTAIL_API_KEY;
let OpenAIAPIKEY = process.env.OPENAI_API_KEY;
const OpenaiOutlineModel = 'gpt-4o-mini';
const OpenaiContentModel = 'gpt-4o-mini';
const OpenaiEditorModel = 'gpt-4o-mini';

const environment = process.env.NODE_ENV === 'production' ? 'production' : 'staging';

function constructLangtailUrl(projectPath) {
  return `https://api.langtail.com/improvitz-uGMbkj/my-project/${projectPath}/${environment}`;
}

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


  export async function CallOpenAIOutline(title, keyword, buyerpersona_prompt, userId, db) {
    const systemPrompt = buyerpersona_prompt;
    const instructionPrompt = `
    Crea el outline de un contenido en formato JSON que deberá tener por lo menos 4 subtítulos h2 y entre 1 y 3 subtítulos h3. La estructura del JSON debe ser:
    {
      "h1": "Título Principal",
      "h2": [
        {
          "titulo": "Subtítulo de Nivel 2",
          "h3": [
            {
              "titulo": "Subtítulo de Nivel 3"
            }
          ]
        }
      ]
    }

    No pongas nada relacionado a ejemplos que requieran de información específica, casos de éxito ni ejemplos particulares.`;
    const messages = [
        {
            role: "system",
            content: instructionPrompt
        },
        {
          role: "system",
          content: systemPrompt
      },
        {
            role: "user",
            content: `Crea un outline de por lo menos 5 subtítulos para un contenido con el título: ${title}. La keyword principal es: ${keyword}. No pongas nada relacionado a ejemplos que requieran de información específica del negocio ni casos de éxito particulares ni de ejemplos particulares.`
        }
    ];
    
    const options = {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${OpenAIAPIKEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: OpenaiOutlineModel,
            response_format: {
              'type': "json_object"},
            messages: messages
        })
    };

    const url = 'https://api.openai.com/v1/chat/completions';
    
    try {
        const response = await fetch(url, options);
        const data = await response.json();
        //console.log("Respuesta de OpenAI:", data);
        let outline = data.choices[0].message.content;
        //console.log("Outline: ", outline);
        //console.log("Token Usage: ", data.usage);
        return outline;
    } catch (error) {
        console.error('Error al llamar a OpenAI:', error);
        return [];
    }
};

export async function OpenaiCreateSubtitles(systemPrompt, userPrompt) {
  const instructionContentPrompt = "Te van a pedir que redactes un fragmento de un contenido de blog, este deberá de tener más de 700 palabras. No saludes a los lectores, no te despidas de ellos, no firmes los textos, No pongas ningun texto que requiera ser cambiado por el usuario.";
  const messages = [
      {
          role: "system",
          content: instructionContentPrompt
      },
      {
        role: "system",
        content: systemPrompt
    },
      {
          role: "user",
          content: userPrompt
      }
  ];
  
  const options = {
      method: 'POST',
      headers: {
          'Authorization': `Bearer ${OpenAIAPIKEY}`,
          'Content-Type': 'application/json'
      },
      body: JSON.stringify({
          model: OpenaiContentModel,
          messages: messages
      })
  };

  const url = 'https://api.openai.com/v1/chat/completions';
  
  try {
      const response = await fetch(url, options);
      const data = await response.json();
      //console.log("Respuesta de OpenAI:", data);
      let content = data.choices[0].message.content;
      //console.log("Contenido del Subtitulo: ",content);
      //console.log("Token Usage: ", data.usage);
      return content;
  } catch (error) {
      console.error('Error al llamar a OpenAI:', error);
      return [];
  }
};

  export async function openAIEditor(content) {
    const systemPrompt = "Eres un editor de contenido experto en SEO, te voy a dar un contenido de blog y quiero que me regreses el mismo contenido sin resumir, con una mayor cantidad de palabras, deberás editarlo de manera que la conexión entre los temas sea coherente, hazlo de manera que no tengas que eliminar palabras, agrega palabras siempre que puedas, asegurate que el contenido tenga una introducción y una conclusión atractivas y además el contenido deberá contar con etiquetas <h2>, <h3> y <p>. También quiero que agregues negritas y itálicas para resaltar los textos importantes usando <b> y también <i>. No agregues la etiqueta de HTML al inicio ni al final ni tampoco agregues <div>.";
    
    const messages = [
        {
            role: "system",
            content: systemPrompt
        },
        {
            role: "user",
            content: content
        }
    ];
    
    const options = {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${OpenAIAPIKEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: OpenaiEditorModel,
            messages: messages
        })
    };

    const url = 'https://api.openai.com/v1/chat/completions';
    
    try {
        const response = await fetch(url, options);
        const data = await response.json();
        //console.log("Respuesta de OpenAI:", data);
        let editedContent = data.choices[0].message.content;
       // console.log("Token Usage: ", data.usage);
        return editedContent;
    } catch (error) {
        console.error('Error al llamar a OpenAI:', error);
        return [];
    }
};