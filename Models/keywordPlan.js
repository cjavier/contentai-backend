// models/KeywordPlan.js
import { Model } from 'objection';
import Keyword from './keyword.js';
import Content from './Content.js';
import BuyerPersona from './BuyerPerson.js'; 

class KeywordPlan extends Model {
  static get tableName() {
    return 'keywordplans';
  }

  static get relationMappings() {
    return {
        buyerPersona: {
            relation: Model.BelongsToOneRelation,
            modelClass: BuyerPersona,
            join: {
              from: 'keywordplans.buyerpersonaId',
              to: 'buyerpersonas.id'
            }
          },
      keywords: {
        relation: Model.HasManyRelation,
        modelClass: Keyword,
        join: {
          from: 'keywordplans.id',
          to: 'keywords.keywordplanid'
        }
      },
      contents: {
        relation: Model.HasManyRelation,
        modelClass: Content,
        join: {
          from: 'keywordplans.id',
          to: 'contents.keywordPlanId'
        }
      }
    };
  }
}

export default KeywordPlan;