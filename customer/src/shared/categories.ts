// shared/categories.ts
// Predefined grocery categories and subcategories

export const GROCERY_CATEGORIES = {
  "Fruits & Vegetables": [
    "Fresh Vegetables",
    "Fresh Fruits",
    "Exotic Fruits & Vegetables",
    "Organic Produce",
    "Herbs & Seasonings",
    "Cuts & Sprouts"
  ],
  
  "Dairy & Bakery": [
    "Milk",
    "Curd & Yogurt",
    "Paneer & Tofu",
    "Butter & Ghee",
    "Cheese",
    "Bread & Pav",
    "Cakes & Pastries",
    "Cookies & Biscuits"
  ],
  
  "Staples": [
    "Rice & Rice Products",
    "Atta, Flours & Sooji",
    "Dals & Pulses",
    "Edible Oils",
    "Masalas & Spices",
    "Salt, Sugar & Jaggery",
    "Dry Fruits & Nuts"
  ],
  
  "Snacks & Beverages": [
    "Tea & Coffee",
    "Soft Drinks",
    "Juices",
    "Energy & Health Drinks",
    "Water",
    "Chips & Namkeen",
    "Chocolates & Candies",
    "Biscuits & Cookies"
  ],
  
  "Packaged Food": [
    "Breakfast Cereals",
    "Noodles & Pasta",
    "Sauces & Spreads",
    "Pickles & Chutney",
    "Ready to Cook",
    "Ready to Eat",
    "Instant Mixes",
    "Canned & Jarred Food"
  ],
  
  "Personal Care": [
    "Bath & Hand Wash",
    "Hair Care",
    "Skin Care",
    "Oral Care",
    "Shaving & Grooming",
    "Feminine Hygiene",
    "Diapers & Wipes",
    "Health & Medicine"
  ],
  
  "Household": [
    "Detergents & Dishwash",
    "All Purpose Cleaners",
    "Fresheners & Repellents",
    "Pooja Needs",
    "Stationery",
    "Batteries & Electricals",
    "Kitchen Accessories",
    "Garbage Bags"
  ],
  
  "Meat, Fish & Eggs": [
    "Eggs",
    "Fresh Chicken",
    "Fresh Mutton",
    "Fresh Fish",
    "Frozen Non-Veg",
    "Sausages & Bacon"
  ],
  
  "Frozen & Instant": [
    "Frozen Vegetables",
    "Frozen Snacks",
    "Ice Cream",
    "Frozen Non-Veg"
  ],
  
  "Baby Care": [
    "Baby Food",
    "Diapers & Wipes",
    "Baby Bath & Hygiene",
    "Baby Accessories"
  ],
  
  "Pet Care": [
    "Dog Food",
    "Cat Food",
    "Pet Accessories",
    "Pet Grooming"
  ]
} as const;

export type GroceryCategory = keyof typeof GROCERY_CATEGORIES;
export type GrocerySubcategory = typeof GROCERY_CATEGORIES[GroceryCategory][number];

// Flat list for easy iteration
export const CATEGORY_LIST = Object.keys(GROCERY_CATEGORIES) as GroceryCategory[];

// Get subcategories for a category
export function getSubcategories(category: GroceryCategory): readonly string[] {
  return GROCERY_CATEGORIES[category] || [];
}
