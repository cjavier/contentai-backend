import admin from 'firebase-admin';
import fetch from 'node-fetch';


export async function getKeywords(db, keywordPlanId) {
  const keywordsRef = db.collection(`keywordsplans/${keywordPlanId}/keywords`);
  const snapshot = await keywordsRef.get();
  const keywords = [];
  snapshot.forEach(doc => {
    keywords.push({ id: doc.id, ...doc.data() });
  });
  return keywords;
}

export async function getTitles(db, keywordPlanId) {
  const titles = [];
  const keywordsRef = db.collection(`keywordsplans/${keywordPlanId}/keywords`);
  const keywordsSnapshot = await keywordsRef.get();
  for (const keywordDoc of keywordsSnapshot.docs) {
    const titlesRef = keywordsRef.doc(keywordDoc.id).collection('titles');
    const titlesSnapshot = await titlesRef.get();
    for (const titleDoc of titlesSnapshot.docs) {
      titles.push({ id: titleDoc.id, ...titleDoc.data() });
    }
  }
  return titles;
}

export async function getOutlines(db, keywordPlanId) {
  const outlines = [];
  const keywordsRef = db.collection(`keywordsplans/${keywordPlanId}/keywords`);
  const keywordsSnapshot = await keywordsRef.get();
  for (const keywordDoc of keywordsSnapshot.docs) {
    const titlesRef = keywordsRef.doc(keywordDoc.id).collection('titles');
    const titlesSnapshot = await titlesRef.where('outline', '!=', null).get();
    for (const titleDoc of titlesSnapshot.docs) {
      const titleData = titleDoc.data();
      if (titleData.outline) {
        outlines.push({ id: titleDoc.id, outline: titleData.outline });
      }
    }
  }
  return outlines;
}

export async function getKeywordsAndTitles(db, keywordPlanId) {
  const keywordsWithTitles = [];
  const keywordsRef = db.collection(`keywordsplans/${keywordPlanId}/keywords`);
  const keywordsSnapshot = await keywordsRef.get();
  for (const keywordDoc of keywordsSnapshot.docs) {
    const keywordData = { id: keywordDoc.id, keyword: keywordDoc.data().keyword, titles: [] };
    const titlesRef = keywordsRef.doc(keywordDoc.id).collection('titles');
    const titlesSnapshot = await titlesRef.get();
    for (const titleDoc of titlesSnapshot.docs) {
      keywordData.titles.push({ id: titleDoc.id, ...titleDoc.data() });
    }
    keywordsWithTitles.push(keywordData);
  }
  return keywordsWithTitles;
}

export async function getKeywordsTitlesAndOutlines(db, keywordPlanId) {
  const keywordsWithTitlesAndOutlines = [];
  const keywordsRef = db.collection(`keywordsplans/${keywordPlanId}/keywords`);
  const keywordsSnapshot = await keywordsRef.get();
  for (const keywordDoc of keywordsSnapshot.docs) {
    const keywordData = { id: keywordDoc.id, keyword: keywordDoc.data().keyword, titles: [] };
    const titlesRef = keywordsRef.doc(keywordDoc.id).collection('titles');
    const titlesSnapshot = await titlesRef.get();
    for (const titleDoc of titlesSnapshot.docs) {
      const titleData = titleDoc.data();
      if (titleData.outline) {
        keywordData.titles.push({ id: titleDoc.id, title: titleData.title, outline: titleData.outline });
      } else {
        keywordData.titles.push({ id: titleDoc.id, title: titleData.title });
      }
    }
    keywordsWithTitlesAndOutlines.push(keywordData);
  }
  return keywordsWithTitlesAndOutlines;
}

export async function getBuyerPersonaPrompts(db, buyerpersonaId) {
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

  export async function getAllTitlesWithOutline(db, keywordPlanId) {
    const titlesWithOutline = [];
    const keywordsRef = db.collection(`keywordsplans/${keywordPlanId}/keywords`);
    const keywordsSnapshot = await keywordsRef.get();
    for (const keywordDoc of keywordsSnapshot.docs) {
      const titlesRef = keywordsRef.doc(keywordDoc.id).collection('titles');
      const titlesSnapshot = await titlesRef.where('outline', '!=', null).get();
      for (const titleDoc of titlesSnapshot.docs) {
        const titleData = titleDoc.data();
        if (titleData.outline && (titleData.contentId === undefined || titleData.contentId === null)) { 
          titlesWithOutline.push({
            keywordId: keywordDoc.id,
            titleId: titleDoc.id
          });
        }
      }
    }
    return titlesWithOutline;
  }

  export async function getKeywordAndTitleData(db, keywordPlanId, keywordId, titleId) {
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