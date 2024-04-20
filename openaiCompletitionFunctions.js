import admin from 'firebase-admin';
import fetch from 'node-fetch';
import { getOpenAIKey } from './openaiAuth.js';
import { LangtailPrompts } from "langtail";
import dotenv from 'dotenv';

dotenv.config();
let LangtailAPIKEY = process.env.LANGTAIL_API_KEY;
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


  export async function CallOpenAIOutline(title, keyword, buyerpersona_prompt, userId, db)  {
    const systemPrompt = buyerpersona_prompt;
    const messages = [
      {
          role: "system",
          content: systemPrompt
      },
      {
          role: "user",
          content: `Crea un outline de por lo menos 5 subtitulos para un contenido con el título: ${title}. La keyword principal es: ${keyword}. No pongas nada relacionado a ejemplos que requieran de información especifica del negocio ni casos de éxito particulares ni de ejemplos particulares.`
      }
  ];
  const options = {
      method: 'POST',
      headers: {
          'X-API-Key': LangtailAPIKEY,
          'Content-Type': 'application/json'
      },
      body: JSON.stringify({
          stream: false,
          user: userId,
          doNotRecord: false,
          messages: messages      })
  };

  const url = constructLangtailUrl('create-content-outline');
    
      try {
        const response = await fetch(url, options);
        const data = await response.json();
        //console.log("Respuesta de LangTail:", data);
        let outline = data.choices[0].message.content;
        console.log("Outline: ",outline);
        console.log("Token Usage: ", data.usage);
        await saveTokenUsage(data.usage, userId, "outline", db);
      return outline;
      } catch (error) {
        console.error('Error al llamar a OpenAI:', error);
        return [];
      }
  };

  export async function LangtailSubtitles(systemPrompt, userPrompt, userId, db)  {
    const messages = [
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
          'X-API-Key': LangtailAPIKEY,
          'Content-Type': 'application/json'
      },
      body: JSON.stringify({
          stream: false,
          user: userId,
          doNotRecord: false,
          messages: messages      })
  };

  const url = constructLangtailUrl('create-content-subtitle');

      try {
        const response = await fetch(url, options);
        const data = await response.json();
        //console.log("Respuesta de LangTail:", data);
        let content = data.choices[0].message.content;
        //console.log("Contenido del Subtitulo: ",content);
        console.log("Token Usage: ", data.usage);
        await saveTokenUsage(data.usage, userId, "content", db);
      return content;
      } catch (error) {
        console.error('Error al llamar a OpenAI:', error);
        return [];
      }
  };

  export async function langtailEditor(content, userId, db)  {
    const messages = [
      {
          role: "user",
          content: content
      }
  ];
  const options = {
      method: 'POST',
      headers: {
          'X-API-Key': LangtailAPIKEY,
          'Content-Type': 'application/json'
      },
      body: JSON.stringify({
          stream: false,
          user: userId,
          doNotRecord: false,
          messages: messages      })
  };

  const url = constructLangtailUrl('content-editor');

      try {
        const response = await fetch(url, options);
        const data = await response.json();
        //console.log("Respuesta de LangTail:", data);
        let content = data.choices[0].message.content;
        console.log("Token Usage: ", data.usage);
        await saveTokenUsage(data.usage, userId, "content", db);
      return content;
      } catch (error) {
        console.error('Error al llamar a OpenAI:', error);
        return [];
      }
  };