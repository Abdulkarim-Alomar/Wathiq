// ✅ إضافة مادة جديدة
// ✅ إضافة مادة جديدة مع ترحيل تلقائي إلى المخزون
import { query } from '../libraries/Database.js';

// ✅ إضافة مادة جديدة مع ترحيل تلقائي للمخزون والنظام المالي
export async function addProduct(req, res) {
  const client = await query('BEGIN');
  try {
    const {
      Product_code,
      Product_name,
      Product_amount,
      has_weight,
      Product_weight,
      Product_weight_total,
      unite,
      Product_purchase_price,
      Product_purchase_price_total,
      Product_sale_price,
      Product_exchange_rate,
      note,
      fund_id, // 🏦 الصندوق الذي سيتم الخصم منه
      money_type // 💲 نوع العملة (Dollar أو SP)
    } = req.body;

    // 1️⃣ إدخال المادة إلى جدول Product
    const result = await query(
      `INSERT INTO "Product" (
        "Product_code", "Product_name", "Product_amount", has_weight, 
        "Product_weight", "Product_weight_total", unite, 
        "Product_purchase_price", "Product_purchase_price_total", 
        "Product_sale_price", "Product_exchange_rate"
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      RETURNING "Product_id"`,
      [
        Product_code,
        Product_name,
        Product_amount,
        has_weight,
        Product_weight,
        Product_weight_total,
        unite,
        Product_purchase_price,
        Product_purchase_price_total,
        Product_sale_price,
        Product_exchange_rate,
      ]
    );

    const productId = result.rows[0].product_id;

    // // 2️⃣ تسجيل عملية الشراء في جدول Purchased_product
    // await query(
    //   `INSERT INTO "Purchased_product" (
    //     purchased_product_name, purchased_product_weight, purchased_product_total_weight,
    //     purchased_product_unite, purchased_product_price, purchased_product_pice_total,
    //     note, purchased_product_date, purchased_product_exchange_rate, purchased_product_product_id
    //   ) VALUES ($1,$2,$3,$4,$5,$6,$7, NOW(), $8, $9)`,
    //   [
    //     Product_name,
    //     Product_weight,
    //     Product_weight_total,
    //     unite,
    //     Product_purchase_price,
    //     Product_purchase_price_total,
    //     note,
    //     Product_exchange_rate,
    //     productId,
    //   ]
    // );

    // // 3️⃣ ترحيل تلقائي للمخزون
    // await query(
    //   `INSERT INTO "Product_arrangement" (
    //     "Product_arranged_name", "Product_arranged_amount", "Product_arranged_total_weight",
    //     count_arrangment, weight_arrangment, count_after_arrangement,
    //     weight_after_arrangement, "Product_arranged_date", note, product_id
    //   )
    //   VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8, $9)`,
    //   [
    //     Product_name,
    //     Product_amount,
    //     Product_weight_total,
    //     Product_amount,
    //     Product_weight_total,
    //     Product_amount,
    //     Product_weight_total,
    //     note || 'ترحيل تلقائي بعد الشراء',
    //     productId,
    //   ]
    // );

    // // 4️⃣ ترحيل مالي إلى جدول Transaction
    // await query(
    //   `INSERT INTO "Transaction" (
    //     transaction_type, amount, transaction_date, fund_id, related_table, related_id, note
    //   ) VALUES ('Purchase', $1, NOW(), $2, 'Product', $3, $4)`,
    //   [Product_purchase_price_total, fund_id, productId, note || 'عملية شراء مواد']
    // );

    // // 5️⃣ تحديث الصندوق (خصم المبلغ)
    // if (money_type.toLowerCase() === 'dollar' || money_type === 'D') {
    //   await query(
    //     `UPDATE "Funds"
    //      SET fund_account_D = COALESCE(fund_account_D, 0) - $1
    //      WHERE fund_id = $2`,
    //     [Product_purchase_price_total, fund_id]
    //   );
    // } else if (money_type.toLowerCase() === 'sp' || money_type === 'SP') {
    //   await query(
    //     `UPDATE "Funds"
    //      SET fund_account_SP = COALESCE(fund_account_SP, 0) - $1
    //      WHERE fund_id = $2`,
    //     [Product_purchase_price_total, fund_id]
    //   );
    // }

    await query('COMMIT');
    res.status(201).json({
      message: '✅ تم إنشاء بطاقة المادة وترحيلها للمخزون والنظام المالي بنجاح',
      productId,
    });
  } catch (err) {
    await query('ROLLBACK');
    console.error('❌ Error in addProduct (with transaction):', err);
    res.status(500).json({ message: 'حدث خطأ أثناء إضافة المادة أو ترحيلها المالي' });
  }
}

