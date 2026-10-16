// Todo管理系统主JavaScript文件
// 初始化全局变量
let supabase;
let currentUser = null;
let isSupabaseLoaded = false;
let isAppInitialized = false;
let debugEnabled = true;
let allTasks = [];

// 显示调试信息
function logDebug(message) {
  if (!debugEnabled) return;
  console.log(message);
}

// 显示加载状态
function showLoading(message = "正在加载...") {
  logDebug(`显示加载状态: ${message}`);
  const loadingEl = document.getElementById("loading");
  if (loadingEl) {
    loadingEl.querySelector("p").textContent = message;
    loadingEl.style.display = "flex";
  }
}

// 隐藏加载状态
function hideLoading() {
  logDebug("隐藏加载状态");
  const loadingEl = document.getElementById("loading");
  if (loadingEl) {
    loadingEl.style.display = "none";
  }
}

// 检查配置是否完整
function checkConfig() {
  logDebug("检查配置完整性");

  if (
    !SUPABASE_URL ||
    SUPABASE_URL === "https://your-project.supabase.co" ||
    SUPABASE_URL.includes("your-project")
  ) {
    logDebug("错误: SUPABASE_URL 未正确配置");
    return false;
  }

  if (!SUPABASE_ANON_KEY || SUPABASE_ANON_KEY === "your-anon-key") {
    logDebug("错误: SUPABASE_ANON_KEY 未正确配置");
    return false;
  }

  logDebug("配置检查通过");
  return true;
}

// 初始化Supabase
function initSupabase() {
  logDebug("初始化 Supabase 客户端");

  try {
    // 检查 Supabase 库是否加载
    if (typeof window.supabase === "undefined") {
      logDebug("错误: Supabase 库未加载");
      throw new Error("Supabase库未加载");
    }

    logDebug("Supabase 库已加载");

    // 创建客户端实例
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // 检查客户端是否创建成功
    if (!supabase) {
      logDebug("错误: Supabase 客户端创建失败");
      throw new Error("Supabase客户端创建失败");
    }

    logDebug("Supabase 客户端创建成功");
    logDebug(`连接到: ${SUPABASE_URL}`);

    return true;
  } catch (err) {
    logDebug(`Supabase 初始化失败: ${err.message}`);
    alert(
      "Supabase初始化失败: " + err.message + "\n\n请检查Supabase配置是否正确",
    );
    return false;
  }
}

// 初始化应用
async function initApp() {
  if (isAppInitialized) {
    logDebug("应用已初始化，跳过");
    return;
  }

  logDebug("开始初始化应用");
  isAppInitialized = true;

  showLoading("初始化应用...");

  try {
    // 检查配置
    if (!checkConfig()) {
      logDebug("配置检查失败");
      document.getElementById("user-section").style.display = "block";
      hideLoading();
      return;
    }

    // 初始化Supabase
    if (!initSupabase()) {
      logDebug("Supabase 初始化失败");
      document.getElementById("user-section").style.display = "block";
      hideLoading();
      return;
    }

    // 检查会话
    checkSession();
  } catch (err) {
    logDebug(`Supabase加载失败: ${err.message}`);
    hideLoading();

    // 显示错误信息
    const errorDiv = document.createElement("div");
    errorDiv.style.cssText =
      "padding: 20px; margin: 20px; background: #fff3f3; border: 1px solid #ffcdd2; border-radius: 4px;";
    errorDiv.innerHTML = `
            <h3 style="color: #d32f2f; margin-top: 0;">Supabase加载失败</h3>
            <p>错误信息: ${err.message}</p>
            <p>可能的原因:</p>
            <ul>
                <li>网络连接问题</li>
                <li>CDN服务暂时不可用</li>
            </ul>
            <button onclick="window.location.reload()" style="padding: 8px 16px; background: #d32f2f; color: white; border: none; border-radius: 4px; cursor: pointer;">
                刷新页面重试
            </button>
        `;

    document.body.appendChild(errorDiv);
  }
}

