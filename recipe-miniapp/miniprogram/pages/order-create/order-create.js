const util = require('../../utils/util.js');
const { MEAL_TYPES } = require('../../utils/const.js');

Page({
  data: {
    // 预填信息（从菜谱详情跳转来）
    presetRecipeId: '',
    presetRecipeName: '',
    presetRecipeCover: '',

    // 表单
    recipes: [],           // 可选菜谱列表
    selectedRecipeId: '',
    selectedRecipeName: '',
    selectedRecipeCover: '',
    mealType: 'lunch',
    mealDate: '',
    quantity: 1,
    note: '',
    requestedBy: '',

    mealTypes: MEAL_TYPES,
    minDate: '',
    dateLabel: '',
    submitting: false,
    showRecipePicker: false,
    searchKeyword: ''
  },

  onLoad(options) {
    // 预设菜谱
    if (options.recipeId) {
      this.setData({
        presetRecipeId: options.recipeId,
        presetRecipeName: decodeURIComponent(options.recipeName || ''),
        presetRecipeCover: decodeURIComponent(options.recipeCover || ''),
        selectedRecipeId: options.recipeId,
        selectedRecipeName: decodeURIComponent(options.recipeName || ''),
        selectedRecipeCover: decodeURIComponent(options.recipeCover || '')
      });
    }

    // 默认日期为明天
    const tomorrow = util.getTomorrow();
    this.setData({
      mealDate: tomorrow,
      minDate: util.getToday(),
      dateLabel: '明天'
    });

    // 读取昵称
    const nickname = wx.getStorageSync('nickname') || '';
    this.setData({ requestedBy: nickname });

    // 加载菜谱列表（供选择）
    this.loadRecipes();
  },

  async loadRecipes() {
    try {
      const db = wx.cloud.database();
      const res = await db.collection('recipes')
        .where({ status: 'active' })
        .field({ name: true, coverImage: true, category: true })
        .orderBy('createdAt', 'desc')
        .limit(50)
        .get();
      this.setData({ recipes: res.data || [] });
    } catch (err) {
      console.error('加载菜谱失败:', err);
    }
  },

  // 切换菜谱选择器
  toggleRecipePicker() {
    this.setData({ showRecipePicker: !this.data.showRecipePicker });
  },

  // 搜索菜谱
  onRecipeSearch(e) {
    this.setData({ searchKeyword: e.detail.value });
  },

  // 选择菜谱
  selectRecipe(e) {
    const { id, name, cover } = e.currentTarget.dataset;
    this.setData({
      selectedRecipeId: id,
      selectedRecipeName: name,
      selectedRecipeCover: cover || '',
      showRecipePicker: false
    });
  },

  // 表单字段变更
  onFieldChange(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({ [field]: e.detail.value });
  },

  // 餐别选择
  onMealTypeChange(e) {
    this.setData({ mealType: e.currentTarget.dataset.value });
  },

  // 日期选择
  onDateChange(e) {
    this.setData({
      mealDate: e.detail.value,
      dateLabel: util.formatDateDisplay(e.detail.value)
    });
  },

  // 数量加减
  increaseQty() {
    if (this.data.quantity < 10) {
      this.setData({ quantity: this.data.quantity + 1 });
    }
  },
  decreaseQty() {
    if (this.data.quantity > 1) {
      this.setData({ quantity: this.data.quantity - 1 });
    }
  },

  // 提交订单
  async onSubmit() {
    if (!this.data.selectedRecipeId) {
      util.showToast('请选择一道菜');
      return;
    }
    if (!this.data.requestedBy.trim()) {
      util.showToast('请输入点餐人昵称');
      return;
    }

    this.setData({ submitting: true });
    try {
      const result = await wx.cloud.callFunction({
        name: 'createOrder',
        data: {
          recipeId: this.data.selectedRecipeId,
          recipeName: this.data.selectedRecipeName,
          recipeCover: this.data.selectedRecipeCover,
          requestedBy: this.data.requestedBy.trim(),
          requestedDate: this.data.mealDate,
          mealType: this.data.mealType,
          quantity: this.data.quantity,
          note: this.data.note.trim()
        }
      });

      if (result.result && result.result.success) {
        wx.showToast({ title: '点餐成功！', icon: 'success' });
        setTimeout(() => {
          wx.switchTab({ url: '/pages/orders/orders' });
        }, 1000);
      } else {
        util.showToast(result.result?.error || '点餐失败，请重试');
      }
    } catch (err) {
      console.error('点餐失败:', err);
      util.showToast('网络错误，请重试');
    } finally {
      this.setData({ submitting: false });
    }
  }
});
