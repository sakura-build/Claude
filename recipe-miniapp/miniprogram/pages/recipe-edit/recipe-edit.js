const util = require('../../utils/util.js');
const { CATEGORIES, DIFFICULTIES, UNITS } = require('../../utils/const.js');

Page({
  data: {
    isEdit: false,
    recipeId: '',
    form: {
      name: '',
      coverImage: '',
      category: '家常菜',
      description: '',
      cookingTime: 30,
      difficulty: 'easy',
      servings: 2,
      tags: [],
      ingredients: [{ name: '', quantity: '', unit: '个' }],
      steps: [{ stepNum: 1, description: '', timer: '', image: '' }]
    },
    categoryList: CATEGORIES.slice(1),  // 去掉"全部"
    categoryIndex: 0,
    difficulties: DIFFICULTIES,
    units: UNITS,
    tagInput: '',
    saving: false
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ isEdit: true, recipeId: options.id });
      wx.setNavigationBarTitle({ title: '编辑菜谱' });
      this.loadRecipe(options.id);
    } else {
      wx.setNavigationBarTitle({ title: '新增菜谱' });
      this.updateCategoryIndex();
    }
  },

  // 更新分类索引
  updateCategoryIndex() {
    const idx = this.data.categoryList.indexOf(this.data.form.category);
    this.setData({ categoryIndex: idx >= 0 ? idx : 0 });
  },

  async loadRecipe(id) {
    try {
      const db = wx.cloud.database();
      const res = await db.collection('recipes').doc(id).get();
      if (res.data) {
        const recipe = res.data;
        this.setData({
          form: {
            name: recipe.name || '',
            coverImage: recipe.coverImage || '',
            category: recipe.category || '家常菜',
            description: recipe.description || '',
            cookingTime: recipe.cookingTime || 30,
            difficulty: recipe.difficulty || 'easy',
            servings: recipe.servings || 2,
            tags: recipe.tags || [],
            ingredients: recipe.ingredients && recipe.ingredients.length > 0
              ? recipe.ingredients
              : [{ name: '', quantity: '', unit: '个' }],
            steps: recipe.steps && recipe.steps.length > 0
              ? recipe.steps
              : [{ stepNum: 1, description: '', timer: '', image: '' }]
          }
        });
        this.updateCategoryIndex();
      }
    } catch (err) {
      console.error('加载菜谱失败:', err);
      util.showToast('加载菜谱数据失败');
    }
  },

  // ===== 文本输入字段 =====
  onNameInput(e) {
    this.setData({ 'form.name': e.detail.value });
  },
  onDescInput(e) {
    this.setData({ 'form.description': e.detail.value });
  },

  // ===== 分类选择 =====
  onCategoryChange(e) {
    const idx = parseInt(e.detail.value);
    this.setData({
      categoryIndex: idx,
      'form.category': this.data.categoryList[idx]
    });
  },

  // ===== 难度选择 =====
  onDifficultyTap(e) {
    const { value } = e.currentTarget.dataset;
    this.setData({ 'form.difficulty': value });
  },

  // ===== 份数步进 =====
  increaseServings() {
    if (this.data.form.servings < 20) {
      this.setData({ 'form.servings': this.data.form.servings + 1 });
    }
  },
  decreaseServings() {
    if (this.data.form.servings > 1) {
      this.setData({ 'form.servings': this.data.form.servings - 1 });
    }
  },

  // ===== 烹饪时长 =====
  onCookingTimeChange(e) {
    this.setData({ 'form.cookingTime': e.detail.value });
  },

  // ===== 封面 =====
  async onChooseCover() {
    try {
      const res = await wx.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera']
      });
      util.showLoading('上传中...');
      const ext = res.tempFilePaths[0].split('.').pop() || 'jpg';
      const cloudRes = await wx.cloud.uploadFile({
        cloudPath: `covers/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`,
        filePath: res.tempFilePaths[0]
      });
      this.setData({ 'form.coverImage': cloudRes.fileID });
      util.hideLoading();
      util.showToast('封面上传成功');
    } catch (err) {
      util.hideLoading();
      if (err.errMsg && err.errMsg.includes('cancel')) return;
      util.showToast('上传失败');
    }
  },

  // ===== 标签 =====
  onTagInput(e) {
    this.setData({ tagInput: e.detail.value });
  },
  addTag() {
    const tag = this.data.tagInput.trim();
    if (!tag) return;
    if (this.data.form.tags.includes(tag)) {
      util.showToast('标签已存在'); return;
    }
    if (this.data.form.tags.length >= 6) {
      util.showToast('最多添加6个标签'); return;
    }
    this.setData({
      'form.tags': [...this.data.form.tags, tag],
      tagInput: ''
    });
  },
  removeTag(e) {
    const { index } = e.currentTarget.dataset;
    const tags = [...this.data.form.tags];
    tags.splice(index, 1);
    this.setData({ 'form.tags': tags });
  },

  // ===== 食材（组件事件）=====
  onIngredientsChange(e) {
    this.setData({ 'form.ingredients': e.detail.ingredients });
  },

  // ===== 步骤（组件事件）=====
  onStepsChange(e) {
    this.setData({ 'form.steps': e.detail.steps });
  },

  // ===== 保存 =====
  async onSave() {
    if (!this.data.form.name.trim()) {
      util.showToast('请输入菜名'); return;
    }

    const ingredients = this.data.form.ingredients.filter(
      ing => ing.name && ing.name.trim()
    );
    if (ingredients.length === 0) {
      util.showToast('请至少添加一种食材'); return;
    }

    const steps = this.data.form.steps.filter(
      s => s.description && s.description.trim()
    );
    if (steps.length === 0) {
      util.showToast('请至少添加一个步骤'); return;
    }

    const cleanedSteps = steps.map((s, i) => ({
      stepNum: i + 1,
      description: s.description.trim(),
      image: s.image || '',
      timer: parseInt(s.timer) || 0
    }));

    const cleanedIngredients = ingredients.map(ing => ({
      name: ing.name.trim(),
      quantity: parseFloat(ing.quantity) || 0,
      unit: ing.unit
    }));

    const data = {
      name: this.data.form.name.trim(),
      coverImage: this.data.form.coverImage,
      category: this.data.form.category,
      description: this.data.form.description.trim(),
      cookingTime: parseInt(this.data.form.cookingTime) || 30,
      difficulty: this.data.form.difficulty,
      servings: parseInt(this.data.form.servings) || 1,
      tags: this.data.form.tags,
      ingredients: cleanedIngredients,
      steps: cleanedSteps,
      updatedAt: new Date()
    };

    this.setData({ saving: true });
    try {
      const db = wx.cloud.database();
      if (this.data.isEdit) {
        await db.collection('recipes').doc(this.data.recipeId).update({ data });
      } else {
        data.status = 'active';
        data.createdAt = new Date();
        await db.collection('recipes').add({ data });
      }
      util.showToast(this.data.isEdit ? '修改成功' : '创建成功');
      setTimeout(() => wx.navigateBack(), 1000);
    } catch (err) {
      console.error('保存失败:', err);
      util.showToast('保存失败，请重试');
    } finally {
      this.setData({ saving: false });
    }
  }
});
