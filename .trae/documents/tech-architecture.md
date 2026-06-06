# 企业级供应商竞价与反向拍卖自动化管理系统 - 技术架构

## 1. 架构设计

```mermaid
graph TB
    subgraph "客户端"
        Web["Web前端(React)"]
        Mobile["移动端(响应式)"]
    end

    subgraph "接入层"
        Nginx["Nginx反向代理"]
        LB["负载均衡"]
    end

    subgraph "应用层"
        WebServer["Web服务器(Express)"]
        Auth["认证服务"]
        APIGateway["API网关"]
    end

    subgraph "实时通信层"
        SocketIO["Socket.IO服务"]
        Redis["Redis Pub/Sub"]
    end

    subgraph "业务服务层"
        ProcurementSvc["采购需求服务"]
        SupplierSvc["供应商服务"]
        BiddingSvc["竞价引擎服务"]
        EvaluationSvc["评标服务"]
        ApprovalSvc["审批服务"]
        ContractSvc["合同服务"]
        FulfillmentSvc["履约服务"]
        ReportSvc["报告服务"]
        NotificationSvc["通知推送服务"]
    end

    subgraph "数据层"
        PostgreSQL["PostgreSQL"]
        RedisCache["Redis缓存"]
        FileStorage["文件存储"]
    end

    subgraph "外部集成"
        SSO["企业SSO"]
        WeChat["企业微信群机器人"]
        ESign["电子签署系统"]
        ERP["ERP系统"]
    end

    Web --> Nginx
    Mobile --> Nginx
    Nginx --> LB
    LB --> WebServer
    WebServer --> APIGateway
    APIGateway --> Auth
    APIGateway --> ProcurementSvc
    APIGateway --> SupplierSvc
    APIGateway --> BiddingSvc
    APIGateway --> EvaluationSvc
    APIGateway --> ApprovalSvc
    APIGateway --> ContractSvc
    APIGateway --> FulfillmentSvc
    APIGateway --> ReportSvc
    
    Web --> SocketIO
    SocketIO --> Redis
    Redis --> BiddingSvc
    
    ProcurementSvc --> PostgreSQL
    SupplierSvc --> PostgreSQL
    BiddingSvc --> PostgreSQL
    BiddingSvc --> RedisCache
    EvaluationSvc --> PostgreSQL
    ApprovalSvc --> PostgreSQL
    ContractSvc --> PostgreSQL
    ContractSvc --> FileStorage
    FulfillmentSvc --> PostgreSQL
    ReportSvc --> PostgreSQL
    ReportSvc --> FileStorage
    
    NotificationSvc --> WeChat
    Auth --> SSO
    ContractSvc --> ESign
    FulfillmentSvc --> ERP
```

## 2. 技术描述

### 2.1 前端技术栈
- **框架**: React 18 + TypeScript
- **构建工具**: Vite 5
- **样式**: TailwindCSS 3
- **状态管理**: Zustand
- **路由**: React Router DOM 6
- **图表**: Recharts 2
- **UI组件**: Radix UI + Lucide React
- **实时通信**: Socket.IO Client
- **HTTP客户端**: Axios
- **日期处理**: date-fns

### 2.2 后端技术栈
- **运行时**: Node.js 20
- **框架**: Express 4
- **语言**: TypeScript
- **实时通信**: Socket.IO 4
- **ORM**: Prisma 5
- **缓存**: Redis + ioredis
- **认证**: JWT + bcrypt
- **API文档**: Swagger/OpenAPI
- **任务调度**: node-cron

### 2.3 数据库
- **主数据库**: PostgreSQL 15
- **缓存/会话**: Redis 7
- **开发环境**: SQLite（快速原型开发）

### 2.4 报告生成
- **PDF生成**: PDFKit
- **Excel生成**: ExcelJS
- **图表渲染**: Chart.js Node版

### 2.5 高并发架构要点
1. **Redis分布式锁**: 防止并发报价冲突
2. **连接池优化**: PostgreSQL连接池配置
3. **内存缓存**: 竞价排名实时数据内存缓存
4. **批量写入**: 操作日志批量异步写入
5. **水平扩展**: Socket.IO多节点 + Redis适配器

## 3. 路由定义

| 路由 | 权限 | 页面 |
|------|------|------|
| `/login` | 公开 | 登录页 |
| `/dashboard` | 认证用户 | 数据概览 |
| `/procurement` | 采购专员/总监 | 采购需求列表 |
| `/procurement/new` | 采购专员 | 新建竞价需求 |
| `/procurement/:id` | 相关人员 | 需求详情/竞价大厅 |
| `/suppliers` | 采购专员/总监 | 供应商库 |
| `/suppliers/:id` | 相关人员 | 供应商详情 |
| `/bidding` | 供应商 | 我的竞价 |
| `/bidding/:id` | 供应商 | 报价页面 |
| `/evaluation/:id` | 采购专员/总监 | 评标结果 |
| `/approvals` | 审批人 | 审批中心 |
| `/contracts` | 相关人员 | 合同管理 |
| `/fulfillment` | 采购专员 | 履约管理 |
| `/reports` | 管理层 | 报告中心 |
| `/history` | 认证用户 | 历史查询 |
| `/admin/logs` | 管理员 | 系统日志 |
| `/admin/settings` | 管理员 | 系统设置 |

