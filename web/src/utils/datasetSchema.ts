/**
 * Helper to inject and clean up page-specific Schema.org Dataset JSON-LD in <head>.
 */
export const PAGE_DATASET_SCRIPT_ID = 'page-dataset-jsonld-schema';

export function upsertPageDatasetSchema(schema: Record<string, unknown> | null): void {
  if (typeof document === 'undefined') return;
  let script = document.getElementById(PAGE_DATASET_SCRIPT_ID) as HTMLScriptElement | null;
  if (!schema) {
    if (script) script.remove();
    return;
  }
  if (!script) {
    script = document.createElement('script');
    script.id = PAGE_DATASET_SCRIPT_ID;
    script.type = 'application/ld+json';
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(schema);
}

export function removePageDatasetSchema(): void {
  if (typeof document === 'undefined') return;
  const el = document.getElementById(PAGE_DATASET_SCRIPT_ID);
  if (el) el.remove();
}
