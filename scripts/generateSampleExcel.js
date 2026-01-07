const xlsx = require("xlsx");
const path = require("path");

const createSampleExcel = () => {
    // Define columns matching the controller logic
    const headers = [
        "Name",
        "Description",
        "Price",
        "Category",
        "Tax",
        "IsAvailable",
        "PreparationTime",
        "MeatType"
    ];

    // Sample data
    const data = [
        {
            "Name": "Classic Cheese Burger",
            "Description": "Juicy beef patty with cheddar cheese and fresh lettuce.",
            "Price": 12.50,
            "Category": "Burgers", // Matches seed data
            "Tax": "VAT",          // Matches seed data
            "IsAvailable": true,
            "PreparationTime": 15,
            "MeatType": "Non-Veg"
        },
        {
            "Name": "Margherita Pizza",
            "Description": "Traditional wood-fired pizza with basil and mozzarella.",
            "Price": 14.00,
            "Category": "Pizza",
            "Tax": "VAT",
            "IsAvailable": true,
            "PreparationTime": 20,
            "MeatType": "Veg"
        },
        {
            "Name": "Caesar Salad",
            "Description": "Crisp romaine lettuce with parmesan and garlic croutons.",
            "Price": 9.99,
            "Category": "Salads",
            "Tax": "VAT",
            "IsAvailable": true,
            "PreparationTime": 10,
            "MeatType": "Veg"
        },
        {
            "Name": "Spicy Chicken Wrap",
            "Description": "Grilled chicken with spicy salsa in a tortilla.",
            "Price": 8.50,
            "Category": "Wraps",
            "Tax": "VAT",
            "IsAvailable": true,
            "PreparationTime": 12,
            "MeatType": "Non-Veg"
        }
    ];

    // Create a new workbook
    const workbook = xlsx.utils.book_new();

    // Create a worksheet from the data
    const worksheet = xlsx.utils.json_to_sheet(data, { header: headers });

    // Append the worksheet to the workbook
    xlsx.utils.book_append_sheet(workbook, worksheet, "MenuItems");

    // Output file path
    const outputPath = path.join(__dirname, "../sample_menu_items.xlsx");

    // Write file
    xlsx.writeFile(workbook, outputPath);

    console.log(`Sample Excel file created at: ${outputPath}`);
};

createSampleExcel();
