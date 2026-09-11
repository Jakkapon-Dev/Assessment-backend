# Shopping Cart — Fullstack Assessment

REST API ด้วย **Express.js** กับหน้าเว็บ **React** ที่คุยกับ API นั้นจริง ๆ
ทั้งสองฝั่งรันบนเครื่อง local คนละ port

```
Assessment-backend/
├── client/          React + Vite  → http://localhost:5173
├── server/          Express API   → http://localhost:4001
├── my-understanding.md
└── README.md
```

---

## วิธีรัน

ต้องรันทั้งสองฝั่งพร้อมกัน เปิด **2 terminal**

### Terminal 1 — API server

```bash
cd server
npm install
npm run dev
```

รันที่ **http://localhost:4001** (`npm run dev` เรียก `node --watch index.js` แก้โค้ดแล้ว restart ให้เอง)

> ต้องมีไฟล์ `server/.env` ที่มี `PORT=4001`
> ถ้าไม่มีไฟล์นี้ server จะ fallback ไปใช้ port `3001` แทน
> (ถ้าเปลี่ยน port ต้องแก้ `client/.env` ให้ตรงกันด้วย)

### Terminal 2 — React client

```bash
cd client
npm install
cp .env.example .env
npm run dev
```

เปิด **http://localhost:5173**

> `.env` ไม่ได้ถูก commit ขึ้น git ต้อง copy จาก `.env.example` ก่อนรันครั้งแรก
> ข้างในมีแค่ `VITE_API_URL=http://localhost:4001`

---

## API Endpoints

base URL: `http://localhost:4001`

| Method | Route | คำอธิบาย | Status |
|---|---|---|---|
| `GET` | `/products` | คืน products ทั้งหมด | `200` |
| `GET` | `/products?name=key` | กรองตามชื่อ (ไม่สนตัวพิมพ์เล็กใหญ่) | `200` |
| `GET` | `/products?sort=asc` | เรียงตามราคาน้อยไปมาก (`desc` = มากไปน้อย) | `200` |
| `GET` | `/products/:id` | คืน product เดียว | `200` / `404` |
| `POST` | `/products` | เพิ่ม product ใหม่ | `201` / `400` |
| `PUT` | `/products/:id` | แก้ไข product | `200` / `404` |
| `DELETE` | `/products/:id` | ลบ product | `200` / `404` |

### รูปแบบข้อมูล

```json
{
  "id": "1",
  "name": "Keyboard",
  "price": 49.99,
  "quantity": 5
}
```

`id` ถูกสร้างโดย server ตอน `POST` (`String(Date.now())`)
`name` กับ `price` เป็น field ที่ **จำเป็นต้องมี** ถ้าขาดจะได้ `400`
`quantity` ถ้าไม่ส่งมาจะ default เป็น `1`

### ตัวอย่าง

```bash
# ดูทั้งหมด
curl http://localhost:4001/products

# เพิ่มใหม่
curl -X POST http://localhost:4001/products \
  -H "Content-Type: application/json" \
  -d '{"name":"Webcam","price":59.5,"quantity":4}'
```

---

## ทดสอบ API แยกจาก frontend

มีไฟล์ `server/testHTTP/products.rest` เตรียมไว้ครบทุก endpoint
รวมถึงเคสที่ควรพัง (`404`, `400`)

เปิดด้วย [REST Client](https://marketplace.visualstudio.com/items?itemName=humao.rest-client)
extension ของ VS Code แล้วกด **Send Request** เหนือแต่ละ request ได้เลย

วิธีนี้ช่วยแยกได้ว่า bug อยู่ฝั่ง server หรือฝั่ง client

---

## สิ่งที่ทำได้ในแอป

- ดู list ของ products ทั้งหมด (โหลดตอนเปิดหน้าเว็บ)
- ค้นหาตามชื่อ และเรียงตามราคา (ส่งเป็น query string ไปให้ API กรอง)
- เพิ่ม product ใหม่ผ่านฟอร์ม
- แก้ไข product ที่มีอยู่ (กด Edit แล้วฟอร์มจะเติมค่าเดิมให้)
- ลบ product
- ทุก action อัปเดตหน้าจอทันทีโดย**ไม่ต้อง refresh** หน้าเว็บ

**ระหว่างโหลด** แสดงข้อความ "Loading products..."

**ถ้า server ไม่ได้รัน** แสดงกล่อง error บอกว่าต่อ URL ไหนไม่ได้ พร้อมปุ่ม Try again
แอปไม่ crash และไม่เงียบหาย

**ถ้าส่งฟอร์มไม่ครบ** server ตอบ `400` แล้ว UI เอา error message จาก server มาแสดง

---

## โครงสร้างโค้ด

### `server/`

```
server/
├── index.js                   ตั้ง Express, middleware, mount router, error handler
├── routes/products.js         5 routes ทั้งหมด + in-memory array
├── middlewares/logger.js      custom middleware: log ทุก request
├── testHTTP/products.rest     ไฟล์ทดสอบ API
└── .env                       PORT (ไม่ถูก commit)
```

ลำดับ middleware ใน `index.js` สำคัญ:

```
cors() → express.json() → requestLogger → routes → 404 handler → error handler
```

`express.json()` ต้องมาก่อน routes ไม่งั้น `req.body` จะเป็น `undefined`
ส่วน error handler ต้องอยู่**ท้ายสุด** เพราะ Express เลือก middleware ตามลำดับที่ประกาศ

> `config/db.js` และ `models/product.model.js` เป็นโครงเตรียมไว้สำหรับ
> stretch goal MongoDB ตอนนี้ยังไม่ได้ใช้ ข้อมูลเก็บใน memory ทั้งหมด
> (ปิด server แล้วข้อมูลจะกลับไปเป็นค่าเริ่มต้น 3 ตัว)

### `client/`

```
client/
├── .env                       VITE_API_URL (ไม่ถูก commit)
├── .env.example               ตัวอย่างให้ copy
└── src/
    ├── api.js                 base URL + fetch ทุกตัวรวมไว้ที่นี่
    ├── App.jsx                state ทั้งหมด + handler ของ add/edit/delete
    └── components/
        ├── ProductForm.jsx    ฟอร์มเดียว ใช้ได้ทั้งเพิ่มและแก้ไข
        └── ProductList.jsx    ตารางแสดงผล
```

fetch ทุกตัวเรียกผ่าน `src/api.js` ที่เดียว base URL อ่านจาก `.env`
เวลา server ย้าย port จึงแก้ที่เดียวจบ

---

## หมายเหตุเรื่อง CORS

React dev server อยู่ที่ port `5173` ส่วน API อยู่ที่ `4001`
browser มองว่าเป็นคนละ origin กัน จึงบล็อก request โดย default

`server/index.js` เลยเรียก `app.use(cors())` เพื่อให้ API ส่ง header
`Access-Control-Allow-Origin` กลับมาบอก browser ว่าอนุญาต

ถ้าลบบรรทัดนั้นออก จะเห็น error ใน browser console ประมาณว่า
*"has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present"*
และ Network tab จะเห็นว่า request ออกไปถึง server จริง แต่ browser ไม่ยอมให้ JS อ่าน response

---

## Tech Stack

| ฝั่ง | ใช้อะไร |
|---|---|
| Backend | Node.js, Express 5, cors, dotenv |
| Frontend | React 19, Vite 8 |
| Storage | in-memory array (ไม่ใช้ database) |
