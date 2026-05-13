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
