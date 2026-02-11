export const KANBAN_COLUMNS = {
  IDEES: 'idees',
  A_FAIRE: 'a_faire',
  EN_COURS: 'en_cours',
  EN_REVISION: 'en_revision',
  TERMINE: 'termine'
};

export const ISSUE_TYPES = {
  BUG: 'bug',
  FEATURE: 'feature',
  QUESTION: 'question'
};

export const COLUMN_MAPPING = {
  [ISSUE_TYPES.BUG]: KANBAN_COLUMNS.A_FAIRE,
  [ISSUE_TYPES.FEATURE]: KANBAN_COLUMNS.IDEES,
  [ISSUE_TYPES.QUESTION]: KANBAN_COLUMNS.IDEES
};

export const DB_FILE_NAME = '.kaia';
