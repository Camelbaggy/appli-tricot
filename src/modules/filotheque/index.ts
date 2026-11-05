// Contrat public du module filothèque.
export { ProjectYarnPanel } from './ProjectYarnPanel';
/** Coût matière d'un projet (g, m, €) : `await projectMaterialCost(projectId)`. */
export { projectMaterialCost } from './data';
/** Version pure, sans accès à la base. */
export { computeMaterialCost, type MaterialCost } from './calc';
