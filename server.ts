import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// In-Memory Database / State for Live Trading Sandbox and Bot Simulation
let mexcConfig = {
  apiKey: "",
  apiSecret: "",
  isSandbox: true,
  autoTransferRewards: true,
  leverage: 20,
  eventDurationMinutes: 10
};

let accountBalances = {
  spot: {
    USDT: 450.75, // initial mock rewards waiting for transfer
    BTC: 0.0,
  },
  futures: {
    USDT: 1250.0, // initial trading balance
    BTC: 0.05,
  }
};

let activePositions: any[] = [];
let rewardLogs: any[] = [
  {
    id: "tx_1001",
    amount: 12.50,
    asset: "USDT",
    fromAccount: "Spot Wallet (MEXC Rewards)",
    toAccount: "Futures Wallet",
    status: "SUCCESS",
    timestamp: new Date(Date.now() - 3600000 * 4).toISOString()
  },
  {
    id: "tx_1002",
    amount: 5.25,
    asset: "USDT",
    fromAccount: "Spot Wallet (MEXC Rewards)",
    toAccount: "Futures Wallet",
    status: "SUCCESS",
    timestamp: new Date(Date.now() - 3600000 * 24).toISOString()
  }
];

let botLogs: any[] = [
  {
    id: "log_1",
    timestamp: new Date(Date.now() - 120000).toISOString(),
    type: "INFO",
    message: "تطبيق مارية (Maria-Bot) قيد العمل والتأهب لحدث BTCUSDT."
  },
  {
    id: "log_2",
    timestamp: new Date(Date.now() - 90000).toISOString(),
    type: "SUCCESS",
    message: "تم إنشاء اتصال آمن بالشبكة المحلية لجهاز أندرويد LT_9904 بنجاح."
  }
];

// Helper to add logs
function addLog(type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR', message: string) {
  botLogs.unshift({
    id: `log_${Date.now()}`,
    timestamp: new Date().toISOString(),
    type,
    message
  });
  if (botLogs.length > 100) botLogs.pop();
}

// Global active price
let currentBTCPrice = 64250.0;
// Simulate slight price fluctuation
setInterval(() => {
  const change = (Math.random() - 0.5) * 45;
  currentBTCPrice = parseFloat((currentBTCPrice + change).toFixed(2));

  // Update active positions PnL
  activePositions = activePositions.map(pos => {
    if (pos.status === 'ACTIVE') {
      const priceDiff = currentBTCPrice - pos.entryPrice;
      const directionMult = pos.type === 'LONG' ? 1 : -1;
      const rawReturn = (priceDiff / pos.entryPrice) * directionMult * pos.leverage;
      const pnl = parseFloat((pos.amount * rawReturn).toFixed(2));
      const pnlPercent = parseFloat((rawReturn * 100).toFixed(2));
      return {
        ...pos,
        currentPrice: currentBTCPrice,
        pnl,
        pnlPercent
      };
    }
    return pos;
  });
}, 1500);

// Auto reward harvesting simulation (runs every 60 seconds)
setInterval(() => {
  if (mexcConfig.autoTransferRewards && accountBalances.spot.USDT > 0) {
    const amountToTransfer = accountBalances.spot.USDT;
    accountBalances.spot.USDT = 0;
    accountBalances.futures.USDT = parseFloat((accountBalances.futures.USDT + amountToTransfer).toFixed(2));
    
    const newLog = {
      id: `tx_${Date.now()}`,
      amount: amountToTransfer,
      asset: "USDT",
      fromAccount: "Spot Wallet (MEXC Rewards)",
      toAccount: "Futures Wallet",
      status: "SUCCESS",
      timestamp: new Date().toISOString()
    };
    
    rewardLogs.unshift(newLog);
    addLog("SUCCESS", `تلقائي: تم رصد وتحويل مكافأة بقيمة $${amountToTransfer} USDT إلى محفظة العقود الآجلة بنجاح.`);
  } else if (Math.random() > 0.8) {
    // Randomly deposit new rewards in Spot to simulate active earning
    const randomReward = parseFloat((Math.random() * 15 + 2).toFixed(2));
    accountBalances.spot.USDT = parseFloat((accountBalances.spot.USDT + randomReward).toFixed(2));
    addLog("INFO", `تم رصد مكافأة ترويجية جديدة بقيمة $${randomReward} USDT في محفظة الفوري (Spot).`);
  }
}, 35000);


// API endpoints
app.get("/api/mexc/config", (req, res) => {
  res.json(mexcConfig);
});

