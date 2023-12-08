import express from "express";
import admin from 'firebase-admin';
import serviceAccount from '/etc/secrets/contentai-3f684-firebase-adminsdk-roi76-79cb9813cf.json' assert { type: 'json' };
import cors from 'cors';
import { callOpenAI, callOpenAIExtra, contentEditor, CallOpenAIOutline } from './openaiCompletitionFunctions.js'; // Import the functions
import { getBuyerPersonaPrompts, getKeywordsAndTitles, getAllTitlesWithOutline, getKeywordAndTitleData } from './firebaseFunctions.js';
import { getOpenAIKey } from './openaiAuth.js';

const app = express();
const PORT = 8080;
app.use(cors());


//const serviceAccountPath = path.join(__dirname, 'contentai-3f684-firebase-adminsdk-roi76-79cb9813cf.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
app.use(express.json());

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));



async function createOutline(db, keywordPlanId, keywordId, titleId, userId) {
  try {
    console.log("createoutline function started");
    // Fetch the keyword plan from Firestore
    const keywordPlanRef = db.collection('keywordsplans').doc(keywordPlanId);
    const keywordPlanDoc = await keywordPlanRef.get();
    console.log("Keyword Plan fetched", keywordPlanDoc.data());

    if (!keywordPlanDoc.exists) {
      throw new Error('Keyword Plan not found');
    }
    const keywordPlan = keywordPlanDoc.data();

    // Ensure that the keyword plan has a buyerpersonaid field
    if (!keywordPlan.buyerpersonaid) {
      throw new Error('Buyer persona ID not found in keyword plan');
    }
    const buyerPersonaId = keywordPlan.buyerpersonaid;

    // Fetch the keyword from Firestore
    const keywordRef = keywordPlanRef.collection('keywords').doc(keywordId);
    const keywordDoc = await keywordRef.get();
    console.log("Keyword fetched", keywordDoc.data());

    if (!keywordDoc.exists) {
      throw new Error('Keyword not found');
    }
    const keyword = keywordDoc.data();

    // Fetch the title from Firestore
    const titleRef = keywordRef.collection('titles').doc(titleId);
    const titleDoc = await titleRef.get();
    console.log("Title fetched", titleDoc.data());

    if (!titleDoc.exists) {
      throw new Error('Title not found');
    }
    const titleObj = titleDoc.data();

    // Use getBuyerPersonaPrompts to fetch the buyer persona prompt
    const { buyerpersona_prompt } = await getBuyerPersonaPrompts(db, buyerPersonaId);


// Call OpenAI to generate the outline
const outline = await CallOpenAIOutline(titleObj.title, keyword.keyword, buyerpersona_prompt, userId, db);

// Check if outline is received properly and update Firestore
if (outline && outline.length > 0) {
  const titleRef = db.collection('keywordsplans').doc(keywordPlanId).collection('keywords').doc(keywordId).collection('titles').doc(titleId);
  await titleRef.update({ outline: outline });

  console.log('Outline successfully created and saved.');
} else {
  throw new Error('No outline received from OpenAI');
}  } catch (error) {
    console.error('Error al crear el outline:', error);
    throw error; // Re-throw the error for handling at a higher level
  }
}

async function createAllOutlinesForPlan(db, keywordPlanId, userId) {
  const keywordsWithTitles = await getKeywordsAndTitles(db, keywordPlanId);
  for (const keyword of keywordsWithTitles) {
    for (const title of keyword.titles) {
      try {
        // Check if outline already exists before creating it
        if (!title.outline) {
          await createOutline(db, keywordPlanId, keyword.id, title.id, userId);
        }
      } catch (error) {
        console.error("Error al crear outline para el título", title.id, ":", error);
      }
    }
  }
  console.log("Outlines creados y guardados con éxito para el plan", keywordPlanId);
}


