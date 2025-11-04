
export type ModelLike = {
  define?: Record<string, { type: string, inputs?: any }>;
  links?: Array<{ from: string, to: string }>;
};

export function toGraph(model: ModelLike) {
  const nodes = Object.entries(model.define || {}).map(([id, def]) => ({ id, type: String((def as any).type || 'Unknown') }));
  const links = (model.links || []).map((l: any) => ({ from: String(l.from), to: String(l.to) }));
  return { nodes, links };
}
