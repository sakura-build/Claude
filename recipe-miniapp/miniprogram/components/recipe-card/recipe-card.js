Component({
  properties: {
    recipe: {
      type: Object,
      value: {}
    }
  },

  data: {
    difficultyLabel: ''
  },

  observers: {
    'recipe.difficulty': function(difficulty) {
      const difficultyMap = { easy: '简单', medium: '中等', hard: '困难' };
      this.setData({
        difficultyLabel: difficultyMap[difficulty] || ''
      });
    }
  },

  lifetimes: {
    attached() {
      const difficultyMap = { easy: '简单', medium: '中等', hard: '困难' };
      this.setData({
        difficultyLabel: difficultyMap[this.properties.recipe.difficulty] || ''
      });
    }
  },

  methods: {
    onTap() {
      this.triggerEvent('tap', { id: this.properties.recipe._id });
    }
  }
});
