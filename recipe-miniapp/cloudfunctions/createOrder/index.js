const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  const {
    recipeId,
    recipeName,
    recipeCover,
    requestedBy,
    requestedDate,
    mealType,
    quantity,
    note
  } = event;

  // 数据校验
  if (!recipeId || !requestedBy || !requestedDate || !mealType) {
    return { success: false, error: '缺少必填字段' };
  }

  if (!['breakfast', 'lunch', 'dinner'].includes(mealType)) {
    return { success: false, error: '无效的餐别' };
  }

  const now = new Date();
  try {
    const result = await db.collection('orders').add({
      data: {
        recipeId,
        recipeName: recipeName || '',
        recipeCover: recipeCover || '',
        requestedBy: requestedBy.trim(),
        requestedDate,
        mealType,
        quantity: parseInt(quantity) || 1,
        note: note || '',
        status: 'pending',
        createdAt: now,
        updatedAt: now
      }
    });

    return {
      success: true,
      orderId: result._id
    };
  } catch (err) {
    console.error('创建订单失败:', err);
    return {
      success: false,
      error: '创建订单失败，请重试'
    };
  }
};
