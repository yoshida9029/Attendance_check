// ===== データ =====
let records = JSON.parse(localStorage.getItem("records")) || [];

// ===== 時刻変換 =====
function toMinutes(time) {
    if (!time || !time.includes(":")) return null;
    const [h, m] = time.split(":").map(Number);
    if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}

// ===== 休憩ルール（★これを先に定義）=====
function getRequiredBreak(workMin) {
    const hours = workMin / 60;

    if (hours > 16) return 120;
    if (hours > 12) return 90;
    if (hours > 8) return 60;
    if (hours > 6) return 45;
    return 0;
}

// ===== 勤務時間（夜勤＋長時間対応）=====
function calcWorkMinutes(start, end, breakMinutes) {
    const startMin = toMinutes(start);
    let endMin = toMinutes(end);

    if (startMin === null || endMin === null) {
    throw new Error("時刻が不正です");
    }

  // 夜勤対応
    if (endMin <= startMin) {
    endMin += 1440;
    }

    const totalMin = endMin - startMin;

    if (totalMin <= 0) {
    throw new Error("勤務時間が不正です");
    }

  // ★休憩チェック
    const requiredBreak = getRequiredBreak(totalMin);

    if (breakMinutes < requiredBreak) {
    throw new Error(`休憩が不足しています（必要: ${requiredBreak}分）`);
    }

    if (breakMinutes > totalMin) {
    throw new Error("休憩時間が多すぎます");
    }

    return totalMin - breakMinutes;
}

// ===== 深夜時間 =====
function calcNightMinutes(start, end) {
    let startMin = toMinutes(start);
    let endMin = toMinutes(end);

    if (endMin <= startMin) {
    endMin += 1440;
    }

    let nightMin = 0;

    for (let i = startMin; i < endMin; i++) {
    const t = i % 1440;
    if (t >= 22 * 60 || t < 5 * 60) {
        nightMin++;
    }
    }

    return nightMin;
}

// ===== 給料計算 =====
function calculateSalary(workMin, nightMin) {
    const hourly = 1000;
  const baseMin = 8 * 60;

    const normalMin = Math.min(workMin, baseMin);
    const overtimeMin = Math.max(0, workMin - baseMin);

  const normalPay = normalMin * (hourly / 60);
  const overtimePay = overtimeMin * (hourly * 1.25 / 60);
  const nightPay = nightMin * (hourly * 0.25 / 60);

    return {
    salary: Math.floor(normalPay + overtimePay + nightPay),
    overtimeHours: overtimeMin / 60,
    nightHours: nightMin / 60
    };
}

// ===== 保存 =====
function saveData() {
    localStorage.setItem("records", JSON.stringify(records));
}

// ===== 月合計 =====
function calculateMonthlyTotal() {
    const now = new Date();

    let totalHours = 0;
    let totalSalary = 0;
    let totalOvertime = 0;

    records.forEach(rec => {
    const d = new Date(rec.date);

    if (
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear()
    ) {
        totalHours += Number(rec.hours);
        totalSalary += rec.salary;
        totalOvertime += Number(rec.overtime);
    }
    });

    return { totalHours, totalSalary, totalOvertime };
}

// ===== 表示 =====
function render() {
    const historyEl = document.getElementById("history");
    historyEl.innerHTML = "";

    records.forEach((rec, i) => {
    const li = document.createElement("li");

    li.innerHTML = `
        <span>
        ${rec.date} / ${rec.hours}h（残業${rec.overtime}h 深夜${rec.night}h）
        / ${rec.salary.toLocaleString()}円
        </span>
        <button onclick="deleteRecord(${i})">削除</button>
    `;

    historyEl.appendChild(li);
    });

    const { totalHours, totalSalary, totalOvertime } = calculateMonthlyTotal();

    document.getElementById("totalHours").textContent = totalHours.toFixed(2);
    document.getElementById("totalSalary").textContent = totalSalary.toLocaleString();
    document.getElementById("totalOvertime").textContent = totalOvertime.toFixed(2);
}

// ===== 削除 =====
function deleteRecord(index) {
    records.splice(index, 1);
    saveData();
    render();
}

// ===== ボタン処理 =====
document.getElementById("calcBtn").addEventListener("click", () => {
    const date = document.getElementById("date").value;
    const start = document.getElementById("start").value;
    const end = document.getElementById("end").value;
    const breakTime = Number(document.getElementById("break").value);

    const errorEl = document.getElementById("error");
    errorEl.textContent = "";

    try {
    if (!date) throw new Error("日付を入力してください");

    const workMin = calcWorkMinutes(start, end, breakTime);
    const nightMin = calcNightMinutes(start, end);
    const result = calculateSalary(workMin, nightMin);

    const hours = workMin / 60;

    document.getElementById("hours").textContent = hours.toFixed(2);
    document.getElementById("salary").textContent = result.salary.toLocaleString();
    document.getElementById("overtime").textContent = result.overtimeHours.toFixed(2);
    document.getElementById("night").textContent = result.nightHours.toFixed(2);

    const index = records.findIndex(r => r.date === date);

    const data = {
        date,
        hours: hours.toFixed(2),
        overtime: result.overtimeHours.toFixed(2),
        night: result.nightHours.toFixed(2),
        salary: result.salary
    };

    if (index !== -1) {
        records[index] = data;
    } else {
        records.push(data);
    }

    saveData();
    render();

    } catch (e) {
    errorEl.textContent = e.message;
    }
});

// 初期表示
render();