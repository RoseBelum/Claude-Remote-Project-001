declare module 'frappe-gantt' {
  interface GanttTask {
    id: string
    name: string
    start: string
    end: string
    progress?: number
    custom_class?: string
    [key: string]: unknown
  }

  interface GanttOptions {
    view_mode?: string
    date_format?: string
    on_click?: (task: GanttTask) => void
    on_date_change?: (task: GanttTask, start: string, end: string) => void
    on_progress_change?: (task: GanttTask, progress: number) => void
    [key: string]: unknown
  }

  class Gantt {
    constructor(element: HTMLElement | string, tasks: GanttTask[], options?: GanttOptions)
    change_view_mode(mode: string): void
    refresh(tasks: GanttTask[]): void
  }

  export default Gantt
}
