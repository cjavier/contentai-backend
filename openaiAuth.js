import admin from 'firebase-admin';
import fetch from 'node-fetch';

export async function getOpenAIKey(db, userId) {
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