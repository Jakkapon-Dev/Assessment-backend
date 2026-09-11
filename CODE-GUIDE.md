# คู่มืออธิบายโค้ด

ไฟล์นี้อธิบายว่าโปรเจกต์นี้ทำงานยังไง ไล่ทีละไฟล์ทีละบรรทัด
เขียนไว้เพื่อให้อ่านแล้วเข้าใจโค้ดของตัวเอง ไม่ใช่ไว้ copy ไปตอบ

---

## ภาพรวม: สองแอปคุยกันยังไง

โปรเจกต์นี้มีโปรแกรม **2 ตัวแยกกันคนละ process** รันคนละ port

```
┌─────────────────────────┐         HTTP          ┌──────────────────────────┐
│  React (Vite)           │  ──── request ───▶    │  Express                 │
│  localhost:5173         │                       │  localhost:4001          │
│                         │  ◀─── response ────   │                          │
│  เก็บ products ไว้ใน    │        (JSON)         │  เก็บ products ไว้ใน     │
│  useState (UI state)    │                       │  array ใน RAM            │
└─────────────────────────┘                       └──────────────────────────┘
```

**จุดสำคัญที่ต้องเข้าใจ:** มี products อยู่ **2 ชุด**

| | อยู่ที่ไหน | ใครเป็นเจ้าของความจริง |
|---|---|---|
| **server state** | array ใน `routes/products.js` | ✅ ตัวจริง |
| **UI state** | `useState` ใน `App.jsx` | สำเนาที่เอามาแสดง |

หน้าที่ของ React คือทำให้สำเนาของตัวเอง **ตรงกับ** ของจริงบน server เสมอ
ทุกครั้งที่ add/edit/delete เราจึงเอา**ข้อมูลที่ server ตอบกลับมา**ไปอัปเดต state
ไม่ใช่เดาเอาเองว่าผลลัพธ์น่าจะเป็นอะไร

---

# ฝั่ง Backend

## `server/index.js` — จุดตั้งต้นของ server

ไฟล์นี้สั้นแต่ลำดับสำคัญมาก เพราะ Express ทำงาน**เรียงจากบนลงล่าง**

```js
app.use(cors());           // บรรทัด 12
app.use(express.json());   // บรรทัด 13
app.use(requestLogger);    // บรรทัด 14

app.use("/products", productsRouter);  // บรรทัด 21

app.use((req, res) => { ... });              // บรรทัด 24  — 404
app.use((err, req, res, next) => { ... });   // บรรทัด 29  — error handler
```

### middleware คืออะไร

middleware คือ **ฟังก์ชันที่ request วิ่งผ่านก่อนถึง route จริง**
นึกภาพเป็นด่านที่ต้องผ่านทีละด่าน แต่ละด่านทำอะไรกับ request ได้ แล้วส่งต่อด่านถัดไป

```
request เข้ามา
   │
   ▼
[ cors ]          ติด header อนุญาตให้ browser ข้าม origin
   │
   ▼
[ express.json ]  อ่าน body ที่เป็น JSON แล้วแปลงเป็น object ใส่ใน req.body
   │
   ▼
[ requestLogger ] print log ว่ามี request อะไรเข้ามา
   │
   ▼
[ productsRouter ] หา route ที่ตรงแล้วทำงาน → ส่ง response กลับ
   │
   ▼ (ถ้าไม่มี route ไหนตรงเลย)
[ 404 handler ]   ตอบ JSON ว่าไม่เจอ route
```

### ทำไม order ถึงสำคัญ

**ถ้า `express.json()` อยู่หลัง routes** → ตอน route ทำงาน body ยังไม่ถูกแปลง
`req.body` จะเป็น `undefined` แล้วบรรทัดนี้จะพัง:

```js
const { name, price, quantity } = req.body;  // TypeError: Cannot destructure ...
```

**ถ้า 404 handler อยู่ก่อน `app.use("/products", ...)`** → ทุก request จะโดน 404 ดักไปหมด
เพราะ `app.use()` ที่ไม่ระบุ path จะแมตช์ทุก path

**ถ้า error handler ไม่ได้อยู่ท้ายสุด** → error ที่เกิดใน route ทีหลังจะไม่มีใครรับ
Express มองหา error handler ที่อยู่**ถัดจากจุดที่เกิด error ลงไป**เท่านั้น

### Express รู้ได้ยังไงว่าอันไหนคือ error handler

ดูจาก**จำนวน parameter**

```js
app.use((req, res) => { ... })              // 3 ตัวหรือน้อยกว่า = middleware ธรรมดา
app.use((err, req, res, next) => { ... })   // 4 ตัว = error handler
```

ต่อให้ไม่ได้ใช้ `next` ก็ต้องเขียนไว้ให้ครบ 4 ตัว ไม่งั้น Express จะนึกว่าเป็น middleware ธรรมดา

### `cors()` แก้ปัญหาอะไร

