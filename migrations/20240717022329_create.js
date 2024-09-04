
/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
    return knex.schema.table('titles', (table) => {
        table.integer('contentId').references('id').inTable('contents').onDelete('CASCADE');
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async (knex) => {
    return knex.schema.table('titles', (table) => {
        table.dropColumn('contentId');
      });    
};
