const util = require('../../utils/util.js');
const { ORDER_STATUS_MAP, STATUS_TRANSITIONS, MEAL_TYPES } = require('../../utils/const.js');

Page({
  data: {
    todayOrders: [],
    recentRecipes: [],
    todayDate: '',
    statusColors: {},
    statusLabels: {},
    mealLabels: {},
    stats: {
      totalRecipes: 0,
      todayOrders: 0,
      pendingOrders: 0
    }
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
    MEAL_TYPES.forEach(m => { mealLabels[m.value] = m.label; });

    this.setData({
      todayDate: util.getToday(),
      statusColors,
      statusLabels,
      mealLabels
    });
  },

  onShow() {
    this.loadData();
  },

  async loadData() {
    const db = wx.cloud.database();
    const today = util.getToday();

    try {
      const [recipesCount, ordersResult, recentRecipes] = await Promise.all([
        db.collection('recipes').where({ status: 'active' }).count(),
        db.collection('orders').where({
          requestedDate: today,
          status: db.command.nin(['cancelled'])
        }).get(),
        db.collection('recipes')
          .where({ status: 'active' })
          .orderBy('createdAt', 'desc')
          .limit(5)
          .get()
      ]);

      const todayOrders = ordersResult.data || [];
      const pendingOrders = todayOrders.filter(o => o.status === 'pending');

      this.setData({
        todayOrders,
        recentRecipes: recentRecipes.data || [],
        'stats.totalRecipes': recipesCount.total,
        'stats.todayOrders': todayOrders.length,
        'stats.pendingOrders': pendingOrders.length
      });
    } catch (err) {
      console.error('加载首页数据失败:', err);
    }
  },

  // 点击订单 → 操作状态
  onOrderTap(e) {
    const { id } = e.currentTarget.dataset;
    this.handleOrderAction(id);
  },

  async handleOrderAction(orderId) {
    const db = wx.cloud.database();
    try {
      const res = await db.collection('orders').doc(orderId).get();
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
              data: { orderId, newStatus: action.value }
            });
            if (result.result.success) {
              util.showToast('操作成功');
              this.loadData();
            } else {
              util.showToast(result.result.error || '操作失败');
            }
          } catch (err) {
            util.showToast('操作失败，请重试');
          }
        }
      });
    } catch (err) {
      console.error('获取订单失败:', err);
    }
  },

  goShoppingList() {
    wx.navigateTo({ url: '/pages/shopping-list/shopping-list' });
  },

  goRecipes() {
    wx.switchTab({ url: '/pages/recipes/recipes' });
  },

  onRecipeTap(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({ url: `/pages/recipe-detail/recipe-detail?id=${id}` });
  }
});
