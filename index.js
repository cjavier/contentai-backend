import express from "express";
import admin from 'firebase-admin';
import serviceAccount from './contentai-3f684-firebase-adminsdk-roi76-79cb9813cf.json' assert { type: 'json' };
import cors from 'cors';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';


const app = express();
const PORT = 8080;
app.use(cors({
  origin: 'http://localhost:3000' // Reemplaza esto con el origen de tu aplicación cliente
}));


admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
app.use(express.json());

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

async function saveTokenUsage(usage, userId, type) {
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


async function callOpenAI(apiKey, systemPrompt, userPrompt, userId) {
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
    await saveTokenUsage(data.usage, userId, "blog-post");

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

async function contentEditor(openaiKey, userPrompt, userId) {
  try {
    const systemPrompt = "Eres un editor SEO, te voy a dar un contenido de blog y quiero que me regreses el mismo contenido pero con etiquetas HTML <h2> y <h3>. También quiero que agregues negritas y itálicas para resaltar los textos importantes";
    
    // Dividir el userPrompt en palabras
    const words = userPrompt.split(/\s+/);
    
    // Verificar si el userPrompt excede el límite de palabras
    if (words.length <= 2000) {
      // Si no excede el límite, procesar el texto completo
      const response = await callOpenAI(openaiKey, systemPrompt, userPrompt, userId);
      return response;
    } else {
      // Si excede el límite, dividir el texto en segmentos y procesar cada segmento
      const segments = [];
      while (words.length) {
        const segment = words.splice(0, 2000).join(' ');
        const response = await callOpenAI(openaiKey, systemPrompt, segment, userId);
        segments.push(response);
      }
      // Unir los segmentos procesados y retornar el resultado
      return segments.join(' ');
    }
  } catch (error) {
    console.error("Error al mejorar el contenido:", error);
    throw error; // Re-throw the error after logging it
  }
}



async function getOpenAIKey(db, userId) {
  const businessRef = db.collection('Business').where('userId', '==', userId);
  const businessSnapshot = await businessRef.get();
  if (businessSnapshot.empty) {
    throw new Error("No se encontró ningún documento de negocio con ese userId.");
  }
  const openaiKey = businessSnapshot.docs[0].data().openaikey;
  if (!openaiKey) {
    throw new Error("No se encontró la clave API de OpenAI para ese userId.");
  }
  return openaiKey;
}

async function getBuyerPersonaPrompts(db, buyerpersonaId) {
  const buyerpersonaRef = db.collection('buyerpersonas').doc(buyerpersonaId);
  const buyerpersonaDoc = await buyerpersonaRef.get();
  if (!buyerpersonaDoc.exists) {
    throw new Error("No se encontró ningún documento de buyer persona con ese ID.");
  }
  const buyerpersonaData = buyerpersonaDoc.data();
  return {
    buyerpersona_prompt: buyerpersonaData.buyerpersona_prompt,
    content_prompt: buyerpersonaData.content_prompt,
  };
}

async function getAllTitlesWithOutline(db, keywordPlanId) {
  const titlesWithOutline = [];
  const keywordsRef = db.collection(`keywordsplans/${keywordPlanId}/keywords`);
  const keywordsSnapshot = await keywordsRef.get();
  for (const keywordDoc of keywordsSnapshot.docs) {
    const titlesRef = keywordsRef.doc(keywordDoc.id).collection('titles');
    const titlesSnapshot = await titlesRef.where('outline', '!=', null).get();
    for (const titleDoc of titlesSnapshot.docs) {
      const titleData = titleDoc.data();
      if (titleData.outline && (titleData.content === undefined || titleData.content === null)) { 
        titlesWithOutline.push({
          keywordId: keywordDoc.id,
          titleId: titleDoc.id
        });
      }
    }
  }
  return titlesWithOutline;
}


async function getKeywordAndTitleData(db, keywordPlanId, keywordId, titleId) {
  const keywordRef = db.collection(`keywordsplans/${keywordPlanId}/keywords`).doc(keywordId);
  const keywordDoc = await keywordRef.get();
  if (!keywordDoc.exists) {
    throw new Error("No se encontró el keyword con el ID proporcionado.");
  }
  const keywordData = keywordDoc.data();
  const keyword = keywordData.keyword;

  const titleRef = db.collection(`keywordsplans/${keywordPlanId}/keywords/${keywordId}/titles`).doc(titleId);
  const titleDoc = await titleRef.get();
  if (!titleDoc.exists) {
    throw new Error("No se encontró el title con el ID proporcionado.");
  }
  const titleData = titleDoc.data();

  return {
    keyword,
    title: titleData.title,
    outline: titleData.outline
  };
}


async function createContentAndSave(db, userId, keywordPlanId, keywordId, titleId, openaiKey, systemPrompt, title, keyword, string_outline) {
  const outline = JSON.parse(string_outline);

  // Verificar que el objeto tiene la estructura esperada
  if (!Array.isArray(outline.subtitles)) {
    throw new Error("El outline no tiene una propiedad 'subtitles' que sea un array");
  }
  //console.log("Outline: ", outline);

  const contents = [];
  for (const section of outline.subtitles) {
    console.log("creando subtitulo: ", section.h2)
    const userPrompt = `Redacta un contenido de blog con el título: ${title}. La keyword principal es: ${keyword}. Escribe únicamente el contenido para el subtitulo ${section.h2} que trata de ${section.description}. Incluye las siguientes subsecciones 1: ${section.h3_1}, 2: ${section.h3_2}, 3: ${section.h3_3}.`;
    const openAIResponse = await callOpenAI(openaiKey, systemPrompt, userPrompt, userId);
    contents.push(openAIResponse);
  }

  const titleContent = contents.join('\n\n');
  console.log("Estamos editando el contenido");
  const editorResponse = await contentEditor(openaiKey, titleContent, userId);

  console.log("Estamos guardando el contenido en la colección 'contents'");
  const contentDocRef = await db.collection('contents').add({
    userId,
    keywordPlanId,
    keywordId,
    titleId,
    content: editorResponse
  });

  console.log("Estamos actualizando el título con el ID del contenido");
  const titleRef = db.collection(`keywordsplans/${keywordPlanId}/keywords/${keywordId}/titles`).doc(titleId);
  await titleRef.update({ contentId: contentDocRef.id });

  console.log("Contenido guardado y actualizado con éxito");
}


async function createContent(db, userId, keywordPlanId, keywordId, titleId) {
  // Obtener el buyerPersonaId del keywordPlan
  console.log("userId:", userId, "keywordPlanId:", keywordPlanId, "keywordId:", keywordId, "titleId:", titleId);
  const keywordPlanRef = db.collection('keywordsplans').doc(keywordPlanId);
  const keywordPlanDoc = await keywordPlanRef.get();
  if (!keywordPlanDoc.exists) {
    throw new Error("No se encontró el plan de keywords con el ID proporcionado.");
  }
  const buyerpersonaId = keywordPlanDoc.data().buyerpersonaid;
  // Obtener los prompts del buyer persona
  const { buyerpersona_prompt, content_prompt } = await getBuyerPersonaPrompts(db, buyerpersonaId);
  const systemPrompt = `${buyerpersona_prompt}. Los detalles importantes son que ${content_prompt}. No saludes a los lectores, no te despidas de ellos ni firmes los textos, No pongas ningun texto que requiera ser cambiado por el usuario.`;
  // Obtener la data del keyword y del title
  const { keyword, title, outline } = await getKeywordAndTitleData(db, keywordPlanId, keywordId, titleId);

  // Validar si el title ya tiene contenido
  if (!outline) {
    throw new Error("El title no tiene un outline definido.");
  }
  // Obtener la OpenAI key
  const openaiKey = await getOpenAIKey(db, userId);
  // Llamar a la función para crear el contenido y guardarlo
  await createContentAndSave(db, userId, keywordPlanId, keywordId, titleId, openaiKey, systemPrompt, title, keyword, outline);
}

//ONE SINGLE CONTENT CREATION
app.post("/createcontent", async (req, res) => {
  const { userId, keywordPlanId, keywordId, titleId } = req.query;
  try {
    await createContent(db, userId, keywordPlanId, keywordId, titleId);
    res.status(200).send("Contenido creado y guardado con éxito");
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send(error.message || "Error interno del servidor");
  }
});

//ALL CONTENT IN A KEYWORDSPALN CREATION
app.post("/createallcontent", async (req, res) => {
  const { userId, keywordPlanId } = req.query;
  try {
    // Responder inmediatamente al cliente
    res.status(200).send("Los contenidos se están produciendo en el servidor, ya puedes cerrar la ventana");

    // Iniciar la tarea en segundo plano
    setImmediate(async () => {
      const titlesWithOutline = await getAllTitlesWithOutline(db, keywordPlanId);
      for (const { keywordId, titleId } of titlesWithOutline) {
        await createContent(db, userId, keywordPlanId, keywordId, titleId);
      }
      console.log("Contenido creado y guardado con éxito en segundo plano");
    });
  } catch (error) {
    console.error("Error:", error);
    // Nota: No estamos enviando una respuesta aquí porque ya enviamos una respuesta antes
  }
});