browser มีกฎชื่อ **Same-Origin Policy**: หน้าเว็บจาก origin หนึ่ง
จะอ่าน response จากอีก origin ไม่ได้ ถ้าอีกฝั่งไม่อนุญาต

origin = **protocol + host + port** ถ้าต่างกันแม้แต่อย่างเดียวก็คนละ origin

```
http://localhost:5173   ← React
http://localhost:4001   ← API
                 ▲
          port ต่างกัน = คนละ origin
```

`app.use(cors())` ทำให้ Express ติด header `Access-Control-Allow-Origin: *`
กลับไปในทุก response เป็นการบอก browser ว่า "อนุญาตให้อ่านได้"

**ถ้าลบบรรทัดนี้ออก** จะเห็นใน browser console:

```
Access to fetch at 'http://localhost:4001/products' from origin
'http://localhost:5173' has been blocked by CORS policy:
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

จุดที่คนเข้าใจผิดบ่อย: **request ออกไปถึง server จริงนะ** server ก็ประมวลผลจริง
(ดูใน server log จะเห็น) แต่ **browser ไม่ยอมส่ง response ให้ JS อ่าน**
CORS เป็นกฎของ browser ไม่ใช่ของ server

### `process.env.PORT || 3001`

อ่าน port จาก `.env` (ตอนนี้ตั้งไว้ `4001`) ถ้าไม่มีไฟล์ `.env` ก็ใช้ `3001` แทน
`dotenv.config()` บรรทัด 7 คือตัวที่โหลดไฟล์ `.env` เข้ามาใส่ `process.env`

---

## `server/middlewares/logger.js` — custom middleware

```js
export const requestLogger = (req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.originalUrl}`);
  next();
};
```

middleware ที่เขียนเองต้องมี 3 อย่าง:

1. รับ `(req, res, next)`
2. ทำงานอะไรก็ได้ (ในที่นี้คือ print log)
3. **เรียก `next()`** เพื่อส่งต่อไปด่านถัดไป

> ถ้าลืม `next()` → request จะค้างอยู่ตรงนั้นตลอดกาล
> browser จะหมุนรอจนกว่าจะ timeout เพราะไม่มีใครส่ง response กลับไปเลย

`req.originalUrl` เก็บ path เต็มรวม query string เลยเห็น `GET /products?name=mo` ใน log ได้

---

## `server/routes/products.js` — CRUD ทั้ง 5 route

### ที่เก็บข้อมูล

```js
const products = [
  { id: "1", name: "Keyboard", price: 49.99, quantity: 5 },
  { id: "2", name: "Mouse", price: 29.99, quantity: 10 },
  { id: "3", name: "Monitor", price: 299.99, quantity: 3 },
];
```

เป็นแค่ตัวแปร JavaScript ธรรมดาที่อยู่ใน RAM ของ process
**ปิด server = ข้อมูลหายหมด** เปิดใหม่ก็กลับมาเป็น 3 ตัวนี้

### `express.Router()` คืออะไร

```js
const router = Router();
router.get("/", ...)       // จริง ๆ คือ GET /products
router.get("/:id", ...)    // จริง ๆ คือ GET /products/:id
export default router;
```

`Router()` เป็นเหมือน mini-app ที่เอาไปแปะที่ path ไหนก็ได้
ใน `index.js` เราแปะไว้ที่ `/products`:

```js
app.use("/products", productsRouter);
```

ข้างใน router เลยเขียน path แบบ**สั้น** (`/`, `/:id`) เพราะ `/products` ถูกเติมให้อัตโนมัติ
ข้อดีคือถ้าวันหลังอยากย้ายไป `/api/products` แก้ที่ `index.js` ที่เดียว

---

### 1. `GET /products` — อ่านทั้งหมด + filter + sort

```js
router.get("/", (req, res) => {
  let result = [...products];          // บรรทัด 14
```

`[...products]` คือการ**ก๊อป array ใหม่** สำคัญมาก เพราะบรรทัดล่าง ๆ ใช้ `.sort()`
ซึ่ง **เปลี่ยน array ตัวเดิม** (mutate) ถ้าไม่ก๊อปก่อน การกดเรียงลำดับดูเฉย ๆ
จะไปสลับลำดับของข้อมูลจริงถาวร

```js
  if (req.query.name) {                                        // บรรทัด 17
    result = result.filter((p) =>
      p.name.toLowerCase().includes(req.query.name.toLowerCase()),
    );
  }
```

**`req.query`** = ค่าที่ต่อท้าย URL หลังเครื่องหมาย `?`

```
GET /products?name=mo&sort=desc
                 ▲        ▲
        req.query.name   req.query.sort
             "mo"         "desc"
```

`.toLowerCase()` ทั้งสองฝั่งทำให้พิมพ์ `MO` หรือ `mo` ก็เจอเหมือนกัน
`.includes()` คือค้นแบบบางส่วน พิมพ์ `mo` เจอทั้ง **Mo**use และ **Mo**nitor

