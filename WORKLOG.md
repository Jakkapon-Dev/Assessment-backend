# Worklog

บันทึกว่ามีการแก้อะไรไปบ้างในโปรเจกต์นี้ เรียงตามลำดับที่ทำจริง
ไฟล์นี้เป็นบันทึกการทำงาน ไม่ใช่คำตอบของ `my-understanding.md`

---

## จุดเริ่มต้น

ตอนเริ่ม โปรเจกต์มีสภาพนี้:

| ส่วน | สภาพ |
|---|---|
| `server/` | เขียนไว้เยอะแล้ว แต่ **start ไม่ขึ้น** |
| `client/` | ยังเป็น Vite starter template (counter + โลโก้) |
| `README.md` | ไฟล์ว่าง 0 bytes |
| `my-understanding.md` | ไฟล์ว่าง 0 bytes |
| git | `.git` อยู่ผิดที่ (อยู่ใน `jsd-backend-assessment/` ซึ่งไม่มีโค้ดของเรา) |

---

## 1. แก้ให้ server รันได้

### ปัญหาที่เจอ

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module
  '...\server\routes\index.js' imported from '...\server\index.js'
```

`index.js` import `./routes/index.js` ที่ไม่มีอยู่จริง เป็นเศษที่ติดมาจากโปรเจกต์ auth เก่า
ทำให้ Node ตายตั้งแต่ตอน resolve module ยังไม่ทันถึง `app.listen()` ด้วยซ้ำ

### สิ่งที่แก้ใน `server/index.js`

| แก้อะไร | เหตุผล |
|---|---|
| ลบ `import ... from "./routes/index.js"` และ `app.use("/api", apiRoutes)` | ไฟล์ไม่มีอยู่ คือต้นเหตุที่ crash |
| ลบ `connectDB()` กับฟังก์ชัน `start()` | `routes/products.js` เก็บข้อมูลใน in-memory array ไม่ได้แตะ MongoDB เลย แต่โค้ดเดิม `process.exit(1)` ถ้าต่อ DB ไม่ติด ทำให้ server ตายทั้งที่ไม่จำเป็น ตอนนี้เรียก `app.listen()` ตรง ๆ server ขึ้นเสมอ |
| ลบ `cookieParser` | ไม่มีอะไรในแอปนี้ใช้ cookie |
| `cors({ origin: true, credentials: true })` เป็น `cors()` | `credentials` มีไว้ส่ง cookie ข้าม origin ในเมื่อไม่ใช้ cookie แล้ว `cors()` เปล่า ๆ พอ และอธิบายง่ายกว่า |
| เพิ่ม 404 handler ก่อน error middleware | route ที่ไม่ match จะได้ JSON `{ error: "Route /xxx not found" }` แทน HTML หน้า default ของ Express |

> `config/db.js` และ `models/product.model.js` **ยังอยู่ครบ** ไม่ได้ลบ
> ถ้าจะทำ stretch goal MongoDB Atlas ค่อยเอากลับมาต่อได้

### แก้ port ให้ตรงกัน

`server/.env` ตั้ง `PORT=4001` แต่ `testHTTP/products.rest` ชี้ไปที่ `3001`
แก้ `.rest` ให้ตรงกับ `.env`

### ผลทดสอบ (ยิงจริงทั้ง 12 request)

| # | Request | คาดหวัง | ผล |
|---|---|---|---|
| 1 | `GET /products` | 200 | ผ่าน 3 items |
| 2 | `GET /products?name=key` | 200 กรองแล้ว | ผ่าน เหลือ Keyboard |
| 3 | `GET /products?sort=asc` | 200 | ผ่าน 29.99 ถึง 299.99 |
| 4 | `GET /products?sort=desc` | 200 | ผ่าน 299.99 ถึง 29.99 |
| 5 | `GET /products/1` | 200 | ผ่าน |
| 6 | `GET /products/999` | 404 | ผ่าน `Product not found` |
| 7 | `POST /products` ข้อมูลครบ | 201 | ผ่าน id สร้างจาก `Date.now()` |
| 8 | `POST /products` ขาด price | 400 | ผ่าน `name and price are required` |
| 9 | `PUT /products/1` | 200 | ผ่าน อัปเดตเฉพาะ field ที่ส่งมา (quantity เดิมคงอยู่) |
| 10 | `DELETE /products/2` | 200 | ผ่าน |
| 11 | `GET /products` ซ้ำ | สะท้อนการเปลี่ยน | ผ่าน |
| 12 | `GET /nope` | 404 | ผ่าน |

request logger ยิง log ครบทุก request

---

## 2. ตั้ง git repo ใหม่ให้ถูกที่

**ปัญหา:** `.git` เดิมอยู่ใน `jsd-backend-assessment/` แต่ `client/`, `server/`,
`README.md`, `my-understanding.md` อยู่**ข้างนอก**โฟลเดอร์นั้น
push ขึ้น GitHub ไปก็ไม่มีโค้ดติดไปด้วย

**สิ่งที่ทำ**

1. `git init` ที่ `Assessment-backend/` (root ที่ถูกต้อง) branch `main`
2. สร้าง `.gitignore` ที่ root:

   ```
   node_modules/
   .env
   .env.local
   dist/
   .DS_Store
   .vscode/
   jsd-backend-assessment/
   ```

   `jsd-backend-assessment/` ถูก ignore เพราะเป็น repo ของโจทย์ที่มี `.git` ของตัวเอง
   ถ้าไม่ ignore git จะบันทึกเป็น gitlink เปล่า ๆ ที่ clone แล้วไม่มีอะไรข้างใน
   ไฟล์ brief ยังอยู่ในเครื่องไว้อ่าน แต่ไม่ถูก push

3. ตรวจก่อน push ยืนยันว่าไม่มี `server/.env` (ข้างในมี MongoDB URI กับ JWT secret)
   ไม่มี `node_modules/` และ grep หา connection string ในไฟล์ที่ staged แล้วไม่เจอ
4. push ขึ้น `github.com/Jakkapon-Dev/Assessment-backend`

ยืนยันผ่าน GitHub API: repo เป็น `public` และ default branch เป็น `main`

---

## 3. เขียน React client

`client/` เดิมเป็น Vite template เปล่า เขียนใหม่ทั้งหมด

### ไฟล์ที่สร้าง

```
client/
├── .env                    VITE_API_URL=http://localhost:4001  (gitignored)
├── .env.example            commit ไว้ให้คนอื่น copy
└── src/
    ├── api.js              base URL + fetch ทั้งหมดอยู่ที่นี่ที่เดียว
    ├── App.jsx             state ทั้งหมด + handler
    ├── App.css
    ├── index.css
    └── components/
        ├── ProductForm.jsx ฟอร์มเดียวใช้ทั้ง add และ edit
        └── ProductList.jsx ตารางแสดงผล (ไม่มี state ของตัวเอง)
