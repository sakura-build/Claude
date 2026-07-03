/**
 * 通用工具函数
 */

/**
 * 格式化日期为 YYYY-MM-DD
 */
const formatDate = (date) => {
  const d = date || new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * 获取明天的日期
 */
const getTomorrow = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return formatDate(d);
};

/**
 * 获取今天的日期
 */
const getToday = () => {
  return formatDate(new Date());
};

/**
 * 格式化日期显示（今天、明天、具体日期）
 */
const formatDateDisplay = (dateStr) => {
  const today = getToday();
  const tomorrow = getTomorrow();
  if (dateStr === today) return '今天';
  if (dateStr === tomorrow) return '明天';
  return dateStr;
};

/**
 * 格式化时间 ago
 */
const timeAgo = (dateStr) => {
  const now = new Date();
  const date = new Date(dateStr);
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;
  return formatDate(date);
};

/**
 * Toast 提示封装
 */
const showToast = (title, icon = 'none') => {
  wx.showToast({ title, icon, duration: 2000 });
};

/**
 * 加载提示
 */
const showLoading = (title = '加载中...') => {
  wx.showLoading({ title, mask: true });
};

const hideLoading = () => {
  wx.hideLoading();
};

/**
 * 确认弹窗
 */
const showConfirm = (title, content) => {
  return new Promise((resolve) => {
    wx.showModal({
      title,
      content,
      success: (res) => resolve(res.confirm),
      fail: () => resolve(false)
    });
  });
};

/**
 * 防抖
 */
const debounce = (fn, delay = 300) => {
  let timer = null;
  return function (...args) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
};

/**
 * 获取订单状态显示信息
 */
const getStatusInfo = (status) => {
  const app = getApp();
  return app.globalData.ORDER_STATUS.find(s => s.value === status) || { label: status, color: '#999' };
};

/**
 * 获取餐别显示文字
 */
const getMealTypeLabel = (value) => {
  const app = getApp();
  const meal = app.globalData.MEAL_TYPES.find(m => m.value === value);
  return meal ? meal.label : value;
};

/**
 * 获取难度显示文字
 */
const getDifficultyLabel = (value) => {
  const app = getApp();
  const diff = app.globalData.DIFFICULTIES.find(d => d.value === value);
  return diff ? diff.label : value;
};

module.exports = {
  formatDate,
  getTomorrow,
  getToday,
  formatDateDisplay,
  timeAgo,
  showToast,
  showLoading,
  hideLoading,
  showConfirm,
  debounce,
  getStatusInfo,
  getMealTypeLabel,
  getDifficultyLabel
};
