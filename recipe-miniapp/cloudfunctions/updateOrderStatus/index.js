const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

// 合法的状态转换表
const ALLOWED_TRANSITIONS = {
  'pending':   ['confirmed', 'cancelled'],
  'confirmed': ['cooking', 'cancelled'],
  'cooking':   ['completed', 'cancelled'],
  'completed': [],
  'cancelled': []
};

exports.main = async (event) => {
  const { orderId, newStatus } = event;

  if (!orderId || !newStatus) {
    return { success: false, error: '缺少必要参数' };
  }

  try {
    // 读取当前订单
    const orderRes = await db.collection('orders').doc(orderId).get();
    if (!orderRes.data) {
      return { success: false, error: '订单不存在' };
    }

    const currentStatus = orderRes.data.status;

    // 校验状态流转合法性
    const allowed = ALLOWED_TRANSITIONS[currentStatus];
    if (!allowed || !allowed.includes(newStatus)) {
      return {
        success: false,
        error: `不允许从「${currentStatus}」转为「${newStatus}」`
      };
    }

    // 更新状态
    await db.collection('orders').doc(orderId).update({
      data: {
        status: newStatus,
        updatedAt: new Date()
      }
    });

    return { success: true };
  } catch (err) {
    console.error('更新订单状态失败:', err);
    return {
      success: false,
      error: '操作失败，请重试'
    };
  }
};
