const util = require('../../utils/util.js');

Page({
  data: {
    recipe: null,
    recipeId: '',
    showIngredients: true,
    showSteps: false,
    currentStep: 0,
    difficultyLabel: '',
    difficultyMap: { easy: '简单', medium: '中等', hard: '困难' }
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ recipeId: options.id });
      this.loadRecipe();
    }
  },

  async loadRecipe() {
    try {
      const db = wx.cloud.database();
      const res = await db.collection('recipes').doc(this.data.recipeId).get();
      const recipe = res.data;
      if (!recipe) {
        util.showToast('菜谱不存在');
        return;
      }
      this.setData({
        recipe,
        difficultyLabel: this.data.difficultyMap[recipe.difficulty] || ''
      });
      wx.setNavigationBarTitle({ title: recipe.name });
    } catch (err) {
      console.error('加载菜谱失败:', err);
      util.showToast('加载失败');
    }
  },

  // 切换标签
  switchTab(e) {
    const { tab } = e.currentTarget.dataset;
    this.setData({
      showIngredients: tab === 'ingredients',
      showSteps: tab === 'steps',
      currentStep: tab === 'steps' ? 0 : -1
    });
  },

  // 步骤详情（可展开查看单步）
  viewStep(e) {
    const { index } = e.currentTarget.dataset;
    this.setData({
      showSteps: true,
      showIngredients: false,
      currentStep: index
    });
  },

  // 点这道菜
  onOrderThis() {
    const { recipe } = this.data;
    if (!recipe) return;
    wx.navigateTo({
      url: `/pages/order-create/order-create?recipeId=${recipe._id}&recipeName=${encodeURIComponent(recipe.name)}&recipeCover=${encodeURIComponent(recipe.coverImage || '')}`
    });
  },

  // 编辑菜谱
  onEditRecipe() {
    wx.navigateTo({
      url: `/pages/recipe-edit/recipe-edit?id=${this.data.recipeId}`
    });
  },

  // 删除菜谱
  async onDeleteRecipe() {
    const confirmed = await util.showConfirm('确认删除', '确定要删除这道菜谱吗？此操作不可撤销。');
    if (!confirmed) return;

    try {
      const db = wx.cloud.database();
      await db.collection('recipes').doc(this.data.recipeId).update({
        data: { status: 'archived' }
      });
      util.showToast('已删除');
      setTimeout(() => wx.navigateBack(), 1500);
    } catch (err) {
      util.showToast('删除失败');
    }
  }
});
