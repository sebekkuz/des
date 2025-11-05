
import { create } from 'zustand'

export type ComponentsMap = Record<string, { type?: string }>
export type MetricPoint = { name: string; t: number; v: number }

type State = {
  components: ComponentsMap
  simTime: number
  running: boolean
  logs: string[]
  series: Record<string, { t: number[], v: number[] }>
  setComponents: (c: ComponentsMap) => void
  setSim: (t: number, running: boolean) => void
  pushLog: (msg: string) => void
  pushMetrics: (pts: MetricPoint[]) => void
  clear: () => void
}

export const useModelStore = create<State>((set, get) => ({
  components: {},
  simTime: 0,
  running: false,
  logs: [],
  series: {},
  setComponents: (components) => set({ components }),
  setSim: (t, running) => set({ simTime: t, running }),
  pushLog: (msg) => set({ logs: [...get().logs.slice(-500), msg] }),
  pushMetrics: (pts) => {
    const series = { ...get().series }
    for (const p of pts) {
      if (!series[p.name]) series[p.name] = { t: [], v: [] }
      series[p.name].t.push(p.t); series[p.name].v.push(p.v)
      if (series[p.name].t.length > 1000) {
        series[p.name].t.shift(); series[p.name].v.shift()
      }
    }
    set({ series })
  },
  clear: () => set({ components: {}, simTime: 0, running: false, logs: [], series: {} })
}))