```js
  if (req.query.sort === "asc") {
    result.sort((a, b) => a.price - b.price);      // น้อยไปมาก
  } else if (req.query.sort === "desc") {
    result.sort((a, b) => b.price - a.price);      // มากไปน้อย
  }

  return res.status(200).json(result);
```

`200 OK` = สำเร็จ มีข้อมูลส่งกลับ
ถ้ากรองแล้วไม่เจออะไรเลยก็ยังเป็น `200` อยู่ (ส่ง array ว่าง `[]` กลับ)
ไม่ใช่ `404` เพราะ **"ค้นแล้วไม่เจอ" กับ "ไม่มี route นี้" คนละเรื่องกัน**

---

### 2. `GET /products/:id` — อ่านตัวเดียว

```js
router.get("/:id", (req, res) => {
  const product = products.find((p) => p.id === req.params.id);   // บรรทัด 35

  if (!product) {
    return res.status(404).json({ error: "Product not found" });
  }

  return res.status(200).json(product);
});
```

**`req.params`** = ค่าที่อยู่ใน path ตรงตำแหน่งที่เขียน `:ชื่อ` ไว้

```
GET /products/1
              ▲
        req.params.id = "1"
```

`:id` เป็นชื่อที่เราตั้งเอง ถ้าเขียน `/:productId` ก็ต้องอ่านด้วย `req.params.productId`

`404 Not Found` = เส้นทางถูก แต่ของที่ขอไม่มีอยู่

> ระวัง: `req.params.id` เป็น **string เสมอ** เลยต้องเทียบกับ `p.id`
> ที่เก็บเป็น string ด้วย (`"1"` ไม่ใช่ `1`) ถ้าฝั่งหนึ่งเป็น number
> `===` จะไม่มีวันเท่ากัน

---

### 3. `POST /products` — สร้างใหม่

```js
router.post("/", (req, res) => {
  const { name, price, quantity } = req.body;      // บรรทัด 46

  if (!name || price === undefined) {              // บรรทัด 48
    return res.status(400).json({ error: "name and price are required" });
  }
```

**`req.body`** = ข้อมูลที่ client แนบมากับ request (ไม่ได้อยู่ใน URL)
ใช้กับ POST/PUT เพราะข้อมูลอาจยาวและไม่ควรโผล่ใน URL

`req.body` จะใช้ได้ก็ต่อเมื่อ:
1. server มี `app.use(express.json())` แล้ว
2. client ส่ง header `Content-Type: application/json` มาด้วย

ขาดอย่างใดอย่างหนึ่ง `req.body` จะเป็น `undefined` หรือ object ว่าง

**ทำไมเช็ค `price === undefined` แทน `!price`**
เพราะ `!price` จะจริงตอน `price` เป็น `0` ด้วย แต่ราคา 0 บาทเป็นค่าที่ใส่ได้จริง
ส่วน `!name` ใช้ได้ เพราะชื่อว่าง `""` ควรถูกปฏิเสธอยู่แล้ว

```js
  const newProduct = {
    id: String(Date.now()),                                     // บรรทัด 53
    name,
    price: Number(price),
    quantity: quantity !== undefined ? Number(quantity) : 1,    // บรรทัด 56
  };

  products.push(newProduct);
  return res.status(201).json(newProduct);                      // บรรทัด 60
});
```

`Date.now()` = จำนวน millisecond ตั้งแต่ปี 1970 เอามาทำ id ได้เพราะไม่ซ้ำกัน
ครอบด้วย `String()` ให้เป็น string เหมือน id ตัวอื่น

`Number(price)` แปลงเป็นตัวเลข เพราะถ้า client ส่ง `"49.99"` มาเป็น string
ฝั่ง sort จะคำนวณผิด

`quantity` ถ้าไม่ส่งมาให้เป็น `1` ตามที่โจทย์กำหนด

**`201 Created`** ไม่ใช่ `200` เพราะมีของใหม่ถูกสร้างขึ้นจริง
และเราส่ง object ที่สร้างแล้วกลับไปด้วย เพื่อให้ client รู้ว่า `id` คืออะไร

---

### 4. `PUT /products/:id` — แก้ไข

```js
router.put("/:id", (req, res) => {
  const index = products.findIndex((p) => p.id === req.params.id);  // บรรทัด 65

  if (index === -1) {
    return res.status(404).json({ error: "Product not found" });
  }

  const { name, price, quantity } = req.body;

  if (name !== undefined) products[index].name = name;              // บรรทัด 73
  if (price !== undefined) products[index].price = Number(price);
  if (quantity !== undefined) products[index].quantity = Number(quantity);

  return res.status(200).json(products[index]);
});
```

route นี้ใช้ **ทั้ง `req.params` และ `req.body` พร้อมกัน**
`params` บอกว่าจะแก้ตัวไหน `body` บอกว่าจะแก้เป็นอะไร

