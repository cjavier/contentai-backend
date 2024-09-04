// models/Title.js
import { Model } from 'objection';
import Keyword from './keyword.js';
import Content from './Content.js';
import KeywordPlan from './keywordPlan.js'; 

class Title extends Model {
  static get tableName() {
    return 'titles';
  }

  static get relationMappings() {
    return {
      keyword: {
        relation: Model.BelongsToOneRelation,
        modelClass: Keyword,
        join: {
          from: 'titles.keywordId',
          to: 'keywords.id'
        }
      },
      content: {
        relation: Model.HasOneRelation,
        modelClass: Content,
        join: {
          from: 'titles.id',
          to: 'contents.titleId'
        }
      },
      keywordPlan: {
        relation: Model.BelongsToOneRelation,
        modelClass: KeywordPlan,
        join: {
          from: 'titles.keywordplanid', 
          to: 'keywordplans.id'
        }
      }
    };
  }
}

export default Title;