import { DatasourceForm } from '@/features/datasources/components/DatasourceForm';
import { DatasourceList } from '@/features/datasources/components/DatasourceList';

export function DatasourcesPage() {
  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-medium text-brand-100">Datasources</p>
        <h2 className="mt-2 text-3xl font-bold text-white">데이터소스 관리</h2>
        <p className="mt-3 text-slate-400">PostgreSQL, MySQL, SQLite 등의 연결 정보를 관리합니다.</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <DatasourceForm />
        <DatasourceList />
      </div>
    </section>
  );
}
