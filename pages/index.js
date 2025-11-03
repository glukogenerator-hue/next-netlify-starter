import React, { useState, useEffect } from 'react';
import { Bluetooth, Wifi, RefreshCw, Send, Copy, Check } from 'lucide-react';

export default function ESP32ConfigApp() {
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [connected, setConnected] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [message, setMessage] = useState('');
  const [responseMessage, setResponseMessage] = useState('');
  const [copied, setCopied] = useState(false);

  const [networkMode, setNetworkMode] = useState('dhcp');
  const [ipAddress, setIpAddress] = useState('192.168.1.100');
  const [subnet, setSubnet] = useState('255.255.255.0');
  const [gateway, setGateway] = useState('192.168.1.1');
  const [dns, setDns] = useState('8.8.8.8');

  // UUID сервиса и характеристик
  const SERVICE_UUID = '6E400001-B5A3-F393-E0A9-E50E24DCCA9E';
  const CHARACTERISTIC_RX = '6E400002-B5A3-F393-E0A9-E50E24DCCA9E';
  const CHARACTERISTIC_TX = '6E400003-B5A3-F393-E0A9-E50E24DCCA9E';

  // Сканирование BLE устройств
  const scanDevices = async () => {
    try {
      setScanning(true);
      setDevices([]);
      
      const foundDevices = await navigator.bluetooth.requestDevice({
        filters: [{ name: 'ESP32_Config' }],
        optionalServices: [SERVICE_UUID]
      }).then(device => [device]).catch(() => []);

      if (foundDevices.length > 0) {
        setDevices(foundDevices);
        setSelectedDevice(foundDevices[0]);
      }
    } catch (error) {
      setMessage('❌ Ошибка сканирования: ' + error.message);
    } finally {
      setScanning(false);
    }
  };

  // Подключение к устройству
  const connectDevice = async () => {
    if (!selectedDevice) {
      setMessage('❌ Выберите устройство');
      return;
    }

    try {
      const gatt = await selectedDevice.gatt.connect();
      const service = await gatt.getPrimaryService(SERVICE_UUID);
      const rxChar = await service.getCharacteristic(CHARACTERISTIC_RX);
      const txChar = await service.getCharacteristic(CHARACTERISTIC_TX);

      // Слушаем уведомления от устройства
      await txChar.startNotifications();
      txChar.addEventListener('characteristicvaluechanged', (event) => {
        const value = new TextDecoder().decode(event.target.value);
        setResponseMessage('📩 ' + value);
        setMessage('');
      });

      setConnected(true);
      setMessage('✓ Подключено!');
      
      // Сохраняем для использования в отправке
      selectedDevice.rxChar = rxChar;
      selectedDevice.txChar = txChar;
      selectedDevice.gatt = gatt;
    } catch (error) {
      setMessage('❌ Ошибка подключения: ' + error.message);
    }
  };

  // Отключение
  const disconnectDevice = async () => {
    try {
      if (selectedDevice && selectedDevice.gatt) {
        await selectedDevice.gatt.disconnect();
      }
      setConnected(false);
      setMessage('Отключено');
    } catch (error) {
      setMessage('❌ Ошибка отключения: ' + error.message);
    }
  };

  // Отправка команды DHCP
  const sendDHCP = async () => {
    if (!selectedDevice?.rxChar) {
      setMessage('❌ Не подключено');
      return;
    }

    try {
      const cmd = 'dhcp';
      const encoder = new TextEncoder();
      await selectedDevice.rxChar.writeValue(encoder.encode(cmd));
      setMessage('📤 DHCP команда отправлена...');
      setResponseMessage('');
    } catch (error) {
      setMessage('❌ Ошибка отправки: ' + error.message);
    }
  };

  // Отправка команды Static IP
  const sendStatic = async () => {
    // Валидация
    if (!ipAddress || !subnet || !gateway || !dns) {
      setMessage('❌ Заполните все поля');
      return;
    }

    // Простая проверка IP формата
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(ipAddress) || !ipRegex.test(subnet) || 
        !ipRegex.test(gateway) || !ipRegex.test(dns)) {
      setMessage('❌ Неверный формат IP адреса');
      return;
    }

    if (!selectedDevice?.rxChar) {
      setMessage('❌ Не подключено');
      return;
    }

    try {
      const cmd = `static,${ipAddress},${subnet},${gateway},${dns}`;
      console.log('Отправляю:', cmd);
      
      const encoder = new TextEncoder();
      await selectedDevice.rxChar.writeValue(encoder.encode(cmd));
      setMessage('📤 Static IP команда отправлена...');
      setResponseMessage('');
    } catch (error) {
      setMessage('❌ Ошибка отправки: ' + error.message);
    }
  };

  // Копирование в буфер обмена
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-purple-900 p-4">
      <div className="max-w-2xl mx-auto">
        {/* ЗАГОЛОВОК */}
        <div className="bg-white/10 backdrop-blur-md rounded-t-2xl p-6 border border-white/20">
          <div className="flex items-center gap-3 mb-2">
            <Bluetooth className="w-8 h-8 text-cyan-400" />
            <h1 className="text-3xl font-bold text-white">ESP32 Configurator</h1>
          </div>
          <p className="text-blue-200">Управление сетевыми параметрами через BLE</p>
        </div>

        {/* ОСНОВНАЯ СЕКЦИЯ */}
        <div className="bg-white/5 backdrop-blur-md p-6 border-x border-white/20 space-y-6">
          
          {/* СТАТУС */}
          <div className={`p-4 rounded-lg border-2 ${connected ? 'bg-green-500/10 border-green-500' : 'bg-red-500/10 border-red-500'}`}>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></div>
              <span className="text-white font-semibold">
                {connected ? '🟢 Подключено' : '🔴 Отключено'}
              </span>
              {selectedDevice && <span className="text-blue-300 text-sm ml-auto">{selectedDevice.name}</span>}
            </div>
          </div>

          {/* СООБЩЕНИЯ */}
          {message && (
            <div className="p-3 bg-blue-500/20 border border-blue-400 rounded-lg text-blue-100 text-sm">
              {message}
            </div>
          )}

          {responseMessage && (
            <div className="p-3 bg-green-500/20 border border-green-400 rounded-lg text-green-100 text-sm">
              {responseMessage}
            </div>
          )}

          {/* ПОДКЛЮЧЕНИЕ */}
          <div className="space-y-3">
            <h2 className="text-white font-bold flex items-center gap-2">
              <Bluetooth className="w-5 h-5" /> Подключение
            </h2>
            <div className="flex gap-2">
              <button
                onClick={scanDevices}
                disabled={scanning || connected}
                className="flex-1 bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg transition flex items-center justify-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${scanning ? 'animate-spin' : ''}`} />
                {scanning ? 'Сканирование...' : 'Найти ESP32'}
              </button>
              
              {connected ? (
                <button
                  onClick={disconnectDevice}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition"
                >
                  Отключиться
                </button>
              ) : (
                <button
                  onClick={connectDevice}
                  disabled={!selectedDevice || scanning}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg transition"
                >
                  Подключиться
                </button>
              )}
            </div>
          </div>

          {/* РЕЖИМ СЕТИ */}
          <div className="space-y-3">
            <h2 className="text-white font-bold flex items-center gap-2">
              <Wifi className="w-5 h-5" /> Параметры сети
            </h2>

            <div className="space-y-2">
              <label className="text-blue-200 text-sm">Режим сети:</label>
              <div className="flex gap-3">
                <label className="flex items-center gap-2 cursor-pointer text-white">
                  <input
                    type="radio"
                    value="dhcp"
                    checked={networkMode === 'dhcp'}
                    onChange={(e) => setNetworkMode(e.target.value)}
                    disabled={!connected}
                    className="w-4 h-4"
                  />
                  <span>DHCP (Автоматический)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-white">
                  <input
                    type="radio"
                    value="static"
                    checked={networkMode === 'static'}
                    onChange={(e) => setNetworkMode(e.target.value)}
                    disabled={!connected}
                    className="w-4 h-4"
                  />
                  <span>Статический IP</span>
                </label>
              </div>
            </div>

            {networkMode === 'dhcp' ? (
              <button
                onClick={sendDHCP}
                disabled={!connected}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-semibold py-3 px-4 rounded-lg transition flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                Переключиться на DHCP
              </button>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="text-blue-200 text-sm block mb-1">IP адрес:</label>
                  <input
                    type="text"
                    value={ipAddress}
                    onChange={(e) => setIpAddress(e.target.value)}
                    disabled={!connected}
                    placeholder="192.168.1.100"
                    className="w-full bg-white/10 border border-white/30 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="text-blue-200 text-sm block mb-1">Маска подсети:</label>
                  <input
                    type="text"
                    value={subnet}
                    onChange={(e) => setSubnet(e.target.value)}
                    disabled={!connected}
                    placeholder="255.255.255.0"
                    className="w-full bg-white/10 border border-white/30 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="text-blue-200 text-sm block mb-1">Шлюз (Gateway):</label>
                  <input
                    type="text"
                    value={gateway}
                    onChange={(e) => setGateway(e.target.value)}
                    disabled={!connected}
                    placeholder="192.168.1.1"
                    className="w-full bg-white/10 border border-white/30 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="text-blue-200 text-sm block mb-1">DNS сервер:</label>
                  <input
                    type="text"
                    value={dns}
                    onChange={(e) => setDns(e.target.value)}
                    disabled={!connected}
                    placeholder="8.8.8.8"
                    className="w-full bg-white/10 border border-white/30 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <button
                  onClick={sendStatic}
                  disabled={!connected}
                  className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white font-semibold py-3 px-4 rounded-lg transition flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Применить статический IP
                </button>
              </div>
            )}
          </div>

          {/* ПРИМЕРЫ КОМАНД */}
          <div className="space-y-3 bg-black/30 p-4 rounded-lg">
            <h3 className="text-white font-bold text-sm">📋 Примеры команд:</h3>
            
            <div className="space-y-2 text-xs">
              <div className="bg-black/50 p-2 rounded flex items-center justify-between group">
                <code className="text-green-400 font-mono">dhcp</code>
                <button
                  onClick={() => copyToClipboard('dhcp')}
                  className="opacity-0 group-hover:opacity-100 transition"
                >
                  {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-gray-400" />}
                </button>
              </div>
              
              <div className="bg-black/50 p-2 rounded flex items-center justify-between group">
                <code className="text-green-400 font-mono text-xs">static,192.168.1.100,255.255.255.0,192.168.1.1,8.8.8.8</code>
                <button
                  onClick={() => copyToClipboard('static,192.168.1.100,255.255.255.0,192.168.1.1,8.8.8.8')}
                  className="opacity-0 group-hover:opacity-100 transition flex-shrink-0 ml-2"
                >
                  {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-gray-400" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* НИЖНЯЯ ИНФОРМАЦИЯ */}
        <div className="bg-white/5 backdrop-blur-md rounded-b-2xl p-4 border border-t-0 border-white/20 text-center text-blue-200 text-sm">
          <p>💡 Подключитесь к ESP32 и выберите режим сети</p>
          <p className="text-xs text-blue-300 mt-1">После применения настроек устройство перезагружается</p>
        </div>
      </div>
    </div>
  );
}
