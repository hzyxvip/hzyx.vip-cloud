import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import updateLocale from 'dayjs/plugin/updateLocale'
import zhCn from 'element-plus/es/locale/lang/zh-cn'

/** 全局启用中文日历：dayjs + Element Plus 日期组件 */
export function setupChineseLocale() {
  dayjs.extend(updateLocale)
  dayjs.locale('zh-cn')
  dayjs.updateLocale('zh-cn', {
    weekStart: 1
  })
}

export const elementPlusZhCn = zhCn