app.post("/api/mexc/config", (req, res) => {
  const { apiKey, apiSecret, isSandbox, autoTransferRewards, leverage, eventDurationMinutes } = req.body;
  mexcConfig = {
    apiKey: apiKey || mexcConfig.apiKey,
    apiSecret: apiSecret ? "***HIDDEN***" : mexcConfig.apiSecret,
    isSandbox: isSandbox !== undefined ? isSandbox : mexcConfig.isSandbox,
    autoTransferRewards: autoTransferRewards !== undefined ? autoTransferRewards : mexcConfig.autoTransferRewards,
    leverage: leverage || mexcConfig.leverage,
    eventDurationMinutes: eventDurationMinutes || mexcConfig.eventDurationMinutes
  };
  addLog("INFO", `تم تحديث إعدادات الاتصال وحجم الرافعة المالية لـ Maria Bot (رافعة: ${mexcConfig.leverage}x).`);
  res.json({ success: true, config: mexcConfig });
});

app.get("/api/mexc/state", (req, res) => {
  res.json({
    balances: accountBalances,
    price: currentBTCPrice,
    activePositions: activePositions.filter(p => p.status === 'ACTIVE'),
    closedPositions: activePositions.filter(p => p.status === 'CLOSED'),
    rewardLogs,
    logs: botLogs
  });
});

// Execute Trading Order
app.post("/api/mexc/order", (req, res) => {
  const { type, amount, customPrice } = req.body;
  if (!type || !amount) {
    return res.status(400).json({ error: "Missing order type or amount" });
  }

  const price = customPrice || currentBTCPrice;
  const cost = amount / mexcConfig.leverage;

  if (accountBalances.futures.USDT < cost) {
    addLog("ERROR", `فشل فتح صفقة ${type}: الرصيد المتاح غير كافٍ. التكلفة المطلوبة بالرافعة: $${cost.toFixed(2)} USDT.`);
    return res.status(400).json({ error: "الرصيد في محفظة الآجل غير كافٍ" });
  }

  // Deduct cost
  accountBalances.futures.USDT = parseFloat((accountBalances.futures.USDT - cost).toFixed(2));

  const newPosition = {
    id: `pos_${Date.now()}`,
    pair: "BTCUSDT",
    type: type.toUpperCase(), // 'LONG' | 'SHORT'
    entryPrice: price,
    currentPrice: price,
    amount: parseFloat(amount),
    leverage: mexcConfig.leverage,
    pnl: 0.0,
    pnlPercent: 0.0,
    timestamp: new Date().toISOString(),
    status: 'ACTIVE'
  };

  activePositions.unshift(newPosition);
  addLog("SUCCESS", `تم فتح صفقة عقود آجلة ثنائية لحدث 10 دقائق: [${type === 'LONG' ? 'أعلى ↗' : 'أدنى ↘'}] لزوج BTCUSDT بسعر دخول $${price} بالرافعة المالية ${mexcConfig.leverage}x.`);

  // Auto-close simulated position after event duration (10 mins)
  setTimeout(() => {
    const positionIdx = activePositions.findIndex(p => p.id === newPosition.id);
    if (positionIdx !== -1 && activePositions[positionIdx].status === 'ACTIVE') {
      const pos = activePositions[positionIdx];
      pos.status = 'CLOSED';
      
      // Calculate final PnL and return to balance
      const finalPrice = currentBTCPrice;
      const priceDiff = finalPrice - pos.entryPrice;
      const directionMult = pos.type === 'LONG' ? 1 : -1;
      const rawReturn = (priceDiff / pos.entryPrice) * directionMult * pos.leverage;
      const finalPnl = parseFloat((pos.amount * rawReturn).toFixed(2));
      
      const returnedAmount = parseFloat((cost + finalPnl).toFixed(2));
      accountBalances.futures.USDT = parseFloat((accountBalances.futures.USDT + Math.max(0, returnedAmount)).toFixed(2));
      
      pos.currentPrice = finalPrice;
      pos.pnl = finalPnl;
      pos.pnlPercent = parseFloat((rawReturn * 100).toFixed(2));
      
      addLog("INFO", `انتهى حدث الـ 10 دقائق: تم إغلاق صفقة ${pos.type} تلقائياً. سعر الإغلاق: $${finalPrice}. الأرباح والخسائر: $${finalPnl} USDT.`);
    }
  }, mexcConfig.eventDurationMinutes * 60 * 1000);

  res.json({ success: true, position: newPosition, balances: accountBalances });
});

