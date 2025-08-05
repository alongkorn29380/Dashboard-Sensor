document.addEventListener("DOMContentLoaded", function () {
    let dateInput = document.querySelector("#date-input");

    if (dateInput) {
        let today = new Date();
        let day = today.getDate().toString().padStart(2, "0");
        let month = (today.getMonth() + 1).toString().padStart(2, "0");
        let year = today.getFullYear();
        dateInput.value = `${day}/${month}/${year}`;
    }

    const connectButton = document.getElementById("connect-serial");
    if (connectButton) {
        connectButton.addEventListener("click", async () => {
            try {
                const port = await navigator.serial.requestPort();
                await port.open({ baudRate: 115200 });
                const reader = port.readable.getReader();
                let buffer = "";

                while (true) {
                    const { value, done } = await reader.read();
                    if (done) break;
                    if (value) {
                        buffer += new TextDecoder().decode(value);
                        let lines = buffer.split("\n");
                        buffer = lines.pop();
                        lines.forEach(line => handleSerialData(line.trim()));
                    }
                }
            } catch (err) {
                console.error("Serial Error:", err);
            }
        });
    }
});

function handleSerialData(rawData) {
    try {
        const text = rawData.trim();
        if (!text) return;

        // ถ้าเป็น JSON อยู่แล้ว
        if (text.startsWith('{')) {
            const data = JSON.parse(text);
            return updateCharts(data);
        }

        // แปลงจาก CSV เป็น JSON
        const values = text.split(',').map(v => parseFloat(v));
        if (values.length !== 9) throw new Error('Invalid CSV length');

        const fields = [
            "temperature", "humidity", "pressure",
            "coConcentration", "ch4Concentration", "c2h5ohConcentration",
            "h2Concentration", "nh3Concentration", "no2Concentration"
        ];

        const data = {};
        fields.forEach((key, index) => data[key] = values[index]);

        updateCharts(data);
    } catch (e) {
        console.warn("Invalid data received:", rawData);
    }
}

function updateCharts(data) {
    const {
        temperature,
        humidity,
        pressure,
        coConcentration,
        ch4Concentration,
        c2h5ohConcentration,
        h2Concentration,
        nh3Concentration,
        no2Concentration
    } = data;

    if (!isNaN(temperature)) updateTemperatureChart(temperature);
    if (!isNaN(humidity)) updateHumidityChart(humidity);
    if (!isNaN(pressure)) updatePressureChart(pressure);
    if (!isNaN(coConcentration)) updateCOChart(coConcentration);
    if (!isNaN(ch4Concentration)) updateMetChart(ch4Concentration);
    if (!isNaN(c2h5ohConcentration)) updateEthChart(c2h5ohConcentration);
    if (!isNaN(h2Concentration)) updateNitChart(h2Concentration);
    if (!isNaN(nh3Concentration)) updateAmmChart(nh3Concentration);
    if (!isNaN(no2Concentration)) updateNitrChart(no2Concentration);
}



/*------------------------------ Temperature Chart --------------------------------------*/

// ดึง context ของ canvas ที่มี id เป็น "temp-chart" สำหรับใช้วาดกราฟ
const ctx = document.getElementById("temp-chart").getContext("2d");

// กำหนดค่าอุณหภูมิต่ำสุดและสูงสุดที่จะแสดงในกราฟ
const MIN_TEMP = -20;
const MAX_TEMP = 100;

// สร้างอาร์เรย์เก็บข้อมูลอุณหภูมิและเวลา
let temperatureData = [];
let timeLabelstemp = [];

// สร้างกราฟเส้นโดยใช้ Chart.js
let tempChart = new Chart(ctx, {
    type: "line",
    data: {
        labels: timeLabelstemp,
        datasets: [{
            label: "อุณหภูมิ (°C)",
            data: temperatureData,
            borderColor: "#ff6f61",
            backgroundColor: "rgba(255, 111, 97, 0.2)",
            borderWidth: 2,
            tension: 0.4,
            pointRadius: 3,
            pointBackgroundColor: "#ff6f61",
            pointBorderColor: "#ffffff",
            pointHoverRadius: 7,
            pointHoverBackgroundColor: "#ff3b30",
            fill: true // ทำให้พื้นที่ใต้เส้นมีสี
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
            padding: { right: 20 }
        },
        elements: {
            line: { borderJoinStyle: 'round' }
        },
        scales: {
            x: {
                title: {
                    display: true,
                    text: "เวลา",
                    color: "#333",
                    font: { size: 12, weight: "bold" }
                },
                grid: { display: false },
                ticks: { display: false }
            },
            y: {
                min: MIN_TEMP,
                max: MAX_TEMP,
                title: {
                    display: true,
                    text: "อุณหภูมิ (°C)",
                    color: "#333",
                    font: { size: 12, weight: "bold" }
                },
                grid: { color: "rgba(200, 200, 200, 0.3)" }
            }
        },
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: "rgba(0, 0, 0, 0.8)",
                titleFont: { size: 12, weight: "bold" },
                bodyFont: { size: 12 },
                callbacks: {
                    label: function (context) {
                        return `อุณหภูมิ: ${context.raw.toFixed(1)}°C`;
                    }
                }
            }
        }
    }
});