// ✅ عرض كل المواد
export async function getAllProducts(req, res) {
  try {
    const result = await query(`
      SELECT *
      FROM "Product" 
      ORDER BY "Product_id"
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Error in getAllProducts:', err);
    res.status(500).json({ message: 'حدث خطأ أثناء جلب المواد' });
  }
}

// 🟦 جلب مادة واحدة حسب ID
export async function getProductById(req, res) {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT *
       FROM "Product"
       WHERE "Product_id" = $1`,
      [id]
    );

    // هل المادة موجودة؟
    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "❌ لم يتم العثور على المادة المطلوبة"
      });
    }

    res.json({
      message: "✅ تم جلب بيانات المادة بنجاح",
      product: result.rows[0]
    });

  } catch (err) {
    console.error("❌ Error in getProductById:", err);
    res.status(500).json({
      message: "حدث خطأ أثناء جلب بيانات المادة"
    });
  }
}

// ✅ تعديل بيانات مادة
export async function updateProduct(req, res) {
  try {
    const { id } = req.params;
    const {
      Product_code,
      Product_name,
      Product_amount,
      Product_weight,
      Product_weight_total,
      unite,
      Product_purchase_price,
      Product_purchase_price_total,
      Product_sale_price,
      Product_exchange_rate,
    } = req.body;

    await query(
      `UPDATE "Product" 
       SET "Product_code" = $1,
           "Product_name" = $2,
           "Product_amount" = $3,
           "Product_weight" = $4,
           "Product_weight_total" = $5,
           unite = $6,
           "Product_purchase_price" = $7,
           "Product_purchase_price_total" = $8,
           "Product_sale_price" = $9,
           "Product_exchange_rate" = $10
       WHERE "Product_id" = $11`,
      [
        Product_code, 
        Product_name, 
        Product_amount, 
        Product_weight, 
        Product_weight_total, 
        unite,
        Product_purchase_price,
        Product_purchase_price_total,
        Product_sale_price,
        Product_exchange_rate,
        id
      ]
    );

    res.json({ message: '✏️ تم تحديث بيانات المادة بنجاح' });
  } catch (err) {
    console.error('❌ Error in updateProduct:', err);
    res.status(500).json({ message: 'حدث خطأ أثناء تعديل بيانات المادة' });
  }
}

// ✅ حذف مادة مع حذف علاقاتها
// 🗑️ حذف مادة مع ترحيل عكسي مالي
export async function deleteProduct(req, res) {
  const client = await query('BEGIN');
  try {
    const { id } = req.params;

    // 1️⃣ جلب بيانات المنتج قبل الحذف
    const productResult = await query(`SELECT * FROM "Product" WHERE "Product_id" = $1`, [id]);
    if (productResult.rows.length === 0) {
      await query('ROLLBACK');
      return res.status(404).json({ message: '❌ لم يتم العثور على المادة' });
    }

    const product = productResult.rows[0];

    // // 2️⃣ جلب العملية المالية المرتبطة
    // const transactionResult = await query(
    //   `SELECT * FROM "Transaction" WHERE related_table = 'Product' AND related_id = $1`,
    //   [id]
    // );

    // const transaction = transactionResult.rows[0];

    // // 3️⃣ استرجاع المبلغ إلى الصندوق (عكس الخصم السابق)
    // if (transaction && transaction.fund_id) {
    //   // إذا كانت العملة دولار
    //   if (product.product_exchange_rate && transaction.transaction_type === 'Purchase') {
    //     await query(
    //       `UPDATE "Funds"
    //        SET fund_account_SP = COALESCE(fund_account_SP, 0) + $1
    //        WHERE fund_id = $2`,
    //       [product.product_purchase_price_total, transaction.fund_id]
    //     );
    //   } else {
    //     await query(
    //       `UPDATE "Funds"
    //        SET fund_account_D = COALESCE(fund_account_D, 0) + $1
    //        WHERE fund_id = $2`,
    //       [product.product_purchase_price_total, transaction.fund_id]
    //     );
    //   }
    // }

    // // 4️⃣ حذف العملية المالية المرتبطة
    // if (transaction) {
    //   await query(`DELETE FROM "Transaction" WHERE transaction_id = $1`, [transaction.transaction_id]);
    // }

    // // 5️⃣ حذف من Purchased_product و Product_arrangement
    // await query(`DELETE FROM "Purchased_product" WHERE purchased_product_product_id = $1`, [id]);
    // await query(`DELETE FROM "Product_arrangement" WHERE product_id = $1`, [id]);

    // 6️⃣ حذف المنتج نفسه
    await query(`DELETE FROM "Product" WHERE "Product_id" = $1`, [id]);

    await query('COMMIT');
    res.json({ message: '🗑️ تم حذف المادة بنجاح وتم استرجاع المبلغ إلى الصندوق ✅' });
  } catch (err) {
    await query('ROLLBACK');
    console.error('❌ Error in deleteProduct with rollback:', err);
    res.status(500).json({ message: 'حدث خطأ أثناء حذف المادة أو الترحيل العكسي' });
  }
}