// Close position manually
app.post("/api/mexc/close-position", (req, res) => {
  const { id } = req.body;
  const positionIdx = activePositions.findIndex(p => p.id === id);
  if (positionIdx === -1 || activePositions[positionIdx].status !== 'ACTIVE') {
    return res.status(404).json({ error: "Position not found or already closed" });
  }

  const pos = activePositions[positionIdx];
  pos.status = 'CLOSED';
  
  const cost = pos.amount / pos.leverage;
  const finalPrice = currentBTCPrice;
  const priceDiff = finalPrice - pos.entryPrice;
  const directionMult = pos.type === 'LONG' ? 1 : -1;
  const rawReturn = (priceDiff / pos.entryPrice) * directionMult * pos.leverage;
  const finalPnl = parseFloat((pos.amount * rawReturn).toFixed(2));
  
  const returnedAmount = parseFloat((cost + finalPnl).toFixed(2));
  accountBalances.futures.USDT = parseFloat((accountBalances.futures.USDT + Math.max(0, returnedAmount)).toFixed(2));
  
  pos.currentPrice = finalPrice;
  pos.pnl = finalPnl;
  pos.pnlPercent = parseFloat((rawReturn * 100).toFixed(2));

  addLog("SUCCESS", `تم إغلاق صفقة ${pos.type} يدوياً فوراً. الربح/الخسارة المحقق: $${finalPnl} USDT.`);
  res.json({ success: true, position: pos, balances: accountBalances });
});

// Manual Reward Transfer Trigger
app.post("/api/mexc/transfer-rewards", (req, res) => {
  const amountToTransfer = accountBalances.spot.USDT;
  if (amountToTransfer <= 0) {
    return res.status(400).json({ error: "لا يوجد رصيد مكافآت متاح للتحويل حالياً في حساب الفوري (Spot)" });
  }

  accountBalances.spot.USDT = 0;
  accountBalances.futures.USDT = parseFloat((accountBalances.futures.USDT + amountToTransfer).toFixed(2));

  const newLog = {
    id: `tx_${Date.now()}`,
    amount: amountToTransfer,
    asset: "USDT",
    fromAccount: "Spot Wallet (MEXC Rewards)",
    toAccount: "Futures Wallet",
    status: "SUCCESS",
    timestamp: new Date().toISOString()
  };

  rewardLogs.unshift(newLog);
  addLog("SUCCESS", `يدوي: تم تحويل مكافأة نقدية بقيمة $${amountToTransfer} USDT إلى محفظة العقود الآجلة بنجاح.`);

  res.json({ success: true, transfer: newLog, balances: accountBalances });
});

// Reset Account simulated balance
app.post("/api/mexc/reset-demo", (req, res) => {
  accountBalances = {
    spot: { USDT: 150.0, BTC: 0.0 },
    futures: { USDT: 1000.0, BTC: 0.02 }
  };
  activePositions = [];
  rewardLogs = [];
  addLog("WARNING", "تمت إعادة تعيين أرصدة محفظة التداول الافتراضية والصفقات النشطة.");
  res.json({ success: true, balances: accountBalances });
});

// Generate dynamic GitHub Actions YAML config for Android release builds
app.post("/api/config/generate-yaml", (req, res) => {
  const { branch, appName, packageName, customKeystorePassword, customKeystoreAlias } = req.body;
  
  const targetBranch = branch || "main";
  const nameOfApp = appName || "MariaBot";
  const pkg = packageName || "com.mexc.mariabot";
  const storePassword = customKeystorePassword || "malek-321";
  const alias = customKeystoreAlias || "upload";

  const yamlContent = `name: Maria Bot Fast Build & Sign

on:
  push:
    branches: [ "${targetBranch}" ]

jobs:
  build:
    name: Build & Sign Release Bundle
    runs-on: ubuntu-latest

    steps:
    - name: Checkout Source Code
      uses: actions/checkout@v4

    - name: Set up Java JDK 17
      uses: actions/setup-java@v4
      with:
        java-version: '17'
        distribution: 'temurin'
        cache: gradle # تفعيل الكاش لتسريع البناء الفائق لأقل من دقيقة

    - name: Decode and Prepare Keystore
      run: |
        echo "\${{ secrets.KEYSTORE_BASE64 }}" | base64 --decode > app/upload-keystore.jks

    - name: Build Release APK & AAB Bundle
      run: ./gradlew assembleRelease bundleRelease
      env:
        CM_KEYSTORE_PASSWORD: \${{ secrets.STORE_PASSWORD }}
        APP_NAME: "${nameOfApp}"
        PACKAGE_NAME: "${pkg}"

    - name: Upload Finished APK Artifact
      uses: actions/upload-artifact@v4
      with:
        name: ${nameOfApp}-Release-APK
        path: app/build/outputs/apk/release/*.apk

    - name: Upload Finished AAB Artifact
      uses: actions/upload-artifact@v4
      with:
        name: ${nameOfApp}-Release-AAB
        path: app/build/outputs/bundle/release/*.aab`;

  res.json({ yaml: yamlContent });
});


// Vite Setup or Static files
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Maria-Bot Backend running on port ${PORT}`);
  });
}

startServer();
