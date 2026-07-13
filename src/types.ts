// 全局领域类型定义（本地存储实体）
export interface WeightRecord {
  id?: number
  date: string // YYYY-MM-DD
  value: number // kg
  note?: string
  createdAt: number
}

export interface Todo {
  id?: number
  title: string
  date: string // YYYY-MM-DD 计划日期（周=当周首日，月=当月首日）
  tag?: string
  done: boolean
  createdAt: number
  focusSeconds?: number // 累计专注时长（秒），由番茄钟累加
  period?: TodoPeriod // 归属周期：天/周/月（默认 day）
  kind?: 'event' | 'habit' // 周/月待办的类型：事件 / 习惯
  goalDays?: number // 习惯：每周/每月目标天数
  checkIns?: string[] // 习惯：已打卡日期列表
}

export type TodoPeriod = 'day' | 'week' | 'month'

export interface PomodoroSession {
  id?: number
  todoId?: number // 绑定的待办（可空）
  start: number // 时间戳
  end: number // 时间戳
  duration: number // 实际专注秒数
  type: 'focus' | 'break'
  done: boolean
}

export interface UserSettings {
  id?: number
  theme: 'light' | 'dark'
  pomodoroLen: number // 专注分钟
  breakLen: number // 休息分钟
  targetWeight?: number // 目标体重
  waterTarget?: number // 每日喝水目标 ml（= 杯数 × CUP_ML）
  browserNotify?: boolean // 浏览器通知开关
  exportFormat: 'json' | 'csv'
  onboarded: boolean
  nickname?: string // 昵称
  gender?: 'male' | 'female' | 'other' // 性别
  height?: number // 身高（厘米），用于 BMI 计算
}

export const DEFAULT_SETTINGS: UserSettings = {
  theme: 'light',
  pomodoroLen: 25,
  breakLen: 5,
  targetWeight: undefined,
  waterTarget: 2000, // 8 杯 × 250ml（成年人常见建议饮水量）
  exportFormat: 'json',
  onboarded: false,
  height: 170,
}

// ---- P2 实体 ----

export interface MoodEntry {
  id?: number
  date: string
  mood: number // 1-5（5 最开心）
  text?: string
  createdAt: number
}

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export interface IntakeRecord {
  id?: number
  date: string
  kind: 'water' | 'diet'
  amount?: number // 喝水：ml
  meal?: MealType // 饮食：餐别
  text?: string // 饮食备注 / 喝水备注
  createdAt: number
}

export interface BowelRecord {
  id?: number
  date: string // YYYY-MM-DD
  count: number // 排便次数（0 = 未记录/未排便；勾选后默认 1）
  createdAt: number
}

// ---- 灵感随心记 ----
export interface Note {
  id?: number
  date: string // YYYY-MM-DD
  time: string // HH:MM
  title: string
  content: string
  images?: string[] // 图片 base64（已压缩）
  createdAt: number
}