// 检查会话
function checkSession() {
  logDebug("检查用户会话");
  showLoading("检查登录状态...");

  supabase.auth
    .getSession()
    .then(({ data, error }) => {
      if (error) {
        logDebug(`获取会话失败: ${error.message}`);
        console.error("获取会话失败:", error);
        hideLoading();
        document.getElementById("user-section").style.display = "block";
        return;
      }

      const session = data.session;
      if (session) {
        logDebug("检测到有效会话");
        currentUser = session.user;
        showTaskSection();
        loadTasks();
        document.getElementById("user-email").textContent = currentUser.email;
      } else {
        logDebug("没有检测到会话");
      }

      hideLoading();
      document.getElementById("user-section").style.display = "block";
    })
    .catch((err) => {
      logDebug(`检查会话时出错: ${err.message}`);
      console.error("检查会话时出错:", err);
      hideLoading();
      document.getElementById("user-section").style.display = "block";
      alert("检查会话失败: " + err.message);
    });
}

// 显示错误信息
function showLoginError(message) {
  logDebug(`显示登录错误: ${message}`);
  const errorDiv = document.getElementById("login-error");
  errorDiv.textContent = message;
  errorDiv.style.display = "block";
  setTimeout(() => {
    errorDiv.style.display = "none";
  }, 5000);
}

// 显示任务错误信息
function showTaskError(message) {
  logDebug(`显示任务错误: ${message}`);
  const errorDiv = document.getElementById("task-error");
  errorDiv.textContent = message;
  errorDiv.style.display = "block";
  setTimeout(() => {
    errorDiv.style.display = "none";
  }, 5000);
}

// 用户登录
async function loginUser() {
  logDebug("用户尝试登录");
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  if (!email || !password) {
    logDebug("错误: 请输入邮箱和密码");
    showLoginError("请输入邮箱和密码");
    return;
  }

  logDebug(`尝试登录: ${email}`);
  showLoading("正在登录...");

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      logDebug(`登录失败: ${error.message}`);
      throw error;
    }

    logDebug("登录成功");
    currentUser = data.user;
    showTaskSection();
    loadTasks();
    document.getElementById("user-email").textContent = currentUser.email;

    // 清空表单
    document.getElementById("email").value = "";
    document.getElementById("password").value = "";

    hideLoading();
  } catch (err) {
    logDebug(`登录过程中出错: ${err.message}`);
    hideLoading();
    let errorMessage = "登录失败";

    if (err.message) {
      errorMessage += ": " + err.message;

      // 特定错误处理
      if (err.message.includes("Invalid login credentials")) {
        errorMessage = "邮箱或密码错误";
      } else if (err.message.includes("Network Error")) {
        errorMessage = "网络错误，请稍后再试";
      }
    }

    showLoginError(errorMessage);
  }
}

// 用户注册
async function registerUser() {
  logDebug("用户尝试注册");

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  if (!email || !password) {
    logDebug("错误: 请输入邮箱和密码");
    showLoginError("请输入邮箱和密码");
    return;
  }

  if (password.length < 6) {
    logDebug("错误: 密码长度不足");
    showLoginError("密码长度至少6位");
    return;
  }

  logDebug(`尝试注册: ${email}`);
  showLoading("正在注册...");

  try {
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
    });

    if (error) {
      logDebug(`注册失败: ${error.message}`);
      throw error;
    }

    logDebug("注册成功");
    if (data.session) {
      // 自动登录新注册的用户
      logDebug("新用户已自动登录");
      currentUser = data.user;
      showTaskSection();
      loadTasks();
      document.getElementById("user-email").textContent = currentUser.email;
    } else {
      logDebug("需要邮箱确认");
      showLoginError("注册成功！请检查邮箱确认账户");
    }

    hideLoading();
  } catch (err) {
    logDebug(`注册过程中出错: ${err.message}`);
    hideLoading();
    let errorMessage = "注册失败";

    if (err.message) {
      errorMessage += ": " + err.message;

      // 特定错误处理
      if (err.message.includes("already exists")) {
        errorMessage = "该邮箱已被注册";
      } else if (err.message.includes("Network Error")) {
        errorMessage = "网络错误，请稍后再试";
      } else if (err.message.includes("500")) {
        errorMessage = "服务器错误，请检查Supabase配置";
      }
    }

    showLoginError(errorMessage);
  }
}

// 用户登出
async function logoutUser() {
  logDebug("用户尝试登出");

  showLoading("正在登出...");

  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      logDebug(`登出失败: ${error.message}`);
      throw error;
    }

    logDebug("登出成功");
    currentUser = null;
    document.getElementById("login-section").style.display = "block";
    document.getElementById("current-user").style.display = "none";
    document.getElementById("task-section").style.display = "none";

    hideLoading();
  } catch (err) {
    logDebug(`登出过程中出错: ${err.message}`);
    hideLoading();
    console.error("登出失败:", err);
    showLoginError("登出失败: " + err.message);
  }
}

