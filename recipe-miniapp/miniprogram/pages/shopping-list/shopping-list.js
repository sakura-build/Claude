const util = require('../../utils/util.js');

Page({
  data: {
    date: '',
    dateDisplay: '',
    list: [],
    orderCount: 0,
    loading: false,
    checkedItems: {},
    checkedCount: 0,
    allChecked: false
  },

  onLoad() {
    this.setData({
      date: util.getTomorrow(),
      dateDisplay: '明天'
    });
    this.loadList();
  },

  // 更新计算属性
  updateComputed() {
    const { list, checkedItems, date } = this.data;
    const checkedCount = list.filter(item => checkedItems[`${item.name}_${item.unit}`]).length;
    const allChecked = list.length > 0 && checkedCount === list.length;
    this.setData({
      checkedCount,
      allChecked,
      dateDisplay: util.formatDateDisplay(date)
    });
  },

  // 切换日期
  onDateChange(e) {
    this.setData({ date: e.detail.value });
    this.loadList();
  },

  async loadList() {
    this.setData({ loading: true });
    try {
      const result = await wx.cloud.callFunction({
        name: 'getShoppingList',
        data: { date: this.data.date }
      });

      if (result.result && result.result.success) {
        const list = result.result.list || [];
        this.setData({
          list,
          orderCount: result.result.orderCount || 0
        });

        // 恢复勾选状态
        const storageKey = `checked_${this.data.date}`;
        const saved = wx.getStorageSync(storageKey) || {};
        this.setData({ checkedItems: saved });
      } else {
        this.setData({ list: [], orderCount: 0, checkedItems: {}, checkedCount: 0 });
      }
    } catch (err) {
      console.error('加载采购清单失败:', err);
      this.setData({ list: [], orderCount: 0, checkedItems: {}, checkedCount: 0 });
      if (err.errMsg && err.errMsg.includes('cloud function')) {
        util.showToast('请先部署云函数');
      }
    } finally {
      this.setData({ loading: false });
      this.updateComputed();
    }
  },

  // 勾选食材
  toggleCheck(e) {
    const { key } = e.currentTarget.dataset;
    const checkedItems = { ...this.data.checkedItems };
    checkedItems[key] = !checkedItems[key];
    this.setData({ checkedItems });

    const storageKey = `checked_${this.data.date}`;
    wx.setStorageSync(storageKey, checkedItems);
    this.updateComputed();
  },

  // 一键复制清单
  copyList() {
    let text = `📋 采购清单 - ${this.data.dateDisplay || this.data.date}\n`;
    text += `共 ${this.data.orderCount} 道菜\n`;
    text += '━━━━━━━━━━━━━━\n\n';

    this.data.list.forEach((item) => {
      const key = `${item.name}_${item.unit}`;
      const checked = this.data.checkedItems[key] ? '☑' : '☐';
      text += `${checked} ${item.name} × ${item.totalQuantity} ${item.unit}\n`;
      text += `   来自：${item.sourceRecipes.join('、')}\n\n`;
    });

    wx.setClipboardData({
      data: text,
      success: () => util.showToast('已复制到剪贴板')
    });
  },

  // 一键全选/取消
  toggleAll() {
    const allChecked = this.data.list.every(
      item => this.data.checkedItems[`${item.name}_${item.unit}`]
    );

    const checkedItems = {};
    if (!allChecked) {
      this.data.list.forEach(item => {
        checkedItems[`${item.name}_${item.unit}`] = true;
      });
    }

    this.setData({ checkedItems });
    const storageKey = `checked_${this.data.date}`;
    wx.setStorageSync(storageKey, checkedItems);
    this.updateComputed();
  }
});
