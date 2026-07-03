const util = require('../../utils/util.js');
const { CATEGORIES, PAGE_SIZE } = require('../../utils/const.js');

Page({
  data: {
    recipes: [],
    categories: CATEGORIES,
    activeCategory: '全部',
    searchKeyword: '',
    page: 1,
    hasMore: true,
    loading: false
  },

  onShow() {
    this.setData({ recipes: [], page: 1, hasMore: true });
    // 创建防抖搜索函数（只创建一次）
    if (!this._debouncedSearch) {
      this._debouncedSearch = util.debounce((keyword) => {
        this.setData({
          searchKeyword: keyword,
          recipes: [],
          page: 1,
          hasMore: true
        });
        this.loadRecipes();
      }, 500);
    }
    this.loadRecipes();
  },

  // 加载菜谱列表
  async loadRecipes() {
    if (this.data.loading || !this.data.hasMore) return;

    this.setData({ loading: true });
    const db = wx.cloud.database();
    const { activeCategory, searchKeyword, page, recipes } = this.data;

    try {
      // 构建查询条件（链式 where 为 AND 逻辑）
      let query = db.collection('recipes').where({ status: 'active' });

      if (activeCategory !== '全部') {
        query = query.where({ category: activeCategory });
      }
      if (searchKeyword) {
        query = query.where({
          name: db.RegExp({ regexp: searchKeyword, options: 'i' })
        });
      }

      const result = await query
        .orderBy('createdAt', 'desc')
        .skip((page - 1) * PAGE_SIZE)
        .limit(PAGE_SIZE)
        .get();

      const newRecipes = result.data || [];
      this.setData({
        recipes: page === 1 ? newRecipes : [...recipes, ...newRecipes],
        hasMore: newRecipes.length >= PAGE_SIZE,
        loading: false
      });
    } catch (err) {
      console.error('加载菜谱失败:', err);
      this.setData({ loading: false });
      util.showToast('加载失败，下拉刷新重试');
    }
  },

  // 切换分类
  onCategoryChange(e) {
    const category = e.currentTarget.dataset.category;
    if (category === this.data.activeCategory) return;

    this.setData({
      activeCategory: category,
      recipes: [],
      page: 1,
      hasMore: true
    });
    this.loadRecipes();
  },

  // 搜索
  onSearchInput(e) {
    this._debouncedSearch(e.detail.value);
  },

  onSearchConfirm(e) {
    this.setData({
      searchKeyword: e.detail.value,
      recipes: [],
      page: 1,
      hasMore: true
    });
    this.loadRecipes();
  },

  // 点击菜谱卡片
  onRecipeTap(e) {
    // recipe-card 是自定义组件，id 在 e.detail 中
    const id = e.detail.id;
    if (id) {
      wx.navigateTo({ url: `/pages/recipe-detail/recipe-detail?id=${id}` });
    }
  },

  // 新增菜谱
  onAddRecipe() {
    wx.navigateTo({ url: '/pages/recipe-edit/recipe-edit' });
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.setData({ recipes: [], page: 1, hasMore: true });
    this.loadRecipes().finally(() => wx.stopPullDownRefresh());
  },

  // 上滑加载更多
  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.setData({ page: this.data.page + 1 });
      this.loadRecipes();
    }
  }
});
