#include <Arduino.h>
#include <ESP8266WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <DHT.h>
#include <time.h>

/*
  ESP8266 -> Edge MQTT publisher
  - Telemetry topic: iot/telemetry/{tenant}/{farm}/{barn}/{device}/{metric}
  - Status topic:    iot/status/{tenant}/{farm}/{barn}/{device}
*/

// -----------------------------
// Wi-Fi and Edge settings
// -----------------------------
//static const char* WIFI_SSID = "Infinix_hot_50";
//static const char* WIFI_PASS = "noteye66";
static const char* WIFI_SSID = "Farm-IQ";
static const char* WIFI_PASS = "012345678";
//static const char* WIFI_SSID = "TP-Link_61E3_2.4";
//static const char* WIFI_PASS = "0800453956v1";


static const char* MQTT_HOST = "192.168.1.120";
static const uint16_t MQTT_PORT = 5100;
static const char* MQTT_USERNAME = "";
static const char* MQTT_PASSWORD = "";

// -----------------------------
// Device identity (must match edge allowlist)
// -----------------------------
static const char* TENANT_ID = "t-001";
static const char* FARM_ID = "f-001";
static const char* BARN_ID = "b-001";
static const char* GATEWAY_DEVICE_ID = "83c039e0-913b-4701-a5cf-e082dea5c1a7";
static const char* TEMP_DEVICE_ID = "4b688fd9-a43d-4504-ac0b-74dda759f862";
static const char* HUMI_DEVICE_ID = "5e9b5b8c-3cb5-4297-8393-dd9635099ace";

// -----------------------------
// Sensor pins
// -----------------------------
static const int MQ_PIN = A0;
static const uint8_t DHT_CANDIDATE_PINS[] = {4, 5, 2, 14, 12};  // D2, D1, D4, D5, D6
static const uint8_t DHT_CANDIDATE_TYPES[] = {DHT11, DHT22};

// Publish interval
static const uint32_t POLL_INTERVAL_MS = 60000;

WiFiClient wifiClient;
PubSubClient mqttClient(wifiClient);

DHT* activeDht = nullptr;
uint8_t activeDhtPin = 255;
uint8_t activeDhtType = 0;

unsigned long lastPublishMs = 0;
String statusTopic;

String makeIsoTimestampUtc() {
  time_t now = time(nullptr);
  struct tm tmUtc;
  gmtime_r(&now, &tmUtc);

  char out[32];
  strftime(out, sizeof(out), "%Y-%m-%dT%H:%M:%SZ", &tmUtc);
  return String(out);
}

String makeUuidLike() {
  auto random32 = []() -> uint32_t {
    return (static_cast<uint32_t>(random(0, 0x10000)) << 16) |
           static_cast<uint32_t>(random(0, 0x10000));
  };

  uint32_t a = random32();
  uint16_t b = static_cast<uint16_t>(random32() & 0xFFFF);
  uint16_t c = static_cast<uint16_t>((random32() & 0x0FFF) | 0x4000);
  uint16_t d = static_cast<uint16_t>((random32() & 0x3FFF) | 0x8000);
  uint64_t e =
      (static_cast<uint64_t>(random32()) << 32) | static_cast<uint64_t>(random32());

  char out[37];
  snprintf(out, sizeof(out), "%08lx-%04x-%04x-%04x-%012llx",
           static_cast<unsigned long>(a), b, c, d,
           static_cast<unsigned long long>(e & 0xFFFFFFFFFFFFULL));
  return String(out);
}

String buildTraceId(const String& eventId) {
  return String("trace-") + eventId;
}

String telemetryTopicFor(const char* deviceId, const char* metric) {
  String topic = "iot/telemetry/";
  topic += TENANT_ID;
  topic += "/";
  topic += FARM_ID;
  topic += "/";
  topic += BARN_ID;
  topic += "/";
  topic += deviceId;
  topic += "/";
  topic += metric;
  return topic;
}

