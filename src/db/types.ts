/** Champs communs à toutes les entités (voir docs/ARCHITECTURE.md). */
export interface BaseRecord {
  /** crypto.randomUUID() */
  id: string;
  /** epoch ms */
  createdAt: number;
  /** epoch ms, mis à jour à chaque écriture */
  updatedAt: number;
  /** suppression logique (tombstone), nécessaire à la synchro */
  deletedAt?: number;
}

/** Données saisissables d'une entité : tout sauf les champs gérés par les helpers. */
export type NewRecord<T extends BaseRecord> = Omit<T, keyof BaseRecord>;

export type JsonValue =
  string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

// ---------------------------------------------------------------- Projets

export type ProjectStatus = 'a_venir' | 'en_cours' | 'termine';
export type RecipientType = 'soi' | 'cadeau' | 'commande';

export interface Project extends BaseRecord {
  name: string;
  status: ProjectStatus;
  recipientType: RecipientType;
  recipientName?: string;
  /** ISO yyyy-mm-dd */
  startDate?: string;
  endDate?: string;
  patternId?: string;
  measurementProfileId?: string;
  eventId?: string;
  isPro: boolean;
  salePrice?: number;
  notes?: string;
  coverFileId?: string;
}

// ---------------------------------------------------------------- Patrons

export type PatternCategory =
  'femme' | 'homme' | 'enfant' | 'bebe' | 'accessoire' | 'maison' | 'autre';

export interface Pattern extends BaseRecord {
  title: string;
  designer?: string;
  category: PatternCategory;
  tags: string[];
  fileIds: string[];
  /** Indicateur « déjà tricoté » (cahier des charges §2). */
  knitted?: boolean;
  yarnWeight?: YarnWeight;
  yardageMin?: number;
  yardageMax?: number;
  needleSizeMm?: number;
  sourceUrl?: string;
  ravelryId?: number;
}

// ---------------------------------------------------------------- Laine

export type YarnWeight =
  'lace' | 'fingering' | 'sport' | 'dk' | 'worsted' | 'aran' | 'bulky' | 'super_bulky';

/** Référence d'un fil (catalogue). */
export interface Yarn extends BaseRecord {
  brand: string;
  /** gamme */
  line: string;
  weight: YarnWeight;
  /** composition, texte libre */
  fiber: string;
  ballWeightG: number;
  ballLengthM: number;
  needleSizeMm?: number;
  ravelryId?: number;
}

/** Pelotes possédées. Le stock restant est calculé, jamais stocké. */
export interface StashItem extends BaseRecord {
  yarnId: string;
  colorway: string;
  colorHex?: string;
  dyeLot?: string;
  initialQuantityG: number;
  pricePerBall?: number;
  location?: string;
  notes?: string;
}

export interface Consumption extends BaseRecord {
  projectId: string;
  stashItemId: string;
  quantityG: number;
}

// ---------------------------------------------------------------- Tricot en cours

export interface Counter extends BaseRecord {
  projectId: string;
  label: string;
  value: number;
  /** pour le décompte « restants » */
  target?: number;
  order: number;
}

export interface JournalEntry extends BaseRecord {
  projectId: string;
  text: string;
  /** ISO yyyy-mm-dd */
  date: string;
}

/** Session ouverte (endedAt absent) = chrono en marche ; au plus une à la fois. */
export interface WorkSession extends BaseRecord {
  projectId: string;
  startedAt: number;
  endedAt?: number;
}

// ---------------------------------------------------------------- Fichiers & liseuse

export type FileSource = 'local' | 'drive';

export interface StoredFile extends BaseRecord {
  name: string;
  mimeType: string;
  size: number;
  blob: Blob;
  driveFileId?: string;
  source: FileSource;
}

export interface ReaderState extends BaseRecord {
  fileId: string;
  page: number;
  zoom: number;
  rulerY: number;
  totalRows?: number;
  currentRow: number;
}

// ---------------------------------------------------------------- Phases suivantes

export type ShoppingStatus = 'a_acheter' | 'commande' | 'recu';

export interface ShoppingItem extends BaseRecord {
  /** Fil du catalogue, s'il existe déjà dans `yarns`. */
  yarnId?: string;
  brand: string;
  line: string;
  colorway?: string;
  colorHex?: string;
  weight?: YarnWeight;
  fiber?: string;
  ballWeightG?: number;
  ballLengthM?: number;
  /** nombre de pelotes */
  quantity: number;
  pricePerBall?: number;
  status: ShoppingStatus;
  projectId?: string;
  url?: string;
  ravelryId?: number;
  notes?: string;
}

/** Mesures en centimètres, clé = nom de la mesure (poitrine, bras, pointure…). */
export interface MeasurementProfile extends BaseRecord {
  name: string;
  relation?: string;
  measurements: Record<string, number>;
  notes?: string;
}

export type NeedleType = 'droites' | 'circulaires' | 'doubles_pointes' | 'crochet' | 'autre';

export interface Needle extends BaseRecord {
  type: NeedleType;
  sizeMm: number;
  /** longueur du câble ou des aiguilles */
  lengthCm?: number;
  material?: string;
  brand?: string;
  quantity: number;
  notes?: string;
}

/** Échantillon (gauge log). Tension en mailles / rangs pour 10 cm. */
export interface Swatch extends BaseRecord {
  yarnId?: string;
  stashItemId?: string;
  needleId?: string;
  needleSizeMm: number;
  stitchesPer10cm: number;
  rowsPer10cm: number;
  stitchPattern?: string;
  /** ISO yyyy-mm-dd */
  date: string;
  photoFileId?: string;
  notes?: string;
}

/** Événement de vente (festival, marché…). */
export interface AppEvent extends BaseRecord {
  name: string;
  startDate?: string;
  endDate?: string;
  location?: string;
  notes?: string;
}

/** Réglage clé/valeur ; `id` = `key`, ce qui garantit l'unicité et simplifie la synchro. */
export interface Setting extends BaseRecord {
  key: string;
  value: JsonValue;
}

export interface JacquardPaletteColor {
  hex: string;
  label?: string;
  yarnId?: string;
  colorway?: string;
}

export interface JacquardChart extends BaseRecord {
  name: string;
  /** largeur en mailles */
  width: number;
  /** hauteur en rangs */
  height: number;
  palette: JacquardPaletteColor[];
  /** index de palette, ligne par ligne (longueur = width × height), -1 = vide */
  cells: number[];
  /** échantillon pour le ratio « vraie maille » et le calcul de gabarit */
  stitchesPer10cm?: number;
  rowsPer10cm?: number;
  /** alerte si un fil flotte sur plus de N mailles */
  maxFloat?: number;
  yarnLineId?: string;
  projectId?: string;
  fileId?: string;
}
