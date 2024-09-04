import express from 'express';
import db from './db.js';
import KeywordPlan from './Models/keywordPlan.js';
import Keyword from './Models/keyword.js';
import Title from './Models/Title.js';
import Content from './Models/Content.js';
import BuyerPersona from './Models/BuyerPerson.js';
import Business from './Models/Business.js';

const router = express.Router();
router.use(express.json());

// **
// **
// KEYWORDPLANS
// **
// **

// GET KeywordPlans by userId
router.get('/keywordplans/user/:userId', async (req, res) => {
  const { userId } = req.params;
  
  try {
    const keywordPlans = await KeywordPlan.query()
    .where('userId', userId)
    .withGraphFetched('buyerPersona');    
    if (keywordPlans.length === 0) {
      return res.status(404).json({ msg: "No se encontraron Keyword Plans para el usuario especificado" });
    }

    return res.status(200).json({
      msg: "Keyword Plans obtenidos con éxito",
      keywordPlans
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// POST new KeywordPlan
router.post('/keywordplan', async (req, res) => {
  const { planName, description, buyerPersonaId, userId, keywords } = req.body;

  if (!planName || !userId || !keywords || keywords.length === 0 || !buyerPersonaId) {
    return res.status(400).json({ msg: "Todos los campos requeridos deben ser proporcionados" });
  }

  try {
    const newKeywordPlan = await KeywordPlan.query().insert({
      planName,
      description,
      buyerpersonaId: buyerPersonaId,
      userId
    });

    // Insertar las keywords asociadas
    if (Array.isArray(keywords) && keywords.length > 0) {
      await Promise.all(
        keywords.map(keyword => {
          return newKeywordPlan.$relatedQuery('keywords').insert({ keyword });
        })
      );
    }

    return res.status(201).json({
      msg: "Keyword Plan creado con éxito",
      newKeywordPlan
    });
  } catch (error) {
    console.error('Error creando Keyword Plan:', error);
    return res.status(500).json({ error: error.message });
  }
});

// GET all KeywordPlans
router.get('/keywordplans', async (req, res) => {
    try {
      const keywordPlans = await KeywordPlan.query();
      return res.status(200).json({
        msg: "Keyword Plans obtenidos con éxito",
        keywordPlans
      });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  });

  // GET KeywordPlan por ID con sus Keywords
router.get('/keywordplans/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const keywordPlan = await KeywordPlan.query()
      .findById(id)
      .withGraphFetched('keywords') // Incluye las keywords asociadas
      .withGraphFetched('buyerPersona'); // Incluye el buyer persona relacionado

    if (!keywordPlan) {
      return res.status(404).json({
        msg: "Keyword Plan no encontrado"
      });
    }

    return res.status(200).json({
      msg: "Keyword Plan obtenido con éxito",
      keywordPlan
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

  router.delete('/keywordplans/:id', async (req, res) => {
    const { id } = req.params;
  
    try {
        const rowsDeleted = await KeywordPlan.query().deleteById(id);
      
      if (rowsDeleted === 0) {
        return res.status(404).json({
          msg: "Keyword Plan no encontrado"
        });
      }
  
      return res.status(200).json({
        msg: "Keyword Plan eliminado con éxito"
      });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  });

 // PUT /keywordplans/:id
router.put('/keywordplans/:id', async (req, res) => {
  const { id } = req.params;
  const { planName, description, buyerpersonaid, userid, alloutlinecreation, allcontentcreation } = req.body;

  try {
    const updatedKeywordPlan = await KeywordPlan.query().patchAndFetchById(id, {
      planName,
      description,
      buyerpersonaid,
      userid,
      alloutlinecreation,
      allcontentcreation,
    });

    if (!updatedKeywordPlan) {
      return res.status(404).json({ msg: "Keyword Plan no encontrado" });
    }

    return res.status(200).json({
      msg: "Keyword Plan actualizado con éxito",
      updatedKeywordPlan,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// **
// **
// BUSINESSES
// **
// **

router.post('/businesses', async (req, res) => {
  const { empresa, firstname, lastname, openaiModel, openaikey, wpWebsiteUrl, wpUsername, wpAppPassword, userId } = req.body;
  try {
    const newBusiness = await Business.query().insert({
      empresa,
      firstname,
      lastname,
      openaiModel,
      openaikey,
      wpWebsiteUrl,
      wpUsername,
      wpAppPassword,
      userId
    });
    return res.status(201).json({
      msg: "Business creado con éxito",
      newBusiness
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});
  // Get all Businesses
  router.get('/businesses', async (req, res) => {
    try {
      const businesses = await Business.query();
      return res.status(200).json({
        msg: "Businesses obtenidos con éxito",
        businesses
      });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  });
  
  // Get a Business by userId
router.get('/business/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const business = await Business.query().findOne({ userId });

    if (!business) {
      return res.status(404).json({
        msg: "Business no encontrado"
      });
    }

    return res.status(200).json({
      msg: "Business obtenido con éxito",
      business
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});
  
  // Delete a Business by ID
  router.delete('/businesses/:id', async (req, res) => {
    const { id } = req.params;
  
    try {
      const rowsDeleted = await Business.query().deleteById(id);
  
      if (rowsDeleted === 0) {
        return res.status(404).json({
          msg: "Business no encontrado"
        });
      }
  
      return res.status(200).json({
        msg: "Business eliminado con éxito"
      });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  });
  
  // Update a Business by ID
  router.put('/businesses/:id', async (req, res) => {
    const { id } = req.params;
    const { empresa, firstname, lastname, openaiModel, openaikey, userId, wpAppPassword, wpWebsiteUrl, wpUsername } = req.body;
  
    try {
      const updatedBusiness = await Business.query().patchAndFetchById(id, {
        empresa,
        firstname,
        lastname,
        openaiModel,
        openaikey,
        userId,
        wpAppPassword,
        wpWebsiteUrl,
        wpUsername
      });
  
      if (!updatedBusiness) {
        return res.status(404).json({ msg: "Business no encontrado" });
      }
  
      return res.status(200).json({
        msg: "Business actualizado con éxito",
        updatedBusiness
      });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  });

// **
// **
// BUYER PERSONAS
// **
// **

// GET Buyer Personas de un usuario
router.get('/buyerpersonas/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const buyerPersonas = await BuyerPersona.query().where('userId', userId);
    res.status(200).json(buyerPersonas);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET buyer persona por ID
router.get('/buyerpersona/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const buyerPersona = await BuyerPersona.query().findById(id);
    if (buyerPersona) {
      res.status(200).json(buyerPersona);
    } else {
      res.status(404).json({ msg: 'Buyer Persona no encontrado' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT Actualizar un Buyer Persona por ID
router.put('/buyerpersona/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  try {
    const updatedBuyerPersona = await BuyerPersona.query().patchAndFetchById(id, updates);
    if (updatedBuyerPersona) {
      res.status(200).json(updatedBuyerPersona);
    } else {
      res.status(404).json({ msg: 'Buyer Persona no encontrado' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE Borrar un Buyer Persona por ID
router.delete('/buyerpersona/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const numDeleted = await BuyerPersona.query().deleteById(id);
    if (numDeleted) {
      res.status(200).json({ msg: 'Buyer Persona eliminado con éxito' });
    } else {
      res.status(404).json({ msg: 'Buyer Persona no encontrado' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /buyerpersona - Crear un nuevo Buyer Persona
router.post('/buyerpersona', async (req, res) => {
  const {
    industry,
    language,
    maxCharsInTitle,
    minWordsInContent,
    name,
    userId,
    topic,
    tone,
    title_prompt,
    content_prompt,
    buyerpersona_prompt
  } = req.body;

  try {
    const newBuyerPersona = await BuyerPersona.query().insert({
      industry,
      language,
      maxCharsInTitle,
      minWordsInContent,
      name,
      userId,
      topic,
      tone,
      title_prompt,
      content_prompt,
      buyerpersona_prompt
    });
    res.status(201).json(newBuyerPersona);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// **
// **
// KEYWORDS
// **
// **

// GET - Obtener todas las keywords de un keywordPlan específico
router.get('/keywordplans/:keywordPlanId/keywords', async (req, res) => {
  const { keywordPlanId } = req.params;

  try {
    // Obtener las keywords asociadas al keywordPlan específico
    const keywords = await Keyword.query().where('keywordplanid', keywordPlanId);

    if (keywords.length === 0) {
      return res.status(404).json({ msg: 'No se encontraron keywords para el keyword plan especificado' });
    }

    return res.status(200).json({
      msg: 'Keywords obtenidas con éxito',
      keywords,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// GET - Obtener una keyword específica por ID
router.get('/keywords/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const keyword = await Keyword.query().findById(id);

    if (!keyword) {
      return res.status(404).json({ msg: 'Keyword no encontrada' });
    }

    return res.status(200).json({
      msg: 'Keyword obtenida con éxito',
      keyword,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// POST - Agregar múltiples keywords a un keywordPlan
router.post('/keywords', async (req, res) => {
  const { keywordPlanId, keywords } = req.body;

  try {
    // Verificar que el keywordPlan existe
    const keywordPlan = await KeywordPlan.query().findById(keywordPlanId);

    if (!keywordPlan) {
      return res.status(404).json({ msg: 'Keyword Plan no encontrado' });
    }

    // Insertar múltiples keywords
    const newKeywords = await Keyword.query().insert(
      keywords.map((keyword) => ({
        keywordplanid: keywordPlanId,
        keyword,
      }))
    );

    return res.status(201).json({
      msg: 'Keywords agregadas con éxito',
      newKeywords,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// PUT - Actualizar una keyword específica
router.put('/keywords/:id', async (req, res) => {
  const { id } = req.params;
  const { keyword } = req.body;

  try {
    const updatedKeyword = await Keyword.query().patchAndFetchById(id, { keyword });

    if (!updatedKeyword) {
      return res.status(404).json({ msg: 'Keyword no encontrada' });
    }

    return res.status(200).json({
      msg: 'Keyword actualizada con éxito',
      updatedKeyword,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// DELETE - Eliminar una keyword específica
router.delete('/keywords/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const rowsDeleted = await Keyword.query().deleteById(id);

    if (rowsDeleted === 0) {
      return res.status(404).json({ msg: 'Keyword no encontrada' });
    }
    return res.status(200).json({
      msg: 'Keyword eliminada con éxito',
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// **
// **
// TITLES
// **
// **

// GET - Obtener todos los títulos de un keywordPlan específico
router.get('/keywordplans/:keywordPlanId/titles', async (req, res) => {
  const { keywordPlanId } = req.params;

  try {
    // Obtener los títulos asociados al keywordPlan específico
    const titles = await Title.query().where('keywordplanid', keywordPlanId);

    if (titles.length === 0) {
      return res.status(404).json({ msg: 'No se encontraron títulos para el keyword plan especificado' });
    }

    return res.status(200).json({
      msg: 'Títulos obtenidos con éxito',
      titles,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// GET - Obtener todos los títulos de una keyword específica
router.get('/keywords/:keywordId/titles', async (req, res) => {
  const { keywordId } = req.params;

  try {
    // Obtener los títulos asociados a la keyword específica
    const titles = await Title.query().where('keywordid', keywordId);

    if (titles.length === 0) {
      return res.status(404).json({ msg: 'No se encontraron títulos para la keyword especificada' });
    }

    return res.status(200).json({
      msg: 'Títulos obtenidos con éxito',
      titles,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// GET - Obtener un título específico por ID
router.get('/titles/:id', async (req, res) => {
  const { id } = req.params;

  try {
    console.log("ID:", id);
    const title = await Title.query().findById(id);

    if (!title) {
      return res.status(404).json({ msg: 'Título no encontrado' });
    }

    return res.status(200).json({
      msg: 'Título obtenido con éxito',
      title,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// POST - Agregar múltiples títulos a una keyword y keywordPlan
router.post('/titles', async (req, res) => {
  const { keywordId, keywordplanid, titles } = req.body;

  try {
    // Verificar que la keyword y el keywordPlan existen
    const keyword = await Keyword.query().findById(keywordId);
    const keywordPlan = await KeywordPlan.query().findById(keywordplanid);

    if (!keyword || !keywordPlan) {
      return res.status(404).json({ msg: 'Keyword o KeywordPlan no encontrado' });
    }

    // Insertar múltiples títulos
    const newTitles = await Title.query().insert(
      titles.map((title) => ({
        keywordId,
        keywordplanid,
        title,
      }))
    );

    return res.status(201).json({
      msg: 'Títulos agregados con éxito',
      newTitles,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// PUT - Actualizar un título específico

router.put('/titles/:id', async (req, res) => {
  const { id } = req.params;
  const { outline, title, keywordId, created_at, updated_at, keywordplanid } = req.body;

  try {
    const updatedTitle = await Title.query().patchAndFetchById(id, { outline, title, keywordId, created_at, updated_at, keywordplanid });

    if (!updatedTitle) {
      return res.status(404).json({ msg: 'Título no encontrado' });
    }

    return res.status(200).json({
      msg: 'Título actualizado con éxito',
      updatedTitle,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// DELETE - Eliminar un título específico
router.delete('/titles/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const rowsDeleted = await Title.query().deleteById(id);

    if (rowsDeleted === 0) {
      return res.status(404).json({ msg: 'Título no encontrado' });
    }

    return res.status(200).json({
      msg: 'Título eliminado con éxito',
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// **
// **
// CONTENTS
// **
// **

// POST - Crear un nuevo contenido
router.post('/contents', async (req, res) => {
  const { content, title, userId, keywordId, titleId, keywordPlanId } = req.body;

  if (!content || !title || !userId || !keywordId || !titleId || !keywordPlanId) {
    return res.status(400).json({ msg: "Todos los campos requeridos deben ser proporcionados" });
  }

  try {
    const newContent = await Content.query().insert({
      content,
      title,
      userId,
      keywordId,
      titleId,
      keywordPlanId
    });

    return res.status(201).json({
      msg: "Contenido creado con éxito",
      newContent
    });
  } catch (error) {
    console.error('Error creando contenido:', error);
    return res.status(500).json({ error: error.message });
  }
});

// GET - Obtener todos los contenidos por keywordPlanId
router.get('/contents/keywordplan/:keywordPlanId', async (req, res) => {
  const { keywordPlanId } = req.params;

  try {
    const contents = await Content.query().where('keywordPlanId', keywordPlanId);

    if (contents.length === 0) {
      return res.status(404).json({ msg: 'No se encontraron contenidos para el plan de keywords especificado' });
    }

    return res.status(200).json({
      msg: 'Contenidos obtenidos con éxito',
      contents,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// GET - Obtener un contenido específico por ID
router.get('/contents/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const content = await Content.query().findById(id);

    if (!content) {
      return res.status(404).json({ msg: 'Contenido no encontrado' });
    }

    return res.status(200).json({
      msg: 'Contenido obtenido con éxito',
      content,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// PUT - Actualizar un contenido específico
router.put('/contents/:id', async (req, res) => {
  const { id } = req.params;
  const { content, title, category, userId, keywordId, titleId, keywordPlanId } = req.body;

  try {
    const updatedContent = await Content.query().patchAndFetchById(id, {
      content,
      title,
      category,
      userId,
      keywordId,
      titleId,
      keywordPlanId
    });

    if (!updatedContent) {
      return res.status(404).json({ msg: 'Contenido no encontrado' });
    }

    return res.status(200).json({
      msg: 'Contenido actualizado con éxito',
      updatedContent,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// DELETE - Eliminar un contenido específico
router.delete('/contents/:id', async (req, res) => {
  const { id } = req.params;

  try {
    // Buscar el contenido por su id para obtener el titleId
    const content = await Content.query().findById(id);
    if (!content) {
      return res.status(404).json({ msg: 'Contenido no encontrado' });
    }
    
    const { titleId } = content;

    // Borrar el contenido
    const rowsDeleted = await Content.query().deleteById(id);
    if (rowsDeleted === 0) {
      return res.status(404).json({ msg: 'Contenido no encontrado' });
    }

    // Actualizar el título para establecer contentId como null
    await Title.query().patchAndFetchById(titleId, { contentid: null });

    return res.status(200).json({
      msg: 'Contenido eliminado con éxito',
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});


export default router;