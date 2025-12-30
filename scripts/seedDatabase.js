const dotenv = require("dotenv");
dotenv.config();

const { connectToDatabase } = require("../config/db");
const {
  getCategoryModel,
  getCustomizationOptionModel,
  getItemModel,
  getMenuModel,
  getTaxModel,
  getRestaurantModel,
  getDiscountModel,
} = require("../models/index");
let userDB, restaurantDB;

const connectDB = async () => {
  try {
    userDB = await connectToDatabase("Users");
    restaurantDB = await connectToDatabase("123");
    console.log("Connected to databases successfully");
  } catch (error) {
    console.error("Failed to connect to databases:", error);
    process.exit(1);
  }
};

const seedDatabase = async () => {
  try {
    const Category = getCategoryModel(restaurantDB);
    const CustomizationOption = getCustomizationOptionModel(restaurantDB);
    const Item = getItemModel(restaurantDB);
    const Menu = getMenuModel(restaurantDB);
    const Tax = getTaxModel(restaurantDB);
    const Restaurant = getRestaurantModel(restaurantDB);
    const Discount = getDiscountModel(restaurantDB);

    // await Restaurant.deleteMany({ restaurantId: "restaurant_123" });
    await Restaurant.create({
      restaurantId: "restaurant_123",
      name: "Tasty Bytes",
      address: "123 Food Street, Tech City",
      operatingHours: {
        Monday: { openTime: "08:00", closeTime: "22:00" },
        Tuesday: { openTime: "08:00", closeTime: "22:00" },
        Wednesday: { openTime: "08:00", closeTime: "22:00" },
        Thursday: { openTime: "08:00", closeTime: "22:00" },
        Friday: { openTime: "08:00", closeTime: "22:00" },
        Saturday: { openTime: "08:00", closeTime: "22:00" },
        Sunday: { openTime: "08:00", closeTime: "22:00" },
      },
      phone: "555-0123",
      email: "contact@tastybytes.com",
      isActive: true,
      cuisineType: ["American", "Italian"],
      tableConfiguration: {
        totalTables: 15,
      },
      acceptsOnlineOrders: false,
      acceptsReservations: true,
      paymentMethods: ["cash", "credit", "online"],
      kdsConfiguration: { workflow: ["new", "start", "prepared", "ready"] },
      capacity: 150,
    });

    await Category.insertMany([
      {
        restaurantId: "restaurant_123",
        name: "Burgers",
        description: "Grilled burgers",
        isActive: true,
        displayOrder: 1,
      },
      {
        restaurantId: "restaurant_123",
        name: "Pizza",
        description: "Hand-tossed pizzas",
        isActive: true,
        displayOrder: 2,
      },
      {
        restaurantId: "restaurant_123",
        name: "Pasta",
        description: "Authentic Italian pasta",
        isActive: true,
        displayOrder: 3,
      },
      {
        restaurantId: "restaurant_123",
        name: "Salads",
        description: "Fresh and healthy",
        isActive: true,
        displayOrder: 4,
      },
      {
        restaurantId: "restaurant_123",
        name: "Desserts",
        description: "Sweet and delicious",
        isActive: true,
        displayOrder: 5,
      },
      {
        restaurantId: "restaurant_123",
        name: "Steaks",
        description: "Juicy premium cuts",
        isActive: true,
        displayOrder: 6,
      },
      {
        restaurantId: "restaurant_123",
        name: "Wraps",
        description: "Flavored wraps",
        isActive: true,
        displayOrder: 7,
      },
      {
        restaurantId: "restaurant_123",
        name: "BBQ",
        description: "Smoked BBQ platters",
        isActive: true,
        displayOrder: 8,
      },
      {
        restaurantId: "restaurant_123",
        name: "Seafood",
        description: "Fresh seafood",
        isActive: true,
        displayOrder: 9,
      },
      {
        restaurantId: "restaurant_123",
        name: "Asian Cuisine",
        description: "Authentic Asian flavors",
        isActive: true,
        displayOrder: 10,
      },
      {
        restaurantId: "restaurant_123",
        name: "Breakfast",
        description: "Morning delights",
        isActive: true,
        displayOrder: 11,
      },
      {
        restaurantId: "restaurant_123",
        name: "Sandwiches",
        description: "Gourmet sandwiches",
        isActive: true,
        displayOrder: 12,
      },
      {
        restaurantId: "restaurant_123",
        name: "Smoothies",
        description: "Healthy smoothies",
        isActive: true,
        displayOrder: 13,
      },
      {
        restaurantId: "restaurant_123",
        name: "Vegan",
        description: "Plant-based meals",
        isActive: true,
        displayOrder: 14,
      },
      {
        restaurantId: "restaurant_123",
        name: "Tacos",
        description: "Mexican street tacos",
        isActive: true,
        displayOrder: 15,
      },
      {
        restaurantId: "restaurant_123",
        name: "Fries",
        description: "Crispy fries & sides",
        isActive: true,
        displayOrder: 16,
      },
      {
        restaurantId: "restaurant_123",
        name: "Rice Bowls",
        description: "Hearty rice dishes",
        isActive: true,
        displayOrder: 17,
      },
      {
        restaurantId: "restaurant_123",
        name: "Indian Cuisine",
        description: "Traditional Indian flavors",
        isActive: true,
        displayOrder: 18,
      },
      {
        restaurantId: "restaurant_123",
        name: "Sushi",
        description: "Freshly made sushi",
        isActive: true,
        displayOrder: 19,
      },
      {
        restaurantId: "restaurant_123",
        name: "Drinks",
        description: "Refreshing beverages",
        isActive: true,
        displayOrder: 20,
      },
    ]);

    await CustomizationOption.insertMany([
      {
        restaurantId: "restaurant_123",
        name: "Extra Cheese",
        price: 1.5,
        isActive: true,
      },
      {
        restaurantId: "restaurant_123",
        name: "Spicy Sauce",
        price: 0.75,
        isActive: true,
      },
      {
        restaurantId: "restaurant_123",
        name: "Gluten-Free",
        price: 2.0,
        isActive: true,
      },
      {
        restaurantId: "restaurant_123",
        name: "Bacon Bits",
        price: 2.0,
        isActive: true,
      },
      {
        restaurantId: "restaurant_123",
        name: "Double Patty",
        price: 3.5,
        isActive: true,
      },
    ]);

    const [vatTax] = await Tax.insertMany([
      {
        restaurantId: "restaurant_123",
        name: "VAT",
        percentage: 10, // ✅ FIXED 10%
        isActive: true,
        metaData: [
          { key: "type", value: "standard" },
          { key: "country", value: "GLOBAL" },
        ],
      },
    ]);

    await Discount.insertMany([
      {
        restaurantId: "restaurant_123",
        type: "percentage",
        discountName: "NEW_2026",
        value: 26, // ✅ FIXED 10%
        isActive: true,
        metaData: [
          { key: "type", value: "standard" },
          { key: "country", value: "GLOBAL" },
        ],
      },
    ]);

    const categories = await Category.find({}, "_id"); // Fetch inserted categories
    const customizations = await CustomizationOption.find({}, "_id"); // Fetch inserted customizations

    const items = [];
    categories.forEach((category) => {
      for (let i = 1; i <= 3; i++) {
        items.push({
          restaurantId: "restaurant_123",
          category: category._id,
          name: `${category.name} Item ${i}`,
          description: `Delicious ${category.name} item ${i}`,
          price: +(Math.random() * 10 + 5).toFixed(2), // Random price between 5 and 15
          image: `https://tse4.mm.bing.net/th/id/OIP.eoBSdHfQ0ThaJV8tcP-5FwHaF7?rs=1&pid=ImgDetMain&o=7&rm=3`,
          isAvailable: true,
          preparationTime: Math.floor(Math.random() * 10) + 10, // Random prep time 10-20 min
          allergens: ["Dairy", "Gluten"],
          customizationOptions: [
            customizations[Math.floor(Math.random() * customizations.length)]
              ._id,
            customizations[Math.floor(Math.random() * customizations.length)]
              ._id,
          ],
          popularityScore: Math.floor(Math.random() * 100), // Random popularity score
          averageRating: (Math.random() * (5 - 3.5) + 3.5).toFixed(1), // Random rating 3.5 - 5
          taxable: true,
          taxRate: vatTax._id,
          minOrderQuantity: 1,
          maxOrderQuantity: 5,
        });
      }
    });
    await Item.insertMany(items);

    const itemsV2 = await Item.find({}, "_id");
    await Menu.insertMany([
      {
        restaurantId: "restaurant_123",
        name: "Lunch Special",
        description: "Available from 12 PM - 3 PM",
        isActive: true,
        availableDays: [
          {
            day: "Monday",
            timeSlots: [{ openTime: "12:00 PM", closeTime: "3:00 PM" }],
          },
          {
            day: "Tuesday",
            timeSlots: [{ openTime: "12:00 PM", closeTime: "3:00 PM" }],
          },
        ],
        categories: categories.map((cat) => cat._id),
        items: itemsV2.slice(0, 10).map((item) => ({
          item: item._id,
          defaultPrice: 10,
        })),
        taxes: [vatTax._id],
      },
      {
        restaurantId: "restaurant_123",
        name: "Dinner Special",
        description: "Available from 6 PM - 10 PM",
        isActive: true,
        availableDays: [
          {
            day: "Friday",
            timeSlots: [{ openTime: "18:00", closeTime: "21:00" }],
          },
          {
            day: "Saturday",
            timeSlots: [{ openTime: "18:00", closeTime: "21:00" }],
          },
        ],
        categories: categories.map((cat) => cat._id),
        items: itemsV2.slice(10, 20).map((item) => ({
          item: item._id,
          defaultPrice: 15,
        })),
        taxes: [vatTax._id],
      },

      {
        restaurantId: "restaurant_123",
        name: "Dinner Special",
        description: "Available from 6 PM - 10 PM",
        isActive: true,
        availableDays: [
          {
            day: "Monday",
            timeSlots: [{ openTime: "18:00", closeTime: "21:00" }],
          },
          {
            day: "Tuesday",
            timeSlots: [{ openTime: "18:00", closeTime: "21:00" }],
          },
          {
            day: "Wednesday",
            timeSlots: [{ openTime: "18:00", closeTime: "21:00" }],
          },
          {
            day: "Thursday",
            timeSlots: [{ openTime: "18:00", closeTime: "21:00" }],
          },
          {
            day: "Friday",
            timeSlots: [{ openTime: "18:00", closeTime: "21:00" }],
          },
          {
            day: "Saturday",
            timeSlots: [{ openTime: "18:00", closeTime: "21:00" }],
          },
          {
            day: "Sunday",
            timeSlots: [{ openTime: "18:00", closeTime: "21:00" }],
          },
        ],
        categories: categories.map((cat) => cat._id),
        items: itemsV2.slice(10, 20).map((item) => ({
          item: item._id,
          defaultPrice: 15,
        })),
        taxes: [vatTax._id],
      },
      {
        restaurantId: "restaurant_123",
        name: "Lunch Special",
        description: "Available from 2 PM - 6 PM",
        isActive: true,
        availableDays: [
          {
            day: "Monday",
            timeSlots: [{ openTime: "14:00", closeTime: "18:00" }],
          },
          {
            day: "Tuesday",
            timeSlots: [{ openTime: "14:00", closeTime: "18:00" }],
          },
          {
            day: "Wednesday",
            timeSlots: [{ openTime: "14:00", closeTime: "18:00" }],
          },
          {
            day: "Thursday",
            timeSlots: [{ openTime: "14:00", closeTime: "18:00" }],
          },
          {
            day: "Friday",
            timeSlots: [{ openTime: "14:00", closeTime: "18:00" }],
          },
          {
            day: "Saturday",
            timeSlots: [{ openTime: "14:00", closeTime: "18:00" }],
          },
          {
            day: "Sunday",
            timeSlots: [{ openTime: "14:00", closeTime: "18:00" }],
          },
        ],
        categories: categories.map((cat) => cat._id),
        items: itemsV2.slice(10, 20).map((item) => ({
          item: item._id,
          defaultPrice: 15,
        })),
        taxes: [vatTax._id],
      },
      {
        restaurantId: "restaurant_123",
        name: "Morning Special",
        description: "Available from 9 AM - 2 PM",
        isActive: true,
        availableDays: [
          {
            day: "Monday",
            timeSlots: [{ openTime: "09:00", closeTime: "14:00" }],
          },
          {
            day: "Tuesday",
            timeSlots: [{ openTime: "09:00", closeTime: "14:00" }],
          },
          {
            day: "Wednesday",
            timeSlots: [{ openTime: "09:00", closeTime: "14:00" }],
          },
          {
            day: "Thursday",
            timeSlots: [{ openTime: "09:00", closeTime: "14:00" }],
          },
          {
            day: "Friday",
            timeSlots: [{ openTime: "09:00", closeTime: "14:00" }],
          },
          {
            day: "Saturday",
            timeSlots: [{ openTime: "09:00", closeTime: "14:00" }],
          },
          {
            day: "Sunday",
            timeSlots: [{ openTime: "09:00", closeTime: "14:00" }],
          },
        ],
        categories: categories.map((cat) => cat._id),
        items: itemsV2.slice(10, 20).map((item) => ({
          item: item._id,
          defaultPrice: 15,
        })),
        taxes: [vatTax._id],
      },
      {
        restaurantId: "restaurant_123",
        name: "Sample Restaurant Menu",
        description: "A diverse selection of delicious meals.",
        isActive: true,
        availableDays: [
          {
            day: "Monday",
            timeSlots: [{ openTime: "08:00", closeTime: "08:59" }],
          },
          {
            day: "Tuesday",
            timeSlots: [{ openTime: "08:00", closeTime: "08:59" }],
          },
          {
            day: "Wednesday",
            timeSlots: [{ openTime: "08:00", closeTime: "08:59" }],
          },
          {
            day: "Thursday",
            timeSlots: [{ openTime: "08:00", closeTime: "08:59" }],
          },
          {
            day: "Friday",
            timeSlots: [{ openTime: "08:00", closeTime: "08:59" }],
          },
          {
            day: "Saturday",
            timeSlots: [{ openTime: "08:00", closeTime: "08:59" }],
          },
          {
            day: "Sunday",
            timeSlots: [{ openTime: "08:00", closeTime: "08:59" }],
          },
        ],
        categories: categories.map((cat) => cat._id),
        items: itemsV2.slice(10, 20).map((item) => ({
          item: item._id,
          // defaultPrice: 15,
          timeBasedPricing: [
            {
              days: ["Monday", "Tuesday"],
              startTime: "14:00",
              endTime: "18:00",
              price: 12.99,
            },
          ],
          specialEventPricing: [
            {
              event: "Christmas",
              date: "2025-12-25",
              priceMultiplier: 1.5,
            },
          ],
          membershipPricing: [
            {
              membershipLevel: "Gold",
              price: 13.49,
            },
          ],
          bulkPricing: [
            {
              minQuantity: 5,
              discountPercentage: 10,
            },
          ],
          locationPricing: [
            {
              location: "New York",
              price: 16.99,
            },
          ],
          availabilityHours: {
            startTime: "10:00",
            endTime: "21:00",
          },
        })),
        taxes: [vatTax._id],
      },
    ]);

    console.log("Data inserted successfully!");
  } catch (error) {
    console.error("Error seeding database:", error);
  } finally {
    if (userDB) await userDB.connection;
    if (restaurantDB) await restaurantDB.connection;
    console.log("Database connections closed");
  }
};

const dropDatabases = async () => {
  try {
    if (userDB) {
      await userDB.connection.db.dropDatabase();
      console.log("Dropped Users database");
    }
    if (restaurantDB) {
      await restaurantDB.connection.db.dropDatabase();
      console.log("Dropped ABC database");
    }
  } catch (error) {
    console.error("Error dropping databases:", error);
    process.exit(1); // Exit process if there's an error dropping databases
  }
};

const add = async () => {
  await connectDB();
  await seedDatabase();
  process.exit(0);
};

const drop = async () => {
  try {
    await connectDB(); // Assuming connectDB() establishes connections to userDB and schoolDB
    await dropDatabases();
  } catch (error) {
    console.error("Error in drop function:", error);
    process.exit(1); // Exit process if there's an error in the drop function
  } finally {
    // Close database connections after dropping
    if (userDB) await userDB.connection.close();
    if (schoolDB) await schoolDB.connection.close();
    console.log("Database connections closed");
  }
};

add();
// drop();
