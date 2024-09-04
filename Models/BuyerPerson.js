// models/BuyerPersona.js
import { Model } from 'objection';
import KeywordPlan from './keywordPlan.js';

class BuyerPersona extends Model {
  static get tableName() {
    return 'buyerpersonas';
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['userId'],

      properties: {
        id: { type: 'integer' },
        industry: { type: 'string' },
        language: { type: 'string' },
        maxCharsInTitle: { type: 'string' },
        minWordsInContent: { type: 'string' },
        name: { type: 'string' },
        userId: { type: 'string' },
        topic: { type: 'string' },
        tone: { type: 'string' },
        title_prompt: { type: 'string' },
        content_prompt: { type: 'string' },
        buyerpersona_prompt: { type: 'string' },
        created_at: { type: 'string', format: 'date-time' }
      }
    };
  }

  static get relationMappings() {
    return {
      keywordPlans: {
        relation: Model.HasManyRelation,
        modelClass: KeywordPlan,
        join: {
          from: 'buyerpersonas.id',
          to: 'keywordplans.buyerpersonaId'
        }
      }
    };
  }
}

export default BuyerPersona;