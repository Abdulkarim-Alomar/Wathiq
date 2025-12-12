import { query } from '../libraries/Database.js';

// جلب كل المواد الموجودة في المخزن
export async function getAllAvailableProducts(req, res) {
  try {
    const result = await query(`
      SELECT 
        "Product_id",
        "Product_code",
        "Product_name",
        "Product_amount",
        "has_weight",
        "Product_weight",
        "Product_weight_total",
        "unite",
        "Product_purchase_price",
        "Product_purchase_price_total",
        "Product_sale_price",
        "Product_exchange_rate"
      FROM "Product"
      ORDER BY "Product_name" ASC
    `);

    res.json({
      status: "success",
      count: result.rows.length,
      products: result.rows
    });

  } catch (err) {
    console.error('❌ Error fetching products for visitors:', err);
    console.error('DB ERROR DETAILS:', err.message);
    res.status(500).json({ message: 'حدث خطأ أثناء جلب المواد.' });
}

}