/*------------------ ฟังก์ชันอัปเดตค่ากราฟเมื่อมีค่าอุณหภูมิใหม่ ------------------*/
function updateTemperatureChart(newTemp) {
    const now = new Date().toLocaleTimeString();
    if (temperatureData.length >= 20) {
        temperatureData.shift();
        timeLabelstemp.shift();
    }
    temperatureData.push(newTemp);
    timeLabelstemp.push(now);

    // คำนวณสีที่เปลี่ยนไปตามอุณหภูมิ
    const temperatureColor = getTemperatureColor(newTemp);
    const rgb = temperatureColor.match(/\d+/g); // ดึงค่า [r, g, b] จาก "rgb(r, g, b)"

    // อัปเดตสีของกราฟ
    tempChart.data.datasets[0].borderColor = temperatureColor;
    tempChart.data.datasets[0].pointBackgroundColor = temperatureColor;
    tempChart.data.datasets[0].pointHoverBackgroundColor = temperatureColor;
    tempChart.data.datasets[0].backgroundColor = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.2)`;

    tempChart.update(); // รีเฟรชกราฟ

    // อัปเดตค่าอุณหภูมิที่แสดงใน HTML
    const tempValueElement = document.getElementById("temp-value");
    tempValueElement.textContent = `${newTemp.toFixed(1)}°C`;
    tempValueElement.style.color = temperatureColor;
}

/*------------------ ฟังก์ชันเปลี่ยนสีตามอุณหภูมิ ------------------*/
function getTemperatureColor(temp) {
    let ratio = (temp - MIN_TEMP) / (MAX_TEMP - MIN_TEMP);
    ratio = Math.max(0, Math.min(1, ratio));

    const blue = [52, 152, 219]; // สีน้ำเงิน (เย็น)
    const red = [255, 87, 51];  // สีแดง (ร้อน)

    const r = Math.round(blue[0] + (red[0] - blue[0]) * ratio);
    const g = Math.round(blue[1] + (red[1] - blue[1]) * ratio);
    const b = Math.round(blue[2] + (red[2] - blue[2]) * ratio);

    return `rgb(${r}, ${g}, ${b})`;
}

/*------------------ จำลองอุณหภูมิทุก 3 วินาที ------------------*/






/*------------------ Plugin แสดงเวลาล่าสุดที่มุมขวาล่างของกราฟ ------------------*/
Chart.register({
    id: 'lastTimeDisplay',
    afterDraw: function (chart) {
        if (timeLabelstemp.length === 0) return;
        const ctx = chart.ctx;
        const lastTime = timeLabelstemp[timeLabelstemp.length - 1];
        ctx.save();
        ctx.font = "14px Arial";
        ctx.fillStyle = "#333";
        ctx.textAlign = "right";
        ctx.textBaseline = "bottom";
        ctx.fillText(lastTime, chart.width - 10, chart.height - 10);
        ctx.restore();
    }
});


/*------------------------------ Humidity Chart --------------------------------------*/

// ดึง context ของ canvas ที่มี id เป็น "hum-chart" เพื่อใช้ในการวาดกราฟ
const humidityCtx = document.getElementById("hum-chart").getContext("2d");

// กำหนดค่าต่ำสุดและสูงสุดของความชื้นในเปอร์เซ็นต์ (0 - 100%)
const MIN_HUMIDITY = 0;
const MAX_HUMIDITY = 100;

// ตัวแปรสำหรับเก็บค่าความชื้น
let humidityData = [];
let timeLabelshum = [];

// สร้างกราฟความชื้นโดยใช้ Chart.js
let humidityChart = new Chart(humidityCtx, {
    type: "line", // ใช้กราฟเส้น (line chart)
    data: {
        labels: timeLabelshum, // แกน X ใช้ตัวแปร timeLabels ซึ่งเก็บค่าช่วงเวลาต่างๆ
        datasets: [{
            label: "Humidity (%)", // ชื่อของเส้นกราฟ
            data: humidityData, // ข้อมูลค่าความชื้นที่จะถูกเพิ่มเข้าไปเรื่อยๆ
            borderColor: "#4a8cff",  // สีน้ำเงินของเส้นกราฟ
            backgroundColor: "rgba(74, 140, 255, 0.2)", // สีพื้นหลังของกราฟแบบโปร่งใส
            borderWidth: 2, // ความหนาของเส้นกราฟ
            tension: 0.4, // ความโค้งของเส้นกราฟ (0 = มุมตรง, 1 = โค้งมาก)
            pointRadius: 3, // ขนาดของจุดข้อมูล
            pointBackgroundColor: "#4a8cff", // สีของจุดข้อมูล
            pointBorderColor: "#ffffff", // สีขอบของจุดข้อมูล
            pointHoverRadius: 5, // ขนาดของจุดเมื่อเอาเมาส์ไปชี้
            pointHoverBackgroundColor: "#2a6fcc", // สีของจุดเมื่อเอาเมาส์ไปชี้
            fill: true // ให้พื้นหลังกราฟถูกเติมสี
        }]
    },
    options: {
        responsive: true, // ปรับขนาดอัตโนมัติให้พอดีกับหน้าจอ
        maintainAspectRatio: false, // ไม่ต้องรักษาอัตราส่วนของกราฟ
        layout: {
            padding: {
                right: 20 // กำหนดระยะห่างด้านขวา 20px
            }
        },
        elements: {
            line: {
                borderJoinStyle: 'round' // ทำให้เส้นกราฟดูนุ่มนวลขึ้น
            }
        },
        scales: {
            x: { // แกน X
                title: {
                    display: true,
                    text: "เวลา", // ชื่อแกน X
                    color: "#333",
                    font: { size: 12, weight: "bold" }
                },
                grid: { display: false }, // ซ่อนเส้นตารางแกน X
                ticks: { display: false } // ซ่อนค่า tick บนแกน X
            },
            y: { // แกน Y
                min: MIN_HUMIDITY,
                max: MAX_HUMIDITY,
                title: {
                    display: true,
                    text: "ความชื้น (g/m3)", // ชื่อแกน Y
                    color: "#333",
                    font: { size: 12, weight: "bold" }
                },
                grid: { color: "rgba(200, 200, 200, 0.3)" } // สีของเส้นตารางแกน Y
            }
        },
        plugins: {
            legend: { display: false }, // ซ่อนคำอธิบายของ dataset
            tooltip: { // ตั้งค่ากล่อง tooltip เมื่อ hover
                backgroundColor: "rgba(0, 0, 0, 0.8)",
                titleFont: { size: 12, weight: "bold" },
                bodyFont: { size: 12 },
                callbacks: {
                    label: function (context) {
                        return `ความชื้น: ${context.raw.toFixed(1)}°C`;
                    }
                }
            }
        }
    }
});

/*------------------------------ ฟังก์ชันอัปเดตกราฟความชื้น --------------------------------------*/

function updateHumidityChart(newHumidity) {
    // ดึงเวลาปัจจุบันเป็นรูปแบบ HH:MM
    const now = new Date().toLocaleTimeString();

    // ตรวจสอบว่ามีข้อมูลเกิน 15 จุดหรือไม่ ถ้าเกินให้ลบข้อมูลเก่าออก
    if (humidityData.length >= 20) {
        humidityData.shift(); // ลบค่าความชื้นตัวแรกออก
        timeLabelshum.shift(); // ลบค่าเวลาแรกออก
    }

    // เพิ่มค่าความชื้นใหม่และเวลาใหม่เข้าไป
    humidityData.push(newHumidity);
    timeLabelshum.push(now);

    // อัปเดตข้อมูลในกราฟ
    humidityChart.data.labels = timeLabelshum;
    humidityChart.data.datasets[0].data = humidityData;

    // เปลี่ยนสีของเส้นและจุดตามค่าความชื้นที่ได้รับ
    const humidityColor = getHumidityColor(newHumidity);
    humidityChart.data.datasets[0].borderColor = humidityColor;
    humidityChart.data.datasets[0].pointBackgroundColor = humidityColor;
    humidityChart.data.datasets[0].pointHoverBackgroundColor = humidityColor;
    humidityChart.data.datasets[0].backgroundColor = `rgba(${hexToRgb(humidityColor)}, 0.1)`;

    humidityChart.update(); // รีเฟรชกราฟ

    // อัปเดตค่าความชื้นที่แสดงใน HTML
    const humidityValueElement = document.getElementById("hum-value");
    humidityValueElement.textContent = `${newHumidity.toFixed(1)}%`;
    humidityValueElement.style.color = humidityColor;
}

/*------------------------------ ฟังก์ชันช่วยเหลือ --------------------------------------*/

// ฟังก์ชันกำหนดสีตามค่าความชื้น
function getHumidityColor(humidity) {
    if (humidity < 30) {
        return "#4a8cff";  // น้ำเงินอ่อน (ความชื้นต่ำ)
    } else if (humidity < 70) {
        return "#2ecc71";  // เขียว (ความชื้นปานกลาง)
    } else {
        return "#2980b9";  // น้ำเงินเข้ม (ความชื้นสูง)
    }
}

// ฟังก์ชันแปลงสีจาก HEX เป็น RGB
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ?
        `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` :
        "74, 140, 255";  // ค่าดีฟอลต์เมื่อแปลงไม่ได้
}

/*------------------------------ จำลองการรับข้อมูลความชื้นใหม่ --------------------------------------*/



/*------------------------------ Custom Plugin: แสดงเวลาล่าสุด --------------------------------------*/

// สร้าง plugin สำหรับ Chart.js เพื่อแสดงเวลาล่าสุดที่ได้รับข้อมูลความชื้น
Chart.register({
    id: 'lastTimeDisplay',
    afterDraw: function (chart) {
        if (timeLabelshum.length === 0) return;

        const humidityCtx = chart.ctx;
        const lastTime = timeLabelshum[timeLabelshum.length - 1]; // เวลาล่าสุด

        humidityCtx.save();
        humidityCtx.font = "12px Arial";
        humidityCtx.fillStyle = "#666";
        humidityCtx.textAlign = "right";
        humidityCtx.textBaseline = "bottom";
        humidityCtx.fillText(lastTime, chart.width - 10, chart.height - 10);
        humidityCtx.restore();
    }
});

/*------------------------------ Pressure Chart --------------------------------------*/

// ดึง context ของ canvas ที่มี id เป็น "pre-chart" เพื่อใช้ในการวาดกราฟ
const pressureCtx = document.getElementById("pre-chart").getContext("2d");

// กำหนดค่าต่ำสุดและสูงสุดของความดัน (หน่วย hPa)
const MIN_PRESSURE = 900;
const MAX_PRESSURE = 1100;

// ตัวแปรสำหรับเก็บค่าความดัน
let pressureData = [];
let timeLabelspressure = [];

// สร้างกราฟความดันโดยใช้ Chart.js
let pressureChart = new Chart(pressureCtx, {
    type: "line",
    data: {
        labels: timeLabelspressure,
        datasets: [{
            label: "Pressure (hPa)",
            data: pressureData,
            borderColor: "#ffcc00",  // สีเหลืองของเส้นกราฟ
            backgroundColor: "rgba(255, 204, 0, 0.2)", // สีพื้นหลังของกราฟแบบโปร่งใส
            borderWidth: 2,
            tension: 0.4,
            pointRadius: 3,
            pointBackgroundColor: "#ffcc00",
            pointBorderColor: "#ffffff",
            pointHoverRadius: 5,
            pointHoverBackgroundColor: "#ffaa00",
            fill: true // ให้พื้นหลังกราฟถูกเติมสี
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
            padding: { right: 20 }
        },
        elements: {
            line: { borderJoinStyle: 'round' }
        },
        scales: {
            x: {
                title: {
                    display: true,
                    text: "เวลา",
                    color: "#333",
                    font: { size: 12, weight: "bold" }
                },
                grid: { display: false },
                ticks: { display: false }
            },
            y: {
                min: MIN_PRESSURE,
                max: MAX_PRESSURE,
                title: {
                    display: true,
                    text: "ความดัน (hPa)",
                    color: "#333",
                    font: { size: 12, weight: "bold" }
                },
                grid: { color: "rgba(200, 200, 200, 0.3)" }
            }
        },
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: "rgba(0, 0, 0, 0.8)",
                titleFont: { size: 12, weight: "bold" },
                bodyFont: { size: 12 },
                callbacks: {
                    label: function (context) {
                        return `ความดัน: ${context.raw.toFixed(1)} hPa`;
                    }
                }
            }
        }
    }
});

/*------------------ ฟังก์ชันอัปเดตกราฟความดัน ------------------*/

function updatePressureChart(newPressure) {
    const now = new Date().toLocaleTimeString();

    // ลบค่าที่เก่าที่สุดหากเกิน 20 ค่า
    if (pressureData.length >= 20) {
        pressureData.shift();
        timeLabelspressure.shift();
    }

    // เพิ่มค่าความดันใหม่และเวลาใหม่เข้าไป
    pressureData.push(newPressure);
    timeLabelspressure.push(now);

    // คำนวณสีที่เปลี่ยนไปตามความดัน
    const pressureColor = getPressureColor(newPressure);
    const rgb = pressureColor.match(/\d+/g);

    // อัปเดตสีของกราฟ
    pressureChart.data.datasets[0].borderColor = pressureColor;
    pressureChart.data.datasets[0].pointBackgroundColor = pressureColor;
    pressureChart.data.datasets[0].pointHoverBackgroundColor = pressureColor;
    pressureChart.data.datasets[0].backgroundColor = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.2)`;

    pressureChart.update();

    // อัปเดตค่าความดันที่แสดงใน HTML
    const pressureValueElement = document.getElementById("pre-value");
    pressureValueElement.textContent = `${newPressure.toFixed(1)} hPa`;
    pressureValueElement.style.color = pressureColor;
}

