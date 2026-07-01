/**
 * ============================================================
 * 开票模块 JS 面板脚本
 *
 * 所属表单：mk_model_20250415uji22（开票申请）
 * 触发方式：低代码平台 JS 面板事件绑定
 *
 * 包含三个事件函数：
 *   onDetailChange    — 分项开票明细表数据变更监听
 *   onDetailChange_1  — 整单开票明细表数据变更监听
 *   onBeforeSubmit    — 表单提交前校验
 *
 * 开票类型（refundType）约定：
 *   0 = 整单开票
 *   1 = 分项开票
 * ============================================================
 */

// =============================================================================
// 一、通用工具函数
//    以下函数被多个事件处理函数共用，避免重复代码
// =============================================================================

/**
 * 检测子表中重复选择的数据行，返回需要删除的行号数组
 *
 * 业务场景：操作人在明细表中选择合同设备时，同一设备不允许重复选择。
 * 以指定字段 fdId 为唯一标识，第二次及之后出现的行视为重复。
 *
 * @param {Array}  rows    - data.values，子表所有行数据
 * @param {string} key     - 用作重复判定的控件字段名
 * @param {string} keyType - 字段取值方式
 *   'array'  — 字段值为数组，取 item[key][0].fdId（如关联选择控件）
 *   'scalar' — 字段值为标量，直接取 item[key]（如普通文本控件）
 *
 * @returns {number[]} 重复行的行号数组（行号 = fd_order - 1，从 0 开始）
 *
 * 示例：
 *   输入 rows = [{fd_order:1, fdId:'A'}, {fd_order:2, fdId:'B'}, {fd_order:3, fdId:'A'}]
 *   返回 [2]（fd_order 为 3 的行是重复的，行号 = 3-1 = 2）
 */
function findDuplicateOrders(rows, key, keyType) {
  // 记录每个 fdId 首次出现的行号，key = fdId，value = 行号
  var firstSeen = new Map();
  // 收集所有重复行的行号
  var duplicates = [];

  rows.forEach(function (item) {
    var fdId;

    // 根据 keyType 决定如何从行数据中提取唯一标识
    if (keyType === 'array') {
      // 关联选择控件：字段值是一个数组，取第一个元素的 fdId
      if (!Array.isArray(item[key]) || item[key].length === 0) return;
      fdId = item[key][0].fdId;
    } else {
      // 普通控件：直接取字段值
      if (item[key] == null) return;
      fdId = item[key];
    }

    // fd_order 是平台内部行序号（从 1 开始），转换为 0-based 行号
    var order = item.fd_order - 1;

    if (firstSeen.has(fdId)) {
      // 该 fdId 已出现过，当前行为重复行，记录其行号
      duplicates.push(order);
    } else {
      // 首次出现，记录到 Map 中
      firstSeen.set(fdId, order);
    }
  });

  return duplicates;
}

/**
 * 检测子表中出卖人不一致的行，返回需要删除的行号数组
 *
 * 业务场景：一张发票中所有明细行的合同出卖人必须一致。
 * 判断逻辑：统计每个出卖人 fdId 在全表中的出现次数，
 * 仅出现 1 次的出卖人视为不一致（孤立的异类）。
 * 首行不参与校验，以其出卖人为基准。
 *
 * @param {Array}  rows - data.values，子表所有行数据
 * @param {string} key  - 出卖人字段名（关联选择控件，取值路径为 item[key][0].fdId）
 *
 * @returns {number[]} 不一致行的行号数组
 */
function findInvalidOrders(rows, key) {
  // 第一遍遍历：统计每个出卖人 fdId 在全表中出现的总次数
  var freq = new Map();

  rows.forEach(function (item) {
    if (!Array.isArray(item[key]) || item[key].length === 0) return;
    var fdId = item[key][0].fdId;
    // 累加计数：已存在则 +1，不存在则初始化为 1
    freq.set(fdId, (freq.get(fdId) || 0) + 1);
  });

  // 第二遍遍历：找出仅出现 1 次的出卖人所在行（跳过首行，首行作为基准）
  var invalid = [];
  rows.slice(1).forEach(function (item) {
    if (!Array.isArray(item[key]) || item[key].length === 0) return;
    var fdId = item[key][0].fdId;
    if (freq.get(fdId) === 1) {
      // 该出卖人在全表中仅此一条，视为不一致
      invalid.push(item.fd_order - 1);
    }
  });

  return invalid;
}

