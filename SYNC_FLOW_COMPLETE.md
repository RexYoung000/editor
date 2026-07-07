# 教师端到学生端同步完整流程

> 作者：Wills.Deng  
> 整理日期：2026-04-27

---

## 一、初始化流程

### 1.1 URL 参数解析

教师端和学生端通过 URL 参数初始化连接信息：

**教师端 URL：**
```
http://localhost:8080/?course=xxx&type=1&ip=127.0.0.1&port=9001&roomid=10001&id=1001&ct=1&rl=dev&sc=1
```

**学生端 URL：**
```
http://localhost:8080/?course=xxx&type=2&ip=127.0.0.1&port=9001&roomid=10001&id=2001&ct=1&rl=dev&sc=1
```

**参数说明：**
- `course`: 课件 ID
- `type`: 用户类型（1=教师，2=学生，3=观察者）
- `ip`: Socket 服务器 IP
- `port`: Socket 服务器端口
- `roomid`: 房间 ID（**必须是纯数字，长度 >= 2**）
- `id`: 用户 ID
- `ct`: 客户端类型
- `rl`: 运行级别（dev/uat/prod）
- `sc`: 是否同步光标（1=是）

### 1.2 LaunchParam 初始化

SDK 通过 `getLaunchParam()` 解析 URL 参数并创建 `LaunchParam` 对象：

```javascript
// 解析 URL 参数
const params = new URLSearchParams(window.location.search);
const socketInfo = {
    ip: params.get('ip'),
    port: params.get('port'),
    roomID: params.get('roomid'),  // 注意：这里是 roomID
    userID: params.get('id'),
    userType: params.get('type')
};

// 创建 LaunchParam 实例
VipThink.launchParam = new LaunchParam(socketInfo);
```

---

## 二、Socket 连接流程

### 2.1 建立 WebSocket 连接

SDK 在初始化时自动建立 WebSocket 连接：

```javascript
// 连接到服务器
const ws = new WebSocket(`ws://${ip}:${port}`);

ws.onopen = function() {
    console.log('WebSocket 连接已建立');
    // 连接成功后，发送 Login 消息
};

ws.onmessage = function(event) {
    // 接收服务器消息
    const data = JSON.parse(event.data);
    VipThink.transMgr.handleTrans(data);
};

ws.onerror = function(error) {
    console.error('WebSocket 错误:', error);
};

ws.onclose = function() {
    console.log('WebSocket 连接已关闭');
};
```

### 2.2 发送 Login 消息

连接建立后，客户端发送 Login 消息进行身份验证：

```javascript
// Login 消息格式
const loginMsg = {
    cmd: 'Login',
    userId: VipThink.launchParam.userID,
    userType: VipThink.launchParam.userType,
    roomId: VipThink.launchParam.roomID
};

ws.send(JSON.stringify(loginMsg));
```

**服务器端处理：**
- 验证用户身份
- 创建用户会话（UserVO）
- 返回 Login 成功响应

### 2.3 课件加载完成后的初始化

课件加载完成后，触发 `LessonStartTrans` 事务：

```javascript
// LessonStartTrans 执行流程
class LessonStartTrans {
    execute() {
        // 1. 初始化课件数据
        // 2. 触发 EnterRoomFilter
        EnterRoomFilter.execute();
    }
}
```

---

## 三、EnterRoom 流程（关键步骤）

### 3.1 EnterRoomFilter 发送 EnterRoom 命令

这是**最关键的一步**，用户必须正确加入房间才能进行同步：

```javascript
// EnterRoomFilter.execute()
const enterRoomMsg = {
    cmd: 'EnterRoom',
    roomId: VipThink.launchParam.roomID,  // 必须是纯数字
    chgCurrentRoomId: true  // 设置为当前房间
};