/*------------------ ฟังก์ชันเปลี่ยนสีตามค่าความดัน ------------------*/
function getPressureColor(pressure) {
    let ratio = (pressure - MIN_PRESSURE) / (MAX_PRESSURE - MIN_PRESSURE);
    ratio = Math.max(0, Math.min(1, ratio));

    const lowPressure = [255, 87, 51]; // สีแดง (ความดันต่ำ)
    const highPressure = [52, 152, 219]; // สีน้ำเงิน (ความดันสูง)

    const r = Math.round(lowPressure[0] + (highPressure[0] - lowPressure[0]) * ratio);
    const g = Math.round(lowPressure[1] + (highPressure[1] - lowPressure[1]) * ratio);
    const b = Math.round(lowPressure[2] + (highPressure[2] - lowPressure[2]) * ratio);

    return `rgb(${r}, ${g}, ${b})`;
}

/*------------------ จำลองค่าความดันทุก 3 วินาที ------------------*/


/*------------------ Plugin แสดงเวลาล่าสุดที่มุมขวาล่างของกราฟ ------------------*/
Chart.register({
    id: 'lastTimeDisplay',
    afterDraw: function (chart) {
        if (timeLabelspressure.length === 0) return;
        const ctx = chart.ctx;
        const lastTime = timeLabelspressure[timeLabelspressure.length - 1];
        ctx.save();
        ctx.font = "14px Arial";
        ctx.fillStyle = "#333";
        ctx.textAlign = "right";
        ctx.textBaseline = "bottom";
        ctx.fillText(lastTime, chart.width - 10, chart.height - 10);
        ctx.restore();
    }
});

