const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  const { date } = event;  // "YYYY-MM-DD"

  if (!date) {
    return { success: false, error: '请指定日期' };
  }

  try {
    // 1. 查询该日期所有活跃订单（非取消状态）
    const ordersRes = await db.collection('orders')
      .where({
        requestedDate: date,
        status: db.command.nin(['cancelled'])
      })
      .get();

    const orders = ordersRes.data || [];

    if (orders.length === 0) {
      return { success: true, date, orderCount: 0, list: [] };
    }

    // 2. 提取所有 recipeId 并去重
    const recipeIds = [...new Set(orders.map(o => o.recipeId))];

    // 3. 查询关联食谱的食材信息
    const recipesRes = await db.collection('recipes')
      .where({ _id: db.command.in(recipeIds) })
      .field({ name: true, ingredients: true })
      .get();

    const recipes = recipesRes.data || [];

    // 4. 构建 recipeId → recipe 的快速查找表
    const recipeMap = {};
    recipes.forEach(r => { recipeMap[r._id] = r; });

    // 5. 聚合食材：按 名称+单位 合并
    const ingredientMap = {};

    orders.forEach(order => {
      const recipe = recipeMap[order.recipeId];
      if (!recipe || !recipe.ingredients) return;

      recipe.ingredients.forEach(ing => {
        const key = `${ing.name}_${ing.unit}`;
        if (!ingredientMap[key]) {
          ingredientMap[key] = {
            name: ing.name,
            unit: ing.unit,
            totalQuantity: 0,
            sourceRecipes: []
          };
        }
        ingredientMap[key].totalQuantity += (ing.quantity || 0) * (order.quantity || 1);
        if (!ingredientMap[key].sourceRecipes.includes(recipe.name)) {
          ingredientMap[key].sourceRecipes.push(recipe.name);
        }
      });
    });

    const list = Object.values(ingredientMap);

    return {
      success: true,
      date,
      orderCount: orders.length,
      list
    };
  } catch (err) {
    console.error('生成采购清单失败:', err);
    return {
      success: false,
      error: '生成清单失败'
    };
  }
};
