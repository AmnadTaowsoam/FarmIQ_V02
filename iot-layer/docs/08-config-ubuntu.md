### 08-config-ubuntu.md

docker logs iot-layer-weight-vision-service-1
docker logs iot-layer-weight-vision-capture-1



docker compose up -d --no-deps --force-recreate

docker compose --profile capture build weight-vision-capture
docker compose --profile capture up -d weight-vision-capture

---------------------------------------------------------------

🔵 วิธีมืออาชีพ (ดีที่สุดสำหรับคุณ)
ทำ Static Route ให้กล้องออก LAN โดยเฉพาะ
sudo ip route add 192.168.1.199/32 dev enp2s0
sudo ip route add 192.168.1.200/32 dev enp2s0

🔵 ให้ LAN metric ต่ำกว่า WiFi
sudo nmcli connection modify "Wired connection 1" ipv4.route-metric 1000
sudo nmcli connection modify "TP-Link_61E3_2.4" ipv4.route-metric 100
sudo systemctl restart NetworkManager


docker compose up -d --build
docker compose --profile capture build weight-vision-capture
docker compose --profile capture up -d weight-vision-capture


----------------------------------

✅ STEP 1: Fix USB ให้เป็น ttyUSB0 ถาวร
1. ดู Vendor / Product ID
lsusb

จะได้แบบ:
ID 067b:23a3
Prolific Technology, Inc. ATEN Serial Bridge


2. สร้าง udev rule
sudo nano /etc/udev/rules.d/99-scale.rules
ใส่ (แก้ idVendor/idProduct ให้ตรงของคุณ):

SUBSYSTEM=="tty", ATTRS{idVendor}=="067b", ATTRS{idProduct}=="23a3", SYMLINK+="ttyUSB0"


ใช้ SYMLINK ดีกว่า NAME= ปลอดภัยกว่า

3. Reload rule
sudo udevadm control --reload-rules
sudo udevadm trigger

ถอด–เสียบใหม่
เช็ค:
ls -l /dev/ttyUSB0

✅ STEP 2: ตั้ง WiFi เป็น Network หลัก ถาวร
ตั้ง metric ให้ WiFi ต่ำกว่า LAN
sudo nmcli connection modify "TP-Link_61E3_2.4" ipv4.route-metric 100
sudo nmcli connection modify "Wired connection 1" ipv4.route-metric 1000
sudo systemctl restart NetworkManager

เช็ค:
ip route
ต้องเห็น:
default via 192.168.1.1 dev wlx... metric 100
default via 192.168.1.1 dev enp2s0 metric 1000

✅ STEP 3: ให้กล้องออก LAN เท่านั้น (ถาวร)
เพิ่ม static route ผ่าน NetworkManager (ถาวร)
sudo nmcli connection modify "Wired connection 1" +ipv4.routes "192.168.1.199/32 0.0.0.0"
sudo nmcli connection modify "Wired connection 1" +ipv4.routes "192.168.1.200/32 0.0.0.0"

รีสตาร์ท network:
sudo systemctl restart NetworkManager

เช็ค:
ip route
ต้องเห็น:
192.168.1.199 dev enp2s0
192.168.1.200 dev enp2s0

✅ STEP 4: ปิด rp_filter ถาวร (สำคัญมาก)
เพราะมี 2 NIC subnet เดียวกัน
สร้างไฟล์:
sudo nano /etc/sysctl.d/99-multinic.conf
ใส่:
net.ipv4.conf.all.rp_filter=0
net.ipv4.conf.default.rp_filter=0
net.ipv4.conf.enp2s0.rp_filter=0
net.ipv4.conf.wlx18a6f7181220.rp_filter=0

Apply:
sudo sysctl --system

🧪 ทดสอบหลัง Reboot
รีบูตเครื่อง:
sudo reboot
หลังเปิดใหม่ ตรวจสอบ:
ls -l /dev/ttyUSB0
ip route
ping 192.168.1.199
ping 192.168.1.120
ทุกอย่างต้องยังทำงานเหมือนเดิม
🎯 สรุปสุดท้าย (Production Ready)

✔ USB คงที่
✔ WiFi เป็น Default route
✔ กล้องออก LAN
✔ Reboot แล้วไม่พัง
✔ Docker ใช้ network_mode: host ได้ปก

แล้วจึงรัน
cd ~/FarmIQ/iot-layer
docker compose up -d --build
docker compose up -d --build weight-vision-capture