/*------------------------------ CO₂ Chart --------------------------------------*/

// ดึง context ของ canvas ที่มี id เป็น "co-chart" เพื่อใช้ในการวาดกราฟ
const coCtx = document.getElementById("co-chart").getContext("2d");

// กำหนดค่าต่ำสุดและสูงสุดของ CO₂ (ppm)
const MIN_CO2 = 300;  // ค่า CO₂ ต่ำสุด (อากาศบริสุทธิ์)
const MAX_CO2 = 2000; // ค่า CO₂ สูงสุด (อากาศไม่ดี)

// ตัวแปรสำหรับเก็บค่าความเข้มข้นของ CO₂
let coData = [];
let timeLabelsCO = [];

// สร้างกราฟ CO₂ โดยใช้ Chart.js
let coChart = new Chart(coCtx, {
    type: "line",
    data: {
        labels: timeLabelsCO,
        datasets: [{
            label: "CO₂ (ppm)",
            data: coData,
            borderColor: "#27ae60",  // สีเขียว
            backgroundColor: "rgba(39, 174, 96, 0.2)", // สีพื้นหลังโปร่งใส
            borderWidth: 2,
            tension: 0.4,
            pointRadius: 3,
            pointBackgroundColor: "#27ae60",
            pointBorderColor: "#ffffff",
            pointHoverRadius: 5,
            pointHoverBackgroundColor: "#1e8449",
            fill: true
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
            padding: { right: 20 }
        },
        elements: {
            line: { borderJoinStyle: 'round' }
        },
        scales: {
            x: {
                title: {
                    display: true,
                    text: "เวลา",
                    color: "#333",
                    font: { size: 12, weight: "bold" }
                },
                grid: { display: false },
                ticks: { display: false }
            },
            y: {
                min: MIN_CO2,
                max: MAX_CO2,
                title: {
                    display: true,
                    text: "CO₂ (ppm)",
                    color: "#333",
                    font: { size: 12, weight: "bold" }
                },
                grid: { color: "rgba(200, 200, 200, 0.3)" }
            }
        },
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: "rgba(0, 0, 0, 0.8)",
                titleFont: { size: 12, weight: "bold" },
                bodyFont: { size: 12 },
                callbacks: {
                    label: function (context) {
                        return `CO₂: ${context.raw.toFixed(1)} ppm`;
                    }
                }
            }
        }
    }
});

/*------------------ ฟังก์ชันอัปเดตกราฟ CO₂ ------------------*/

