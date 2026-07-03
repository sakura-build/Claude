const util = require('../../utils/util.js');
const { ORDER_STATUS_MAP, STATUS_TRANSITIONS, PAGE_SIZE } = require('../../utils/const.js');

Page({
  data: {
    orders: [],
    activeFilter: 'all',       // 'all' | 'pending' | 'confirmed' | 'cooking' | 'completed'
    filterDate: '',            // YYYY-MM-DD，空表示全部
    statusColors: {},
    statusLabels: {},
    mealLabels: {},
    page: 1,
    hasMore: true,
    loading: false
  },

  onLoad() {
    // 准备映射表
    const statusColors = {};
    const statusLabels = {};
    Object.entries(ORDER_STATUS_MAP).forEach(([k, v]) => {
      statusColors[k] = v.color;
      statusLabels[k] = v.label;
    });
    const mealLabels = {};
    const app = getApp();
    app.globalData.MEAL_TYPES.forEach(m => { mealLabels[m.value] = m.label; });

    this.setData({ statusColors, statusLabels, mealLabels });
  },

  onShow() {
    this.setData({ orders: [], page: 1, hasMore: true });
    this.loadOrders();
  },

  async loadOrders() {
    if (this.data.loading || !this.data.hasMore) return;

    this.setData({ loading: true });
    const db = wx.cloud.database();
    const { activeFilter, filterDate, page, orders } = this.data;

    try {
      let query = db.collection('orders');

      // 状态筛选
      if (activeFilter !== 'all') {
        query = query.where({ status: activeFilter });
      }

      const result = await query
        .orderBy('createdAt', 'desc')
        .skip((page - 1) * PAGE_SIZE)
        .limit(PAGE_SIZE)
        .get();

      let newOrders = result.data || [];

      // 客户端按日期筛选
      if (filterDate) {
        newOrders = newOrders.filter(o => o.requestedDate === filterDate);
      }

      this.setData({
        orders: page === 1 ? newOrders : [...orders, ...newOrders],
        hasMore: (result.data || []).length >= PAGE_SIZE,
        loading: false
      });
    } catch (err) {
      console.error('加载订单失败:', err);
      this.setData({ loading: false });
      util.showToast('加载失败');
    }
  },

  // 切换状态筛选
  onFilterChange(e) {
    const filter = e.currentTarget.dataset.filter;
    if (filter === this.data.activeFilter) return;
    this.setData({ activeFilter: filter, orders: [], page: 1, hasMore: true });
    this.loadOrders();
  },

  // 日期筛选
  onDateChange(e) {
    this.setData({ filterDate: e.detail.value, orders: [], page: 1, hasMore: true });
    this.loadOrders();
  },

  // 清除日期筛选
  clearDateFilter() {
    this.setData({ filterDate: '', orders: [], page: 1, hasMore: true });
    this.loadOrders();
  },

  // 处理订单操作
  onOrderAction(e) {
    const { id } = e.currentTarget.dataset;
    const db = wx.cloud.database();

    db.collection('orders').doc(id).get().then(res => {
      const order = res.data;
      if (!order) return;
      const transitions = STATUS_TRANSITIONS[order.status] || [];

      if (transitions.length === 0) {
        util.showToast('该订单无需操作');
        return;
      }

      wx.showActionSheet({
        itemList: transitions.map(t => t.label),
        success: async (actionRes) => {
          const action = transitions[actionRes.tapIndex];
          try {
            const result = await wx.cloud.callFunction({
              name: 'updateOrderStatus',
              data: { orderId: id, newStatus: action.value }
            });
            if (result.result.success) {
              util.showToast('操作成功');
              this.setData({ orders: [], page: 1, hasMore: true });
              this.loadOrders();
            } else {
              util.showToast(result.result.error || '操作失败');
            }
          } catch (err) {
            util.showToast('操作失败，请重试');
          }
        }
      });
    });
  },

  // 新增订单
  onAddOrder() {
    wx.navigateTo({ url: '/pages/order-create/order-create' });
  },

  // 跳转菜谱详情
  onRecipeTap(e) {
    const { recipeId } = e.currentTarget.dataset;
    if (recipeId) {
      wx.navigateTo({ url: `/pages/recipe-detail/recipe-detail?id=${recipeId}` });
    }
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.setData({ orders: [], page: 1, hasMore: true });
    this.loadOrders().finally(() => wx.stopPullDownRefresh());
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.setData({ page: this.data.page + 1 });
      this.loadOrders();
    }
  }
});