`.findIndex()` คืน**ตำแหน่ง**ในอาร์เรย์ (หรือ `-1` ถ้าไม่เจอ)
ใช้แทน `.find()` เพราะเราต้องแก้ค่าในอาร์เรย์ ไม่ใช่แค่อ่าน

การเช็ค `!== undefined` ทีละ field ทำให้ส่งมาแค่ field เดียวก็ได้
เช่นส่งมาแค่ `{ "price": 89.99 }` ชื่อกับจำนวนจะคงเดิมไม่หาย

> **ข้อสังเกตที่ควรรู้:** ตามหลัก REST แบบเคร่งครัด `PUT` ควรแทนที่ทั้ง object
> ส่วนการแก้บาง field คือหน้าที่ของ `PATCH`
> โค้ดนี้ใช้ method `PUT` แต่พฤติกรรมเป็นแบบ `PATCH`
> โจทย์เขียนว่า `PUT or PATCH` เลยไม่ผิด แต่ถ้าถูกถามควรตอบได้ว่ารู้ความต่าง

`200 OK` เพราะเป็นการแก้ของที่มีอยู่แล้ว ไม่ได้สร้างใหม่

---

### 5. `DELETE /products/:id` — ลบ

```js
router.delete("/:id", (req, res) => {
  const index = products.findIndex((p) => p.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ error: "Product not found" });
  }

  const deleted = products.splice(index, 1);                        // บรรทัด 88
  return res.status(200).json({ message: "Product deleted", deleted: deleted[0] });
});
```

`.splice(index, 1)` = ตัดออก 1 ตัวจากตำแหน่ง `index` และ**เปลี่ยนอาร์เรย์ตัวจริง**
คืนค่าเป็น array ของสิ่งที่ถูกตัด เลยต้องหยิบ `deleted[0]` ออกมา

---

### สรุป 3 ตัวที่ต้องแยกให้ออก

| | มาจากไหน | ตัวอย่างในโปรเจกต์นี้ |
|---|---|---|
| `req.params` | ส่วนหนึ่งของ **path** ตรงที่เขียน `:id` | `GET /products/**1**` → `req.params.id` = `"1"` |
| `req.query` | ต่อท้าย URL หลัง **`?`** | `GET /products**?name=mo**` → `req.query.name` = `"mo"` |
| `req.body` | **แนบมากับ request** ไม่อยู่ใน URL | `POST /products` + `{"name":"Webcam"}` → `req.body.name` |

วิธีจำ: `params` = **ชี้ว่าตัวไหน**, `query` = **ปรับแต่งผลลัพธ์**, `body` = **ข้อมูลที่จะเขียนลงไป**

### status code ที่ใช้ในโปรเจกต์นี้

| Code | ใช้ตอนไหน | ที่ไหนในโค้ด |
|---|---|---|
| `200` | สำเร็จ มีข้อมูลกลับ | GET ทั้งสอง, PUT, DELETE |
| `201` | สร้างของใหม่สำเร็จ | POST |
| `400` | **client ส่งมาผิด** ส่งซ้ำแบบเดิมก็ผิดเหมือนเดิม | POST ที่ขาด name/price |
| `404` | หาของ/เส้นทางที่ขอไม่เจอ | GET/PUT/DELETE ที่ id ไม่มีจริง + 404 handler |
| `500` | **server พังเอง** ไม่ใช่ความผิด client | error handler ใน `index.js` |

**ทำไมต้องแยก** เพราะ client ต้องตัดสินใจจาก code ได้โดยไม่ต้องอ่านข้อความ
`4xx = คุณผิด` / `5xx = ผมผิด` ถ้าตอบ `200` หมดทุกกรณี React จะแยกไม่ออกว่าสำเร็จหรือล้มเหลว

---

# ฝั่ง Frontend

## `client/src/api.js` — รวม fetch ไว้ที่เดียว

```js
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4001";
```

`import.meta.env` คือวิธีที่ Vite ให้เราอ่านค่าจากไฟล์ `.env`

> ตัวแปรต้องขึ้นต้นด้วย **`VITE_`** เท่านั้นถึงจะอ่านได้
> เป็นกันพลาดของ Vite เอง เพราะค่าพวกนี้จะถูกฝังลงไฟล์ JS ที่ browser โหลด
> **ใครก็เปิดดูได้** ห้ามเอา password หรือ secret มาใส่เด็ดขาด

**ทำไมไม่ hardcode URL ในทุก fetch**

ถ้าเขียน `fetch("http://localhost:4001/products")` กระจายอยู่ 5 ที่
วันที่ย้าย port ต้องไล่แก้ 5 จุด ลืมจุดเดียวก็พังแบบหายาก
รวมไว้ที่เดียวคือแก้ที่เดียวจบ

### ตัวกลาง `request()`

```js
async function request(path, options) {
  const res = await fetch(BASE_URL + path, options);
  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(data?.error || `Request failed with status ${res.status}`);
  }

  return data;
}
```

