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
sudo nano /etc/netplan/01-netplan.yaml

network:
  version: 2
  renderer: networkd
  ethernets:
    eno1:                      # คุยกับกล้อง (Lan)
      dhcp4: no
      addresses:
        - 192.168.1.100/24
      routes:
        - to: 192.168.1.199/32 # กล้อง 1
          via: 192.168.1.100
        - to: 192.168.1.200/32 # กล้อง 2
          via: 192.168.1.100

  wifis:
    wlx40a5ef5943f6:           # ออกเน็ต (Wifi หลัก)
      dhcp4: no
      addresses:
        - 192.168.1.121/24
      gateway4: 192.168.1.1    # แก้เป็น IP Router ของคุณ
      nameservers:
        addresses: [8.8.8.8, 1.1.1.1]
      access-points:
        "ชื่อ_WIFI_ของคุณ":
          password: "รหัสผ่าน_WIFI"
      routes:
        - to: default
          via: 192.168.1.1
          metric: 50           # ตัวเลขน้อย = สำคัญกว่า (เป็นหลัก)



sudo netplan try

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