// 显示任务区域
function showTaskSection() {
  logDebug("显示任务区域");
  document.getElementById("login-section").style.display = "none";
  document.getElementById("current-user").style.display = "block";
  document.getElementById("task-section").style.display = "block";
}

// 加载任务
async function loadTasks() {
  logDebug("加载任务数据");

  if (!currentUser) {
    logDebug("错误: 无当前用户");
    return;
  }

  showLoading("加载任务...");

  try {
    logDebug("执行任务查询");
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", currentUser.id)
      .order("created_at", { ascending: false });

    if (error) {
      logDebug(`任务查询失败: ${error.message}`);
      throw error;
    }

    logDebug(`成功加载 ${data.length} 条任务`);
    allTasks = data;
    renderTasks(data);
    hideLoading();
  } catch (err) {
    logDebug(`加载任务失败: ${err.message}`);
    hideLoading();
    console.error("加载任务失败:", err);
    alert("加载任务失败: " + err.message);
  }
}

// 渲染任务数据
function renderTasks(data) {
  logDebug(`渲染 ${data.length} 条任务`);
  const container = document.getElementById("task-table-body");
  container.innerHTML = "";

  // 确保表格可见
  const table = document.querySelector(".task-table");
  if (table) {
    table.style.display = "table";
  }

  if (data.length === 0) {
    // 显示空状态提示
    container.innerHTML = `
    <tr>
    <td colspan="5">
    <div class="empty-state">
    <i class="fas fa-clipboard-list"></i>
    <p>暂无任务</p>
    <p>添加新任务开始吧！</p>
    </div>
                </td>
            </tr>
        `;
    return;
  }

  data.forEach((task) => {
    logDebug(`渲染任务: ${task.id} - ${task.content}`);
    const row = document.createElement("tr");
    row.dataset.id = task.id;

    // 格式化时间
    const dueTime = task.due_time
      ? new Date(task.due_time).toLocaleString("zh-CN", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "未设置";

    const createdAt = new Date(task.created_at).toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

    // 状态样式
    const statusClass =
      task.status === "已完成" ? "status-completed" : "status-active";

    row.innerHTML = `
    <td>${task.content}</td>
    <td>${dueTime}</td>
    <td><span class="status-badge ${statusClass}">${task.status}</span></td>
    <td>${createdAt}</td>
    <td>
    <button class="btn btn-action btn-complete" data-id="${task.id}" data-status="${task.status}">
    <i class="fas ${task.status === "进行中" ? "fa-check" : "fa-undo"}"></i>
    ${task.status === "进行中" ? "完成" : "重置"}
    </button>
    <button class="btn btn-action btn-edit" data-id="${task.id}">
    <i class="fas fa-edit"></i> 编辑
    </button>
    <button class="btn btn-action btn-delete" data-id="${task.id}">
    <i class="fas fa-trash-alt"></i> 删除
    </button>
    </td>
    `;

    container.appendChild(row);
  });

  // 重新绑定按钮事件
  bindTaskButtons();
}

// 绑定任务按钮事件
function bindTaskButtons() {
  // 完成/重置按钮
  document.querySelectorAll(".btn-complete").forEach((btn) => {
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      const id = this.getAttribute("data-id");
      const status = this.getAttribute("data-status");
      toggleTaskStatus(id, status);
    });
  });

  // 编辑按钮
  document.querySelectorAll(".btn-edit").forEach((btn) => {
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      const id = this.getAttribute("data-id");
      editTask(id);
    });
  });

  // 删除按钮
  document.querySelectorAll(".btn-delete").forEach((btn) => {
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      const id = this.getAttribute("data-id");
      deleteTask(id);
    });
  });
}

// 切换任务状态
async function toggleTaskStatus(taskId, currentStatus) {
  logDebug(`切换任务状态: ${taskId} - ${currentStatus}`);

  const newStatus = currentStatus === "进行中" ? "已完成" : "进行中";
  logDebug(`新状态: ${newStatus}`);

  showLoading("更新任务状态...");

  try {
    const { error } = await supabase
      .from("tasks")
      .update({ status: newStatus })
      .eq("id", taskId);

    if (error) {
      logDebug(`状态更新失败: ${error.message}`);
      throw error;
    }

    logDebug("状态更新成功");
    loadTasks();
  } catch (err) {
    logDebug(`更新状态失败: ${err.message}`);
    hideLoading();
    console.error("更新状态失败:", err);
    alert("更新状态失败: " + err.message);
  }
}