String buildStatusPayload(const char* statusValue, const char* message) {
  StaticJsonDocument<512> doc;
  const String eventId = makeUuidLike();
  const String ts = makeIsoTimestampUtc();

  doc["schema_version"] = "1.0";
  doc["event_id"] = eventId;
  doc["trace_id"] = buildTraceId(eventId);
  doc["tenant_id"] = TENANT_ID;
  doc["device_id"] = GATEWAY_DEVICE_ID;
  doc["event_type"] = "device.status";
  doc["ts"] = ts;

  JsonObject payload = doc.createNestedObject("payload");
  payload["status"] = statusValue;
  payload["message"] = message;
  payload["last_seen_at"] = ts;
  payload["firmware_version"] = "esp8266-edge-mqtt-1.0.2";
  payload["ip"] = WiFi.localIP().toString();

  JsonObject health = payload.createNestedObject("health");
  health["sensor_ok"] = (activeDht != nullptr);
  health["wifi_ok"] = (WiFi.status() == WL_CONNECTED);
  health["mqtt_ok"] = mqttClient.connected();

  String out;
  serializeJson(doc, out);
  return out;
}

String buildTelemetryPayload(const char* deviceId, const char* metric, float value, const char* unit) {
  StaticJsonDocument<384> doc;
  const String eventId = makeUuidLike();

  doc["schema_version"] = "1.0";
  doc["event_id"] = eventId;
  doc["trace_id"] = buildTraceId(eventId);
  doc["tenant_id"] = TENANT_ID;
  doc["device_id"] = deviceId;
  doc["event_type"] = "telemetry.reading";
  doc["ts"] = makeIsoTimestampUtc();

  JsonObject payload = doc.createNestedObject("payload");
  payload["metric"] = metric;
  payload["value"] = value;
  payload["unit"] = unit;

  String out;
  serializeJson(doc, out);
  return out;
}

bool publishStatus(const char* statusValue, const char* message) {
  String payload = buildStatusPayload(statusValue, message);
  return mqttClient.publish(statusTopic.c_str(), payload.c_str(), true);
}

bool publishTelemetry(const char* deviceId, const char* metric, float value, const char* unit) {
  const String topic = telemetryTopicFor(deviceId, metric);
  const String payload = buildTelemetryPayload(deviceId, metric, value, unit);
  return mqttClient.publish(topic.c_str(), payload.c_str(), false);
}

void ensureWifi() {
  if (WiFi.status() == WL_CONNECTED) return;

  Serial.printf("[WiFi] Connecting to SSID: %s\r\n", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);

  uint32_t started = millis();
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
    if (millis() - started > 30000) {
      Serial.println("\r\n[WiFi] Connection timeout, retrying...");
      started = millis();
    }
  }
  Serial.printf("\r\n[WiFi] Connected. IP: %s\r\n", WiFi.localIP().toString().c_str());
}

void ensureTimeSync() {
  configTime(0, 0, "pool.ntp.org", "time.google.com", "time.cloudflare.com");

  time_t now = time(nullptr);
  uint8_t retries = 0;
  while (now < 1700000000 && retries < 40) {
    delay(250);
    now = time(nullptr);
    retries++;
  }
}

void ensureMqtt() {
  if (mqttClient.connected()) return;

  while (!mqttClient.connected()) {
    Serial.printf("[MQTT] Connecting to %s:%u ...\r\n", MQTT_HOST, MQTT_PORT);
    const String lwtPayload = buildStatusPayload("offline", "unexpected_disconnect");
    bool connected;

    if (strlen(MQTT_USERNAME) > 0) {
      connected = mqttClient.connect(
          GATEWAY_DEVICE_ID,
          MQTT_USERNAME,
          MQTT_PASSWORD,
          statusTopic.c_str(),
          1,
          true,
          lwtPayload.c_str());
    } else {
      connected = mqttClient.connect(
          GATEWAY_DEVICE_ID,
          statusTopic.c_str(),
          1,
          true,
          lwtPayload.c_str());
    }

    if (connected) {
      Serial.println("[MQTT] Connected");
      publishStatus("online", "booted");
      break;
    }
    Serial.printf("[MQTT] Connect failed, state=%d. Retry in 2s\r\n", mqttClient.state());
    delay(2000);
  }
}

bool looksLikeValidDht(float temperature, float humidity) {
  return !isnan(temperature) && !isnan(humidity) && humidity >= 0.0f && humidity <= 100.0f &&
         temperature > -40.0f && temperature < 90.0f;
}

