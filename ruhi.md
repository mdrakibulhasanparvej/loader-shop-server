

🛠 ১. ডাটাবেজ ও স্কিমা (Task 1)
সবকিছুর আগে তোমাকে Product এবং Category মডেল তৈরি করতে হবে।

Product Schema: এখানে sku ফিল্ডটি unique: true রাখবে। ইমেজগুলোর জন্য [String] এরে ব্যবহার করবে।

Indexing: সার্চ ফাস্ট করার জন্য স্কিমা লেভেলে name এবং category তে ইনডেক্সিং সেট করতে হবে:
productSchema.index({ name: 'text', description: 'text' }); (সার্চের জন্য এটি খুব জরুরি)।

🔍 ২. মাস্টার এপিআই ও অ্যাডভান্সড ফিল্টারিং (Task 2 & 3)
তোমার সবচেয়ে বড় চ্যালেঞ্জ হলো GET /api/products এপিআই-টি। এটি ডাইনামিক হতে হবে।

Pagination: req.query.page এবং req.query.limit ব্যবহার করে skip() এবং limit() ক্যালকুলেট করতে হবে।

Filtering: category, price, rating এর জন্য একটি query object তৈরি করবে। যেমন:

JavaScript
let query = {};
if (req.query.category) query.category = req.query.category;
if (req.query.minPrice) query.price = { $gte: req.query.minPrice };
Search: কি-ওয়ার্ড সার্চের জন্য মঙ্গোডিবি-র $regex বা text search ব্যবহার করতে পারো।

⭐ ৩. রিভিউ ও রেটিং ক্যালকুলেশন (Task 4)
যখনই কোনো ইউজার নতুন রিভিউ দেবে (POST), তোমাকে নিচের লজিকটি হ্যান্ডেল করতে হবে:

প্রোডাক্টের বর্তমান সব রিভিউ খুঁজে বের করা।

সব রেটিং যোগ করে টোটাল রিভিউ দিয়ে ভাগ করা।

প্রোডাক্ট মডেলে rating এবং numReviews ফিল্ড দুটি আপডেট করা।

🏠 ৪. হোমপেজ স্পেসিফিক এপিআই (Task 5)
এই এপিআইগুলো খুব সহজ কিন্তু পারফরম্যান্সের জন্য গুরুত্বপূর্ণ:

Latest Products: sort({ createdAt: -1 }).limit(8)।

Flash Sale: যেখানে discountPrice তার অরিজিনাল price থেকে কম।

📝 গিট কমিট স্ট্র্যাটেজি (Commit Plan)
তোমার রিকোয়ারমেন্ট অনুযায়ী নিচের সিকুয়েন্সে কমিট করলে প্রজেক্ট ক্লিন থাকবে:

feat: create product mongoose schema with all required fields

feat: implement admin-only product CRUD endpoints

feat: build advanced product fetching api with pagination

feat: add filtering and sorting logic to product list api

feat: implement category and sub-category management endpoints

feat: build keyword-based search functionality for products

feat: implement customer review and average rating calculation logic

feat: create specialized endpoints for featured and flash sale products












🛠️ 1. Product CRUD (Admin)
POST /products ✔️
PUT /products/:id ✔️
DELETE /products/:id ✔️

👉 ✔️ Task sheet fully cover

📦 2. Product Details API
GET /products/:id ✔️

👉 ✔️ এখন single product page কাজ করবে

📂 3. Category System
GET /categories ✔️
POST /categories ✔️

👉 ✔️ Navbar / filter ready

🔐 4. Auth System 
requireAdmin ✔️
requireCustomer ✔️

👉 ✔️ এখন secure (task sheet requirement fulfilled)

⭐ 5. Review System Improve
এখন review দিতে login (customer auth) লাগে ✔️

👉 ✔️ Real-world behavior

🖼️ 6. Image + Slug Utility
image normalize ✔️
slug generate ✔️

👉 ✔️ clean URL + better data handling

⚙️ 7. Route Setup
সব route properly register করা ✔️

👉 ✔️ production-ready structure

📁 8. .env.example
config setup added ✔️











server run korci ami 
========================
🚀 Server running on port 5000









✔️ ADMIN_SECRET add করেছি
✔️ MongoDB URL clean করে database name add করেছি (LoaderShop)
✔️ FRONTEND_URL → 3000 করলাম (Next.js হলে usually এটা হয়)






🔐 1. Admin API (Product add/edit/delete)

👉 যখন তুমি product create / update / delete করবে
তখন request এর সাথে একটা secret key পাঠাতে হবে

📌 কোথায় দিবা?

👉 Postman বা frontend request এ Headers section এ

✍️ কী দিবা?
Authorization: Bearer akhi_admin_123

👉 মানে:

Authorization = header name
Bearer akhi_admin_123 = value (তোমার ADMIN_SECRET)
👤 2. Review API (user review দিবে)

👉 যখন user review দিবে
তখন backend জানতে চায় “কে review দিচ্ছে?”

📌 Headers এ দিবা:
x-user-id: 123
x-user-name: Akhi

👉 মানে:

user id (যেকোনো dummy number দিলেই হবে এখন)
name optional (না দিলেও চলে)



all is done ======
✅ Clean schema

backend এখন:

✅ Error-free
✅ Warning-free
✅ Production-ready basic level