/**
 * 将子表首行的指定字段值同步到父表单的目标字段
 *
 * 业务场景：分项 / 整单开票时，需要将子表第一行的合同编号自动填入父表单，
 * 供后续流程节点或校验使用。
 *
 * @param {string} detailTableId - 子表 ID（如 'mk_model_20250415uji22_d_s0q4u'）
 * @param {string} sourceField   - 子表源字段名（含前导 '.'，如 '.fd_col_3113y8'）
 * @param {string} targetField   - 父表单目标字段全路径（如 'mk_model_20250415uji22.fd_col_tyzo7s'）
 */
function syncFirstRowToParent(detailTableId, sourceField, targetField) {
  var count = MKXFORM.getRowCount(detailTableId);
  // 子表无数据时无需同步
  if (count === 0) return;

  var value = MKXFORM.getControlValue(detailTableId + sourceField, 0);
  MKXFORM.setValue(targetField, value);
}

/**
 * 合并两个行号数组并去重，若非空则调用平台 API 删除对应行
 *
 * @param {number[]} arrA    - 第一组行号（如不一致的行号）
 * @param {number[]} arrB    - 第二组行号（如重复的行号）
 * @param {string}   tableId - 要删除行的子表 ID
 */
function deleteCombinedOrders(arrA, arrB, tableId) {
  // 手动合并去重（不使用 Set，兼容低版本 JS 引擎）
  var combined = [];
  arrA.concat(arrB).forEach(function (n) {
    if (combined.indexOf(n) === -1) combined.push(n);
  });

  if (combined.length > 0) {
    MKXFORM.deleteRow(tableId, combined);
  }
}

/**
 * 将重复校验和不一致校验的结果合并到一个警告弹窗中展示
 *
 * 业务场景：原逻辑中重复和不一致各弹一次窗，操作人需连点两次确认。
 * 优化为合并弹窗，一次展示所有问题，减少操作打断。
 *
 * @param {number[]} invalidOrders   - 不一致的行号数组
 * @param {number[]} duplicateOrders - 重复的行号数组
 * @param {string}   type            - 弹窗文案类型
 *   'item'  — 分项开票（"选择合同的出卖人不一致 / 重复选择合同设备"）
 *   'whole' — 整单开票（"存在合同出卖人不同 / 重复选择开票合同"）
 */
function showCombinedWarning(invalidOrders, duplicateOrders, type) {
  var hasDup = duplicateOrders.length > 0;
  var hasInv = invalidOrders.length > 0;

  // 没有问题直接返回，不弹窗
  if (!hasDup && !hasInv) return;

  // 拼接提示文案：两种问题都存在时用分号连接
  var content = '';
  if (type === 'item') {
    if (hasInv) content = content + '选择合同的出卖人不一致，请重新选择';
    if (hasInv && hasDup) content = content + '；';
    if (hasDup) content = content + '重复选择合同设备，请重新选择';
  } else {
    if (hasInv) content = content + '存在合同出卖人不同，请重新选择';
    if (hasInv && hasDup) content = content + '；';
    if (hasDup) content = content + '重复选择开票合同，请重新选择';
  }

  MKXFORM.modal({
    title: '警告',
    content: content,
    onOk: function () { },
    onCancel: function () { },
  });
}

// =============================================================================
// 二、明细变更处理
//    handleDetailChange 是 onDetailChange / onDetailChange_1 的通用处理器，
//    将校验 → 警告 → 删除 → 同步四步流程封装为一个函数，
//    两个事件函数只需传入不同的配置参数即可。
// =============================================================================

/**
 * 通用明细变更处理函数
 *
 * 执行流程（按顺序）：
 *   1. 检测出卖人不一致的行 → findInvalidOrders
 *   2. 检测重复选择的行     → findDuplicateOrders
 *   3. 合并弹窗警告         → showCombinedWarning
 *   4. 删除问题行           → deleteCombinedOrders
 *   5. 同步首行合同编号到父表单 → syncFirstRowToParent
 *
 * @param {object} value - onChange 事件回调的 value 参数
 * @param {object} opts  - 配置项
 * @param {string} opts.tableId      - 子表 ID
 * @param {string} opts.dupKey       - 重复检测字段名
 * @param {string} opts.dupKeyType   - 重复检测字段类型（'array' | 'scalar'）
 * @param {string} opts.supplierKey  - 出卖人不一致检测字段名
 * @param {string} opts.syncField    - 同步到父表单的源字段名
 * @param {string} opts.warningType  - 弹窗文案类型（'item' | 'whole'）
 */
