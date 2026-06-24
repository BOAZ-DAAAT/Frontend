export type DatasourceType = 'postgres' | 'mysql' | 'sqlite';

export type DatasourceSummary = {
  datasource_id: string;
  name: string;
  type: DatasourceType;
  description?: string | null;
};

export type DatasourceCredential = {
  [key: string]: unknown;
};

export type DatasourceCreatePayload = {
  name: string;
  type: DatasourceType;
  credential?: DatasourceCredential;
  metadata?: Record<string, unknown>;
};

export type DatasourceSchema = {
  tables: Array<{
    name: string;
    columns: Array<{
      name: string;
      type: string;
      nullable?: boolean;
    }>;
  }>;
};

export type DatasourceSampleRows = {
  columns: string[];
  rows: Array<Record<string, unknown>>;
};
