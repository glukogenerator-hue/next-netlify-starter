import React, { useState, useEffect } from "react";
import { Wifi, Settings, Thermometer, Bluetooth, Plug } from "lucide-react";

const SERVICE_UUID = "6E400001-B5A3-F393-E0A9-E50E24DCCA9E";
const CHARACTERISTIC_UUID_RX = "6E400002-B5A3-F393-E0A9-E50E24DCCA9E";
const CHARACTERISTIC_UUID_TX = "6E400003-B5A3-F393-E0A9-E50E24DCCA9E";

export default function ESP32ConfigApp() {
  const [device, setDevice] = useState(null);
  const [temperature, setTemperature] = useState("--");
  const [status, setStatus] = useState("Ожидание подключения...");
  const [ipConfig, setIpConfig] = useState({
    ip: "",
    subnet: "",
    gateway: "",
    dns: "",
  });
  const [rxChar, setRxChar] = useState(null);

  const connectToESP32 = async () => {
    try {
      setStatus("Подключение к ESP32...");
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ name: "ESP32_Config" }],
        optionalServices: [SERVICE_UUID],
      });

      const server = await device.gatt.connect();
      const service = await server.getPrimaryService(SERVICE_UUID);
      const txChar = await service.getCharacteristic(CHARACTERISTIC_UUID_TX);
      const rxChar = await service.getCharacteristic(CHARACTERISTIC_UUID_RX);

      setDevice(device);
      setRxChar(rxChar);
      setStatus("✅ Подключено!");

      txChar.startNotifications();
      txChar.addEventListener("characteristicvaluechanged", (event) => {
        const msg = new TextDecoder().decode(event.target.value);
        console.log("BLE Notify:", msg);
        if (msg.includes("Temp:")) {
          const t = msg.match(/([\d\.\-]+)C/);
          if (t) setTemperature(t[1]);
        } else {
          setStatus(msg);
        }
      });
    } catch (error) {
      console.error(error);
      setStatus("Ошибка подключения");
    }
  };

  const sendCommand = async (cmd) => {
    if (!rxChar) return alert("BLE не подключен");
    await rxChar.writeValue(new TextEncoder().encode(cmd));
    setStatus("Команда отправлена");
  };

  const handleStaticSubmit = (e) => {
    e.preventDefault();
    const { ip, subnet, gateway, dns } = ipConfig;
    const cmd = `static,${ip},${subnet},${gateway},${dns}`;
    sendCommand(cmd);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full bg-gray-800 p-6 rounded-2xl shadow-lg">
        <h1 className="text-2xl font-bold mb-4 flex items-center justify-center gap-2">
          <Bluetooth /> ESP32 Configurator
        </h1>

        <p className="text-sm mb-4 text-gray-400">{status}</p>

        {!device && (
          <button
            onClick={connectToESP32}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg"
          >
            🔗 Подключить по BLE
          </button>
        )}

        {device && (
          <>
            <div className="mt-4 p-3 bg-gray-700 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Thermometer />
                <span className="text-lg font-semibold">
                  {temperature} °C
                </span>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <button
                onClick={() => sendCommand("dhcp")}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg flex items-center justify-center gap-2"
              >
                <Plug /> Включить DHCP
              </button>

              <form
                onSubmit={handleStaticSubmit}
                className="bg-gray-700 p-4 rounded-lg space-y-3 text-left"
              >
                <p className="font-semibold flex items-center gap-2">
                  <Settings /> Статическая IP конфигурация
                </p>
                {["ip", "subnet", "gateway", "dns"].map((f) => (
                  <input
                    key={f}
                    type="text"
                    placeholder={f.toUpperCase()}
                    value={ipConfig[f]}
                    onChange={(e) =>
                      setIpConfig({ ...ipConfig, [f]: e.target.value })
                    }
                    className="w-full p-2 bg-gray-800 rounded text-white text-sm"
                  />
                ))}
                <button
                  type="submit"
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg"
                >
                  💾 Сохранить статический IP
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
