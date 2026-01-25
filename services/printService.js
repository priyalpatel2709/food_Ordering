const { jsPDF } = require("jspdf");
require("jspdf-autotable");

/**
 * Service to handle receipt and bill printing
 */
const printService = {
  /**
   * Generate a receipt PDF
   * @param {Object} order Order data
   * @param {Object} restaurant Restaurant data
   */
  generateReceiptPDF: (order, restaurant) => {
    const doc = new jsPDF({
      unit: "mm",
      format: [80, 200], // Standard thermal printer width 80mm
    });

    // Formatting for thermal printer
    doc.setFontSize(12);
    doc.text(restaurant.name || "Restaurant", 40, 10, { align: "center" });
    doc.setFontSize(8);
    doc.text(restaurant.address || "", 40, 15, { align: "center" });
    doc.text(`Phone: ${restaurant.phone || "N/A"}`, 40, 20, {
      align: "center",
    });

    doc.line(5, 25, 75, 25);

    doc.text(`Order ID: ${order.orderId}`, 5, 30);
    doc.text(`Date: ${new Date(order.createdAt).toLocaleString()}`, 5, 35);
    doc.text(
      `Order Type: ${order.isDeliveryOrder ? "Delivery" : "Dine-In"}`,
      5,
      40,
    );
    if (order.tableNumber) doc.text(`Table: ${order.tableNumber}`, 5, 45);

    doc.line(5, 50, 75, 50);

    const tableData = order.orderItems.map((item) => [
      item.item.name,
      item.quantity,
      (item.price * item.quantity).toFixed(2),
    ]);

    doc.autoTable({
      startY: 55,
      margin: { left: 5, right: 5 },
      head: [["Item", "Qty", "Price"]],
      body: tableData,
      theme: "plain",
      styles: { fontSize: 7 },
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontStyle: "bold",
      },
    });

    const finalY = doc.lastAutoTable.finalY + 5;
    doc.text(`Subtotal: ${order.subtotal.toFixed(2)}`, 50, finalY);
    doc.text(`Tax: ${order.tax.totalTaxAmount.toFixed(2)}`, 50, finalY + 5);
    doc.text(
      `Discount: ${order.discount.totalDiscountAmount.toFixed(2)}`,
      50,
      finalY + 10,
    );
    doc.setFontSize(10);
    doc.text(`TOTAL: ${order.orderFinalCharge.toFixed(2)}`, 50, finalY + 17);

    doc.setFontSize(8);
    doc.text("Thank you for your visit!", 40, finalY + 25, { align: "center" });

    return doc;
  },

  /**
   * Format receipt for raw text printing (esc/pos)
   */
  formatRawReceipt: (order, restaurant) => {
    let text = `${restaurant.name}\n`;
    text += `${restaurant.address}\n`;
    text += `--------------------------------\n`;
    text += `Order: ${order.orderId}\n`;
    text += `Date: ${new Date().toLocaleString()}\n`;
    text += `--------------------------------\n`;
    order.orderItems.forEach((item) => {
      text += `${item.item.name.padEnd(20)} ${item.quantity}  ${(item.price * item.quantity).toFixed(2)}\n`;
    });
    text += `--------------------------------\n`;
    text += `TOTAL: ${order.orderFinalCharge.toFixed(2)}\n`;
    text += `--------------------------------\n`;
    text += `Thank you!\n`;
    return text;
  },
};

module.exports = printService;