ws.send(JSON.stringify(enterRoomMsg));
```

### 3.2 服务器端处理 EnterRoom

服务器收到 EnterRoom 命令后：

```java
// UpdateCachedData.java
public void handleEnterRoom(UserVO userVO, String roomId) {
    // 设置用户的当前房间 ID
    userVO.currentRoomId = roomId;
    
    // 将用户加入房间列表
    roomManager.addUserToRoom(roomId, userVO);
}
```

**重要：** 只有 `userVO.currentRoomId` 被正确设置后，服务器才会广播该用户的同步消息。

### 3.3 验证用户是否在房间内

可以通过以下代码验证：

```javascript
// 浏览器控制台验证
const GlobalModel = window.vipthink?.GlobalModel;
console.log('当前房间ID:', GlobalModel.user?.currentRoomId);
console.log('是否在房间内:', GlobalModel.isInRoom());
```

**预期输出：**
- 教师端：`currentRoomId: "10001"`, `isInRoom(): true`
- 学生端：`currentRoomId: "10001"`, `isInRoom(): true`

---

## 四、同步消息发送流程

### 4.1 教师端操作触发同步

当教师端进行操作时（例如移动鼠标、点击按钮等），触发同步：

```javascript
// 示例：鼠标移动触发光标同步
CursorBox.prototype.onMouseMove = function(e) {
    this.x = e.stageX;
    this.y = e.stageY;
    
    // 触发同步
    this.sync();
};

CursorBox.prototype.sync = function() {
    // 调用 ViewManager 处理同步
    ViewManager.handleSync({
        type: 'cursor',
        x: this.x,
        y: this.y
    });
};
```

### 4.2 ViewManager.handleSync()

```javascript
ViewManager.prototype.handleSync = function(data) {
    // 调用 TransManager 处理事务
    VipThink.transMgr.handleTrans({
        transType: 'SendCursor',
        data: data
    });
};
```

### 4.3 TransManager.handleTrans()

```javascript
TransManager.prototype.handleTrans = function(transData) {
    // 根据事务类型创建对应的 Trans 对象
    const trans = this.createTrans(transData.transType);
    
    // 执行事务
    trans.execute(transData.data);
};
```

### 4.4 SendCursorTrans 构建消息

```javascript
class SendCursorTrans {
    execute(data) {
        // 构建同步消息
        const syncMsg = {
            cmd: 'UpdateUserCache',
            userId: VipThink.launchParam.userID,
            roomId: VipThink.launchParam.roomID,
            data: {
                type: 'cursor',
                x: data.x,
                y: data.y,
                timestamp: Date.now()
            }
        };
        
        // 通过 UpdateUserCacheFilter 发送
        UpdateUserCacheFilter.send(syncMsg);
    }
}
```

### 4.5 UpdateUserCacheFilter 发送到服务器

```javascript
UpdateUserCacheFilter.prototype.send = function(msg) {
    // 通过 WebSocket 发送消息
    ws.send(JSON.stringify(msg));
};
```

---

## 五、服务器端广播流程

### 5.1 服务器验证房间 ID

服务器收到 `UpdateUserCache` 消息后，进行验证：

```java
// UpdateCachedData.java (第 98-105 行)
public void handleUpdateUserCache(UserVO sender, UpdateCacheMsg msg) {
    String roomId = sender.currentRoomId;
    
    // 验证用户是否在房间内
    if (roomId == null || roomId.length() < 2 || !roomId.equals(msg.roomId)) {
        // 拒绝更新数据
        log.warn("用户不在房间内，拒绝同步: userId=" + sender.id);
        return;
    }
    
    // 广播给房间内的所有用户
    broadcastToRoom(roomId, msg);
}
```

**关键验证条件：**
1. `sender.currentRoomId` 不为 null
2. `roomId.length() >= 2`
3. `sender.currentRoomId` 等于消息中的 `roomId`

### 5.2 广播给房间内所有用户

```java
public void broadcastToRoom(String roomId, UpdateCacheMsg msg) {
    List<UserVO> users = roomManager.getUsersInRoom(roomId);
    
    for (UserVO user : users) {
        // 不发送给自己
        if (user.id.equals(msg.userId)) {
            continue;
        }
        
        // 发送给其他用户
        user.session.send(msg);
    }
}
```

---

## 六、学生端接收同步消息

### 6.1 WebSocket 接收消息

```javascript
ws.onmessage = function(event) {
    const data = JSON.parse(event.data);
    
    // 交给 TransManager 处理
    VipThink.transMgr.handleTrans(data);
};
```

### 6.2 TransManager 分发消息

```javascript
TransManager.prototype.handleTrans = function(data) {
    // 根据消息类型创建对应的 Trans
    if (data.cmd === 'UpdateUserCache') {
        const trans = new HandleCursorTrans();
        trans.execute(data.data);
    }
};
```

### 6.3 HandleCursorTrans 处理光标数据

```javascript
class HandleCursorTrans {
    execute(data) {
        // 恢复光标位置
        CursorBox.recoverByData(data);
    }
}