function updateCOChart(newCO) {
    const now = new Date().toLocaleTimeString();

    // ลบค่าที่เก่าที่สุดหากเกิน 20 ค่า
    if (coData.length >= 20) {
        coData.shift();
        timeLabelsCO.shift();
    }

    // เพิ่มค่าความเข้มข้น CO₂ ใหม่และเวลาใหม่เข้าไป
    coData.push(newCO);
    timeLabelsCO.push(now);

    // คำนวณสีที่เปลี่ยนไปตามค่า CO₂
    const coColor = getCOColor(newCO);
    const rgb = coColor.match(/\d+/g);

    // อัปเดตสีของกราฟ
    coChart.data.datasets[0].borderColor = coColor;
    coChart.data.datasets[0].pointBackgroundColor = coColor;
    coChart.data.datasets[0].pointHoverBackgroundColor = coColor;
    coChart.data.datasets[0].backgroundColor = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.2)`;

    coChart.update();

    // อัปเดตค่าความเข้มข้น CO₂ ที่แสดงใน HTML
    const coValueElement = document.getElementById("co-value");
    coValueElement.textContent = `${newCO.toFixed(1)} ppm`;
    coValueElement.style.color = coColor;
}

/*------------------ ฟังก์ชันเปลี่ยนสีตามค่า CO₂ ------------------*/
function getCOColor(co) {
    if (co < 600) {
        return "rgb(46, 204, 113)"; // สีเขียว (อากาศดี)
    } else if (co < 1000) {
        return "rgb(241, 196, 15)"; // สีเหลือง (เริ่มมีมลพิษ)
    } else if (co < 1500) {
        return "rgb(230, 126, 34)"; // สีส้ม (อากาศเริ่มแย่)
    } else {
        return "rgb(192, 57, 43)"; // สีแดง (อันตราย)
    }
}

/*------------------ จำลองค่าความเข้มข้น CO₂ ทุก 3 วินาที ------------------*/


/*------------------ Plugin แสดงเวลาล่าสุดที่มุมขวาล่างของกราฟ ------------------*/
Chart.register({
    id: 'lastTimeDisplay',
    afterDraw: function (chart) {
        if (timeLabelsCO.length === 0) return;
        const ctx = chart.ctx;
        const lastTime = timeLabelsCO[timeLabelsCO.length - 1];
        ctx.save();
        ctx.font = "14px Arial";
        ctx.fillStyle = "#333";
        ctx.textAlign = "right";
        ctx.textBaseline = "bottom";
        ctx.fillText(lastTime, chart.width - 10, chart.height - 10);
        ctx.restore();
    }
});

/*------------------------------ CH₄ (Methane) Chart --------------------------------------*/

// ดึง context ของ canvas ที่มี id เป็น "met-chart" เพื่อใช้ในการวาดกราฟ
const metCtx = document.getElementById("met-chart").getContext("2d");

// กำหนดค่าต่ำสุดและสูงสุดของ Methane (ppm)
const MIN_METHANE = 0;    // ค่า CH₄ ต่ำสุด
const MAX_METHANE = 5000; // ค่า CH₄ สูงสุด (ระดับอันตราย)

// ตัวแปรสำหรับเก็บค่าความเข้มข้นของ CH₄
let metData = [];
let timeLabelsMet = [];

// สร้างกราฟ CH₄ โดยใช้ Chart.js
let metChart = new Chart(metCtx, {
    type: "line",
    data: {
        labels: timeLabelsMet,
        datasets: [{
            label: "Methane (ppm)",
            data: metData,
            borderColor: "#8e44ad",  // สีม่วง
            backgroundColor: "rgba(142, 68, 173, 0.2)", // สีพื้นหลังโปร่งใส
            borderWidth: 2,
            tension: 0.4,
            pointRadius: 3,
            pointBackgroundColor: "#8e44ad",
            pointBorderColor: "#ffffff",
            pointHoverRadius: 5,
            pointHoverBackgroundColor: "#5e3370",
            fill: true
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
            padding: { right: 20 }
        },
        elements: {
            line: { borderJoinStyle: 'round' }
        },
        scales: {
            x: {
                title: {
                    display: true,
                    text: "เวลา",
                    color: "#333",
                    font: { size: 12, weight: "bold" }
                },
                grid: { display: false },
                ticks: { display: false }
            },
            y: {
                min: MIN_METHANE,
                max: MAX_METHANE,
                title: {
                    display: true,
                    text: "Methane (ppm)",
                    color: "#333",
                    font: { size: 12, weight: "bold" }
                },
                grid: { color: "rgba(200, 200, 200, 0.3)" }
            }
        },
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: "rgba(0, 0, 0, 0.8)",
                titleFont: { size: 12, weight: "bold" },
                bodyFont: { size: 12 },
                callbacks: {
                    label: function (context) {
                        return `CH₄: ${context.raw.toFixed(1)} ppm`;
                    }
                }
            }
        }
    }
});

/*------------------ ฟังก์ชันอัปเดตกราฟ CH₄ ------------------*/

function updateMetChart(newMet) {
    const now = new Date().toLocaleTimeString();

    // ลบค่าที่เก่าที่สุดหากเกิน 20 ค่า
    if (metData.length >= 20) {
        metData.shift();
        timeLabelsMet.shift();
    }

    // เพิ่มค่าความเข้มข้น CH₄ ใหม่และเวลาใหม่เข้าไป
    metData.push(newMet);
    timeLabelsMet.push(now);

    // คำนวณสีที่เปลี่ยนไปตามค่า CH₄
    const metColor = getMetColor(newMet);
    const rgb = metColor.match(/\d+/g);

    // อัปเดตสีของกราฟ
    metChart.data.datasets[0].borderColor = metColor;
    metChart.data.datasets[0].pointBackgroundColor = metColor;
    metChart.data.datasets[0].pointHoverBackgroundColor = metColor;
    metChart.data.datasets[0].backgroundColor = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.2)`;

    metChart.update();

    // อัปเดตค่าความเข้มข้น CH₄ ที่แสดงใน HTML
    const metValueElement = document.getElementById("met-value");
    metValueElement.textContent = `${newMet.toFixed(1)} ppm`;
    metValueElement.style.color = metColor;
}

/*------------------ ฟังก์ชันเปลี่ยนสีตามค่า CH₄ ------------------*/
function getMetColor(met) {
    if (met < 1000) {
        return "rgb(39, 174, 96)"; // สีเขียว (ปลอดภัย)
    } else if (met < 2000) {
        return "rgb(241, 196, 15)"; // สีเหลือง (เริ่มสูง)
    } else if (met < 3500) {
        return "rgb(230, 126, 34)"; // สีส้ม (อันตรายปานกลาง)
    } else {
        return "rgb(192, 57, 43)"; // สีแดง (อันตรายสูง)
    }
}

/*------------------ จำลองค่าความเข้มข้น CH₄ ทุก 3 วินาที ------------------*/


/*------------------ Plugin แสดงเวลาล่าสุดที่มุมขวาล่างของกราฟ ------------------*/
Chart.register({
    id: 'lastTimeDisplay',
    afterDraw: function (chart) {
        if (timeLabelsMet.length === 0) return;
        const ctx = chart.ctx;
        const lastTime = timeLabelsMet[timeLabelsMet.length - 1];
        ctx.save();
        ctx.font = "14px Arial";
        ctx.fillStyle = "#333";
        ctx.textAlign = "right";
        ctx.textBaseline = "bottom";
        ctx.fillText(lastTime, chart.width - 10, chart.height - 10);
        ctx.restore();
    }
});

/*------------------------------ C₂H₆O (Ethanol) Chart --------------------------------------*/

// ดึง context ของ canvas ที่มี id เป็น "eth-chart" เพื่อใช้ในการวาดกราฟ
const ethCtx = document.getElementById("eth-chart").getContext("2d");

// กำหนดค่าต่ำสุดและสูงสุดของ Ethanol (ppm)
const MIN_ETHANOL = 0;    // ค่า C₂H₆O ต่ำสุด
const MAX_ETHANOL = 5000; // ค่า C₂H₆O สูงสุด (ระดับอันตราย)

// ตัวแปรสำหรับเก็บค่าความเข้มข้นของ Ethanol
let ethData = [];
let timeLabelsEth = [];

// สร้างกราฟ Ethanol โดยใช้ Chart.js
let ethChart = new Chart(ethCtx, {
    type: "line",
    data: {
        labels: timeLabelsEth,
        datasets: [{
            label: "Ethanol (ppm)",
            data: ethData,
            borderColor: "#f39c12",  // สีส้ม
            backgroundColor: "rgba(243, 156, 18, 0.2)", // สีพื้นหลังโปร่งใส
            borderWidth: 2,
            tension: 0.4,
            pointRadius: 3,
            pointBackgroundColor: "#f39c12",
            pointBorderColor: "#ffffff",
            pointHoverRadius: 5,
            pointHoverBackgroundColor: "#d68910",
            fill: true
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
            padding: { right: 20 }
        },
        elements: {
            line: { borderJoinStyle: 'round' }
        },
        scales: {
            x: {
                title: {
                    display: true,
                    text: "เวลา",
                    color: "#333",
                    font: { size: 12, weight: "bold" }
                },
                grid: { display: false },
                ticks: { display: false }
            },
            y: {
                min: MIN_ETHANOL,
                max: MAX_ETHANOL,
                title: {
                    display: true,
                    text: "Ethanol (ppm)",
                    color: "#333",
                    font: { size: 12, weight: "bold" }
                },
                grid: { color: "rgba(200, 200, 200, 0.3)" }
            }
        },
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: "rgba(0, 0, 0, 0.8)",
                titleFont: { size: 12, weight: "bold" },
                bodyFont: { size: 12 },
                callbacks: {
                    label: function (context) {
                        return `C₂H₆O: ${context.raw.toFixed(1)} ppm`;
                    }
                }
            }
        }
    }
});