bool selectActiveDht(uint8_t pin, uint8_t type) {
  if (activeDht != nullptr) {
    delete activeDht;
    activeDht = nullptr;
  }

  activeDht = new DHT(pin, type);
  if (activeDht == nullptr) return false;

  activeDht->begin();
  activeDhtPin = pin;
  activeDhtType = type;
  return true;
}

bool detectDhtSensor() {
  Serial.println("[DHT] Detecting sensor pin/type...");

  for (uint8_t i = 0; i < sizeof(DHT_CANDIDATE_PINS); i++) {
    uint8_t pin = DHT_CANDIDATE_PINS[i];
    for (uint8_t j = 0; j < sizeof(DHT_CANDIDATE_TYPES); j++) {
      uint8_t type = DHT_CANDIDATE_TYPES[j];
      DHT probe(pin, type);
      probe.begin();
      delay(1200);

      for (uint8_t attempt = 0; attempt < 4; attempt++) {
        float t = probe.readTemperature();
        float h = probe.readHumidity();
        if (looksLikeValidDht(t, h)) {
          if (selectActiveDht(pin, type)) {
            Serial.printf("[DHT] Detected pin=GPIO%u type=%s\r\n", pin, type == DHT11 ? "DHT11" : "DHT22");
            return true;
          }
        }
        delay(250);
      }
    }
  }

  Serial.println("[DHT] Detect failed on candidate pins/types");
  return false;
}

bool readDhtWithRetry(float& temperature, float& humidity) {
  if (activeDht == nullptr && !detectDhtSensor()) {
    return false;
  }

  for (uint8_t attempt = 1; attempt <= 5; ++attempt) {
    temperature = activeDht->readTemperature();
    humidity = activeDht->readHumidity();
    if (looksLikeValidDht(temperature, humidity)) {
      return true;
    }
    delay(250);
  }

  // Re-detect in case wiring/pin map changed or first detection was wrong.
  activeDht = nullptr;
  return false;
}

void publishSensorBatch() {
  float temperature = NAN;
  float humidity = NAN;
  bool dhtOk = readDhtWithRetry(temperature, humidity);
  int rawMq = analogRead(MQ_PIN);

  float mqPpmApprox = (static_cast<float>(rawMq) / 1023.0f) * 1000.0f;  // MQ-135 mapped as CO2e placeholder

  if (dhtOk) {
    publishTelemetry(TEMP_DEVICE_ID, "temperature", temperature, "C");
    publishTelemetry(HUMI_DEVICE_ID, "humidity", humidity, "%");
  } else {
    Serial.println("[DHT] Read failed (auto-detect will retry next cycle)");
  }

  publishTelemetry(GATEWAY_DEVICE_ID, "co2_equivalent", mqPpmApprox, "ppm");
  Serial.printf("[PUB] dht_ok=%s pin=%d type=%s temp=%.2fC hum=%.2f%% co2e=%.2fppm\r\n",
                dhtOk ? "true" : "false",
                activeDht == nullptr ? -1 : static_cast<int>(activeDhtPin),
                activeDhtType == DHT11 ? "DHT11" : (activeDhtType == DHT22 ? "DHT22" : "N/A"),
                temperature,
                humidity,
                mqPpmApprox);
}

void setup() {
  Serial.begin(74880);
  delay(200);
  Serial.println("\r\n[BOOT] ESP8266 starting...");
  randomSeed(static_cast<unsigned long>(ESP.getChipId()) ^ micros());

  statusTopic = String("iot/status/") + TENANT_ID + "/" + FARM_ID + "/" + BARN_ID + "/" + GATEWAY_DEVICE_ID;

  ensureWifi();
  ensureTimeSync();

  mqttClient.setServer(MQTT_HOST, MQTT_PORT);
  mqttClient.setBufferSize(1024);
  mqttClient.setKeepAlive(60);

  ensureMqtt();
}

void loop() {
  ensureWifi();
  ensureMqtt();
  mqttClient.loop();

  unsigned long now = millis();
  if (now - lastPublishMs >= POLL_INTERVAL_MS) {
    lastPublishMs = now;
    publishSensorBatch();
    publishStatus("online", "heartbeat");
  }
}