// 编辑任务
async function editTask(taskId) {
  logDebug(`编辑任务: ${taskId}`);

  const task = allTasks.find((t) => t.id === taskId);
  if (!task) {
    logDebug(`错误: 找不到ID为 ${taskId} 的任务`);
    return;
  }

  // 检查权限
  if (task.user_id !== currentUser.id) {
    alert("您只能编辑自己创建的任务");
    return;
  }

  // 填充表单
  document.getElementById("edit-id").value = task.id;
  document.getElementById("task-content").value = task.content || "";
  document.getElementById("task-status").value = task.status || "进行中";

  // 格式化日期时间
  let dueTime = "";
  if (task.due_time) {
    const date = new Date(task.due_time);
    dueTime = date.toISOString().slice(0, 16);
  }
  document.getElementById("task-due-time").value = dueTime;

  // 更改模态框标题
  document.getElementById("modal-title").textContent = "编辑任务";

  // 打开模态框
  document.getElementById("task-modal").classList.add("show");
}

// 删除任务
async function deleteTask(taskId) {
  logDebug(`删除任务: ${taskId}`);

  const task = allTasks.find((t) => t.id === taskId);
  if (!task) {
    logDebug(`错误: 找不到ID为 ${taskId} 的任务`);
    return;
  }

  // 检查权限
  if (task.user_id !== currentUser.id) {
    alert("您只能删除自己创建的任务");
    return;
  }

  if (!confirm("确定要删除此任务吗？此操作不可恢复。")) {
    return;
  }

  showLoading("删除中...");

  try {
    const { error } = await supabase.from("tasks").delete().eq("id", taskId);

    if (error) {
      logDebug(`删除任务失败: ${error.message}`);
      throw error;
    }

    logDebug("任务删除成功");
    loadTasks();
  } catch (err) {
    logDebug(`删除任务失败: ${err.message}`);
    hideLoading();
    console.error("删除任务失败:", err);
    alert("删除任务失败: " + err.message);
  }
}

// 筛选任务
function filterTasks() {
  logDebug("筛选任务");

  // 获取当前激活的状态筛选按钮
  const activeStatusBtn = document.querySelector(".btn-status.active");
  const statusFilter = activeStatusBtn
    ? activeStatusBtn.getAttribute("data-status")
    : "all";

  const dateFilter = document.getElementById("date-filter").value;
  const searchText = document
    .getElementById("search-input")
    .value.toLowerCase();

  logDebug(
    `筛选条件: 状态=${statusFilter}, 日期=${dateFilter}, 搜索=${searchText}`,
  );

  let filteredData = allTasks;

  // 按状态筛选
  if (statusFilter !== "all") {
    filteredData = filteredData.filter((task) => task.status === statusFilter);
  }

  // 按日期筛选
  if (dateFilter) {
    filteredData = filteredData.filter((task) => {
      if (!task.due_time) return false;
      const taskDate = new Date(task.due_time).toISOString().split("T")[0];
      return taskDate === dateFilter;
    });
  }

  // 按搜索文本筛选
  if (searchText) {
    filteredData = filteredData.filter(
      (task) => task.content && task.content.toLowerCase().includes(searchText),
    );
  }

  logDebug(`筛选后剩余 ${filteredData.length} 条记录`);
  renderTasks(filteredData);
}

// 重置所有筛选条件
function resetFilters() {
  logDebug("重置所有筛选条件");

  // 重置状态筛选按钮
  document.querySelectorAll(".btn-status").forEach((btn) => {
    btn.classList.remove("active");
    if (btn.getAttribute("data-status") === "all") {
      btn.classList.add("active");
    }
  });

  // 重置日期筛选框
  document.getElementById("date-filter").value = "";

  // 重置搜索框
  document.getElementById("search-input").value = "";

  // 重新加载全部数据
  renderTasks(allTasks);
}

// 打开添加任务模态框
function openAddTaskModal() {
  logDebug("打开添加任务模态框");

  if (!currentUser) {
    logDebug("错误: 需要登录才能添加任务");
    alert("请先登录再添加任务");
    return;
  }

  // 重置表单
  document.getElementById("edit-id").value = "";
  document.getElementById("task-content").value = "";
  document.getElementById("task-due-time").value = "";
  document.getElementById("task-status").value = "进行中";
  document.getElementById("task-error").style.display = "none";

  // 更改模态框标题
  document.getElementById("modal-title").textContent = "添加新任务";

  document.getElementById("task-modal").classList.add("show");
}

