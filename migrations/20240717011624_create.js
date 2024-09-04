
/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
  await knex.schema.createTable('businesses', (table) => {
    table.increments('id').primary();
    table.string('empresa').notNullable();
    table.string('firstname');
    table.string('lastname');
    table.string('openaiModel');
    table.string('openaikey');
    table.string('userId').notNullable();  
    table.string('wpWebsiteUrl');
    table.string('wpUsername');
    table.string('wpAppPassword');
    table.timestamps(true, true);
  });

  await knex.schema.createTable('tokenusage', (table) => {
    table.increments('id').primary();
    table.integer('completion_tokens').notNullable();
    table.integer('prompt_tokens').notNullable();
    table.integer('total_tokens').notNullable();
    table.integer('userId').notNullable();
    table.string('type');
    table.timestamps(true, true);
  });

  await knex.schema.createTable('buyerpersonas', (table) => {
    table.increments('id').primary();
    table.string('industry');
    table.string('language');
    table.string('maxCharsInTitle');
    table.string('minWordsInContent');
    table.string('name');
    table.string('userId').notNullable();
    table.string('topic');
    table.string('tone');
    table.text('title_prompt');
    table.text('content_prompt');
    table.text('buyerpersona_prompt');
    table.timestamps(true, true);
  }); 

  await knex.schema.createTable('keywordplans', (table) => {
    table.increments('id').primary();
    table.string('planName');
    table.string('description');
    table.integer('buyerpersonaId').unsigned().notNullable();
    table.string('userId').notNullable();
    table.boolean('allOutlineCreation');
    table.boolean('allContentCreation');
    table.timestamps(true, true);
    table.foreign('buyerpersonaId').references('buyerpersonas.id').onDelete('CASCADE');
  })

  await knex.schema.createTable('keywords', (table) => {
    table.increments('id').primary();
    table.string('keyword').notNullable();
    table.integer('keywordplanid').unsigned().notNullable();
    table.foreign('keywordplanid').references('keywordplans.id').onDelete('CASCADE');
    table.timestamps(true, true);
  });

  await knex.schema.createTable('titles', (table) => {
    table.increments('id').primary();
    table.text('outline');
    table.string('title').notNullable();
    table.integer('keywordId').unsigned().notNullable();
    table.integer('keywordPlanId').unsigned().notNullable();
    table.foreign('keywordId').references('keywords.id').onDelete('CASCADE');
    table.foreign('keywordPlanId').references('keywordplans.id').onDelete('CASCADE');
    table.timestamps(true, true);
});

await knex.schema.createTable('contents', (table) => {
  table.increments('id').primary();
  table.text('content').notNullable();
  table.string('category');
  table.string('contenttitle');
  table.string('published');
  table.string('userId').notNullable();
  table.integer('keywordId').unsigned().notNullable();
  table.integer('titleId').unsigned().notNullable().unique();
  table.integer('keywordPlanId').unsigned().notNullable();
  table.timestamps(true, true);

  table.foreign('keywordId').references('keywords.id').onDelete('CASCADE');
  table.foreign('titleId').references('titles.id').onDelete('CASCADE');
  table.foreign('keywordPlanId').references('keywordplans.id').onDelete('CASCADE');
});

};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async (knex) => {
  await knex.schema.dropTable('contents');
  await knex.schema.dropTable('titles');
  await knex.schema.dropTable('keywords'); 
  await knex.schema.dropTable('keywordplans'); 
  await knex.schema.dropTable('buyerpersonas');
  await knex.schema.dropTable('tokenusage');
  await knex.schema.dropTable('businesses');
};
