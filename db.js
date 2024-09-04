import knex from "knex";
import { Model } from 'objection';
import configFile from "./knexfile.js";

const db = knex(configFile.development);
Model.knex(db);

export default db;