/*------------------ ฟังก์ชันอัปเดตกราฟ Ethanol ------------------*/

function updateEthChart(newEth) {
    const now = new Date().toLocaleTimeString();

    // ลบค่าที่เก่าที่สุดหากเกิน 20 ค่า
    if (ethData.length >= 20) {
        ethData.shift();
        timeLabelsEth.shift();
    }

    // เพิ่มค่าความเข้มข้น Ethanol ใหม่และเวลาใหม่เข้าไป
    ethData.push(newEth);
    timeLabelsEth.push(now);

    // คำนวณสีที่เปลี่ยนไปตามค่า Ethanol
    const ethColor = getEthColor(newEth);
    const rgb = ethColor.match(/\d+/g);

    // อัปเดตสีของกราฟ
    ethChart.data.datasets[0].borderColor = ethColor;
    ethChart.data.datasets[0].pointBackgroundColor = ethColor;
    ethChart.data.datasets[0].pointHoverBackgroundColor = ethColor;
    ethChart.data.datasets[0].backgroundColor = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.2)`;

    ethChart.update();

    // อัปเดตค่าความเข้มข้น Ethanol ที่แสดงใน HTML
    const ethValueElement = document.getElementById("eth-value");
    ethValueElement.textContent = `${newEth.toFixed(1)} ppm`;
    ethValueElement.style.color = ethColor;
}

/*------------------ ฟังก์ชันเปลี่ยนสีตามค่า Ethanol ------------------*/
function getEthColor(eth) {
    if (eth < 1000) {
        return "rgb(39, 174, 96)"; // สีเขียว (ปลอดภัย)
    } else if (eth < 2000) {
        return "rgb(241, 196, 15)"; // สีเหลือง (เริ่มสูง)
    } else if (eth < 3500) {
        return "rgb(230, 126, 34)"; // สีส้ม (อันตรายปานกลาง)
    } else {
        return "rgb(192, 57, 43)"; // สีแดง (อันตรายสูง)
    }
}

/*------------------ จำลองค่าความเข้มข้น Ethanol ทุก 3 วินาที ------------------*/


/*------------------ Plugin แสดงเวลาล่าสุดที่มุมขวาล่างของกราฟ ------------------*/
Chart.register({
    id: 'lastTimeDisplay',
    afterDraw: function (chart) {
        if (timeLabelsEth.length === 0) return;
        const ctx = chart.ctx;
        const lastTime = timeLabelsEth[timeLabelsEth.length - 1];
        ctx.save();
        ctx.font = "14px Arial";
        ctx.fillStyle = "#333";
        ctx.textAlign = "right";
        ctx.textBaseline = "bottom";
        ctx.fillText(lastTime, chart.width - 10, chart.height - 10);
        ctx.restore();
    }
});

/*------------------------------ Nitrogen Chart --------------------------------------*/

// ดึง context ของ canvas ที่มี id เป็น "nit-chart" เพื่อใช้ในการวาดกราฟ
const nitCtx = document.getElementById("nit-chart").getContext("2d");

// กำหนดค่าต่ำสุดและสูงสุดของไนโตรเจน (ppm)
const MIN_NITROGEN = 0;    // ค่า Nitrogen ต่ำสุด
const MAX_NITROGEN = 5000; // ค่า Nitrogen สูงสุด (ระดับอันตราย)

// ตัวแปรสำหรับเก็บค่าความเข้มข้นของไนโตรเจน
let nitData = [];
let timeLabelsNit = [];

// สร้างกราฟไนโตรเจนโดยใช้ Chart.js
let nitChart = new Chart(nitCtx, {
    type: "line",
    data: {
        labels: timeLabelsNit,
        datasets: [{
            label: "Nitrogen (ppm)",
            data: nitData,
            borderColor: "#16a085",  // สีเขียวมรกต
            backgroundColor: "rgba(22, 160, 133, 0.2)", // สีพื้นหลังโปร่งใส
            borderWidth: 2,
            tension: 0.4,
            pointRadius: 3,
            pointBackgroundColor: "#16a085",
            pointBorderColor: "#ffffff",
            pointHoverRadius: 5,
            pointHoverBackgroundColor: "#1abc9c",
            fill: true
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
            padding: { right: 20 }
        },
        elements: {
            line: { borderJoinStyle: 'round' }
        },
        scales: {
            x: {
                title: {
                    display: true,
                    text: "เวลา",
                    color: "#333",
                    font: { size: 12, weight: "bold" }
                },
                grid: { display: false },
                ticks: { display: false }
            },
            y: {
                min: MIN_NITROGEN,
                max: MAX_NITROGEN,
                title: {
                    display: true,
                    text: "Nitrogen (ppm)",
                    color: "#333",
                    font: { size: 12, weight: "bold" }
                },
                grid: { color: "rgba(200, 200, 200, 0.3)" }
            }
        },
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: "rgba(0, 0, 0, 0.8)",
                titleFont: { size: 12, weight: "bold" },
                bodyFont: { size: 12 },
                callbacks: {
                    label: function (context) {
                        return `Nitrogen: ${context.raw.toFixed(1)} ppm`;
                    }
                }
            }
        }
    }
});

/*------------------ ฟังก์ชันอัปเดตกราฟไนโตรเจน ------------------*/

function updateNitChart(newNit) {
    const now = new Date().toLocaleTimeString();

    // ลบค่าที่เก่าที่สุดหากเกิน 20 ค่า
    if (nitData.length >= 20) {
        nitData.shift();
        timeLabelsNit.shift();
    }

    // เพิ่มค่าความเข้มข้น Nitrogen ใหม่และเวลาใหม่เข้าไป
    nitData.push(newNit);
    timeLabelsNit.push(now);

    // คำนวณสีที่เปลี่ยนไปตามค่า Nitrogen
    const nitColor = getNitColor(newNit);
    const rgb = nitColor.match(/\d+/g);

    // อัปเดตสีของกราฟ
    nitChart.data.datasets[0].borderColor = nitColor;
    nitChart.data.datasets[0].pointBackgroundColor = nitColor;
    nitChart.data.datasets[0].pointHoverBackgroundColor = nitColor;
    nitChart.data.datasets[0].backgroundColor = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.2)`;

    nitChart.update();

    // อัปเดตค่าความเข้มข้น Nitrogen ที่แสดงใน HTML
    const nitValueElement = document.getElementById("nit-value");
    nitValueElement.textContent = `${newNit.toFixed(1)} ppm`;
    nitValueElement.style.color = nitColor;
}

