// models/Content.js
import { Model } from 'objection';
import Keyword from './keyword.js';
import Title from './Title.js';
import KeywordPlan from './keywordPlan.js';

class Content extends Model {
  static get tableName() {
    return 'contents';
  }

  static get relationMappings() {
    return {
      keyword: {
        relation: Model.BelongsToOneRelation,
        modelClass: Keyword,
        join: {
          from: 'contents.keywordId',
          to: 'keywords.id'
        }
      },
      title: {
        relation: Model.BelongsToOneRelation,
        modelClass: Title,
        join: {
          from: 'contents.titleId',
          to: 'titles.id'
        }
      },
      keywordPlan: {
        relation: Model.BelongsToOneRelation,
        modelClass: KeywordPlan,
        join: {
          from: 'contents.keywordPlanId',
          to: 'keywordplans.id'
        }
      }
    };
  }
}

export default Content;