//CONTENTS CREATION
async function createContentAndSave(db, userId, keywordPlanId, keywordId, titleId, openaiKey, systemPrompt, title, keyword, string_outline) {
  let outline;
  try {
    outline = JSON.parse(string_outline);
  } catch (error) {
    console.error("Error al parsear el outline:", error);
    return; // Salir de la función si ocurre un error
  }
  // Verificar que el objeto tiene la estructura esperada
  if (!Array.isArray(outline.subtitles)) {
    throw new Error("El outline no tiene una propiedad 'subtitles' que sea un array");
  }
  //console.log("Outline: ", outline);

  const contents = [];
  for (const section of outline.subtitles) {
    console.log("creando subtitulo: ", section.h2)
    const userPrompt = `Redacta un contenido de blog con el título: ${title}. La keyword principal es: ${keyword}. Escribe únicamente el contenido para el subtitulo ${section.h2} que trata de ${section.description}. Incluye las siguientes subsecciones 1: ${section.h3_1}, 2: ${section.h3_2}, 3: ${section.h3_3}.`;
    const openAIResponse = await callOpenAI(openaiKey, systemPrompt, userPrompt, userId, db);
    contents.push(openAIResponse);
  }

  const titleContent = contents.join('\n\n');
  console.log("Estamos editando el contenido");
  const editorResponse = await contentEditor(openaiKey, titleContent, userId, db);

  console.log("Estamos guardando el contenido en la colección 'contents'");
  const contentDocRef = await db.collection('contents').add({
    userId,
    keywordPlanId,
    keywordId,
    titleId,
    title,
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

async function createAllContentsForPlan(db, keywordPlanId, userId) {
  const titlesWithOutline = await getAllTitlesWithOutline(db, keywordPlanId);
  for (const { keywordId, titleId } of titlesWithOutline) {
    try {
      // Check if content already exists before creating it
      const titleRef = db.collection(`keywordsplans/${keywordPlanId}/keywords/${keywordId}/titles`).doc(titleId);
      const titleDoc = await titleRef.get();
      if (!titleDoc.exists || titleDoc.data().contentId) {
        continue; // Skip if content already exists
      }
      await createContent(db, userId, keywordPlanId, keywordId, titleId);
    } catch (error) {
      console.error("Error al crear contenido para el título", titleId, ":", error);
    }
  }
  console.log("Contenido creado y guardado con éxito para el plan", keywordPlanId);
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
        try {
          await createContent(db, userId, keywordPlanId, keywordId, titleId);
        } catch (error) {
          console.error("Error al crear contenido para el título", titleId, ":", error);
        }      }
      console.log("Contenido creado y guardado con éxito en segundo plano");
    });
  } catch (error) {
    console.error("Error:", error);
    // Nota: No estamos enviando una respuesta aquí porque ya enviamos una respuesta antes
  }
});

app.post("/createoutline", async (req, res) => {
  console.log("Received request for /createoutline");
  const { keywordPlanId, keywordId, titleId, userId } = req.query;
  console.log("Query Params:", keywordPlanId, keywordId, titleId, userId);

  try {
    await createOutline(db, keywordPlanId, keywordId, titleId, userId);
    res.status(200).send("Outline creado con éxito");
  } catch (error) {
    console.error("Error en /createoutline:", error);
    res.status(500).send(error.message || "Error interno del servidor");
  }
});

app.post("/createalloutline", async (req, res) => {
  console.log("Received request for /createalloutline");
  const { keywordPlanId, userId } = req.query;
  try {
    // Fetch all keywords and their titles for the keyword plan
    const keywordsWithTitles = await getKeywordsAndTitles(db, keywordPlanId);

    for (const keyword of keywordsWithTitles) {
      for (const title of keyword.titles) {
        // Check if outline already exists to avoid duplication
        if (!title.outline) {
          await createOutline(db, keywordPlanId, keyword.id, title.id, userId);
        }
      }
    }
    res.status(200).send("Todos los outlines han sido creados");
  } catch (error) {
    console.error("Error en /createalloutline:", error);
    res.status(500).send("Error interno del servidor");
  }
});

app.post("/runallcreation", async (req, res) => {
  const DEFAULT_USER_ID = 'Trk9iS5OFeQhmaaEB4nedWWNkrs2';
  const userId = req.query.userId || DEFAULT_USER_ID;

  // Respond immediately
  res.status(202).send("Proceso de creación iniciado");

  // Process in the background
  setImmediate(async () => {
    try {
      const keywordPlansSnapshot = await db.collection('keywordsplans').get();
      for (const keywordPlanDoc of keywordPlansSnapshot.docs) {
        const keywordPlanData = keywordPlanDoc.data();
        const keywordPlanId = keywordPlanDoc.id;

        if (keywordPlanData.All_Outline_Creation) {
          console.log('Creating outlines for keywordPlanId:', keywordPlanId);
          await createAllOutlinesForPlan(db, keywordPlanId, userId);
        }

        if (keywordPlanData.All_Content_Creation) {
          console.log('Creating contents for keywordPlanId:', keywordPlanId);
          await createAllContentsForPlan(db, keywordPlanId, userId);
        }
      }
    } catch (error) {
      console.error("Error en background processing /runallcreation:", error);
      // Handle error, maybe log it or send a notification
    }
  });
});