/*------------------ ฟังก์ชันเปลี่ยนสีตามค่า Nitrogen ------------------*/
function getNitColor(nit) {
    if (nit < 1000) {
        return "rgb(46, 204, 113)"; // สีเขียว (ปลอดภัย)
    } else if (nit < 2000) {
        return "rgb(241, 196, 15)"; // สีเหลือง (เริ่มสูง)
    } else if (nit < 3500) {
        return "rgb(230, 126, 34)"; // สีส้ม (อันตรายปานกลาง)
    } else {
        return "rgb(192, 57, 43)"; // สีแดง (อันตรายสูง)
    }
}

/*------------------ จำลองค่าความเข้มข้น Nitrogen ทุก 3 วินาที ------------------*/


/*------------------ Plugin แสดงเวลาล่าสุดที่มุมขวาล่างของกราฟ ------------------*/
Chart.register({
    id: 'lastTimeDisplay',
    afterDraw: function (chart) {
        if (timeLabelsNit.length === 0) return;
        const ctx = chart.ctx;
        const lastTime = timeLabelsNit[timeLabelsNit.length - 1];
        ctx.save();
        ctx.font = "14px Arial";
        ctx.fillStyle = "#333";
        ctx.textAlign = "right";
        ctx.textBaseline = "bottom";
        ctx.fillText(lastTime, chart.width - 10, chart.height - 10);
        ctx.restore();
    }
});

/*------------------------------ Ammonia Chart --------------------------------------*/

// ดึง context ของ canvas ที่มี id เป็น "amm-chart" เพื่อใช้ในการวาดกราฟ
const ammCtx = document.getElementById("amm-chart").getContext("2d");

// กำหนดค่าต่ำสุดและสูงสุดของแอมโมเนีย (ppm)
const MIN_AMMONIA = 0;    // ค่า Ammonia ต่ำสุด
const MAX_AMMONIA = 500;  // ค่า Ammonia สูงสุด (ระดับอันตราย)

// ตัวแปรสำหรับเก็บค่าความเข้มข้นของแอมโมเนีย
let ammData = [];
let timeLabelsAmm = [];

// สร้างกราฟแอมโมเนียโดยใช้ Chart.js
let ammChart = new Chart(ammCtx, {
    type: "line",
    data: {
        labels: timeLabelsAmm,
        datasets: [{
            label: "Ammonia (ppm)",
            data: ammData,
            borderColor: "#f39c12",  // สีส้ม (ค่าปกติ)
            backgroundColor: "rgba(243, 156, 18, 0.2)", // สีพื้นหลังโปร่งใส
            borderWidth: 2,
            tension: 0.4,
            pointRadius: 3,
            pointBackgroundColor: "#f39c12",
            pointBorderColor: "#ffffff",
            pointHoverRadius: 5,
            pointHoverBackgroundColor: "#e67e22",
            fill: true
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
            padding: { right: 20 }
        },
        elements: {
            line: { borderJoinStyle: 'round' }
        },
        scales: {
            x: {
                title: {
                    display: true,
                    text: "เวลา",
                    color: "#333",
                    font: { size: 12, weight: "bold" }
                },
                grid: { display: false },
                ticks: { display: false }
            },
            y: {
                min: MIN_AMMONIA,
                max: MAX_AMMONIA,
                title: {
                    display: true,
                    text: "Ammonia (ppm)",
                    color: "#333",
                    font: { size: 12, weight: "bold" }
                },
                grid: { color: "rgba(200, 200, 200, 0.3)" }
            }
        },
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: "rgba(0, 0, 0, 0.8)",
                titleFont: { size: 12, weight: "bold" },
                bodyFont: { size: 12 },
                callbacks: {
                    label: function (context) {
                        return `Ammonia: ${context.raw.toFixed(1)} ppm`;
                    }
                }
            }
        }
    }
});

/*------------------ ฟังก์ชันอัปเดตกราฟแอมโมเนีย ------------------*/