## 4. API 定义

### 4.1 核心类型定义

```typescript
// 供应商
interface Supplier {
  id: string;
  name: string;
  qualification: string[];
  level: 'A' | 'B' | 'C' | 'D';
  performanceScore: number;
  historicalScores: {
    price: number;
    quality: number;
    delivery: number;
    service: number;
  };
  status: 'active' | 'inactive' | 'suspended';
  categories: string[];
  createdAt: Date;
}

// 采购需求
interface ProcurementRequest {
  id: string;
  title: string;
  description: string;
  category: string;
  quantity: number;
  unit: string;
  budget: number;
  startPrice: number;
  requiredQualifications: string[];
  minSupplierLevel: 'A' | 'B' | 'C' | 'D';
  deadline: Date;
  maxRounds: number;
  minPriceDrop: number;
  status: 'draft' | 'published' | 'bidding' | 'evaluating' | 'approved' | 'rejected' | 'awarded' | 'completed';
  createdBy: string;
  createdAt: Date;
}

// 竞价轮次
interface BiddingRound {
  id: string;
  procurementId: string;
  roundNumber: number;
  startTime: Date;
  endTime: Date;
  status: 'active' | 'ended';
  lowestPrice: number;
}

// 供应商报价
interface Bid {
  id: string;
  procurementId: string;
  roundId: string;
  supplierId: string;
  price: number;
  timestamp: Date;
  isValid: boolean;
  rank: number;
  anonymousName: string;
}

// 评标结果
interface EvaluationResult {
  id: string;
  procurementId: string;
  supplierId: string;
  priceScore: number;
  historyScore: number;
  totalScore: number;
  rank: number;
  isRecommended: boolean;
}

// 审批记录
interface ApprovalRecord {
  id: string;
  procurementId: string;
  approverId: string;
  approverRole: string;
  decision: 'approved' | 'rejected';
  comment: string;
  createdAt: Date;
}

// 合同
interface Contract {
  id: string;
  procurementId: string;
  supplierId: string;
  amount: number;
  status: 'draft' | 'signing' | 'signed' | 'executing' | 'completed';
  content: string;
  signedAt?: Date;
}

// 履约记录
interface FulfillmentRecord {
  id: string;
  contractId: string;
  receiptNo: string;
  deliveredQuantity: number;
  acceptedQuantity: number;
  qualityScore: number;
  deliveryDate: Date;
  performanceDelta: number;
}

// 系统日志
interface AuditLog {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId: string;
  details: string;
  ip: string;
  timestamp: Date;
  level: 'info' | 'warning' | 'error';
}

// 月度报告
interface MonthlyReport {
  id: string;
  month: string;
  totalProjects: number;
  avgPriceDrop: number;
  awardDeviationRate: number;
  totalSavings: number;
  comparisonData: {
    currentMonth: Record<string, number>;
    lastMonth: Record<string, number>;
  };
  generatedAt: Date;
}
```

### 4.2 主要API端点

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | `/api/auth/login` | 用户登录 |
| GET | `/api/procurements` | 获取采购需求列表 |
| POST | `/api/procurements` | 创建采购需求 |
| POST | `/api/procurements/:id/publish` | 发布需求并筛选供应商 |
| GET | `/api/procurements/:id/bidding` | 获取竞价实时数据 |
| POST | `/api/bids` | 提交报价 |
| GET | `/api/procurements/:id/evaluation` | 获取评标结果 |
| POST | `/api/approvals/:id/decide` | 审批决策 |
| POST | `/api/contracts/:id/generate` | 生成合同草稿 |
| POST | `/api/fulfillments/receive` | 登记收货 |
| GET | `/api/reports/monthly/:month` | 获取月度报告 |
| POST | `/api/reports/monthly/:month/export` | 导出月度报告 |
| GET | `/api/history/search` | 历史记录组合查询 |
| POST | `/api/history/export` | 批量导出 |
| GET | `/api/admin/logs` | 获取系统日志 |

## 5. 服务器架构图

