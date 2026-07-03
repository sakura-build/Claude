Component({
  properties: {
    ingredients: {
      type: Array,
      value: [{ name: '', quantity: '', unit: '个' }]
    },
    units: {
      type: Array,
      value: ['个', '克', '千克', '毫升', '升', '小勺', '大勺', '撮', '根', '片', '块', '瓣', '颗', '把', '适量']
    }
  },

  methods: {
    // 食材名变化
    onNameChange(e) {
      const { index } = e.currentTarget.dataset;
      const ingredients = [...this.data.ingredients];
      ingredients[index].name = e.detail.value;
      this.triggerChange(ingredients);
    },

    // 数量变化
    onQuantityChange(e) {
      const { index } = e.currentTarget.dataset;
      const ingredients = [...this.data.ingredients];
      ingredients[index].quantity = e.detail.value;
      this.triggerChange(ingredients);
    },

    // 单位变化
    onUnitChange(e) {
      const { index } = e.currentTarget.dataset;
      const ingredients = [...this.data.ingredients];
      ingredients[index].unit = this.data.units[e.detail.value];
      this.triggerChange(ingredients);
    },

    // 添加食材行
    addIngredient() {
      const ingredients = [...this.data.ingredients, { name: '', quantity: '', unit: '个' }];
      this.triggerChange(ingredients);
    },

    // 删除食材行
    removeIngredient(e) {
      const { index } = e.currentTarget.dataset;
      if (this.data.ingredients.length <= 1) return;
      const ingredients = [...this.data.ingredients];
      ingredients.splice(index, 1);
      this.triggerChange(ingredients);
    },

    triggerChange(ingredients) {
      this.setData({ ingredients });
      this.triggerEvent('change', { ingredients });
    }
  }
});