CursorBox.recoverByData = function(data) {
    // 更新光标位置
    this.x = data.x;
    this.y = data.y;
    
    // 显示光标
    this.visible = true;
};
```

---

## 七、完整数据流图

```
教师端操作
    ↓
CursorBox.sync()
    ↓
ViewManager.handleSync()
    ↓
VipThink.transMgr.handleTrans()
    ↓
SendCursorTrans.execute()
    ↓
UpdateUserCacheFilter.send()
    ↓
WebSocket.send() → 服务器
    ↓
服务器验证 currentRoomId
    ↓
broadcastToRoom() → 学生端 WebSocket
    ↓
学生端 ws.onmessage
    ↓
VipThink.transMgr.handleTrans()
    ↓
HandleCursorTrans.execute()
    ↓
CursorBox.recoverByData()
    ↓
学生端显示教师光标
```

---

## 八、常见问题排查

### 8.1 同步失败的原因

1. **用户未正确加入房间**
   - 检查：`GlobalModel.user.currentRoomId` 是否为 null
   - 解决：确保 `EnterRoom` 命令正确发送

2. **roomId 格式不正确**
   - 检查：roomId 是否为纯数字，长度 >= 2
   - 解决：使用纯数字 roomId（如 `'10001'`）

3. **WebSocket 连接断开**
   - 检查：浏览器控制台是否有连接错误
   - 解决：重新连接或检查服务器状态

4. **服务器端验证失败**
   - 检查：服务器日志是否有 "拒绝同步" 的警告
   - 解决：确保 `currentRoomId` 与消息中的 `roomId` 一致

### 8.2 调试脚本

在浏览器控制台运行以下脚本进行调试：

```javascript
// 验证用户状态
const GlobalModel = window.vipthink?.GlobalModel;
console.log('=== 用户状态 ===');
console.log('用户ID:', GlobalModel.user?.id);
console.log('用户类型:', GlobalModel.user?.userType);
console.log('当前房间ID:', GlobalModel.user?.currentRoomId);
console.log('是否在房间内:', GlobalModel.isInRoom());
console.log('是否为教师:', GlobalModel.isLisChannelEditor);
console.log('是否通知:', GlobalModel.willNotify);

// 验证 URL 参数
const params = new URLSearchParams(window.location.search);
console.log('=== URL 参数 ===');
console.log('roomid:', params.get('roomid'));
console.log('id:', params.get('id'));
console.log('type:', params.get('type'));
console.log('ip:', params.get('ip'));
console.log('port:', params.get('port'));

// 验证 WebSocket 连接
console.log('=== WebSocket 状态 ===');
console.log('连接状态:', window.vipthink?.socket?.readyState);
// 0=CONNECTING, 1=OPEN, 2=CLOSING, 3=CLOSED
```

---

## 九、关键代码位置

### 前端代码（forge 项目）

- **URL 参数配置**: `src/components/Toolbar.tsx:29`
- **预览服务器配置**: `preview-server/sys_config.json`
- **SDK 基础库**: `preview-server/libs/sdk_baiya_base.js`

### SDK 内部（sdk_baiya_base.js）

- **LaunchParam 初始化**: 搜索 `function LaunchParam`
- **WebSocket 连接**: 搜索 `new WebSocket`
- **Login 消息**: 搜索 `cmd: 'Login'`
- **EnterRoom 消息**: 搜索 `cmd: 'EnterRoom'`
- **TransManager**: 搜索 `class TransManager`
- **SendCursorTrans**: 搜索 `class SendCursorTrans`
- **HandleCursorTrans**: 搜索 `class HandleCursorTrans`

### 服务器端（Java）

- **EnterRoom 处理**: `UpdateCachedData.java`
- **房间验证**: `UpdateCachedData.java:98-105`
- **广播逻辑**: `RoomManager.java`

---

## 十、总结

教师端到学生端的同步流程包含以下关键步骤：

1. **初始化**: URL 参数解析 → LaunchParam 创建
2. **连接**: WebSocket 连接 → Login 消息
3. **加入房间**: EnterRoom 命令 → 服务器设置 `currentRoomId`
4. **同步发送**: 操作触发 → TransManager → UpdateUserCache → 服务器
5. **服务器验证**: 检查 `currentRoomId` → 广播给房间内用户
6. **学生端接收**: WebSocket 接收 → TransManager → 更新组件状态

**最关键的一步是 EnterRoom**，只有正确加入房间后，服务器才会广播同步消息。
