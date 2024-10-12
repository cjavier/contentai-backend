import express from "express";
import db from './db.js';
import KeywordPlan from './Models/keywordPlan.js';
import Content from './Models/Content.js';
import Keyword from './Models/keyword.js';
import Title from './Models/Title.js';
import BuyerPersona from './Models/BuyerPerson.js';
import { OpenaiCreateSubtitles, openAIEditor, CallOpenAIOutline } from './openaiCompletitionFunctions.js'; 
import { transaction } from 'objection';

const router = express.Router();

// Middleware
router.use(express.json());

router.post('/create-outline', async (req, res) => {
  const { keywordPlanId, keywordId, titleId } = req.body; // Get IDs from request body

  try {
    console.log("Received IDs:", { keywordPlanId, keywordId, titleId });

    // Fetch the keyword plan using Objection.js
    const keywordPlan = await KeywordPlan.query().findById(keywordPlanId);

    if (!keywordPlan) {
      return res.status(404).json({ msg: 'Keyword Plan not found' });
    }
    console.log("keywordplan OK");

    // Ensure that the keyword plan has a buyerpersonaid field
    if (!keywordPlan.buyerpersonaId) {
      return res.status(400).json({ msg: 'Buyer persona ID not found in keyword plan' });
    }
    console.log("buyerpersona OK");

    const buyerPersonaId = keywordPlan.buyerpersonaId;

    // Fetch the keyword using Objection.js
    const keyword = await Keyword.query().findById(keywordId);

    if (!keyword || keyword.keywordplanid !== keywordPlanId) {
      return res.status(404).json({ msg: 'Keyword not found or does not belong to the specified Keyword Plan' });
    }
    console.log("keyword OK");

    // Fetch the title using Objection.js
    const titleObj = await Title.query().findById(titleId);

    if (!titleObj || titleObj.keywordId !== keywordId) {
      return res.status(404).json({ msg: 'Title not found or does not belong to the specified Keyword' });
    }
    console.log("Title OK");

    // Fetch the buyer persona using Objection.js
    const buyerPersona = await BuyerPersona.query().findById(buyerPersonaId);

    if (!buyerPersona) {
      return res.status(404).json({ msg: 'Buyer Persona not found' });
    }
    console.log("buyerpersona OK");

    // Extract the buyer persona prompt
    const { buyerpersona_prompt } = buyerPersona;

    // Trigger the OpenAI call asynchronously without waiting for the response
    CallOpenAIOutline(titleObj.title, keyword.keyword, buyerpersona_prompt)
      .then(async (outline) => {
        // Update PostgreSQL with the outline if received correctly
        if (outline && outline.length > 0) {
          await Title.query().findById(titleId).patch({ outline: outline });
          console.log('Outline successfully created and saved.');
        } else {
          console.error('No outline received from OpenAI');
        }
      })
      .catch((error) => {
        console.error('Error in OpenAI call:', error);
      });

    // Respond immediately with success since IDs and data are valid
    return res.status(200).json({ msg: 'Outline creation process started successfully' });
  } catch (error) {
    console.error('Error processing outline creation:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});


router.post('/create-content', async (req, res) => {
  const { userId, keywordPlanId, keywordId, titleId } = req.body;

  try {
    // Verificar que los datos fueron recibidos correctamente y responder inmediatamente
    if (!userId || !keywordPlanId || !keywordId || !titleId) {
      return res.status(400).json({ msg: 'Faltan datos requeridos' });
    }

    // Responder inmediatamente con un 200 indicando que los datos fueron recibidos correctamente
    res.status(200).json({ msg: 'Datos recibidos. El proceso de creación de contenido se está ejecutando en segundo plano.' });

    // Continuar con la creación de contenido en segundo plano
    await transaction(Content.knex(), async (trx) => {
      const existingContent = await Content.query(trx).where('titleId', titleId).first();
      if (existingContent) {
        console.log('Contenido ya existente para el título:', titleId);
        return;
      }

      const titleRecord = await Title.query(trx).findById(titleId);
      if (!titleRecord) {
        console.error('Título no encontrado');
        return;
      }
      const { title, outline } = titleRecord;

      const keywordRecord = await Keyword.query(trx).findById(keywordId);
      if (!keywordRecord) {
        console.error('Keyword no encontrada');
        return;
      }
      const { keyword } = keywordRecord;

      const keywordPlanRecord = await KeywordPlan.query(trx).findById(keywordPlanId);
      if (!keywordPlanRecord) {
        console.error('Keyword Plan no encontrado');
        return;
      }
      const { buyerpersonaId } = keywordPlanRecord;

      const buyerPersonaRecord = await BuyerPersona.query(trx).findById(buyerpersonaId);
      if (!buyerPersonaRecord) {
        console.error('Buyer Persona no encontrado');
        return;
      }
      const { content_prompt } = buyerPersonaRecord;
      const systemPrompt = content_prompt;

      let parsedOutline;
      try {
        parsedOutline = JSON.parse(outline);
      } catch (error) {
        console.error('Error al parsear el outline:', error);
        return;
      }

      if (!Array.isArray(parsedOutline.h2)) {
        console.error("El outline no tiene una propiedad 'h2' que sea un array");
        return;
      }

      const contents = await Promise.all(parsedOutline.h2.map(async (section) => {
        console.log('Creando contenido para subtítulo: ', section.titulo);
        let userPrompt = `Redacta un contenido de blog con el título: ${title}. La keyword principal es: ${keyword}. Por ahora solo escribe únicamente el contenido para el subtítulo ${section.titulo}.`;

        if (section.h3 && section.h3.length > 0) {
          const subSections = section.h3.map((sub, index) => `${index + 1}: ${sub.titulo}`).join(', ');
          userPrompt += ` Incluye las siguientes subsecciones: ${subSections}.`;
        }

        return await OpenaiCreateSubtitles(systemPrompt, userPrompt);
      }));

      const titleContent = contents.join('\n\n');
      const editorResponse = await openAIEditor(titleContent, userId);
      console.log("the title of the content is ", title);

      const newContent = await Content.query(trx).insert({
        userId,
        keywordPlanId,
        keywordId,
        titleId,
        contenttitle: title,
        content: editorResponse,
      });

      await Title.query(trx).patchAndFetchById(titleId, { contentid: newContent.id });

      console.log('Contenido creado y actualizado en segundo plano.');
    });

  } catch (error) {
    console.error('Error creando contenido:', error);
  }
});

router.get('/all-outline-creation', async (req, res) => {
  try {
    // Obtener todos los KeywordPlans que tienen alloutlinecreation = true
    const keywordPlans = await KeywordPlan.query().where('alloutlinecreation', true);

    if (keywordPlans.length === 0) {
      return res.status(404).json({ msg: 'No se encontraron Keyword Plans con alloutlinecreation = true' });
    }

    // Responder inmediatamente con un 200 indicando que el proceso ha comenzado
    res.status(200).json({ msg: 'Proceso de creación de outlines iniciado en segundo plano.' });

    // Procesar cada KeywordPlan en segundo plano
    for (const keywordPlan of keywordPlans) {
      const buyerPersonaId = keywordPlan.buyerpersonaId;

      // Obtener la información del Buyer Persona
      const buyerPersona = await BuyerPersona.query().findById(buyerPersonaId);
      if (!buyerPersona) {
        console.error(`Buyer Persona no encontrado para el Keyword Plan ${keywordPlan.id}`);
        continue;
      }

      const { buyerpersona_prompt } = buyerPersona;

      // Obtener todas las keywords asociadas a este KeywordPlan
      const keywords = await Keyword.query().where('keywordplanid', keywordPlan.id);

      for (const keyword of keywords) {
        // Obtener todos los títulos asociados a cada keyword
        const titles = await Title.query().where('keywordId', keyword.id);

        for (const titleObj of titles) {
          // Verificar si el título ya tiene un outline
          if (titleObj.outline) {
            console.log(`El título "${titleObj.title}" ya tiene un outline.`);
            continue; // Saltar al siguiente título
          }

          console.log(`Creando outline para el título: "${titleObj.title}"`);

          // Llamar a la función para crear el outline
          try {
            const outline = await CallOpenAIOutline(titleObj.title, keyword.keyword, buyerpersona_prompt);
            if (outline && outline.length > 0) {
              // Actualizar el título con el outline generado
              await Title.query().patchAndFetchById(titleObj.id, { outline: outline });
              console.log(`Outline creado y guardado para el título "${titleObj.title}".`);
            } else {
              console.error(`No se recibió un outline válido para el título "${titleObj.title}".`);
            }
          } catch (error) {
            console.error(`Error al generar outline para el título "${titleObj.title}":`, error);
          }
        }
      }

      // Establecer alloutlinecreation a false después de completar el proceso para este KeywordPlan
      await KeywordPlan.query().patchAndFetchById(keywordPlan.id, { alloutlinecreation: false });
    }

    console.log('Proceso de creación de outlines completado.');

  } catch (error) {
    console.error('Error en el proceso de creación de outlines:', error);
    // No es necesario enviar una respuesta aquí ya que la respuesta ya fue enviada
  }
});

router.get('/all-content-creation', async (req, res) => {
  try {
    // Obtener todos los KeywordPlans que tienen allcontentcreation = true
    const keywordPlans = await KeywordPlan.query().where('allcontentcreation', true);

    if (keywordPlans.length === 0) {
      return res.status(404).json({ msg: 'No se encontraron Keyword Plans con allcontentcreation = true' });
    }

    // Responder inmediatamente con un 200 indicando que el proceso ha comenzado
    res.status(200).json({ msg: 'Proceso de creación de contenidos iniciado en segundo plano.' });

    // Procesar cada KeywordPlan en segundo plano
    for (const keywordPlan of keywordPlans) {
      const buyerPersonaId = keywordPlan.buyerpersonaId;

      // Obtener la información del Buyer Persona
      const buyerPersona = await BuyerPersona.query().findById(buyerPersonaId);
      if (!buyerPersona) {
        console.error(`Buyer Persona no encontrado para el Keyword Plan ${keywordPlan.id}`);
        continue;
      }

      const { content_prompt } = buyerPersona;
      const systemPrompt = content_prompt;

      // Obtener todas las keywords asociadas a este KeywordPlan
      const keywords = await Keyword.query().where('keywordplanid', keywordPlan.id);

      for (const keyword of keywords) {
        // Obtener todos los títulos asociados a cada keyword
        const titles = await Title.query().where('keywordId', keyword.id);

        for (const titleObj of titles) {
          // Verificar si el título ya tiene un contenido
          const existingContent = await Content.query().where('titleId', titleObj.id).first();
          if (existingContent) {
            console.log(`El título "${titleObj.title}" ya tiene un contenido.`);
            continue; // Saltar al siguiente título
          }

          console.log(`Creando contenido para el título: "${titleObj.title}"`);

          // Generar contenido en función del outline y del prompt del sistema
          let parsedOutline;
          try {
            parsedOutline = JSON.parse(titleObj.outline);
          } catch (error) {
            console.error(`Error al parsear el outline para el título "${titleObj.title}":`, error);
            continue;
          }

          if (!Array.isArray(parsedOutline.h2)) {
            console.error(`El outline para el título "${titleObj.title}" no tiene una propiedad 'h2' que sea un array.`);
            continue;
          }

          const contents = await Promise.all(parsedOutline.h2.map(async (section) => {
            console.log('Creando contenido para subtítulo: ', section.titulo);
            let userPrompt = `Redacta un contenido de blog con el título: ${titleObj.title}. La keyword principal es: ${keyword.keyword}. Por ahora solo escribe únicamente el contenido para el subtítulo ${section.titulo}.`;

            if (section.h3 && section.h3.length > 0) {
              const subSections = section.h3.map((sub, index) => `${index + 1}: ${sub.titulo}`).join(', ');
              userPrompt += ` Incluye las siguientes subsecciones: ${subSections}.`;
            }

            return await OpenaiCreateSubtitles(systemPrompt, userPrompt);
          }));

          const titleContent = contents.join('\n\n');
          const editorResponse = await openAIEditor(titleContent, keywordPlan.userId);

          // Guardar el contenido generado en la base de datos
          const newContent = await Content.query().insert({
            userId: keywordPlan.userId,
            keywordPlanId: keywordPlan.id,
            keywordId: keyword.id,
            titleId: titleObj.id,
            contenttitle: titleObj.title,
            content: editorResponse,
          });

          await Title.query().patchAndFetchById(titleObj.id, { contentid: newContent.id });

          console.log(`Contenido creado y guardado para el título "${titleObj.title}".`);
        }
      }

      // Establecer allcontentcreation a false después de completar el proceso para este KeywordPlan
      await KeywordPlan.query().patchAndFetchById(keywordPlan.id, { allcontentcreation: false });
    }

    console.log('Proceso de creación de contenidos completado.');

  } catch (error) {
    console.error('Error en el proceso de creación de contenidos:', error);
    // No es necesario enviar una respuesta aquí ya que la respuesta ya fue enviada
  }
});

export default router;