function updateAmmChart(newAmm) {
    const now = new Date().toLocaleTimeString();

    // ลบค่าที่เก่าที่สุดหากเกิน 20 ค่า
    if (ammData.length >= 20) {
        ammData.shift();
        timeLabelsAmm.shift();
    }

    // เพิ่มค่าความเข้มข้น Ammonia ใหม่และเวลาใหม่เข้าไป
    ammData.push(newAmm);
    timeLabelsAmm.push(now);

    // คำนวณสีที่เปลี่ยนไปตามค่า Ammonia
    const ammColor = getAmmColor(newAmm);
    const rgb = ammColor.match(/\d+/g);

    // อัปเดตสีของกราฟ
    ammChart.data.datasets[0].borderColor = ammColor;
    ammChart.data.datasets[0].pointBackgroundColor = ammColor;
    ammChart.data.datasets[0].pointHoverBackgroundColor = ammColor;
    ammChart.data.datasets[0].backgroundColor = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.2)`;

    ammChart.update();

    // อัปเดตค่าความเข้มข้น Ammonia ที่แสดงใน HTML
    const ammValueElement = document.getElementById("amm-value");
    ammValueElement.textContent = `${newAmm.toFixed(1)} ppm`;
    ammValueElement.style.color = ammColor;
}

/*------------------ ฟังก์ชันเปลี่ยนสีตามค่า Ammonia ------------------*/
function getAmmColor(amm) {
    if (amm < 50) {
        return "rgb(46, 204, 113)"; // สีเขียว (ปลอดภัย)
    } else if (amm < 100) {
        return "rgb(241, 196, 15)"; // สีเหลือง (เริ่มสูง)
    } else if (amm < 200) {
        return "rgb(230, 126, 34)"; // สีส้ม (อันตรายปานกลาง)
    } else {
        return "rgb(192, 57, 43)"; // สีแดง (อันตรายสูง)
    }
}

/*------------------ จำลองค่าความเข้มข้น Ammonia ทุก 3 วินาที ------------------*/


/*------------------ Plugin แสดงเวลาล่าสุดที่มุมขวาล่างของกราฟ ------------------*/
Chart.register({
    id: 'lastTimeDisplay',
    afterDraw: function (chart) {
        if (timeLabelsAmm.length === 0) return;
        const ctx = chart.ctx;
        const lastTime = timeLabelsAmm[timeLabelsAmm.length - 1];
        ctx.save();
        ctx.font = "14px Arial";
        ctx.fillStyle = "#333";
        ctx.textAlign = "right";
        ctx.textBaseline = "bottom";
        ctx.fillText(lastTime, chart.width - 10, chart.height - 10);
        ctx.restore();
    }
});


/*------------------------------ Nitrogen Dioxide Chart --------------------------------------*/

// ดึง context ของ canvas ที่มี id เป็น "nitr-chart" เพื่อใช้ในการวาดกราฟ
const nitrCtx = document.getElementById("nitr-chart").getContext("2d");

// กำหนดค่าต่ำสุดและสูงสุดของไนโตรเจนไดออกไซด์ (ppb หรือ ppm)
const MIN_NITRODIOXIDE = 0;    // ค่า Nitrogen Dioxide ต่ำสุด
const MAX_NITRODIOXIDE = 500;  // ค่า Nitrogen Dioxide สูงสุด (ระดับอันตราย)

// ตัวแปรสำหรับเก็บค่าความเข้มข้นของไนโตรเจนไดออกไซด์
let nitrData = [];
let timeLabelsNitr = [];

// สร้างกราฟไนโตรเจนไดออกไซด์โดยใช้ Chart.js
let nitrChart = new Chart(nitrCtx, {
    type: "line",
    data: {
        labels: timeLabelsNitr,
        datasets: [{
            label: "Nitrogen Dioxide (ppb)",
            data: nitrData,
            borderColor: "#e74c3c",  // สีแดง (ค่าปกติ)
            backgroundColor: "rgba(231, 76, 60, 0.2)", // สีพื้นหลังโปร่งใส
            borderWidth: 2,
            tension: 0.4,
            pointRadius: 3,
            pointBackgroundColor: "#e74c3c",
            pointBorderColor: "#ffffff",
            pointHoverRadius: 5,
            pointHoverBackgroundColor: "#c0392b",
            fill: true
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
            padding: { right: 20 }
        },
        elements: {
            line: { borderJoinStyle: 'round' }
        },
        scales: {
            x: {
                title: {
                    display: true,
                    text: "เวลา",
                    color: "#333",
                    font: { size: 12, weight: "bold" }
                },
                grid: { display: false },
                ticks: { display: false }
            },
            y: {
                min: MIN_NITRODIOXIDE,
                max: MAX_NITRODIOXIDE,
                title: {
                    display: true,
                    text: "Nitrogen Dioxide (ppb)",
                    color: "#333",
                    font: { size: 12, weight: "bold" }
                },
                grid: { color: "rgba(200, 200, 200, 0.3)" }
            }
        },
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: "rgba(0, 0, 0, 0.8)",
                titleFont: { size: 12, weight: "bold" },
                bodyFont: { size: 12 },
                callbacks: {
                    label: function (context) {
                        return `Nitrogen Dioxide: ${context.raw.toFixed(1)} ppb`;
                    }
                }
            }
        }
    }
});

/*------------------ ฟังก์ชันอัปเดตกราฟไนโตรเจนไดออกไซด์ ------------------*/

function updateNitrChart(newNitr) {
    const now = new Date().toLocaleTimeString();

    // ลบค่าที่เก่าที่สุดหากเกิน 20 ค่า
    if (nitrData.length >= 20) {
        nitrData.shift();
        timeLabelsNitr.shift();
    }

    // เพิ่มค่าความเข้มข้น Nitrogen Dioxide ใหม่และเวลาใหม่เข้าไป
    nitrData.push(newNitr);
    timeLabelsNitr.push(now);

    // คำนวณสีที่เปลี่ยนไปตามค่า Nitrogen Dioxide
    const nitrColor = getNitrColor(newNitr);
    const rgb = nitrColor.match(/\d+/g);

    // อัปเดตสีของกราฟ
    nitrChart.data.datasets[0].borderColor = nitrColor;
    nitrChart.data.datasets[0].pointBackgroundColor = nitrColor;
    nitrChart.data.datasets[0].pointHoverBackgroundColor = nitrColor;
    nitrChart.data.datasets[0].backgroundColor = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.2)`;

    nitrChart.update();

    // อัปเดตค่าความเข้มข้น Nitrogen Dioxide ที่แสดงใน HTML
    const nitrValueElement = document.getElementById("nitr-value");
    nitrValueElement.textContent = `${newNitr.toFixed(1)} ppb`;
    nitrValueElement.style.color = nitrColor;
}

/*------------------ ฟังก์ชันเปลี่ยนสีตามค่า Nitrogen Dioxide ------------------*/
function getNitrColor(nitr) {
    if (nitr < 50) {
        return "rgb(46, 204, 113)"; // สีเขียว (ปลอดภัย)
    } else if (nitr < 100) {
        return "rgb(241, 196, 15)"; // สีเหลือง (เริ่มสูง)
    } else if (nitr < 200) {
        return "rgb(230, 126, 34)"; // สีส้ม (อันตรายปานกลาง)
    } else {
        return "rgb(192, 57, 43)"; // สีแดง (อันตรายสูง)
    }
}

/*------------------ จำลองค่าความเข้มข้น Nitrogen Dioxide ทุก 3 วินาที ------------------*/


/*------------------ Plugin แสดงเวลาล่าสุดที่มุมขวาล่างของกราฟ ------------------*/
Chart.register({
    id: 'lastTimeDisplay',
    afterDraw: function (chart) {
        if (timeLabelsNitr.length === 0) return;
        const ctx = chart.ctx;
        const lastTime = timeLabelsNitr[timeLabelsNitr.length - 1];
        ctx.save();
        ctx.font = "14px Arial";
        ctx.fillStyle = "#333";
        ctx.textAlign = "right";
        ctx.textBaseline = "bottom";
        ctx.fillText(lastTime, chart.width - 10, chart.height - 10);
        ctx.restore();
    }
});