**เรื่องที่สำคัญที่สุดของ `fetch`:**

`fetch` **ไม่ throw** เวลาได้ `400` หรือ `404` มันถือว่า "ส่งไปถึงและได้คำตอบกลับมาแล้ว = สำเร็จ"
มันจะ reject เฉพาะตอน**ต่อไม่ติดจริง ๆ** เช่น server ไม่ได้เปิด หรือเน็ตหลุด

```js
// เขียนแบบนี้ = bug เงียบ ๆ
const res = await fetch(url)   // ได้ 404 มา แต่ไม่ throw
const data = await res.json()  // data = { error: "Product not found" }
setProducts(data)              // เอา error object ไปแสดงเป็น list
```

เลยต้องเช็ค **`res.ok`** เอง (`true` เมื่อ status อยู่ในช่วง 200–299)
ถ้าไม่ ok ก็ `throw` ออกไปให้ `try/catch` ฝั่ง component รับ

`data?.error` คือดึง error message ที่ server ส่งมา
ทำให้ข้อความ `"name and price are required"` ที่เขียนไว้ใน Express
ไปโผล่บนหน้าจอผู้ใช้ได้โดยไม่ต้องเขียนข้อความซ้ำอีกรอบใน React

### การประกอบ query string

```js
export function getProducts({ name, sort } = {}) {
  const params = new URLSearchParams();
  if (name) params.set("name", name);
  if (sort) params.set("sort", sort);

  const query = params.toString();
  return request(query ? `/products?${query}` : "/products");
}
```

`URLSearchParams` จัดการ encode ให้เอง
ถ้าพิมพ์ค้นหาว่า `a b&c` มันจะแปลงเป็น `a%20b%26c` ให้ ไม่ทำให้ URL พัง

---

## `client/src/App.jsx` — สมองของแอป

### state ทั้งหมด

```js
const [products, setProducts] = useState([]);      // list ที่แสดง
const [loading, setLoading] = useState(true);      // กำลังโหลดอยู่ไหม
const [loadError, setLoadError] = useState(null);  // โหลด list ไม่ได้
const [actionError, setActionError] = useState(null); // กดปุ่มแล้วไม่ผ่าน
const [editing, setEditing] = useState(null);      // กำลังแก้ตัวไหน
const [busy, setBusy] = useState(false);           // กำลังส่งฟอร์ม
const [deletingId, setDeletingId] = useState(null);// กำลังลบตัวไหน
const [search, setSearch] = useState("");
const [sort, setSort] = useState("");
const [reloadKey, setReloadKey] = useState(0);     // ตัวสั่งโหลดใหม่
```

**ทำไมแยก `loadError` กับ `actionError`**
"โหลดรายการไม่ได้" ควรแทนที่ตารางทั้งตาราง
แต่ "กดเพิ่มแล้วไม่ผ่าน" ตารางเดิมยังใช้ได้อยู่ ไม่ควรหายไป
ถ้าใช้ตัวเดียวร่วมกัน พิมพ์ฟอร์มผิดทีเดียวตารางจะหายทั้งหน้า

### `useEffect` — ที่สำหรับ fetch

```js
useEffect(() => {
  const timer = setTimeout(async () => {
    try {
      setLoading(true);
      const data = await getProducts({ name: search, sort });
      setProducts(data);
      setLoadError(null);
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  }, 300);

  return () => clearTimeout(timer);
}, [search, sort, reloadKey]);
```

**ทำไมเรียก fetch ตรง ๆ ใน component body ไม่ได้**

body ของ component ทำงาน**ใหม่ทุกครั้งที่ render** ถ้าเขียน fetch ไว้ตรงนั้น:

```
render → fetch → setProducts → state เปลี่ยน → render → fetch → ... วนไม่จบ
```

`useEffect` แก้ปัญหานี้ด้วยการ:
- ทำงาน **หลัง** render เสร็จแล้ว
- ทำงานเฉพาะเมื่อค่าใน **dependency array** (`[search, sort, reloadKey]`) เปลี่ยน

รอบแรกที่ component mount มันทำงาน 1 ครั้ง หลังจากนั้นทำเฉพาะตอน search/sort เปลี่ยน
หรือตอนกด Try again (ซึ่งบวก `reloadKey` ขึ้น 1)

**`return () => clearTimeout(timer)` คืออะไร**

คือ **cleanup function** React จะเรียกมันก่อนรัน effect รอบถัดไป (และตอน component ถูกถอดออก)

ในที่นี้ทำให้เกิด debounce: พิมพ์ `m` → ตั้งเวลา 300ms → พิมพ์ `o` ต่อทันที
→ cleanup ยกเลิกตัวของ `m` ทิ้ง → ตั้งใหม่สำหรับ `mo`
ผลคือพิมพ์ `mo` รัว ๆ ยิง request แค่ **1 ครั้ง** ไม่ใช่ 2 ครั้ง

