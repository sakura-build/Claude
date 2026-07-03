Component({
  properties: {
    steps: {
      type: Array,
      value: [{ stepNum: 1, description: '', timer: '', image: '' }]
    }
  },

  methods: {
    // 步骤描述
    onDescChange(e) {
      const { index } = e.currentTarget.dataset;
      const steps = [...this.data.steps];
      steps[index].description = e.detail.value;
      this.triggerChange(steps);
    },

    // 计时器
    onTimerChange(e) {
      const { index } = e.currentTarget.dataset;
      const steps = [...this.data.steps];
      steps[index].timer = e.detail.value;
      this.triggerChange(steps);
    },

    // 步骤配图
    async onChooseImage(e) {
      const { index } = e.currentTarget.dataset;
      try {
        const res = await wx.chooseImage({
          count: 1,
          sizeType: ['compressed'],
          sourceType: ['album', 'camera']
        });

        wx.showLoading({ title: '上传中...' });
        const cloudRes = await wx.cloud.uploadFile({
          cloudPath: `steps/${Date.now()}-${Math.random().toString(36).slice(2)}.${res.tempFilePaths[0].split('.').pop()}`,
          filePath: res.tempFilePaths[0]
        });

        const steps = [...this.data.steps];
        steps[index].image = cloudRes.fileID;
        this.triggerChange(steps);
        wx.hideLoading();
      } catch (err) {
        wx.hideLoading();
        if (err.errMsg && err.errMsg.includes('cancel')) return;
        wx.showToast({ title: '上传失败', icon: 'none' });
      }
    },

    // 删除步骤图
    removeImage(e) {
      const { index } = e.currentTarget.dataset;
      const steps = [...this.data.steps];
      steps[index].image = '';
      this.triggerChange(steps);
    },

    // 添加步骤
    addStep() {
      const steps = [...this.data.steps, {
        stepNum: this.data.steps.length + 1,
        description: '',
        timer: '',
        image: ''
      }];
      this.triggerChange(steps);
    },

    // 删除步骤
    removeStep(e) {
      const { index } = e.currentTarget.dataset;
      if (this.data.steps.length <= 1) return;
      const steps = [...this.data.steps];
      steps.splice(index, 1);
      // 重新编号
      steps.forEach((s, i) => { s.stepNum = i + 1; });
      this.triggerChange(steps);
    },

    triggerChange(steps) {
      this.setData({ steps });
      this.triggerEvent('change', { steps });
    }
  }
});
