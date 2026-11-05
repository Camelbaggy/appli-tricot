import Dexie, { type Table } from 'dexie';
import type {
  AppEvent,
  Consumption,
  Counter,
  JacquardChart,
  JournalEntry,
  MeasurementProfile,
  Needle,
  Pattern,
  Project,
  ReaderState,
  Setting,
  ShoppingItem,
  StashItem,
  StoredFile,
  Swatch,
  WorkSession,
  Yarn,
} from './types';

export class AppDatabase extends Dexie {
  projects!: Table<Project, string>;
  patterns!: Table<Pattern, string>;
  yarns!: Table<Yarn, string>;
  stashItems!: Table<StashItem, string>;
  consumptions!: Table<Consumption, string>;
  counters!: Table<Counter, string>;
  journalEntries!: Table<JournalEntry, string>;
  workSessions!: Table<WorkSession, string>;
  files!: Table<StoredFile, string>;
  readerStates!: Table<ReaderState, string>;
  shoppingItems!: Table<ShoppingItem, string>;
  measurementProfiles!: Table<MeasurementProfile, string>;
  needles!: Table<Needle, string>;
  swatches!: Table<Swatch, string>;
  events!: Table<AppEvent, string>;
  settings!: Table<Setting, string>;
  jacquardCharts!: Table<JacquardChart, string>;

  constructor(name = 'appli-tricot') {
    super(name);
    // `updatedAt` est indexé sur chaque table pour la synchro (delta). Le booléen/undefined
    // `deletedAt` n'est pas indexable : le filtrage des supprimés se fait en mémoire.
    this.version(1).stores({
      projects: 'id, status, patternId, eventId, updatedAt',
      patterns: 'id, category, updatedAt',
      yarns: 'id, brand, weight, updatedAt',
      stashItems: 'id, yarnId, updatedAt',
      consumptions: 'id, projectId, stashItemId, updatedAt',
      counters: 'id, projectId, updatedAt',
      journalEntries: 'id, projectId, date, updatedAt',
      workSessions: 'id, projectId, startedAt, updatedAt',
      files: 'id, source, driveFileId, updatedAt',
      readerStates: 'id, fileId, updatedAt',
      shoppingItems: 'id, status, projectId, updatedAt',
      measurementProfiles: 'id, name, updatedAt',
      needles: 'id, sizeMm, updatedAt',
      swatches: 'id, yarnId, updatedAt',
      events: 'id, startDate, updatedAt',
      settings: 'id, &key, updatedAt',
      jacquardCharts: 'id, projectId, updatedAt',
    });
  }
}

export const db = new AppDatabase();

/** Noms de toutes les tables (utile à la synchro et aux sauvegardes). */
export const TABLE_NAMES = [
  'projects',
  'patterns',
  'yarns',
  'stashItems',
  'consumptions',
  'counters',
  'journalEntries',
  'workSessions',
  'files',
  'readerStates',
  'shoppingItems',
  'measurementProfiles',
  'needles',
  'swatches',
  'events',
  'settings',
  'jacquardCharts',
] as const satisfies readonly (keyof AppDatabase)[];

export type TableName = (typeof TABLE_NAMES)[number];