`finally` ทำให้ `setLoading(false)` ทำงานแน่นอน ไม่ว่าจะสำเร็จหรือพัง
ถ้าเอาไปไว้ใน `try` เฉย ๆ เวลา error หน้าจอจะค้างที่ "Loading..." ตลอดกาล

### handler ทั้งสาม

```js
async function handleCreate(form) {
  const created = await createProduct(form);
  setProducts((prev) => [...prev, created]);
}

async function handleUpdate(form) {
  const updated = await updateProduct(editing.id, form);
  setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  setEditing(null);
}

async function handleDelete(product) {
  await deleteProduct(product.id);
  setProducts((prev) => prev.filter((p) => p.id !== product.id));
}
```
*(ตัดส่วน try/catch ออกให้ดูง่าย)*

**สามข้อที่ต้องสังเกต:**

**1. ใช้ `created` / `updated` ที่ server ตอบกลับ ไม่ใช่ `form` ที่ผู้ใช้พิมพ์**
เพราะ `id` server เป็นคนสร้าง ถ้าเอา `form` ใส่ลงไปตรง ๆ จะได้ item ที่ไม่มี `id`
แล้วปุ่ม Edit/Delete ของแถวนั้นจะพังทันที

**2. ยิง API ให้สำเร็จก่อน แล้วค่อยแก้ state**
ถ้า server ปฏิเสธ (เช่น 400) โค้ดจะกระโดดเข้า `catch` ตั้งแต่บรรทัด `await`
บรรทัด `setProducts` ไม่ได้ทำงานเลย หน้าจอจึงไม่แสดงของที่จริง ๆ ไม่ได้ถูกสร้าง

**3. ใช้รูปแบบ `setProducts((prev) => ...)`**
รับค่าล่าสุดมาเป็น argument แทนที่จะอ้าง `products` ตรง ๆ
ปลอดภัยกว่าเวลามีหลาย action เกิดไล่ ๆ กัน

**สร้าง array ใหม่เสมอ ห้าม mutate**

```js
setProducts((prev) => [...prev, created]);   // ✅ array ใหม่
prev.push(created);                          // ❌ React ไม่รู้ว่าเปลี่ยน
```

React เช็คว่า state เปลี่ยนไหมด้วยการ**เทียบ reference** ไม่ได้ไล่ดูข้างใน
`.push()` แก้ array ตัวเดิม reference เท่าเดิม React เลยคิดว่าไม่มีอะไรเปลี่ยน แล้วไม่ re-render
`[...prev, created]` สร้างกล่องใหม่ reference เปลี่ยน React จึง re-render

### ทำไมหน้าจออัปเดตโดยไม่ต้อง refresh

```
เรียก setProducts(ค่าใหม่)
   │
   ▼
React เห็นว่า state ของ App เปลี่ยน
   │
   ▼
สั่ง render App ใหม่
   │
   ▼
App ส่ง products ชุดใหม่ลงไปให้ ProductList
   │
   ▼
React เทียบผลลัพธ์ใหม่กับของเดิม แล้วแก้ DOM เฉพาะส่วนที่ต่าง
```

ไม่ได้วาดใหม่ทั้งหน้า แก้แค่แถวที่เปลี่ยน — เร็วกว่า `location.reload()` มาก
และไม่ทำให้หน้าจอกระพริบหรือค่าที่พิมพ์ค้างไว้หายไป

---

## `client/src/components/ProductForm.jsx`

ฟอร์มเดียวใช้ได้ทั้งเพิ่มและแก้ไข ต่างกันที่ prop `product`

```js
const [name, setName] = useState(product?.name ?? "");
const [price, setPrice] = useState(product?.price ?? "");
const [quantity, setQuantity] = useState(product?.quantity ?? 1);
```

`product?.name` = ถ้า `product` เป็น `null` ก็ได้ `undefined` ไม่พัง
`?? ""` = ถ้าเป็น `undefined`/`null` ให้ใช้ `""` แทน

### `e.preventDefault()`

```js
function handleSubmit(e) {
  e.preventDefault();
  ...
}
```

ปกติ `<form>` เวลา submit จะ**โหลดหน้าใหม่ทั้งหน้า** ซึ่งเป็นพฤติกรรมของเว็บสมัยก่อน
บรรทัดนี้ห้ามไว้ เพื่อให้เราจัดการเองด้วย JavaScript
**ถ้าลืมบรรทัดนี้** หน้าเว็บจะกระพริบแล้ว state หายหมดทุกครั้งที่กดปุ่ม

### `key` บนฟอร์ม (อยู่ใน `App.jsx`)

```jsx
<ProductForm key={editing?.id ?? "new"} product={editing} ... />
```

ปัญหา: `useState(product?.name ?? "")` อ่านค่าเริ่มต้น **แค่ตอน mount ครั้งแรกเท่านั้น**
กด Edit ตัวที่สอง prop เปลี่ยน แต่ `useState` ไม่อ่านใหม่ ฟอร์มจะค้างค่าของตัวแรก

