/**
 * 全局常量定义
 */

// 菜谱分类
const CATEGORIES = ['全部', '家常菜', '面食', '汤粥', '凉菜', '烘焙', '小吃', '其他'];

// 餐别
const MEAL_TYPES = [
  { value: 'breakfast', label: '早餐' },
  { value: 'lunch', label: '午餐' },
  { value: 'dinner', label: '晚餐' }
];

// 难度
const DIFFICULTIES = [
  { value: 'easy', label: '简单' },
  { value: 'medium', label: '中等' },
  { value: 'hard', label: '困难' }
];

// 订单状态
const ORDER_STATUS_MAP = {
  pending: { label: '待确认', color: '#FF9800' },
  confirmed: { label: '已接单', color: '#2196F3' },
  cooking: { label: '制作中', color: '#FF6B35' },
  completed: { label: '已完成', color: '#4CAF50' },
  cancelled: { label: '已取消', color: '#999999' }
};

// 状态流转映射
const STATUS_TRANSITIONS = {
  pending: [
    { value: 'confirmed', label: '确认接单', color: '#2196F3' },
    { value: 'cancelled', label: '取消订单', color: '#999999' }
  ],
  confirmed: [
    { value: 'cooking', label: '开始制作', color: '#FF6B35' },
    { value: 'cancelled', label: '取消订单', color: '#999999' }
  ],
  cooking: [
    { value: 'completed', label: '制作完成', color: '#4CAF50' },
    { value: 'cancelled', label: '取消订单', color: '#999999' }
  ],
  completed: [],
  cancelled: []
};

// 单位选项
const UNITS = ['个', '克', '千克', '毫升', '升', '小勺', '大勺', '撮', '根', '片', '块', '瓣', '颗', '把', '适量'];

// 分页大小
const PAGE_SIZE = 20;

module.exports = {
  CATEGORIES,
  MEAL_TYPES,
  DIFFICULTIES,
  ORDER_STATUS_MAP,
  STATUS_TRANSITIONS,
  UNITS,
  PAGE_SIZE
};
