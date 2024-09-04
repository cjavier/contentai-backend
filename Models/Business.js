// models/Business.js
import { Model } from 'objection';

class Business extends Model {
  static get tableName() {
    return 'businesses';
  }
  static get idColumn() {
    return 'id'; // asegúrate de que este sea el nombre correcto de tu columna ID
  }


  static get jsonSchema() {
    return {
      type: 'object',
      required: ['empresa', 'userId'],

      properties: {
        id: { type: 'integer' },
        empresa: { type: 'string' },
        firstname: { type: 'string' },
        lastname: { type: 'string' },
        openaiModel: { type: 'string' },
        openaikey: { type: 'string' },
        userId: { type: 'string' },
        wpWebsiteUrl: { type: 'string' },
        wpUsername: { type: 'string' },
        wpAppPassword: { type: 'string' },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' }
      }
    };
  }

  static get relationMappings() {
    // Agrega aquí las relaciones si es necesario
  }
}

export default Business;