function handleDetailChange(value, opts) {
  var invalidOrders = findInvalidOrders(value, opts.supplierKey);
  var duplicateOrders = findDuplicateOrders(value, opts.dupKey, opts.dupKeyType);

  showCombinedWarning(invalidOrders, duplicateOrders, opts.warningType);
  deleteCombinedOrders(invalidOrders, duplicateOrders, opts.tableId);
  syncFirstRowToParent(opts.tableId, opts.syncField, 'mk_model_20250415uji22.fd_col_tyzo7s');
}

// =============================================================================
// 三、事件处理函数
//    由低代码平台 JS 面板绑定到具体控件的事件上
// =============================================================================

/**
 * 分项开票明细表数据变更监听
 *
 * 绑定位置：子表 mk_model_20250415uji22_d_s0q4u 的 onDetailChange 事件
 * 触发时机：操作人在分项开票明细表中增删改行数据时
 */
function onDetailChange(value, extValue) {
  handleDetailChange(value, {
    tableId: 'mk_model_20250415uji22_d_s0q4u', // 分项开票明细子表
    dupKey: 'fd_col_s6hlhj',                    // 重复检测：合同设备 ID 列（标量字段）
    dupKeyType: 'scalar',                        // 直接取字段值
    supplierKey: 'fd_col_3113y8',                // 不一致检测：合同出卖人列（关联选择）
    syncField: 'fd_col_3113y8',                  // 同步首行出卖人到父表单
    warningType: 'item',                         // 使用分项开票的弹窗文案
  });
}

/**
 * 整单开票明细表数据变更监听
 *
 * 绑定位置：子表 mk_model_20250415uji22_d_x71o1 的 onDetailChange 事件
 * 触发时机：操作人在整单开票明细表中增删改行数据时
 */
function onDetailChange_1(value, extValue) {
  handleDetailChange(value, {
    tableId: 'mk_model_20250415uji22_d_x71o1', // 整单开票明细子表
    dupKey: 'fd_col_eala97',                    // 重复检测：合同编号列（关联选择控件）
    dupKeyType: 'array',                        // 取 item[key][0].fdId
    supplierKey: 'fd_col_0uhet9',               // 不一致检测：合同出卖人列（关联选择）
    syncField: 'fd_col_0dupez',                 // 同步首行合同编号到父表单
    warningType: 'whole',                       // 使用整单开票的弹窗文案
  });
}

// =============================================================================
// 四、提交前校验
//    onBeforeSubmit 在操作人点击提交时触发，返回 Promise。
//    resolve(true)  = 放行提交
//    resolve(false) = 阻止提交
// =============================================================================

/**
 * 表单提交前校验
 *
 * 校验流程：
 *   1. 草稿状态         → 直接放行
 *   2. 开票类型非 N2 节点 → 直接放行（只有 N2 节点需要校验）
 *   3. 收集合同编号数组（根据整单 / 分项分别处理）
 *   4. 分项开票时：先计算每行的 数量 x 单价 = 金额，更新到标的数据表
 *   5. 不满足校验前置条件 → 直接放行
 *   6. 串行调用两个第三方接口：
 *      a. function_ced427ce9d98a6be — 查合同是否正在开/退票中
 *      b. function_677ba9c5fcf226d8 — 查合同是否在单价调整中
 *     任一接口命中则弹窗 + resolve(false) 阻止提交
 *
 * @param {object} context - 平台提交上下文
 * @param {boolean} context.isDraft - 是否为暂存操作
 * @returns {Promise<boolean>}
 */