// 关闭任务模态框
function closeTaskModal() {
  logDebug("关闭任务模态框");
  document.getElementById("task-modal").classList.remove("show");
}

// 保存任务（新增或编辑）
async function saveTask() {
  const saveButton = document.querySelector("#task-modal .btn-primary");
  const originalText = saveButton.textContent;

  try {
    // 显示加载状态
    saveButton.disabled = true;
    saveButton.innerHTML = '<span class="spinner"></span> 保存中...';

    const editId = document.getElementById("edit-id").value;
    if (editId) {
      await updateTask(editId);
    } else {
      await addTask();
    }
  } finally {
    // 恢复按钮状态
    saveButton.disabled = false;
    saveButton.textContent = originalText;
  }
}

// 添加任务
async function addTask() {
  logDebug("尝试添加任务");

  const content = document.getElementById("task-content").value;
  const dueTime = document.getElementById("task-due-time").value;
  const status = document.getElementById("task-status").value;

  if (!content || !content.trim()) {
    logDebug("错误: 任务内容为空");
    showTaskError("请输入任务内容");
    return;
  }

  logDebug(`添加任务: ${content}`);
  showLoading("添加任务...");

  try {
    logDebug("准备插入任务到数据库");
    const { data, error } = await supabase.from("tasks").insert([
      {
        user_id: currentUser.id,
        content: content.trim(),
        due_time: dueTime || null,
        status: status,
      },
    ]);

    if (error) {
      logDebug(`任务插入失败: ${error.message}`);
      throw error;
    }

    logDebug("任务添加成功");
    closeTaskModal();
    loadTasks();
  } catch (err) {
    logDebug(`添加任务失败: ${err.message}`);
    hideLoading();
    console.error("添加任务失败:", err);

    let errorMessage = "添加任务失败";
    if (err.message) {
      errorMessage += ": " + err.message;
    }

    showTaskError(errorMessage);
  }
}

// 更新任务
async function updateTask(taskId) {
  logDebug(`更新任务: ${taskId}`);

  const content = document.getElementById("task-content").value;
  const dueTime = document.getElementById("task-due-time").value;
  const status = document.getElementById("task-status").value;

  if (!content || !content.trim()) {
    logDebug("错误: 任务内容为空");
    showTaskError("请输入任务内容");
    return;
  }

  logDebug(`更新任务: ${taskId}`);
  showLoading("更新任务...");

  try {
    const updateData = {
      content: content.trim(),
      status: status,
      updated_at: new Date().toISOString(),
    };

    // 只有有值时才添加due_time字段
    if (dueTime) {
      updateData.due_time = dueTime;
    } else {
      updateData.due_time = null;
    }

    const { error } = await supabase
      .from("tasks")
      .update(updateData)
      .eq("id", taskId);

    if (error) {
      logDebug(`任务更新失败: ${error.message}`);
      throw error;
    }

    logDebug("任务更新成功");
    closeTaskModal();
    loadTasks();
  } catch (err) {
    logDebug(`更新任务失败: ${err.message}`);
    hideLoading();
    console.error("更新任务失败:", err);

    let errorMessage = "更新任务失败";
    if (err.message) {
      errorMessage += ": " + err.message;
    }

    showTaskError(errorMessage);
  }
}

// 支持回车键登录
document.addEventListener("DOMContentLoaded", () => {
  logDebug("页面加载完成");

  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");

  if (emailInput && passwordInput) {
    passwordInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        logDebug("检测到回车键，尝试登录");
        loginUser();
      }
    });
  }

  // 支持在任务模态框中按回车键保存
  const taskContentInput = document.getElementById("task-content");
  if (taskContentInput) {
    taskContentInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter" && e.ctrlKey) {
        // Ctrl+Enter 保存任务
        e.preventDefault();
        saveTask();
      }
    });
  }

  // 直接初始化应用
  initApp();
});

// 切换状态筛选
function changeStatusFilter(status) {
  logDebug(`切换状态筛选: ${status}`);

  // 更新按钮激活状态
  document.querySelectorAll(".btn-status").forEach((btn) => {
    btn.classList.remove("active");
    if (btn.getAttribute("data-status") === status) {
      btn.classList.add("active");
    }
  });

  // 执行筛选
  filterTasks();
}

// 首页和退出功能
function goToHome() {
  window.location.href = "index.html";
}

function logout() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("auth_password");
  window.location.href = "login.html";
}