`key` แก้ตรงนี้: เมื่อ `key` เปลี่ยน React ถือว่าเป็น component **คนละตัว**
มันจะถอดตัวเก่าทิ้งแล้วสร้างใหม่ ทำให้ `useState` อ่านค่าเริ่มต้นใหม่

- โหมดเพิ่ม → `key="new"`
- แก้ไข Keyboard → `key="1"`
- แก้ไข Mouse → `key="2"` → ฟอร์มสร้างใหม่พร้อมข้อมูล Mouse

### controlled input

```jsx
<input value={name} onChange={(e) => setName(e.target.value)} />
```

ค่าในช่องมาจาก state ไม่ใช่จาก DOM — React เป็นเจ้าของค่าเสมอ
พิมพ์ 1 ตัว → `onChange` → `setName` → re-render → ช่องแสดงค่าใหม่

**ถ้าใส่ `value` แต่ลืม `onChange`** ช่องจะพิมพ์ไม่ได้เลย เพราะ state ไม่เคยเปลี่ยน

---

## `client/src/components/ProductList.jsx`

component นี้ **ไม่มี state ของตัวเอง** รับข้อมูลลงมาแล้วยิง event กลับขึ้นไป

```jsx
<button onClick={() => onEdit(product)}>Edit</button>
<button onClick={() => onDelete(product)}>Delete</button>
```

เรียกว่า **lifting state up** — เก็บ state ไว้ที่เดียว (`App`) แล้วส่งลงมาเป็น props
ถ้าให้แต่ละแถวเก็บ state เอง จะเกิดปัญหาว่า "ความจริง" อยู่กระจัดกระจายหลายที่

### `key` ใน list

```jsx
{products.map((product) => (
  <tr key={product.id}>
```

React ใช้ `key` จำว่าแถวไหนคือแถวไหนระหว่าง render สองรอบ
ทำให้ลบตัวกลางแล้วมันรู้ว่าต้องเอาแถวนั้นออก ไม่ใช่ขยับข้อมูลทุกแถว

**ห้ามใช้ index ของ array เป็น `key`** เพราะพอลบตัวแรก index ของทุกตัวจะเลื่อน
React จะเข้าใจผิดว่าข้อมูลทุกแถวเปลี่ยน

---

# การเดินทางครบวงจร: กดปุ่ม Delete

ไล่ตั้งแต่ผู้ใช้คลิกจนหน้าจอเปลี่ยน

```
1. ผู้ใช้คลิกปุ่ม Delete ที่แถว "Mouse"
   ProductList.jsx →  onClick={() => onDelete(product)}

2. เรียก handleDelete(product) ใน App.jsx
   setDeletingId("2")  →  ปุ่มเปลี่ยนเป็น "Deleting..." และกดซ้ำไม่ได้

3. เรียก deleteProduct("2") ใน api.js
   fetch("http://localhost:4001/products/2", { method: "DELETE" })

4. ── ออกจาก browser วิ่งข้ามไปอีก port ─────────────────────────▶

5. Express รับ request
   cors()          ติด header Access-Control-Allow-Origin
   express.json()  ไม่มี body ก็ผ่านไป
   requestLogger   print "[...] DELETE /products/2"

6. เข้า app.use("/products", productsRouter)
   ตรงกับ router.delete("/:id")  →  req.params.id = "2"

7. findIndex หา id "2"  →  เจอที่ index 1
   products.splice(1, 1)  ←  ★ array บน server เปลี่ยนจริงตรงนี้
   res.status(200).json({ message: "Product deleted", deleted: {...} })

8. ◀──────────────────────── response วิ่งกลับมา ──────────────────

9. api.js: res.ok เป็น true (200) → return data ไม่ throw

10. App.jsx กลับมาทำงานต่อหลัง await
    setProducts((prev) => prev.filter((p) => p.id !== "2"))
    ★ UI state ตัดตัวนั้นออก → ตรงกับ server อีกครั้ง

11. finally: setDeletingId(null)

12. React เห็น state เปลี่ยน → render ใหม่ → แถว Mouse หายจากตาราง
    ทั้งหมดนี้ไม่มีการ reload หน้าเว็บเลย
```

**ถ้าขั้นตอนที่ 7 เจอ `index === -1`** (เช่นกด Delete ซ้ำสองครั้งเร็ว ๆ)
server ตอบ `404` → `res.ok` เป็น false → `api.js` throw
→ `catch` ใน `handleDelete` ทำงาน → `setActionError("Product not found")`
→ ข้อความ error ขึ้นบนหน้าจอ และ **ตารางไม่ถูกแก้** เพราะ `setProducts` ไม่ได้ทำงาน

---

# ถ้าปิด server จะเกิดอะไรขึ้น

