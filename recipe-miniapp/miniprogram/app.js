App({
  onLaunch: function () {
    // 初始化云开发
    if (wx.cloud) {
      wx.cloud.init({
        env: 'your-env-id',     // 替换为你的云开发环境ID
        traceUser: true
      });
    }

    // 获取系统信息
    const systemInfo = wx.getSystemInfoSync();
    this.globalData.systemInfo = systemInfo;
    this.globalData.statusBarHeight = systemInfo.statusBarHeight;

    // 读取本地存储的用户昵称
    const nickname = wx.getStorageSync('nickname');
    if (nickname) {
      this.globalData.nickname = nickname;
    }
  },

  globalData: {
    systemInfo: null,
    statusBarHeight: 0,
    nickname: '',                // 家庭成员昵称
    // 常量
    MEAL_TYPES: [
      { value: 'breakfast', label: '早餐' },
      { value: 'lunch', label: '午餐' },
      { value: 'dinner', label: '晚餐' }
    ],
    DIFFICULTIES: [
      { value: 'easy', label: '简单' },
      { value: 'medium', label: '中等' },
      { value: 'hard', label: '困难' }
    ],
    ORDER_STATUS: [
      { value: 'pending', label: '待确认', color: '#FF9800' },
      { value: 'confirmed', label: '已接单', color: '#2196F3' },
      { value: 'cooking', label: '制作中', color: '#FF6B35' },
      { value: 'completed', label: '已完成', color: '#4CAF50' },
      { value: 'cancelled', label: '已取消', color: '#999999' }
    ]
  }
});