```

ลบไฟล์ของ template ที่ไม่ได้ใช้: `hero.png`, `react.svg`, `vite.svg`, `icons.svg`
และเปลี่ยน `<title>` ใน `index.html` เป็น `Shopping Cart`

### โครงสร้างที่เลือกใช้ และเหตุผล

**`api.js` รวม fetch ทั้งหมดไว้ที่เดียว**

base URL อ่านจาก `import.meta.env.VITE_API_URL` เวลา server ย้าย port
แก้ที่ `.env` ที่เดียวจบ ไม่ต้องไล่แก้ทุก fetch call

มีฟังก์ชัน `request()` เป็นตัวกลาง: ยิง fetch แล้วแกะ JSON
ถ้า `res.ok` เป็น false ก็โยน `Error` ที่มีข้อความจาก server
(เช่น `"name and price are required"`)
ทำให้ฝั่ง component เขียนแค่ `try/catch` แล้วเอา `err.message` ไปโชว์ได้เลย

> จุดที่ควรรู้: `fetch` **ไม่ reject** เวลาได้ status 400 หรือ 404
> มัน reject เฉพาะตอนต่อ network ไม่ได้จริง ๆ เลยต้องเช็ค `res.ok` เอง

**`App.jsx` เก็บ state ไว้ที่เดียว**

`products` คือสำเนาของ array ที่อยู่บน server ส่วน component ลูกไม่มี state ของตัวเอง
รับข้อมูลลงไปแล้วยิง event กลับขึ้นมา

| state | หน้าที่ |
|---|---|
| `products` | list ที่แสดงบนหน้าจอ |
| `loading` | ระหว่าง fetch |
| `loadError` | พังตอนโหลด list |
| `actionError` | พังตอนกด add / edit / delete |
| `editing` | product ที่กำลังแก้ไข (`null` คือโหมดเพิ่ม) |
| `busy` / `deletingId` | กันกดปุ่มซ้ำระหว่างรอ response |
| `search` / `sort` | ค่าที่ส่งไปเป็น query string |
| `reloadKey` | เพิ่มค่าเพื่อสั่งให้ `useEffect` โหลดใหม่ (ปุ่ม Try again) |

**เทคนิคที่ใช้ 4 อย่าง**

1. **`key={editing?.id ?? "new"}` บน `ProductForm`**

   เวลาสลับ product ที่แก้ไข React จะ mount component ใหม่
   ทำให้ `useState` ข้างในอ่านค่าเริ่มต้นใหม่
   ถ้าไม่ใส่ `key` ฟอร์มจะค้างค่าของ product ตัวก่อนหน้า
   เพราะ `useState(initial)` อ่าน initial แค่ตอน mount ครั้งแรกเท่านั้น

2. **debounce 300ms ใน `useEffect` + `clearTimeout` ใน cleanup**

   กันยิง request ทุกตัวอักษรที่พิมพ์ในช่อง search
   ถ้าพิมพ์ตัวถัดไปก่อนครบ 300ms cleanup จะยกเลิกตัวเดิมทิ้ง

3. **แยก `loadError` กับ `actionError`**

   "โหลด list ไม่ได้" กับ "กดเพิ่มแล้วไม่ผ่าน" เป็นคนละเรื่อง แสดงคนละที่
   ถ้ารวมเป็นตัวเดียว error ตอนกดปุ่มจะไปแทนที่ตารางทั้งตาราง

4. **เอา object ที่ server ตอบกลับมาใส่ state ไม่ใช่ object ที่พิมพ์ในฟอร์ม**

   ```js
   const created = await createProduct(form);
   setProducts((prev) => [...prev, created]);
   ```

   เพราะ `id` server เป็นคนสร้าง ถ้าใส่ `form` ลงไปตรง ๆ จะได้ item ที่ไม่มี `id`
   แล้วปุ่ม Edit/Delete ของแถวนั้นจะพัง

**ทำไมไม่ `location.reload()`**

หลัง add/edit/delete เราแก้ `products` state ตรง ๆ ด้วยข้อมูลที่ server ตอบกลับมา
การเรียก `setProducts` ทำให้ React render ใหม่เฉพาะส่วนที่เปลี่ยน
เร็วกว่าและไม่กระพริบ

### ผลทดสอบ (กดผ่าน UI จริงใน browser)

รัน server (4001) กับ Vite (5173) พร้อมกัน แล้วกดทุกปุ่ม:

| ทดสอบ | ผล |
|---|---|
| โหลดหน้า `GET /products` | ผ่าน ขึ้น 3 products |
| Loading state | ผ่าน เห็น "Loading products..." |
| Add `Webcam` 59.50 | ผ่าน ขึ้นในตารางทันที ไม่ reload |
| Edit เป็น `Webcam Pro` 129 | ผ่าน ฟอร์มเติมค่าเดิมให้ และ server เปลี่ยนจริง |
| Delete | ผ่าน หายจากตาราง และเห็น `DELETE /products/:id` ใน server log |
| Search `mo` | ผ่าน เหลือ Mouse กับ Monitor, server log เห็น `GET /products?name=mo` |
| Sort high to low | ผ่าน 299.99, 129, 49.99, 29.99 |
| ส่งฟอร์มเปล่า (400) | ผ่าน UI โชว์ `name and price are required` จาก server |
| ปิด server แล้ว reload | ผ่าน โชว์ error, บอก URL ที่ต่อไม่ได้, มีปุ่ม Try again |
| กด Try again หลังเปิด server | ผ่าน กลับมาแสดง list ได้ ไม่ต้อง refresh หน้า |

Console ไม่มี React warning มีแค่ 2 error ที่ตั้งใจสร้างเอง (400 กับ connection refused)
`npm run lint` (oxlint) สะอาด และ `npm run build` ผ่าน

---

## ปัญหาที่เจอระหว่างทาง

**process เก่าค้าง port**

ตอนเปิดหน้าเว็บครั้งแรก ตารางแสดง `Mechanical Keyboard` กับ `Headphones`
ซึ่งเป็นข้อมูลที่เหลือจากการเทส API รอบก่อนหน้า
ทั้งที่ควรจะเป็น seed 3 ตัว (`Keyboard`, `Mouse`, `Monitor`)

ไล่หาสาเหตุด้วย:

```powershell
Get-NetTCPConnection -LocalPort 4001 -State Listen
```

เจอว่ามี node process เก่าที่ยังไม่ตายถือ port 4001 อยู่
คำสั่ง kill รอบก่อนหน้าฆ่าแค่ shell job แต่ตัว process จริงรอดมา
ทำให้ in-memory array ยังเป็นข้อมูลชุดเก่า

แก้โดย stop process ตัวนั้นแล้วเปิดใหม่ ข้อมูลก็กลับเป็น seed ถูกต้อง

> เป็นตัวอย่างที่ดีของ in-memory storage: ข้อมูลอยู่ใน RAM ของ process
> ปิด process เท่ากับข้อมูลหายหมด กลับไปเป็น seed ใหม่

---

## สถานะตอนนี้

| ส่วน | สถานะ |
|---|---|
| Backend core | เสร็จ |
| Frontend core | เสร็จ |
| Stretch: `express.Router()` แยกไฟล์ | เสร็จ |
| Stretch: search/sort ส่ง query string | เสร็จ |
| Stretch: validation error แสดงใน UI | เสร็จ |
| Stretch: MongoDB Atlas | ยังไม่ทำ (โครง `config/db.js` และ `models/product.model.js` มีอยู่แล้ว) |
| Stretch: React Router detail page | ยังไม่ทำ |
| Stretch: optimistic updates | ยังไม่ทำ |
| `my-understanding.md` | ยังว่าง ต้องเขียนเอง |
