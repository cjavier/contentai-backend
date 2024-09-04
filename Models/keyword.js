// models/Keyword.js
import { Model } from 'objection';
import KeywordPlan from './keywordPlan.js'; 
import Title from './Title.js';
import Content from './Content.js';

class Keyword extends Model {
  static get tableName() {
    return 'keywords';
  }

  static get relationMappings() {
    return {
      keywordPlan: {
        relation: Model.BelongsToOneRelation,
        modelClass: KeywordPlan,
        join: {
          from: 'keywords.keywordplanid',
          to: 'keywordplans.id'
        }
      },
      titles: {
        relation: Model.HasManyRelation,
        modelClass: Title,
        join: {
          from: 'keywords.id',
          to: 'titles.keywordId'
        }
      },
      contents: {
        relation: Model.HasManyRelation,
        modelClass: Content,
        join: {
          from: 'keywords.id',
          to: 'contents.keywordId'
        }
      }
    };
  }
}

export default Keyword;