function onBeforeSubmit(context) {
  return new Promise(function (resolve) {
    // ---- 步骤 1：草稿直接放行 ----
    if (!!context.isDraft) {
      resolve(true);
      return;
    }

    // ---- 步骤 2：获取主表关键字段 ----
    // 流程节点编号（如 N2 = 开票节点）
    var node = MKXFORM.getValue('mk_model_20250415uji22.fd_col_fl2poa');
    // 合同客户名称（关联选择控件，取 fdId）
    var customer = MKXFORM.getValue('mk_model_20250415uji22.fd_col_ljwbnw');
    var customerId = customer && customer[0] ? customer[0].fdId : null;
    // 开票类型：0 = 整单开票，1 = 分项开票
    var refund = MKXFORM.getValue('mk_model_20250415uji22.fd_col_fnxrya');
    var refundType = refund && refund[0] ? refund[0].fdId : null;

    // 收集所有待校验的合同编号
    var contractArray = [];

    // ---- 步骤 3a：整单开票 — 从整单明细表收集合同编号 ----
    if (refundType == 0 && node == 'N2' && customerId != null) {
      var count1 = MKXFORM.getRowCount('mk_model_20250415uji22_d_x71o1');
      for (var i = 0; i < count1; i++) {
        // fd_col_eala97 = 合同编号列（关联选择控件）
        var val1 = MKXFORM.getControlValue('mk_model_20250415uji22_d_x71o1.fd_col_eala97', i);
        if (val1 && val1[0] && val1[0].fdName) {
          var name = val1[0].fdName;
          // 去重：同一合同编号只收集一次
          if (contractArray.indexOf(name) === -1) {
            contractArray.push(name);
          }
        }
      }
    }

    // ---- 步骤 3b：分项开票 — 计算金额 + 从分项明细表收集合同编号 ----
    if (refundType == 1 && node == 'N2' && customerId != null) {
      var count2 = MKXFORM.getRowCount('mk_model_20250415uji22_d_s0q4u');
      for (var j = 0; j < count2; j++) {
        // fd_col_2fj6e4 = 开票数量，fd_col_6bhyon = 单价
        var num = MKXFORM.getControlValue('mk_model_20250415uji22_d_s0q4u.fd_col_2fj6e4', j);
        var price = MKXFORM.getControlValue('mk_model_20250415uji22_d_s0q4u.fd_col_6bhyon', j);
        if (num != null && price != null) {
          // 计算金额 = 数量 x 单价，更新到标的数据表的对应行
          var amount = parseFloat(num) * parseFloat(price);
          MKXFORM.updateControl('mk_model_20250415uji22_d_4834r.fd_col_56fcep', j, amount);
        }

        // fd_col_sm7e4w = 合同编号列
        var val2 = MKXFORM.getControlValue('mk_model_20250415uji22_d_s0q4u.fd_col_sm7e4w', j);
        if (val2 && contractArray.indexOf(val2) === -1) {
          contractArray.push(val2);
        }
      }
    }

    // ---- 步骤 5：不满足校验前置条件则放行 ----
    // docStatus = '11' 表示流程已结束，无需校验
    var proStatus = MKXFORM.docStatus;
    if (!contractArray.length || customerId == null || proStatus == '11' || node != 'N2') {
      resolve(true);
      return;
    }

    // ---- 步骤 6a：第一道校验 — 合同是否正在开/退票中 ----
    MKXFORM.callTic({
      interfaceCode: 'function_ced427ce9d98a6be',
      param: { contractNoArray: contractArray }
    }, function (error, res) {
      // 接口返回了命中的合同数据，说明有合同正在开/退票
      if (res.data.length != 0) {
        // 拼接提示用的合同编号字符串
        var result = '';
        for (var k = 0; k < res.data.length; k++) {
          if (k > 0) result = result + ', ';
          result = result + res.data[k].fd_col_igto6v;
        }
        MKXFORM.modal({
          title: '提示',
          content: '当前明细表中，所选合同编号为' + result + '的合同正在开/退票中，请稍后操作',
          onOk: function () { },
          onCancel: function () { },
        });
        resolve(false);
        return;
      }

      // ---- 步骤 6b：第二道校验 — 合同是否在单价调整中 ----
      MKXFORM.callTic({
        interfaceCode: 'function_677ba9c5fcf226d8',
        param: { contractNoArray: contractArray }
      }, function (error, res) {
        if (res.data.length != 0) {
          var result1 = '';
          for (var m = 0; m < res.data.length; m++) {
            if (m > 0) result1 = result1 + ', ';
            result1 = result1 + res.data[m].contractNo;
          }
          MKXFORM.modal({
            title: '提示',
            content: '当前明细表中，所选合同编号为' + result1 + '的合同正在进行开票单价调整，需待其流程结束后方能发起开票申请！',
            onOk: function () { },
            onCancel: function () { },
          });
          resolve(false);
          return;
        }
        // 两道校验全部通过，放行提交
        resolve(true);
      });
    });
  });
}