```mermaid
graph LR
    subgraph "HTTP Server"
        Routes["路由层"]
        Middleware["中间件"]
        Controllers["控制器"]
    end

    subgraph "Service Layer"
        ProcurementService["采购服务"]
        SupplierService["供应商服务"]
        BiddingEngine["竞价引擎"]
        EvaluationService["评标服务"]
        ApprovalService["审批服务"]
        ContractService["合同服务"]
        FulfillmentService["履约服务"]
        ReportService["报告服务"]
        NotificationService["通知服务"]
    end

    subgraph "Data Access"
        Repositories["Repository层"]
        Prisma["Prisma ORM"]
        RedisClient["Redis客户端"]
    end

    subgraph "Real-time Layer"
        SocketIOServer["Socket.IO"]
        RedisAdapter["Redis适配器"]
    end

    Routes --> Middleware
    Middleware --> Controllers
    Controllers --> ProcurementService
    Controllers --> SupplierService
    Controllers --> BiddingEngine
    Controllers --> EvaluationService
    Controllers --> ApprovalService
    Controllers --> ContractService
    Controllers --> FulfillmentService
    Controllers --> ReportService
    
    ProcurementService --> Repositories
    SupplierService --> Repositories
    BiddingEngine --> Repositories
    BiddingEngine --> RedisClient
    EvaluationService --> Repositories
    ApprovalService --> Repositories
    ContractService --> Repositories
    FulfillmentService --> Repositories
    ReportService --> Repositories
    NotificationService --> Repositories
    
    Repositories --> Prisma
    
    BiddingEngine --> SocketIOServer
    SocketIOServer --> RedisAdapter
    RedisAdapter --> RedisClient
```

## 6. 数据模型

### 6.1 ER图

```mermaid
erDiagram
    USER ||--o{ PROCUREMENT_REQUEST : creates
    USER ||--o{ APPROVAL_RECORD : approves
    PROCUREMENT_REQUEST ||--o{ BIDDING_ROUND : has
    PROCUREMENT_REQUEST ||--o{ BID : receives
    PROCUREMENT_REQUEST ||--o{ EVALUATION_RESULT : produces
    PROCUREMENT_REQUEST ||--o{ APPROVAL_RECORD : requires
    PROCUREMENT_REQUEST ||--|| CONTRACT : generates
    PROCUREMENT_REQUEST ||--o{ SUPPLIER : invites
    SUPPLIER ||--o{ BID : submits
    SUPPLIER ||--o{ EVALUATION_RESULT : has
    SUPPLIER ||--o{ CONTRACT : signs
    BIDDING_ROUND ||--o{ BID : contains
    CONTRACT ||--o{ FULFILLMENT_RECORD : has
    FULFILLMENT_RECORD ||--|| SUPPLIER : updates
    USER ||--o{ AUDIT_LOG : generates

    USER {
        uuid id PK
        string username
        string role
        string email
    }

    SUPPLIER {
        uuid id PK
        string name
        string[] qualifications
        string level
        decimal performance_score
        json historical_scores
        string[] categories
        string status
    }

    PROCUREMENT_REQUEST {
        uuid id PK
        string title
        string category
        decimal budget
        decimal start_price
        date deadline
        int max_rounds
        decimal min_price_drop
        string status
        uuid created_by FK
    }

    BIDDING_ROUND {
        uuid id PK
        uuid procurement_id FK
        int round_number
        datetime start_time
        datetime end_time
        string status
        decimal lowest_price
    }

    BID {
        uuid id PK
        uuid procurement_id FK
        uuid round_id FK
        uuid supplier_id FK
        decimal price
        datetime timestamp
        boolean is_valid
        int rank
        string anonymous_name
    }

    EVALUATION_RESULT {
        uuid id PK
        uuid procurement_id FK
        uuid supplier_id FK
        decimal price_score
        decimal history_score
        decimal total_score
        int rank
        boolean is_recommended
    }

    APPROVAL_RECORD {
        uuid id PK
        uuid procurement_id FK
        uuid approver_id FK
        string approver_role
        string decision
        string comment
    }

    CONTRACT {
        uuid id PK
        uuid procurement_id FK
        uuid supplier_id FK
        decimal amount
        string status
        text content
    }

    FULFILLMENT_RECORD {
        uuid id PK
        uuid contract_id FK
        string receipt_no
        decimal delivered_qty
        decimal accepted_qty
        decimal quality_score
        date delivery_date
        decimal performance_delta
    }

    AUDIT_LOG {
        uuid id PK
        uuid user_id FK
        string action
        string resource
        string resource_id
        text details
        string level
        datetime timestamp
    }
```

### 6.2 关键索引优化

```sql
-- 竞价查询优化
CREATE INDEX idx_bids_procurement_round ON bids(procurement_id, round_id);
CREATE INDEX idx_bids_supplier_procurement ON bids(supplier_id, procurement_id);
CREATE INDEX idx_bids_price ON bids(price DESC);

-- 供应商筛选优化
CREATE INDEX idx_suppliers_categories ON suppliers USING GIN(categories);
CREATE INDEX idx_suppliers_qualifications ON suppliers USING GIN(qualifications);
CREATE INDEX idx_suppliers_level_status ON suppliers(level, status);

-- 报告查询优化
CREATE INDEX idx_procurements_status_created ON procurements(status, created_at);
CREATE INDEX idx_fulfillments_contract_date ON fulfillments(contract_id, delivery_date);

-- 日志查询优化
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX idx_audit_logs_user_action ON audit_logs(user_id, action);
```
