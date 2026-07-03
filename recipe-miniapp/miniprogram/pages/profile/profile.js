const util = require('../../utils/util.js');

Page({
  data: {
    nickname: '',
    stats: {
      totalRecipes: 0,
      totalOrders: 0
    },
    showNicknameEdit: false,
    nicknameInput: ''
  },

  onShow() {
    const nickname = wx.getStorageSync('nickname') || '';
    this.setData({ nickname });
    this.loadStats();
  },

  async loadStats() {
    try {
      const db = wx.cloud.database();
      const [recipesCount, ordersCount] = await Promise.all([
        db.collection('recipes').where({ status: 'active' }).count(),
        db.collection('orders').count()
      ]);
      this.setData({
        'stats.totalRecipes': recipesCount.total,
        'stats.totalOrders': ordersCount.total
      });
    } catch (err) {
      console.error('加载统计数据失败:', err);
    }
  },

  // 显示昵称编辑
  showEditNickname() {
    this.setData({
      showNicknameEdit: true,
      nicknameInput: this.data.nickname
    });
  },

  // 保存昵称
  saveNickname() {
    const name = this.data.nicknameInput.trim();
    if (!name) {
      util.showToast('昵称不能为空');
      return;
    }
    wx.setStorageSync('nickname', name);
    this.setData({
      nickname: name,
      showNicknameEdit: false
    });
    util.showToast('保存成功');
  },

  // 取消编辑
  cancelEditNickname() {
    this.setData({ showNicknameEdit: false });
  },

  onNicknameInput(e) {
    this.setData({ nicknameInput: e.detail.value });
  },

  // 我的菜谱
  goMyRecipes() {
    wx.switchTab({ url: '/pages/recipes/recipes' });
  },

  // 采购清单
  goShoppingList() {
    wx.navigateTo({ url: '/pages/shopping-list/shopping-list' });
  },

  // 关于
  showAbout() {
    wx.showModal({
      title: '关于',
      content: '家庭菜谱小程序\n版本 1.0.0\n\n专为家庭烹饪打造的菜谱管理和点餐工具。',
      showCancel: false
    });
  }
});