```
fetch("http://localhost:4001/products")
   │
   ▼  ต่อไม่ติด ไม่มีใครรับที่ port นั้น
Promise reject → TypeError: Failed to fetch
   │
   ▼
catch ใน useEffect  →  setLoadError("Failed to fetch")
   │
   ▼
finally  →  setLoading(false)     ← ถ้าไม่มีบรรทัดนี้จะค้างที่ Loading ตลอดกาล
   │
   ▼
หน้าจอแสดง: "Could not load products. Failed to fetch"
            "Is the server running on http://localhost:4001?"
            [ Try again ]
```

กด **Try again** → `setReloadKey((n) => n + 1)` → ค่าใน dependency array เปลี่ยน
→ `useEffect` ทำงานใหม่ → ลองโหลดอีกรอบ โดยไม่ต้อง refresh หน้าเว็บ

**ทำไมต้องมีสถานะพวกนี้** ถ้าไม่มี ผู้ใช้จะเห็นหน้าว่างเปล่าแล้วไม่รู้ว่า
กำลังโหลดอยู่ ไม่มีข้อมูล หรือพังไปแล้ว — ล้มเหลวแบบเงียบ ๆ คือประสบการณ์ที่แย่ที่สุด

---

# แผนที่ไฟล์

```
Assessment-backend/
│
├── server/                          ← Express API, port 4001
│   ├── index.js                     ตั้ง middleware, mount router, error handler, listen
│   ├── routes/products.js           5 routes + in-memory array (หัวใจของ backend)
│   ├── middlewares/logger.js        custom middleware: log ทุก request
│   ├── testHTTP/products.rest       ไฟล์ทดสอบ API แยกจาก frontend
│   ├── .env                         PORT=4001  (ไม่ถูก commit)
│   │
│   ├── config/db.js                 ⚠️ ยังไม่ได้ใช้ เตรียมไว้สำหรับ MongoDB
│   └── models/product.model.js      ⚠️ ยังไม่ได้ใช้ เตรียมไว้สำหรับ MongoDB
│
├── client/                          ← React + Vite, port 5173
│   ├── .env                         VITE_API_URL  (ไม่ถูก commit)
│   ├── .env.example                 ตัวอย่างให้ copy
│   └── src/
│       ├── main.jsx                 จุดเริ่ม เอา App ไปแปะใน #root
│       ├── api.js                   base URL + fetch ทุกตัว
│       ├── App.jsx                  state ทั้งหมด + handler (สมองของแอป)
│       └── components/
│           ├── ProductForm.jsx      ฟอร์มเดียวใช้ทั้งเพิ่มและแก้
│           └── ProductList.jsx      ตารางแสดงผล
│
├── README.md                        วิธีรัน + API reference
├── WORKLOG.md                       บันทึกว่าแก้อะไรไปบ้าง
├── CODE-GUIDE.md                    ไฟล์นี้
└── my-understanding.md              ต้องเขียนเอง
```

---

# เช็คลิสต์ความเข้าใจ

ถ้าตอบได้หมดโดยไม่ต้องเปิดโค้ด แปลว่าเข้าใจจริง

**Backend**

- [ ] ถ้าลบ `app.use(express.json())` ออก บรรทัดไหนจะพังก่อน และพังยังไง
- [ ] ทำไม 404 handler ต้องอยู่**หลัง** `app.use("/products", ...)`
- [ ] Express รู้ได้ยังไงว่า `app.use` ตัวไหนคือ error handler
- [ ] `req.params` `req.query` `req.body` ต่างกันยังไง ชี้ตัวอย่างในโค้ดได้ทั้งสามตัว
- [ ] ทำไม POST ตอบ `201` แต่ PUT ตอบ `200`
- [ ] ทำไมบรรทัด 14 ต้องเขียน `[...products]` แทน `products`
- [ ] ทำไมเช็ค `price === undefined` แทน `!price`

**Frontend**

- [ ] ทำไมเรียก `fetch` ตรง ๆ ใน component body ไม่ได้
- [ ] `fetch` throw ตอนได้ `404` ไหม แล้วเราจัดการยังไง
- [ ] `key` บน `ProductForm` มีไว้ทำอะไร ถ้าไม่มีจะเกิดอะไรขึ้น
- [ ] ทำไมใช้ `[...prev, created]` แทน `prev.push(created)`
- [ ] ทำไมเอา `created` จาก server มาใส่ state แทนที่จะใช้ `form`
- [ ] `return () => clearTimeout(timer)` ทำงานตอนไหน

**การเชื่อมสองฝั่ง**

- [ ] CORS แก้ปัญหาอะไร ถ้าลบ `cors()` จะเห็น error แบบไหน
- [ ] base URL อยู่ที่ไหน ทำไมไม่ hardcode ทุกที่
- [ ] เล่าการเดินทางของการกด Delete ตั้งแต่คลิกจนตารางเปลี่ยน
- [ ] ปิด server แล้วแอปจะเป็นยังไง
- [ ] "server state" กับ "UI state" ต่างกันยังไง ทำให้ตรงกันด้วยวิธีไหน
