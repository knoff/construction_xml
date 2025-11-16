import * as React from "react";

import { DocsViewer } from "./DocsViewer";

export function DocsLayout() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-900">Документация проекта</h1>
        <p className="text-sm text-slate-600">
          Раздел содержит описание архитектуры, процессов разработки и стратегии тестирования. Документация хранится в
          Markdown-файлах в репозитории и отображается в режиме "только чтение".
        </p>
      </header>
      <DocsViewer />
    </div>
  );
}
